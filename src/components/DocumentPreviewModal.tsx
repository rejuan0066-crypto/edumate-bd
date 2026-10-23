import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Download,
  Printer,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle,
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveFileUrl, isPdfUrl } from '@/lib/secureStorage';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null | undefined;
  fileName?: string | null;
  title?: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  title,
}) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pdfMode, setPdfMode] = useState<'image' | 'google' | 'direct'>('google');

  useEffect(() => {
    if (!open || !fileUrl) {
      setResolvedUrl('');
      setError(null);
      setZoom(1);
      setRotation(0);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setZoom(1);
    setRotation(0);

    resolveFileUrl(fileUrl)
      .then((url) => {
        if (!isCancelled) {
          if (!url) {
            setError(bn ? 'ফাইলের সঠিক লিঙ্ক পাওয়া যায়নি' : 'File URL could not be resolved');
          } else {
            setResolvedUrl(url);
            const isCloudinary = isCloudinaryUrl(url) || url.includes('cloudinary');
            const pdf = isPdfUrl(url) || isPdfUrl(fileName) || isPdfUrl(fileUrl);
            if (pdf) {
              // Default to image mode for Cloudinary (instant, no iframe blockage), otherwise Google viewer
              setPdfMode(isCloudinary ? 'image' : 'google');
            }
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Error resolving file URL:', err);
          setError(bn ? 'ফাইল লোড করতে ব্যর্থ হয়েছে' : 'Failed to load file');
        }
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [open, fileUrl, fileName, bn]);

  const isPdf = isPdfUrl(resolvedUrl) || isPdfUrl(fileName) || isPdfUrl(fileUrl);
  const isCloudinary = isCloudinaryUrl(resolvedUrl) || resolvedUrl.includes('cloudinary');
  const displayName = fileName || (isPdf ? (bn ? 'ডকুমেন্ট.pdf' : 'document.pdf') : (bn ? 'মেমো / রসিদ' : 'memo_receipt'));
  const modalTitle = title || (isPdf ? (bn ? 'ডকুমেন্ট প্রিভিউ' : 'Document Preview') : (bn ? 'মেমো / রসিদ প্রিভিউ' : 'Memo / Receipt Preview'));

  // Cloudinary image representation of PDF page 1
  const cloudinaryPdfImageUrl = isCloudinary && isPdf && resolvedUrl
    ? resolvedUrl.replace(/\.pdf($|[?#])/i, '.jpg$1')
    : null;

  const handlePrint = () => {
    if (!resolvedUrl) return;
    if (isPdf) {
      const printWindow = window.open(resolvedUrl, '_blank');
      printWindow?.focus();
      printWindow?.print();
    } else {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>${displayName}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${resolvedUrl}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const handleDownload = () => {
    if (!resolvedUrl) return;
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = displayName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold truncate">
                {modalTitle}
              </DialogTitle>
              {displayName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {displayName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* PDF Viewer Mode Switcher */}
              {isPdf && resolvedUrl && !loading && (
                <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg text-xs font-semibold">
                  {isCloudinary && (
                    <button
                      type="button"
                      onClick={() => setPdfMode('image')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-1',
                        pdfMode === 'image'
                          ? 'bg-background shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{bn ? 'ছবি মোড' : 'Image'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPdfMode('google')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-1',
                      pdfMode === 'google'
                        ? 'bg-background shadow-xs text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>{bn ? 'গুগল ভিউয়ার' : 'Google Viewer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfMode('direct')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-1',
                      pdfMode === 'direct'
                        ? 'bg-background shadow-xs text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>{bn ? 'সরাসরি ভিউ' : 'Direct'}</span>
                  </button>
                </div>
              )}

              {/* Zoom / Rotate controls (Active for images and PDF image mode) */}
              {(!isPdf || (isPdf && pdfMode === 'image')) && resolvedUrl && !loading && (
                <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                    title={bn ? 'জুম ইন' : 'Zoom In'}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                    title={bn ? 'জুম আউট' : 'Zoom Out'}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title={bn ? 'ঘোরান' : 'Rotate'}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Viewer Body */}
        <div className="flex-1 min-h-[300px] max-h-[65vh] overflow-auto flex items-center justify-center bg-muted/20 rounded-xl my-2 p-2 relative">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">{bn ? 'ফাইল প্রস্তুত হচ্ছে...' : 'Loading file...'}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-destructive">
              <AlertCircle className="w-10 h-10 stroke-1" />
              <p className="text-sm font-medium">{error}</p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {bn ? 'সরাসরি লিঙ্ক খুলুন' : 'Open direct link'}
                </a>
              )}
            </div>
          ) : isPdf ? (
            pdfMode === 'image' && cloudinaryPdfImageUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
                <img
                  src={cloudinaryPdfImageUrl}
                  alt={displayName}
                  onError={() => setPdfMode('google')}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-in-out',
                  }}
                  className="max-w-full max-h-[58vh] object-contain rounded-lg shadow-sm border border-border/30 bg-white"
                />
                <p className="mt-2 text-[11px] text-muted-foreground text-center">
                  {bn
                    ? '✨ ক্রোম ব্লকিং এড়াতে ডকুমেন্টটি ছবি আকারে প্রদর্শিত হচ্ছে। পুরো PDF দেখতে উপরের "গুগল ভিউয়ার" অথবা "নতুন ট্যাবে খুলুন" ব্যবহার করুন।'
                    : 'Rendered as image. Switch to Google Viewer or Open in New Tab for full PDF.'}
                </p>
              </div>
            ) : pdfMode === 'google' ? (
              <div className="w-full h-full min-h-[500px] flex flex-col">
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(resolvedUrl)}&embedded=true`}
                  className="w-full flex-1 min-h-[450px] border-0 rounded-lg bg-background"
                  title={displayName}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>
                    {bn ? '🌐 গুগল ডক্স ভিউয়ারে প্রদর্শিত হচ্ছে' : '🌐 Rendered via Google Docs Viewer'}
                  </span>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline font-medium inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {bn ? 'সরাসরি ফাইলে যান' : 'Direct Link'}
                  </a>
                </div>
              </div>
            ) : (
              <div className="w-full h-full min-h-[500px] flex flex-col">
                <iframe
                  src={`${resolvedUrl}#toolbar=1&navpanes=0`}
                  className="w-full flex-1 min-h-[450px] border-0 rounded-lg bg-background"
                  title={displayName}
                />
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center text-xs text-amber-800 dark:text-amber-300">
                  {bn
                    ? '⚠️ ক্রোম ব্রাউজার সরাসরি আইফ্রেমে PDF ব্লক করলে উপরের "গুগল ভিউয়ার" অথবা "ছবি মোড" বাটনে ক্লিক করুন।'
                    : '⚠️ If Chrome blocks raw PDF in iframe, switch to Google Viewer or Image Mode above.'}
                </div>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={resolvedUrl}
                alt={displayName}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm border border-border/30"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50 shrink-0">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {isPdf ? (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-rose-500" /> PDF Document
              </span>
            ) : (
              <span>Image File</span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!resolvedUrl || loading}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!resolvedUrl || loading}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{bn ? 'ডাউনলোড' : 'Download'}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => resolvedUrl && window.open(resolvedUrl, '_blank', 'noopener,noreferrer')}
              disabled={!resolvedUrl || loading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{bn ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewModal;
