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

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        const imgData = canvas.toDataURL('image/png');

        if (imgHeight <= pdfHeight) {
          // Single page — center vertically if shorter than the page.
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        } else {
          // Multi-page slicing.
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
          while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
        }

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
