import { test, expect } from "../playwright-fixture";

/**
 * Mobile responsive overflow / overlap detection.
 *
 * For each (route × viewport) pair we:
 *   1. Take a full-page screenshot (saved as a test attachment for visual review).
 *   2. Assert the document does not horizontally overflow the viewport
 *      (catches "wider than screen" regressions that cause text overlap).
 *   3. Inspect headings / brand labels and flag any element whose scrollWidth
 *      exceeds its clientWidth (the classic "text gets clipped / overlaps").
 *
 * Run:  bunx playwright test tests/mobile-overflow.spec.ts
 */

const ROUTES = ["/", "/login", "/admission", "/notices", "/contact"];

const VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568 },
  { name: "iphone-mini", width: 375, height: 667 },
  { name: "android-small", width: 360, height: 800 },
  { name: "iphone-13", width: 390, height: 844 },
];

// Selectors that commonly host the institution / app name and page titles.
const TEXT_SELECTORS = [
  "header h1",
  "header h2",
  "header [class*='font-display']",
  "main h1",
  "main h2",
  "[data-testid='app-name']",
  "[data-testid='page-title']",
];

for (const vp of VIEWPORTS) {
  test.describe(`mobile @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`no overflow on ${route}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(String(e)));

        const resp = await page.goto(route, { waitUntil: "networkidle" });
        if (!resp || resp.status() >= 400) {
          test.skip(true, `route ${route} returned ${resp?.status()}`);
          return;
        }

        // Allow async chrome (logo, settings) to settle.
        await page.waitForTimeout(800);

        // 1. Screenshot for visual diffing / manual review.
        const shot = await page.screenshot({ fullPage: true });
        await testInfo.attach(`${vp.name}${route.replace(/\//g, "_") || "_root"}.png`, {
          body: shot,
          contentType: "image/png",
        });

        // 2. Document-level horizontal overflow.
        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          return { docW, winW, overflowPx: docW - winW };
        });
        expect.soft(
          overflow.overflowPx,
          `Document scrollWidth ${overflow.docW}px > viewport ${overflow.winW}px`,
        ).toBeLessThanOrEqual(1);

        // 3. Per-element clipped-text detection on key chrome.
        const clipped = await page.evaluate((selectors) => {
          const out: Array<{ selector: string; text: string; sw: number; cw: number }> = [];
          for (const sel of selectors) {
            const nodes = Array.from(document.querySelectorAll<HTMLElement>(sel));
            for (const el of nodes) {
              if (!el.offsetParent && el.tagName !== "BODY") continue; // skip hidden
              const cs = window.getComputedStyle(el);
              // Only flag elements that *intend* to fit on one line / be visible.
              const isTruncated =
                cs.textOverflow === "ellipsis" ||
                cs.whiteSpace === "nowrap" ||
                cs.overflow === "hidden";
              if (isTruncated) continue; // truncate is the intended fix
              if (el.scrollWidth - el.clientWidth > 1) {
                out.push({
                  selector: sel,
                  text: (el.innerText || "").slice(0, 80),
                  sw: el.scrollWidth,
                  cw: el.clientWidth,
                });
              }
            }
          }
          return out;
        }, TEXT_SELECTORS);

        if (clipped.length) {
          await testInfo.attach(`${vp.name}${route.replace(/\//g, "_")}-clipped.json`, {
            body: Buffer.from(JSON.stringify(clipped, null, 2)),
            contentType: "application/json",
          });
        }
        expect.soft(
          clipped,
          `Elements overflow their container (consider truncate / min-w-0):\n${JSON.stringify(clipped, null, 2)}`,
        ).toEqual([]);

        // 4. No runtime errors during render.
        expect.soft(errors, `Page errors: ${errors.join("\n")}`).toEqual([]);
      });
    }
  });
}
