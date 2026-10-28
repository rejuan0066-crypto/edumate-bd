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
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveFileUrl, isPdfUrl } from '@/lib/secureStorage';
import { isCloudinaryUrl } from '@/lib/cloudinary';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [localBlobUrl, setLocalBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!open || !fileUrl) {
      setResolvedUrl('');
      setLocalBlobUrl('');
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
      .then(async (url) => {
        if (!isCancelled) {
          if (!url) {
            setError(bn ? 'ফাইলের সঠিক লিঙ্ক পাওয়া যায়নি' : 'File URL could not be resolved');
          } else {
            setResolvedUrl(url);
            const isCloudinary = isCloudinaryUrl(url) || url.includes('cloudinary');
            const pdf = isPdfUrl(url) || isPdfUrl(fileName) || isPdfUrl(fileUrl);

            if (pdf) {
              // If it's a Supabase storage file, pre-fetch as a local blob
              // This completely bypasses Chrome client adblockers (ERR_BLOCKED_BY_CLIENT)
              const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
              if (m) {
                const bucket = m[1];
                const path = decodeURIComponent(m[2]);
                try {
                  const { data: sbBlob } = await supabase.storage.from(bucket).download(path);
                  if (sbBlob && !isCancelled) {
                    const bUrl = URL.createObjectURL(sbBlob);
                    setLocalBlobUrl(bUrl);
                  }
                } catch (e) {
                  console.warn('Pre-fetch blob warning:', e);
                }
              }
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
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
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

  const handlePrint = async () => {
    const targetUrl = localBlobUrl || resolvedUrl || fileUrl;
    if (!targetUrl) return;

    if (isPdf) {
      if (localBlobUrl) {
        const win = window.open(localBlobUrl, '_blank');
        win?.focus();
        return;
      }

      // Check if Supabase
      const m = targetUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
      if (m) {
        const bucket = m[1];
        const path = decodeURIComponent(m[2]);
        const { data: sbBlob } = await supabase.storage.from(bucket).download(path);
        if (sbBlob) {
          const bUrl = URL.createObjectURL(sbBlob);
          const win = window.open(bUrl, '_blank');
          win?.focus();
          setTimeout(() => URL.revokeObjectURL(bUrl), 30000);
          return;
        }
      }

      const printWindow = window.open(targetUrl, '_blank');
      printWindow?.focus();
      printWindow?.print();
    } else {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>${String(displayName ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${String(targetUrl).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  /**
   * Direct, true in-browser file download.
   * Converts the target into a local same-origin Blob, ensuring the browser saves
   * the file directly into Downloads folder without opening an external tab or
   * triggering adblockers (ERR_BLOCKED_BY_CLIENT).
   */
  const handleDownload = async () => {
    const targetUrl = resolvedUrl || fileUrl;
    if (!targetUrl && !localBlobUrl) return;

    setDownloading(true);
    toast.info(bn ? 'ফাইল ডাউনলোড হচ্ছে...' : 'Downloading file...');

    try {
      let blob: Blob | null = null;

      // 1. If we already have a local blob, use it
      if (localBlobUrl) {
        const res = await fetch(localBlobUrl);
        if (res.ok) blob = await res.blob();
      }

      // 2. If it's a Supabase storage URL, download directly via Supabase SDK
      if (!blob && targetUrl) {
        const m = targetUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/);
        if (m) {
          const bucket = m[1];
          const path = decodeURIComponent(m[2]);
          const { data: sbBlob, error: sbErr } = await supabase.storage.from(bucket).download(path);
          if (!sbErr && sbBlob) {
            blob = sbBlob;
          }
        }
      }

      // 3. Fallback to standard fetch
      if (!blob && targetUrl) {
        const resp = await fetch(targetUrl);
        if (resp.ok) {
          blob = await resp.blob();
        }
      }

      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = displayName || (isPdf ? 'document.pdf' : 'download');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
        toast.success(bn ? 'ডাউনলোড সম্পন্ন হয়েছে!' : 'Downloaded successfully!');
        return;
      }

      // 4. Extreme fallback
      if (targetUrl) {
        const a = document.createElement('a');
        a.href = targetUrl;
        a.download = displayName || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(bn ? 'ডাউনলোড করতে সমস্যা হয়েছে' : 'Download failed');
    } finally {
      setDownloading(false);
    }
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
              {/* Zoom / Rotate controls (Active only for images) */}
              {!isPdf && resolvedUrl && !loading && (
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
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-xs text-primary underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  {bn ? 'সরাসরি ডাউনলোড করুন' : 'Download directly'}
                </button>
              )}
            </div>
          ) : isPdf ? (
            localBlobUrl ? (
              <iframe
                src={`${localBlobUrl}#toolbar=1&navpanes=0`}
                className="w-full flex-1 min-h-[500px] border-0 rounded-lg bg-background"
                title={displayName}
              />
            ) : cloudinaryPdfImageUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
                <img
                  src={cloudinaryPdfImageUrl}
                  alt={displayName}
                  className="max-w-full max-h-[62vh] object-contain rounded-lg shadow-sm border border-border/30 bg-white"
                />
              </div>
            ) : (
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(resolvedUrl)}&embedded=true`}
                className="w-full flex-1 min-h-[500px] border-0 rounded-lg bg-background"
                title={displayName}
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={localBlobUrl || resolvedUrl}
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
              disabled={(!resolvedUrl && !localBlobUrl) || loading}
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
              disabled={(!resolvedUrl && !localBlobUrl) || loading || downloading}
              className="gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloading ? (bn ? 'ডাউনলোড হচ্ছে...' : 'Downloading...') : (bn ? 'ডাউনলোড' : 'Download')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const target = localBlobUrl || resolvedUrl;
                if (target) window.open(target, '_blank', 'noopener,noreferrer');
              }}
              disabled={(!resolvedUrl && !localBlobUrl) || loading}
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
