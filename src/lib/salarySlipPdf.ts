import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Renders a full salary-slip HTML string into a hidden iframe, captures the
 * `.slip` element with html2canvas, and saves it as an A4 PORTRAIT PDF.
 *
 * Why: on iOS Safari / installed PWAs, `window.print()` of an iframe prints the
 * PARENT document (a blank app page), so the slip never appears. Generating a
 * downloadable PDF works reliably on every platform.
 */
export async function downloadSlipAsPdf(
  htmlContent: string,
  filename: string = 'salary-slip.pdf',
): Promise<void> {
  // Strip <script> tags (auto-print logic) and @media screen blocks.
  let cleanHtml = htmlContent.replace(/<script>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/@media\s+screen\s*\{([\s\S]*?)\n\s*\}/g, '');

  // A4 portrait at 96dpi: 794px x 1123px. Capture at the slip's natural width.
  const pageW = 794;

  const pdfOverrides = `
    <style>
      html, body {
        background:#fff !important;
        margin:0 !important;
        padding:0 !important;
        width:${pageW}px !important;
      }
      .slip {
        box-shadow:none !important;
        border-radius:0 !important;
        max-width:${pageW}px !important;
        width:${pageW}px !important;
        margin:0 auto !important;
      }
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    </style>
  `;
  cleanHtml = cleanHtml.replace('</head>', pdfOverrides + '</head>');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${pageW}px;height:1123px;border:none;visibility:hidden;`;
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

        const target = (iframeDoc.querySelector('.slip') as HTMLElement) || iframeDoc.body;

        const canvas = await html2canvas(target, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: pageW,
          logging: false,
          imageTimeout: 5000,
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        const pdfWidth = 210;
        const pdfHeight = 297;
        const margin = 10; // mm margin on all sides

        const availW = pdfWidth - margin * 2;
        const availH = pdfHeight - margin * 2;

        // Scale image to fit the printable area while preserving aspect ratio,
        // so the whole slip always fits on a SINGLE page within the margins.
        const ratio = canvas.width / canvas.height;
        let drawW = availW;
        let drawH = drawW / ratio;
        if (drawH > availH) {
          drawH = availH;
          drawW = drawH * ratio;
        }

        const offsetX = margin + (availW - drawW) / 2;
        const offsetY = margin + (availH - drawH) / 2;

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);

        pdf.save(filename);
        resolve();
      } catch (err) {
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
): Promise<void> {
  // Strip the on-screen Print Settings bar + auto-print script and screen-only blocks.
  let cleanHtml = htmlContent.replace(/<script>[\s\S]*?<\/script>/gi, '');
  cleanHtml = cleanHtml.replace(/@media\s+screen\s*\{([\s\S]*?)\n\s*\}/g, '');

  // A4 landscape at 96dpi: 1123px x 794px. Lock EVERY page to this exact box so
  // all captured pages share one aspect ratio → identical margins in the PDF.
  const pageW = 1123;
  const pageH = 794;

  const pdfOverrides = `
    <style>
      html, body { background:#fff !important; margin:0 !important; padding:0 !important; width:${pageW}px !important; }
      .print-settings, [data-print-settings] { display:none !important; }
      .sheet { width:${pageW}px !important; max-width:${pageW}px !important; margin:0 auto !important; }
      .salary-page {
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
      .print-fit { transform-origin:top left !important; width:100% !important; }
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
    </style>
  `;
  cleanHtml = cleanHtml.replace('</head>', pdfOverrides + '</head>');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${pageW}px;height:${pageH}px;border:none;visibility:hidden;`;
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

        const pages = Array.from(iframeDoc.querySelectorAll('.salary-page')) as HTMLElement[];
        const targets = pages.length > 0
          ? pages
          : [((iframeDoc.querySelector('.sheet') as HTMLElement) || iframeDoc.body)];

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = 297;
        const pdfHeight = 210;
        const margin = 8;
        const availW = pdfWidth - margin * 2;
        const availH = pdfHeight - margin * 2;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];

          // Scale the inner content to fit inside the fixed A4 box so dense pages
          // never overflow the border and sparse pages keep the same frame.
          const fit = target.querySelector('.print-fit') as HTMLElement | null;
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
            scale: 2,
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

          if (i > 0) pdf.addPage('a4', 'landscape');
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
        }

        // Open the generated PDF in a new tab for PREVIEW. Use the window the
        // caller opened synchronously on click (avoids popup blocking); fall back
        // to opening here, then to a direct download.
        try {
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          if (targetWindow && !targetWindow.closed) {
            targetWindow.location.href = url;
          } else {
            const win = window.open(url, '_blank');
            if (!win) pdf.save(filename);
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
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
