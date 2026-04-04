import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Takes receipt HTML string, renders it in a hidden iframe,
 * captures with html2canvas, and saves as PDF.
 */
export async function downloadReceiptAsPdf(
  htmlContent: string,
  filename: string = 'receipt.pdf'
): Promise<void> {
  const cleanHtml = htmlContent
    .replace(/<script>[\s\S]*?<\/script>/gi, '')
    .replace(/@media\s+screen\s*\{[^}]*\{[^}]*\}[^}]*\}/g, '');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;';
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
                if (img.complete) {
                  resolveImage();
                  return;
                }
                img.onload = () => resolveImage();
                img.onerror = () => resolveImage();
              })
          )
        );

        await new Promise((r) => setTimeout(r, 500));

        const pages = iframeDoc.querySelectorAll('.page');
        const targets = pages.length > 0 ? Array.from(pages) : [iframeDoc.body];

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;
        const pdfHeight = 297;

        for (let i = 0; i < targets.length; i++) {
          const target = targets[i] as HTMLElement;
          const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const imgRatio = canvas.height / canvas.width;
          const imgHeight = pdfWidth * imgRatio;

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
        }

        pdf.save(filename);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onload = () => {
      void captureAndDownload();
    };

    setTimeout(() => {
      void captureAndDownload();
    }, 3000);
  });
}
