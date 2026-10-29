import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// iOS Safari silently returns a BLANK canvas when either dimension exceeds
// ~4096px or the total area exceeds ~16.7M px. Clamp the html2canvas scale so
// the captured canvas always stays within those limits (fixes blank mobile PDFs).
const IOS_MAX_DIM = 4096;
const IOS_MAX_AREA = 16_777_216;
function safeCaptureScale(widthPx: number, heightPx: number, desired: number): number {
  let scale = desired;
  scale = Math.min(scale, IOS_MAX_DIM / Math.max(widthPx, 1));
  scale = Math.min(scale, IOS_MAX_DIM / Math.max(heightPx, 1));
  scale = Math.min(scale, Math.sqrt(IOS_MAX_AREA / Math.max(widthPx * heightPx, 1)));
  return Math.max(1, scale);
}

// Off-screen iframes with visibility:hidden are not laid out/painted on mobile
// Safari, so html2canvas captures nothing. Keep the iframe on-screen but fully
// transparent and non-interactive instead.
const HIDDEN_IFRAME_CSS = (w: number, h: number) =>
  `position:fixed;left:0;top:0;width:${w}px;height:${h}px;border:none;opacity:0;pointer-events:none;z-index:-1;`;

/**
 * Generates an A4 PORTRAIT PDF Blob from a salary-slip HTML string.
 */
export async function generateSlipPdfBlob(htmlContent: string): Promise<Blob> {
  // Strip <script> tags and ANY mobile @media screen overrides so PDF is ALWAYS 100% full desktop/computer A4 layout
  let cleanHtml = htmlContent.replace(/<script>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/@media\s+screen[^{]*\{[\s\S]*?\n\s*\}\s*\}/gi, '');
  cleanHtml = cleanHtml.replace(/@media\s+screen[^{]*\{[\s\S]*?\n\s*\}/gi, '');

  // A4 portrait at 96dpi: 794px x 1123px. Capture at the slip's natural width.
  const pageW = 794;

  const pdfOverrides = `
    <style>
      html, body {
        background:#fff !important;
        margin:0 !important;
        padding:0 !important;
        width:${pageW}px !important;
        min-width:${pageW}px !important;
        max-width:${pageW}px !important;
      }
      .slip {
        box-shadow:none !important;
        border-radius:0 !important;
        border:none !important;
        max-width:${pageW}px !important;
        width:${pageW}px !important;
        min-width:${pageW}px !important;
        margin:0 auto !important;
        padding:16px 20px !important;
      }
      .header { padding: 20px 24px !important; }
      .head-row { display: flex !important; flex-direction: row !important; align-items: center !important; gap: 16px !important; }
      .slip-tag { position: absolute !important; right: 24px !important; top: 20px !important; display: block !important; width: auto !important; text-align: right !important; margin-bottom: 0 !important; }
      .month-bar { padding: 10px 24px !important; flex-direction: row !important; display: flex !important; justify-content: space-between !important; align-items: center !important; }
      .body { padding: 18px 24px !important; }
      .info-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; margin-bottom: 14px !important; }
      .info-cell:nth-child(odd) { border-right: 1px solid #cbd5e1 !important; }
      .info-cell { padding: 8px 12px !important; font-size: 13px !important; }
      .info-cell .lbl { white-space: nowrap !important; margin-right: 12px !important; flex-shrink: 0 !important; }
      .info-cell .val { text-align: right !important; word-break: break-word !important; }
      .signatures { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 24px !important; margin-top: 32px !important; }
      .footer { padding: 10px 24px !important; }
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    </style>
  `;
  cleanHtml = cleanHtml.replace('</head>', pdfOverrides + '</head>');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = HIDDEN_IFRAME_CSS(pageW, 1123);
    document.body.appendChild(iframe);

    let hasCaptured = false;
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      cleanup();
      reject(new Error('Could not access iframe'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(cleanHtml);
    iframeDoc.close();

    const captureAndGenerate = async () => {
      if (hasCaptured) return;
      hasCaptured = true;
      try {
        if (iframe.contentWindow?.document?.fonts) {
          await iframe.contentWindow.document.fonts.ready;
        }
        const images = Array.from(iframeDoc.images || []);
        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete) { res(); return; }
                img.onload = () => res();
                img.onerror = () => res();
              }),
          ),
        );
        await new Promise((r) => setTimeout(r, 800));

        const target = (iframeDoc.querySelector('.slip') as HTMLElement) || iframeDoc.body;

        const canvas = await html2canvas(target, {
          scale: safeCaptureScale(target.scrollWidth || pageW, target.scrollHeight || 1123, 3),
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: pageW,
          logging: false,
          imageTimeout: 5000,
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;
        const pdfHeight = 297;
        const marginX = 6; // mm margin on sides (fills full page width)
        const marginTop = 6; // mm margin on top

        const availW = pdfWidth - marginX * 2;
        const availH = pdfHeight - marginTop * 2;

        const ratio = canvas.width / canvas.height;
        let drawW = availW;
        let drawH = drawW / ratio;
        if (drawH > availH) {
          drawH = availH;
          drawW = drawH * ratio;
        }

        const offsetX = marginX + (availW - drawW) / 2;
        const offsetY = marginTop;

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);

        const blob = pdf.output('blob');
        resolve(blob);
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onload = () => { void captureAndGenerate(); };
    setTimeout(() => { void captureAndGenerate(); }, 4000);
  });
}

