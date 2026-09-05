import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Takes A4 portrait letter HTML string, renders it in a hidden iframe,
 * captures with html2canvas, and saves as PDF.
 */
export async function downloadLetterAsPdf(
  htmlContent: string,
  filename: string = 'letter.pdf'
): Promise<void> {
  // Remove @media screen blocks so screen-only styles don't leak
  let cleanHtml = htmlContent.replace(/@media\s+screen\s*\{([\s\S]*?)\n\s*\}/g, '');

  // A4 Portrait dimensions at 96dpi: 210mm=794px, 297mm=1123px
  const pageW = 794;
  const pageH = 1123;

  // Inject PDF-specific overrides
  const pdfOverrides = `
    <style>
      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: ${pageW}px !important;
        min-height: ${pageH}px !important;
        overflow: hidden !important;
      }
      .page {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: ${pageW}px !important;
        max-width: ${pageW}px !important;
        height: ${pageH}px !important;
        min-height: ${pageH}px !important;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
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
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
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
              new Promise<void>((resolveImage) => {
                if (img.complete) { resolveImage(); return; }
                img.onload = () => resolveImage();
                img.onerror = () => resolveImage();
              })
          )
        );

        await new Promise((r) => setTimeout(r, 1200));

        const pages = iframeDoc.querySelectorAll('.page');
        const targets = pages.length > 0 ? Array.from(pages) : [iframeDoc.body];

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;
        const pdfHeight = 297;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i] as HTMLElement;
          target.style.width = `${pageW}px`;
          target.style.height = `${pageH}px`;

          const canvas = await html2canvas(target, {
            scale: 3,
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

          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    setTimeout(() => { void captureAndDownload(); }, 8000);
  });
}
