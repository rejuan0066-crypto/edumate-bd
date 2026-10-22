import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Eye, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useLanguage } from '@/contexts/LanguageContext';
import { isPdfUrl } from '@/lib/secureStorage';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

interface FileUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  value,
  onChange,
  folder = 'documents',
  label,
  accept = '.jpg,.jpeg,.png,.webp,.pdf',
  maxSizeMB = 5,
  className = '',
  disabled = false,
}) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleUpload = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(bn ? `ফাইলের আকার সর্বোচ্চ ${maxSizeMB}MB হতে পারে` : `Max file size is ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // 1. Try Cloudinary
      const res = await uploadToCloudinary(file, { folder });
      onChange(res.secure_url);
      toast.success(bn ? 'ফাইল সফলভাবে আপলোড হয়েছে' : 'File uploaded successfully');
    } catch (cErr) {
      console.warn('Cloudinary upload failed, falling back to Supabase:', cErr);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        const userPrefix = user?.id || 'public-uploads';
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const cleanName = `${userPrefix}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: sbErr } = await supabase.storage
          .from('photos')
          .upload(cleanName, file, { upsert: false });

        if (sbErr) throw sbErr;

        const { data: pubData } = supabase.storage.from('photos').getPublicUrl(cleanName);
        const finalUrl = pubData?.publicUrl || `photos/${cleanName}`;
        onChange(finalUrl);
        toast.success(bn ? 'ফাইল সফলভাবে আপলোড হয়েছে' : 'File uploaded successfully');
      } catch (sbErr: any) {
        console.error('All upload attempts failed:', sbErr);
        toast.error(bn ? 'ফাইল আপলোড ব্যর্থ হয়েছে' : 'Failed to upload file');
        onChange(null);
        setFileName('');
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const isPdf = isPdfUrl(value) || (fileName && isPdfUrl(fileName));
  const fileDisplayName = fileName || (value ? value.split('/').pop()?.split('?')[0] : '');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <p className="text-xs font-semibold text-foreground">{label}</p>}

      {value ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {isPdf ? <FileText className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                {fileDisplayName || (isPdf ? (bn ? 'পিডিএফ ডকুমেন্ট' : 'PDF Document') : (bn ? 'আপলোডকৃত ফাইল' : 'Uploaded File'))}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {bn ? 'সংযুক্ত হয়েছে' : 'Attached'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="h-8 px-2.5 text-xs gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
              title={bn ? 'প্রিভিউ দেখুন' : 'Preview'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{bn ? 'দেখুন' : 'View'}</span>
            </Button>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onChange(null);
                  setFileName('');
                }}
                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                title={bn ? 'মুছুন' : 'Remove'}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
            dragOver ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border/60 hover:border-primary/60 hover:bg-muted/30'
          } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-primary py-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-semibold">{bn ? 'আপলোড হচ্ছে...' : 'Uploading...'}</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-medium text-foreground">
                {bn ? 'ফাইল সিলেক্ট করুন বা ড্র্যাগ করে ছাড়ুন' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                PDF, JPG, PNG, WEBP • {bn ? `সর্বোচ্চ ${maxSizeMB}MB` : `Max ${maxSizeMB}MB`}
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />
        </div>
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileUrl={value}
        fileName={fileDisplayName}
        title={label || (bn ? 'ডকুমেন্ট প্রিভিউ' : 'Document Preview')}
      />
    </div>
  );
};

export default FileUploadField;
