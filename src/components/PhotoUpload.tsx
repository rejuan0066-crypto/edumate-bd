import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SecureImage from '@/components/SecureImage';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_SIZE = 300 * 1024; // 300KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['JPG', 'PNG', 'WEBP'];

interface PhotoUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PhotoUpload = ({ value, onChange, folder = 'general', className, size = 'md' }: PhotoUploadProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-24 h-28',
    md: 'w-32 h-40',
    lg: 'w-40 h-48',
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return bn ? `শুধু ${ALLOWED_EXT.join(', ')} ফরম্যাট অনুমোদিত` : `Only ${ALLOWED_EXT.join(', ')} formats allowed`;
    }
    if (file.size > MAX_SIZE) {
      const sizeKB = Math.round(file.size / 1024);
      return bn ? `ফাইল সাইজ ${sizeKB}KB — সর্বোচ্চ 300KB অনুমোদিত` : `File size ${sizeKB}KB — max 300KB allowed`;
    }
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const res = await uploadToCloudinary(file, { folder: `photos/${folder}` });
      onChange(res.secure_url);
      setPreview(null);
      toast.success(bn ? 'ফটো আপলোড সফল' : 'Photo uploaded');
    } catch (cErr) {
      console.warn('Cloudinary photo upload failed, falling back to Supabase:', cErr);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Store as "<bucket>/<path>" so SecureImage / useSecureUrl can resolve a
        // short-lived signed URL on demand. Avoids getPublicUrl on a private bucket.
        const storageRef = `photos/${fileName}`;

        onChange(storageRef);
        setPreview(null);
        toast.success(bn ? 'ফটো আপলোড সফল' : 'Photo uploaded');
      } catch (err: any) {
        setError(bn ? 'আপলোড ব্যর্থ' : 'Upload failed');
        toast.error(err.message || 'Upload failed');
        setPreview(null);
      }
    } finally {
      setUploading(false);
    }
  }, [folder, onChange, bn]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
    setError(null);
  };

  const displayUrl = preview || value;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          sizeClasses[size],
          'relative border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group',
          dragOver ? 'border-primary bg-primary/10 scale-105' : 'border-primary/40 hover:border-primary',
          error && 'border-destructive/60',
          uploading && 'pointer-events-none opacity-70'
        )}
      >
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {displayUrl ? (
          <>
            {preview ? (
              <img src={preview} alt="Photo" className="w-full h-full object-cover" />
            ) : (
              <SecureImage src={displayUrl} alt="Photo" className="w-full h-full object-cover" />
            )}
            {!uploading && (
              <button
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            {dragOver ? (
              <Upload className="w-8 h-8 text-primary animate-bounce" />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground leading-tight">
              {bn ? 'ছবি আপলোড' : 'Upload Photo'}
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 max-w-[10rem] text-center leading-tight">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground text-center leading-tight">
        {bn ? 'JPG/PNG/WEBP • সর্বোচ্চ 300KB' : 'JPG/PNG/WEBP • Max 300KB'}
      </p>
    </div>
  );
};

export default PhotoUpload;
