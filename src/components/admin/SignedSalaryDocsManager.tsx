import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Camera,
  Upload,
  FileCheck2,
  FileText,
  Eye,
  Trash2,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  FileUp,
} from 'lucide-react';
import { toast } from 'sonner';

export interface SignedSlipMetadata {
  url: string;
  storage_path?: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
  notes?: string;
}

export interface MonthlySignedDocs {
  master_sheet?: SignedSlipMetadata | null;
  staff_slips?: Record<string, SignedSlipMetadata>;
}

const STORAGE_BUCKET = 'website-assets';

// Helper: compress image client-side before upload to conserve storage & speed up mobile upload
async function compressImageFile(file: File, maxDim = 1920, quality = 0.85): Promise<{ blob: Blob; contentType: string }> {
  if (!file.type.startsWith('image/')) {
    return { blob: file, contentType: file.type || 'application/octet-stream' };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, contentType: 'image/jpeg' });
                return;
              }
              resolve({ blob: file, contentType: file.type });
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve({ blob: file, contentType: file.type });
        }
      };
      img.onerror = () => resolve({ blob: file, contentType: file.type });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ blob: file, contentType: file.type });
    reader.readAsDataURL(file);
  });
}

/**
 * Custom hook to manage signed salary documents for a specific month
 */