/**
 * Saves a salary-slip as an A4 PORTRAIT PDF file.
 */
export async function downloadSlipAsPdf(
  htmlContent: string,
  filename: string = 'salary-slip.pdf',
): Promise<void> {
  const blob = await generateSlipPdfBlob(htmlContent);
  saveBlobSmart(blob, filename);
}

/**
 * Opens a salary slip as an A4 PORTRAIT PDF in a new browser tab.
 * Gives mobile and desktop users direct access to the pre-rendered vector PDF.
 */
export async function viewSlipPdfInNewTab(htmlContent: string): Promise<void> {
  const blob = await generateSlipPdfBlob(htmlContent);
  const blobUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(blobUrl), 180000);
}

/**
 * Triggers native mobile (iOS AirPrint / Android) and desktop printing for a salary slip.
 * Uses DOM print isolation so the browser prints ONLY the 1-page A4 salary slip,
 * completely hiding the background admin dashboard and avoiding multi-page blank sheets.
 */
export function printSalarySlipHtml(
  htmlContent: string,
  staffName: string = 'staff',
  customReturnUrl?: string,
): void {
  if (typeof window === 'undefined') return;

  // 1. Clean up any previous isolated print containers
  const existing = document.getElementById('salary-slip-print-standalone');
  if (existing) existing.remove();
  const existingStyle = document.getElementById('salary-slip-print-standalone-css');
  if (existingStyle) existingStyle.remove();

  // 2. Extract slip HTML body content and styles
  let bodyContent = htmlContent;
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1];
  }
  const styleMatches = Array.from(htmlContent.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));
  const extractedStyles = styleMatches.map(m => m[1]).join('\n');

  // 3. Create isolated DOM element directly on document.body
  const container = document.createElement('div');
  container.id = 'salary-slip-print-standalone';
  container.innerHTML = bodyContent;

  // 4. Create print isolation style
  const style = document.createElement('style');
  style.id = 'salary-slip-print-standalone-css';
  style.textContent = `
    @media screen {
      #salary-slip-print-standalone {
        display: none !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        visibility: hidden !important;
      }
    }
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    @media print {
      /* CRITICAL: Hide ALL background page content (admin UI, modals, 18 cards) */
      body > *:not(#salary-slip-print-standalone) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
      }
      html, body {
        background: #fff !important;
        color: #000 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #salary-slip-print-standalone {
        display: block !important;
        visibility: visible !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #fff !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #salary-slip-print-standalone .slip {
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      #salary-slip-print-standalone .header {
        padding: 14px 22px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      #salary-slip-print-standalone .head-row {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 16px !important;
      }
      #salary-slip-print-standalone .slip-tag {
        position: absolute !important;
        right: 22px !important;
        top: 14px !important;
        display: block !important;
        width: auto !important;
        text-align: right !important;
      }
      #salary-slip-print-standalone .info-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        margin-bottom: 10px !important;
        border: 1px solid #cbd5e1 !important;
      }
      #salary-slip-print-standalone .info-cell:nth-child(odd) {
        border-right: 1px solid #cbd5e1 !important;
      }
      #salary-slip-print-standalone .signatures {
        display: grid !important;
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 20px !important;
        margin-top: 32px !important;
      }
      #salary-slip-print-standalone .watermark {
        display: none !important;
      }
      #salary-slip-print-standalone .no-print,
      #salary-slip-print-standalone .print-actions-bar {
        display: none !important;
      }
      ${extractedStyles}
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(container);

  const cleanup = () => {
    try { container.remove(); } catch {}
    try { style.remove(); } catch {}
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // Trigger print after brief delay so fonts & DOM are ready
  setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.error('window.print failed', e);
    }
    setTimeout(cleanup, 4000);
  }, 120);
}

/**
 * Shares salary slip PDF directly to WhatsApp, Bluetooth printer apps, Mail, etc.
 * Falls back cleanly to PDF file download if Web Share API is unavailable.
 */
export async function shareSlipPdf(
  htmlContent: string,
  filename: string = 'salary-slip.pdf',
  title: string = 'বেতন স্লিপ (Salary Slip)',
): Promise<boolean> {
  try {
    const blob = await generateSlipPdfBlob(htmlContent);
    const file = new File([blob], filename, { type: 'application/pdf' });
    if (typeof navigator !== 'undefined' && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: title,
      });
      return true;
    } else if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title,
        text: title,
      });
      return true;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return true; // User dismissed share sheet
    console.warn('Native share failed, falling back to download', err);
  }
  // Fallback to normal download
  await downloadSlipAsPdf(htmlContent, filename);
  return false;
}

/**
 * Renders the full salary-SHEET HTML (A4 landscape, one `.salary-page` section
 * per printed page) into a hidden iframe, captures each `.salary-page` with
 * html2canvas, and saves a multi-page A4 LANDSCAPE PDF.
 *
 * Why: on iOS Safari / installed PWAs `window.open()` + `window.print()` prints
 * the blank parent app page, so the sheet never appears. A downloadable PDF
 * works reliably everywhere.
 */
export async function downloadSheetAsPdf(
  htmlContent: string,
  filename: string = 'salary-sheet.pdf',
  targetWindow?: Window | null,
  orientation: 'landscape' | 'portrait' = 'landscape',
  mode: 'preview' | 'download' = 'preview',
): Promise<void> {
  // Strip the on-screen Print Settings bar + auto-print script and screen-only blocks.
  let cleanHtml = htmlContent.replace(/<script>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/@media\s+screen\s*\{([\s\S]*?)\n\s*\}/g, '');

  // A4 landscape at 96dpi: 1123px x 794px. Lock EVERY page to this exact box so
  // all captured pages share one aspect ratio → identical margins in the PDF.
  const pageW = orientation === 'landscape' ? 1123 : 794;
  const pageH = orientation === 'landscape' ? 794 : 1123;

  const pdfOverrides = `
    <style>
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; width:${pageW}px !important; }
      .print-settings, [data-print-settings] { display:none !important; }
      .sheet { width:${pageW}px !important; max-width:${pageW}px !important; margin:0 auto !important; }
      .salary-page, .result-page, .attendance-page {
        box-shadow:none !important;
        width:${pageW}px !important;
        height:${pageH}px !important;
        min-height:${pageH}px !important;
        max-height:${pageH}px !important;
        margin:0 auto !important;
        overflow:hidden !important;
        box-sizing:border-box !important;
        position:relative !important;
      }
      .print-fit, .fit-inner { transform-origin:top center !important; width:100% !important; }
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    </style>
  `;
  cleanHtml = cleanHtml.replace('</head>', pdfOverrides + '</head>');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = HIDDEN_IFRAME_CSS(pageW, pageH);
    document.body.appendChild(iframe);

    let hasCaptured = false;
    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      cleanup();
      reject(new Error('Could not access iframe'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(cleanHtml);
    iframeDoc.close();

    const captureAndDownload = async () => {
      if (hasCaptured) return;
      hasCaptured = true;
      try {
        if (iframe.contentWindow?.document?.fonts) {
          await iframe.contentWindow.document.fonts.ready;
        }
        const images = Array.from(iframeDoc.images || []);
        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete) { res(); return; }
                img.onload = () => res();
                img.onerror = () => res();
              }),
          ),
        );
        await new Promise((r) => setTimeout(r, 800));

        const pages = Array.from(iframeDoc.querySelectorAll('.salary-page, .result-page, .attendance-page')) as HTMLElement[];
        const targets = pages.length > 0
          ? pages
          : [((iframeDoc.querySelector('.sheet') as HTMLElement) || iframeDoc.body)];

        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const pdfWidth = orientation === 'landscape' ? 297 : 210;
        const pdfHeight = orientation === 'landscape' ? 210 : 297;
        const margin = 8;
        const availW = pdfWidth - margin * 2;
        const availH = pdfHeight - margin * 2;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];

          // Scale the inner content to fit inside the fixed A4 box so dense pages
          // never overflow the border and sparse pages keep the same frame.
          const fit = (target.querySelector('.print-fit') || target.querySelector('.fit-inner')) as HTMLElement | null;
          if (fit) {
            fit.style.transform = 'none';
            const cs = iframe.contentWindow?.getComputedStyle(target);
            const padTop = parseFloat(cs?.paddingTop || '0') || 0;
            const padBottom = parseFloat(cs?.paddingBottom || '0') || 0;
            const borderTop = parseFloat(cs?.borderTopWidth || '0') || 0;
            const borderBottom = parseFloat(cs?.borderBottomWidth || '0') || 0;
            const availInner = pageH - padTop - padBottom - borderTop - borderBottom;
            const contentH = fit.scrollHeight;
            if (contentH > availInner && contentH > 0) {
              fit.style.transform = `scale(${availInner / contentH})`;
            }
          }

          const canvas = await html2canvas(target, {
            scale: safeCaptureScale(pageW, pageH, 2),
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: pageW,
            height: pageH,
            windowWidth: pageW,
            windowHeight: pageH,
            logging: false,
            imageTimeout: 5000,
          });

          // Every canvas now shares the A4-landscape ratio, so all pages map to
          // an identical rectangle → uniform margins across the whole document.
          const ratio = canvas.width / canvas.height;
          let drawW = availW;
          let drawH = drawW / ratio;
          if (drawH > availH) {
            drawH = availH;
            drawW = drawH * ratio;
          }
          const offsetX = margin + (availW - drawW) / 2;
          const offsetY = margin + (availH - drawH) / 2;

          if (i > 0) pdf.addPage('a4', orientation === 'landscape' ? 'landscape' : 'portrait');
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
        }

        // Save the file directly when the caller asked for a download; otherwise
        // preview it in the window opened synchronously on click.
        try {
          if (mode === 'download') {
            if (targetWindow && !targetWindow.closed) targetWindow.close();
            savePdfSmart(pdf, filename);
          } else {
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            if (targetWindow && !targetWindow.closed) {
              targetWindow.location.href = url;
            } else {
              const win = window.open(url, '_blank');
              if (!win) pdf.save(filename);
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
        } catch {
          if (targetWindow && !targetWindow.closed) targetWindow.close();
          pdf.save(filename);
        }
        resolve();
      } catch (err) {
        if (targetWindow && !targetWindow.closed) targetWindow.close();
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onload = () => { void captureAndDownload(); };
    setTimeout(() => { void captureAndDownload(); }, 4000);
  });
}

/**
 * Mobile-safe Blob save. Creates a blob URL and clicks an anchor link,
 * with fallbacks for mobile browsers/PWAs.
 */
export function saveBlobSmart(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { a.remove(); } catch {}
      try { URL.revokeObjectURL(url); } catch {}
    }, 60000);
  } catch {
    try {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60000);
    } catch (e) {
      console.error('saveBlobSmart error', e);
    }
  }
}

/**
 * Mobile-safe PDF save. jsPDF's `save()` relies on an anchor download which
 * silently fails on several mobile browsers (esp. iOS Safari / PWAs). On
 * mobile we create a blob URL and click a real `<a download>` link ourselves.
 */
function savePdfSmart(pdf: jsPDF, filename: string): void {
  if (!isMobileOrPwa()) {
    pdf.save(filename);
    return;
  }
  const blob = pdf.output('blob');
  saveBlobSmart(blob, filename);
}

/** True when running on a mobile device or an installed standalone PWA. */
export function isMobileOrPwa(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as any).standalone === true) return true;
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}
