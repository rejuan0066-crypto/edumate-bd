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
  // Remove the auto-print script from the HTML
  const cleanHtml = htmlContent
    .replace(/<script>[\s\S]*?<\/script>/gi, '')
    .replace(/@media\s+screen\s*\{[^}]*\{[^}]*\}[^}]*\}/g, '');

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;height:1123px;border:none;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      reject(new Error('Could not access iframe'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(cleanHtml);
    iframeDoc.close();

    // Wait for fonts to load then capture
    const captureAndDownload = async () => {
      try {
        // Wait for fonts
        if (iframe.contentWindow?.document?.fonts) {
          await iframe.contentWindow.document.fonts.ready;
        }
        // Extra delay for images/fonts
        await new Promise(r => setTimeout(r, 1500));

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
        document.body.removeChild(iframe);
      }
    };

    iframe.onload = () => captureAndDownload();
    // Fallback if onload doesn't fire
    setTimeout(() => captureAndDownload(), 3000);
  });
}