export function useSignedSalaryDocs(monthYear: string) {
  const queryClient = useQueryClient();
  const queryKey = ['signed-salary-docs', monthYear];

  const { data: docs = { staff_slips: {} }, isLoading } = useQuery<MonthlySignedDocs>({
    queryKey,
    queryFn: async () => {
      const key = `signed_salary_slips_${monthYear}`;
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load signed salary docs:', error);
        return { staff_slips: {} };
      }
      const val = (data?.value as MonthlySignedDocs) || { staff_slips: {} };
      return {
        master_sheet: val.master_sheet || null,
        staff_slips: val.staff_slips || {},
      };
    },
    staleTime: 60000,
  });

  // Upload or replace a staff member's signed slip
  const uploadStaffSlipMutation = useMutation({
    mutationFn: async ({
      staffId,
      staffName,
      file,
      notes,
    }: {
      staffId: string;
      staffName?: string;
      file: File;
      notes?: string;
    }) => {
      const key = `signed_salary_slips_${monthYear}`;
      const fileExt = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
      const safeStaffId = staffId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const path = `salary-signed-slips/${monthYear}/${safeStaffId}_${Date.now()}.${fileExt}`;

      // Compress if image
      const { blob, contentType } = await compressImageFile(file);

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, {
          upsert: true,
          contentType,
        });

      if (upErr) throw upErr;

      const { data: pubUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const metadata: SignedSlipMetadata = {
        url: pubUrlData.publicUrl,
        storage_path: path,
        file_name: file.name,
        file_type: contentType,
        file_size: blob.size,
        uploaded_at: new Date().toISOString(),
        notes: notes || undefined,
      };

      // Get latest state
      const { data: currentWs } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      const existingDocs: MonthlySignedDocs = (currentWs?.value as any) || { staff_slips: {} };
      const updatedSlips = { ...(existingDocs.staff_slips || {}) };
      updatedSlips[staffId] = metadata;

      const payload: MonthlySignedDocs = {
        master_sheet: existingDocs.master_sheet || null,
        staff_slips: updatedSlips,
      };

      const { error: saveErr } = await supabase.from('website_settings').upsert(
        {
          key,
          value: payload as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (saveErr) throw saveErr;
      return { metadata, staffName };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(res.staffName ? `${res.staffName}-এর স্বাক্ষরিত স্লিপ সংরক্ষিত হয়েছে!` : 'স্বাক্ষরিত স্লিপ সংরক্ষিত হয়েছে!');
    },
    onError: (err: any) => {
      console.error('Failed to upload signed slip:', err);
      toast.error('স্বাক্ষরিত স্লিপ আপলোড ব্যর্থ হয়েছে', { description: err.message });
    },
  });

  // Delete a staff member's signed slip
  const deleteStaffSlipMutation = useMutation({
    mutationFn: async ({ staffId, storagePath }: { staffId: string; storagePath?: string }) => {
      const key = `signed_salary_slips_${monthYear}`;

      if (storagePath) {
        try {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        } catch (e) {
          console.warn('Storage delete warning:', e);
        }
      }

      const { data: currentWs } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      const existingDocs: MonthlySignedDocs = (currentWs?.value as any) || { staff_slips: {} };
      const updatedSlips = { ...(existingDocs.staff_slips || {}) };
      delete updatedSlips[staffId];

      const payload: MonthlySignedDocs = {
        master_sheet: existingDocs.master_sheet || null,
        staff_slips: updatedSlips,
      };

      const { error: saveErr } = await supabase.from('website_settings').upsert(
        {
          key,
          value: payload as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (saveErr) throw saveErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('স্বাক্ষরিত স্লিপ মুছে ফেলা হয়েছে');
    },
    onError: (err: any) => {
      toast.error('মুছতে সমস্যা হয়েছে', { description: err.message });
    },
  });

  // Upload or replace the monthly master signed sheet
  const uploadMasterSheetMutation = useMutation({
    mutationFn: async ({ file, notes }: { file: File; notes?: string }) => {
      const key = `signed_salary_slips_${monthYear}`;
      const fileExt = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg');
      const path = `salary-signed-slips/${monthYear}/master_sheet_${Date.now()}.${fileExt}`;

      const { blob, contentType } = await compressImageFile(file);

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, {
          upsert: true,
          contentType,
        });

      if (upErr) throw upErr;

      const { data: pubUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const metadata: SignedSlipMetadata = {
        url: pubUrlData.publicUrl,
        storage_path: path,
        file_name: file.name,
        file_type: contentType,
        file_size: blob.size,
        uploaded_at: new Date().toISOString(),
        notes: notes || undefined,
      };

      const { data: currentWs } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      const existingDocs: MonthlySignedDocs = (currentWs?.value as any) || { staff_slips: {} };
      const payload: MonthlySignedDocs = {
        master_sheet: metadata,
        staff_slips: existingDocs.staff_slips || {},
      };

      const { error: saveErr } = await supabase.from('website_settings').upsert(
        {
          key,
          value: payload as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (saveErr) throw saveErr;
      return metadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('মাসিক মূল স্বাক্ষরিত শীট সংরক্ষিত হয়েছে!');
    },
    onError: (err: any) => {
      toast.error('মূল শীট আপলোড ব্যর্থ হয়েছে', { description: err.message });
    },
  });

  // Delete monthly master signed sheet
  const deleteMasterSheetMutation = useMutation({
    mutationFn: async ({ storagePath }: { storagePath?: string }) => {
      const key = `signed_salary_slips_${monthYear}`;

      if (storagePath) {
        try {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        } catch (e) {
          console.warn('Storage delete warning:', e);
        }
      }

      const { data: currentWs } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      const existingDocs: MonthlySignedDocs = (currentWs?.value as any) || { staff_slips: {} };
      const payload: MonthlySignedDocs = {
        master_sheet: null,
        staff_slips: existingDocs.staff_slips || {},
      };

      const { error: saveErr } = await supabase.from('website_settings').upsert(
        {
          key,
          value: payload as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (saveErr) throw saveErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('মূল স্বাক্ষরিত শীট মুছে ফেলা হয়েছে');
    },
    onError: (err: any) => {
      toast.error('মুছতে সমস্যা হয়েছে', { description: err.message });
    },
  });

  return {
    docs,
    staffSlips: docs.staff_slips || {},
    masterSheet: docs.master_sheet || null,
    signedCount: Object.keys(docs.staff_slips || {}).length,
    isLoading,
    getStaffSlip: (staffId: string) => docs.staff_slips?.[staffId],
    uploadStaffSlip: uploadStaffSlipMutation.mutateAsync,
    isUploadingStaffSlip: uploadStaffSlipMutation.isPending,
    deleteStaffSlip: deleteStaffSlipMutation.mutateAsync,
    isDeletingStaffSlip: deleteStaffSlipMutation.isPending,
    uploadMasterSheet: uploadMasterSheetMutation.mutateAsync,
    isUploadingMasterSheet: uploadMasterSheetMutation.isPending,
    deleteMasterSheet: deleteMasterSheetMutation.mutateAsync,
    isDeletingMasterSheet: deleteMasterSheetMutation.isPending,
  };
}

/**
 * Upload Dialog: for capturing or picking a signed slip file
 */
export function SignedSlipUploadDialog({
  open,
  onOpenChange,
  staff,
  monthLabel,
  existingSlip,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: { id: string; name_bn?: string; name_en?: string; designation?: string };
  monthLabel: string;
  existingSlip?: SignedSlipMetadata | null;
  onSave: (file: File, notes?: string) => Promise<any>;
  isSaving: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setNotes('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('শুধুমাত্র ছবি (JPG, PNG) অথবা PDF ফাইল আপলোড করা যাবে');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('ফাইলের সাইজ ১৫MB এর কম হতে হবে');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('অনুগ্রহ করে একটি ছবি বা PDF ফাইল নির্বাচন করুন');
      return;
    }
    try {
      await onSave(selectedFile, notes);
      resetState();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const staffDisplayName = staff.name_bn || staff.name_en || 'স্টাফ';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 grid place-items-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                স্বাক্ষরিত বেতন স্লিপ আপলোড / স্ক্যান
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {staffDisplayName} • {monthLabel}
              </p>
            </div>
          </div>
        </DialogHeader>

        {existingSlip && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold">পূর্ববর্তী স্বাক্ষরিত স্লিপ সংরক্ষিত আছে।</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                নতুন ফাইল আপলোড করলে আগেরটি প্রতিস্থাপিত (Replace) হবে।
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 my-2">
          {/* File Picker Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed border-2 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-6 w-6 text-emerald-600" />
              <span className="text-xs font-semibold text-foreground">ক্যামেরা দিয়ে ছবি তুলুন</span>
              <span className="text-[10px] text-muted-foreground">মোবাইল থেকে সরাসরি</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed border-2 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-blue-600" />
              <span className="text-xs font-semibold text-foreground">ফাইল / গ্যালারি</span>
              <span className="text-[10px] text-muted-foreground">ছবি বা PDF আপলোড</span>
            </Button>
          </div>

          {/* Selected File Preview Box */}
          {selectedFile && (
            <div className="p-3 bg-muted/60 border rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium truncate max-w-[220px]">{selectedFile.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </Badge>
              </div>

              {previewUrl && (
                <div className="max-h-56 overflow-hidden rounded-lg border bg-black/5 flex justify-center">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-56 object-contain rounded-lg"
                  />
                </div>
              )}

              {selectedFile.type === 'application/pdf' && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center gap-2 text-red-700 dark:text-red-300">
                  <FileText className="h-6 w-6" />
                  <span className="text-xs font-medium">PDF ডকুমেন্ট সিলেক্ট করা হয়েছে</span>
                </div>
              )}
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">নোট / মন্তব্য (ঐচ্ছিক)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: হিসাবরক্ষক ও প্রিন্সিপালের স্বাক্ষরযুক্ত..."
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { resetState(); onOpenChange(false); }}
            disabled={isSaving}
          >
            বাতিল
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            onClick={handleSubmit}
            disabled={!selectedFile || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                সংরক্ষণ হচ্ছে…
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" />
                সংরক্ষণ করুন
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Viewer Dialog: for viewing high-res signed slip, zoom, download, replace, delete
 */
export function SignedSlipViewerDialog({
  open,
  onOpenChange,
  staff,
  monthLabel,
  slip,
  onReplace,
  onDelete,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: { id: string; name_bn?: string; name_en?: string; designation?: string };
  monthLabel: string;
  slip: SignedSlipMetadata | null;
  onReplace?: () => void;
  onDelete?: () => Promise<any>;
  isDeleting?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!slip) return null;

  const isPdf = slip.file_type === 'application/pdf' || slip.url.toLowerCase().endsWith('.pdf');
  const staffDisplayName = staff?.name_bn || staff?.name_en || 'স্টাফ';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = slip.url;
    a.target = '_blank';
    a.download = slip.file_name || `signed-slip-${monthLabel}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const formattedDate = new Date(slip.uploaded_at).toLocaleString('bn-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 grid place-items-center flex-shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-white truncate">
                স্বাক্ষরিত বেতন স্লিপ: {staffDisplayName}
              </DialogTitle>
              <p className="text-[11px] text-emerald-200/80 truncate">
                {monthLabel} • আপলোড: {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ডাউনলোড</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1"
              onClick={() => window.open(slip.url, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">নতুন ট্যাবে</span>
            </Button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 bg-slate-950/90 relative overflow-auto p-4 flex items-center justify-center min-h-[350px] max-h-[65vh]">
          {isPdf ? (
            <iframe
              src={slip.url}
              title="Signed Salary Slip PDF"
              className="w-full h-full min-h-[500px] rounded-lg border bg-white"
            />
          ) : (
            <div className="relative overflow-auto max-w-full max-h-full flex items-center justify-center">
              <img
                src={slip.url}
                alt="Signed Slip"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease',
                }}
                className="max-h-[60vh] max-w-full object-contain rounded shadow-2xl"
              />
            </div>
          )}

          {/* Floating Controls for Image */}
          {!isPdf && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur text-white px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="hover:text-emerald-400 p-1"
                title="জুম আউট"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-mono px-1">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="hover:text-emerald-400 p-1"
                title="জুম ইন"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="w-px h-3 bg-white/20" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="hover:text-emerald-400 p-1"
                title="ঘোরান (Rotate)"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setZoom(1); setRotation(0); }}
                className="text-[10px] text-slate-300 hover:text-white px-1"
              >
                রিসেট
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t bg-background flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs gap-1.5"
                disabled={isDeleting}
                onClick={async () => {
                  if (confirm('আপনি কি নিশ্চিত যে এই স্বাক্ষরিত স্লিপটি মুছে ফেলতে চান?')) {
                    await onDelete();
                    onOpenChange(false);
                  }
                }}
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                মুছে ফেলুন
              </Button>
            )}
            {onReplace && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5 hover:border-emerald-500 hover:text-emerald-700"
                onClick={() => {
                  onOpenChange(false);
                  onReplace();
                }}
              >
                <FileUp className="h-3.5 w-3.5 text-emerald-600" />
                নতুন ফাইল আপলোড
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="default"
            onClick={() => onOpenChange(false)}
          >
            বন্ধ করুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Signed Documents Vault / Hub Dialog:
 * Manage whole month's Master Sheet + All Staff Signed Slips in one place
 */
export function SignedSalaryDocsHubDialog({
  open,
  onOpenChange,
  monthYear,
  monthLabel,
  staffList,
  manager,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthYear: string;
  monthLabel: string;
  staffList: any[];
  manager: ReturnType<typeof useSignedSalaryDocs>;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'missing'>('all');
  const [uploadTargetStaff, setUploadTargetStaff] = useState<any | null>(null);
  const [viewTargetStaff, setViewTargetStaff] = useState<any | null>(null);
  const [masterViewerOpen, setMasterViewerOpen] = useState(false);
  const [masterUploadOpen, setMasterUploadOpen] = useState(false);

  const { staffSlips, masterSheet, uploadStaffSlip, isUploadingStaffSlip, deleteStaffSlip, isDeletingStaffSlip, uploadMasterSheet, isUploadingMasterSheet, deleteMasterSheet, isDeletingMasterSheet } = manager;

  const totalStaff = staffList.length;
  const uploadedCount = useMemo(() => {
    return staffList.filter((s) => !!staffSlips[s.id]).length;
  }, [staffList, staffSlips]);
  const missingCount = totalStaff - uploadedCount;

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const name = (s.name_bn || s.name_en || '').toLowerCase();
      const staffId = (s.staff_id || '').toLowerCase();
      const q = search.toLowerCase();
      if (q && !name.includes(q) && !staffId.includes(q)) return false;

      const hasSlip = !!staffSlips[s.id];
      if (filter === 'uploaded' && !hasSlip) return false;
      if (filter === 'missing' && hasSlip) return false;
      return true;
    });
  }, [staffList, staffSlips, search, filter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="p-5 border-b bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-400 text-emerald-950 grid place-items-center font-bold shadow-md">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-white">
                    স্বাক্ষরিত স্যালারি ডকুমেন্টস ভল্ট (Vault)
                  </DialogTitle>
                  <p className="text-xs text-emerald-200/80">
                    {monthLabel} • স্ক্যান ও আপলোডকৃত ফিজিক্যাল কপি সংরক্ষণ
                  </p>
                </div>
              </div>

              {/* Stat Badges */}
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-1">
                  সংরক্ষিত: {uploadedCount} জন
                </Badge>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs py-1">
                  বাকি: {missingCount} জন
                </Badge>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/30">
            {/* 1. Master Sheet Card */}
            <div className="p-4 bg-white dark:bg-card border rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 grid place-items-center">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">পুরো মাসের মূল স্বাক্ষরিত স্যালারি শীট (Master Sheet)</h4>
                    <p className="text-[11px] text-muted-foreground">
                      সব কর্মকর্তার স্বাক্ষরযুক্ত মাসিক ফুল মাস্টার কপি স্ক্যান করে সংরক্ষণ করুন
                    </p>
                  </div>
                </div>

                {masterSheet ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1 text-xs py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> মূল শীট সংরক্ষিত
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => setMasterViewerOpen(true)}
                    >
                      <Eye className="h-3.5 w-3.5 text-emerald-600" /> দেখুন
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 hover:border-emerald-500"
                      onClick={() => setMasterUploadOpen(true)}
                    >
                      <FileUp className="h-3.5 w-3.5 text-teal-600" /> পরিবর্তন
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 h-8 font-semibold shadow-sm"
                    onClick={() => setMasterUploadOpen(true)}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    মূল শীট আপলোড / স্ক্যান করুন
                  </Button>
                )}
              </div>
            </div>

            {/* 2. Staff Slips Section */}
            <div className="p-4 bg-white dark:bg-card border rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold">ব্যক্তিগত স্টাফ বেতন স্লিপ তালিকা</h4>
                  <p className="text-[11px] text-muted-foreground">
                    প্রতিটি স্টাফের জন্য স্বাক্ষরযুক্ত পৃথক স্লিপ স্ক্যান বা ছবি আপলোড করুন
                  </p>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-44">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="নাম বা আইডি..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
                    <TabsList className="h-8 p-0.5 text-xs">
                      <TabsTrigger value="all" className="text-xs px-2.5 h-7">সব ({totalStaff})</TabsTrigger>
                      <TabsTrigger value="uploaded" className="text-xs px-2.5 h-7 text-emerald-700 dark:text-emerald-400">
                        সংরক্ষিত ({uploadedCount})
                      </TabsTrigger>
                      <TabsTrigger value="missing" className="text-xs px-2.5 h-7 text-amber-600">
                        বাকি ({missingCount})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Staff List Table */}
              <div className="border rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground sticky top-0 border-b">
                    <tr>
                      <th className="p-2.5 font-medium">#</th>
                      <th className="p-2.5 font-medium">স্টাফের নাম</th>
                      <th className="p-2.5 font-medium">পদবি</th>
                      <th className="p-2.5 font-medium text-center">স্ট্যাটাস</th>
                      <th className="p-2.5 font-medium text-center">তারিখ</th>
                      <th className="p-2.5 font-medium text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          কোনো স্টাফ পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((s, idx) => {
                        const slip = staffSlips[s.id];
                        return (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 text-muted-foreground">{idx + 1}</td>
                            <td className="p-2.5">
                              <p className="font-semibold text-foreground">{s.name_bn || s.name_en}</p>
                              <span className="text-[10px] text-muted-foreground font-mono">{s.staff_id || '-'}</span>
                            </td>
                            <td className="p-2.5 text-muted-foreground">{s.designation || '-'}</td>
                            <td className="p-2.5 text-center">
                              {slip ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium text-[10px] py-0 px-2">
                                  ✓ সংরক্ষিত
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-[10px] py-0 px-2">
                                  বাকি আছে
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-center text-[10px] text-muted-foreground">
                              {slip ? new Date(slip.uploaded_at).toLocaleDateString('bn-BD', { dateStyle: 'short' }) : '—'}
                            </td>
                            <td className="p-2.5 text-right">
                              {slip ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[11px] gap-1 hover:border-emerald-500 hover:text-emerald-700"
                                    onClick={() => setViewTargetStaff(s)}
                                  >
                                    <Eye className="h-3 w-3 text-emerald-600" />
                                    দেখুন
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-700"
                                    title="পুনরায় আপলোড"
                                    onClick={() => setUploadTargetStaff(s)}
                                  >
                                    <FileUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                                    title="মুছে ফেলুন"
                                    onClick={async () => {
                                      if (confirm(`${s.name_bn || s.name_en}-এর সংরক্ষিত স্লিপটি মুছে ফেলবেন?`)) {
                                        await deleteStaffSlip({ staffId: s.id, storagePath: slip.storage_path });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1"
                                  onClick={() => setUploadTargetStaff(s)}
                                >
                                  <Camera className="h-3 w-3" />
                                  আপলোড / স্ক্যান
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t bg-background flex justify-end">
            <Button variant="default" onClick={() => onOpenChange(false)}>
              সম্পন্ন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Upload Dialog */}
      {uploadTargetStaff && (
        <SignedSlipUploadDialog
          open={!!uploadTargetStaff}
          onOpenChange={(o) => { if (!o) setUploadTargetStaff(null); }}
          staff={uploadTargetStaff}
          monthLabel={monthLabel}
          existingSlip={staffSlips[uploadTargetStaff.id]}
          onSave={async (file, notes) => {
            await uploadStaffSlip({
              staffId: uploadTargetStaff.id,
              staffName: uploadTargetStaff.name_bn || uploadTargetStaff.name_en,
              file,
              notes,
            });
          }}
          isSaving={isUploadingStaffSlip}
        />
      )}

      {/* Staff Viewer Dialog */}
      {viewTargetStaff && (
        <SignedSlipViewerDialog
          open={!!viewTargetStaff}
          onOpenChange={(o) => { if (!o) setViewTargetStaff(null); }}
          staff={viewTargetStaff}
          monthLabel={monthLabel}
          slip={staffSlips[viewTargetStaff.id] || null}
          onReplace={() => {
            const target = viewTargetStaff;
            setViewTargetStaff(null);
            setUploadTargetStaff(target);
          }}
          onDelete={async () => {
            const s = viewTargetStaff;
            const slip = staffSlips[s.id];
            await deleteStaffSlip({ staffId: s.id, storagePath: slip?.storage_path });
            setViewTargetStaff(null);
          }}
          isDeleting={isDeletingStaffSlip}
        />
      )}

      {/* Master Sheet Viewer */}
      {masterSheet && (
        <SignedSlipViewerDialog
          open={masterViewerOpen}
          onOpenChange={setMasterViewerOpen}
          staff={{ id: 'master', name_bn: 'মাসিক মূল স্যালারি শীট', name_en: 'Monthly Master Sheet' }}
          monthLabel={monthLabel}
          slip={masterSheet}
          onReplace={() => {
            setMasterViewerOpen(false);
            setMasterUploadOpen(true);
          }}
          onDelete={async () => {
            await deleteMasterSheet({ storagePath: masterSheet?.storage_path });
            setMasterViewerOpen(false);
          }}
          isDeleting={isDeletingMasterSheet}
        />
      )}

      {/* Master Sheet Upload Dialog */}
      <SignedSlipUploadDialog
        open={masterUploadOpen}
        onOpenChange={setMasterUploadOpen}
        staff={{ id: 'master', name_bn: 'মাসিক মূল স্যালারি শীট', name_en: 'Monthly Master Sheet' }}
        monthLabel={monthLabel}
        existingSlip={masterSheet}
        onSave={async (file, notes) => {
          await uploadMasterSheet({ file, notes });
        }}
        isSaving={isUploadingMasterSheet}
      />
    </>
  );
}
