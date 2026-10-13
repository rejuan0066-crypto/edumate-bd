import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import SecureImage from "@/components/SecureImage";
import { getSecureUrl } from "@/lib/secureStorage";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Props {
  committeeId: string;
  committeeName?: string;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif";

const fmtSize = (n: number | null | undefined) => {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const iconFor = (mime: string | null) => {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("text"))
    return FileText;
  return FileIcon;
};

export default function CommitteeAttachments({ committeeId, committeeName }: Props) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["committee-attachments", committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_attachments" as any)
        .select("*")
        .eq("committee_id", committeeId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) {
        throw new Error(bn ? "ফাইল ২০MB এর বেশি" : "File exceeds 20MB");
      }
      setUploading(true);
      let fileUrl = '';
      let storagePath = '';

      try {
        const res = await uploadToCloudinary(file, { folder: `committee/${committeeId}` });
        fileUrl = res.secure_url;
        storagePath = res.public_id;
      } catch (cErr) {
        console.warn("Cloudinary upload failed, falling back to Supabase:", cErr);
        const ext = file.name.split(".").pop() || "bin";
        const path = `${committeeId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("committee-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        fileUrl = `committee-attachments/${path}`;
        storagePath = path;
      }

      const { data: userData } = await supabase.auth.getUser();
      const { error: insErr } = await supabase
        .from("committee_attachments" as any)
        .insert({
          committee_id: committeeId,
          file_name: file.name,
          file_url: fileUrl,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type || null,
          description: description || null,
          uploaded_by: userData.user?.id || null,
          uploaded_by_email: userData.user?.email || null,
        });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-attachments", committeeId] });
      setDescription("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success(bn ? "আপলোড হয়েছে" : "Uploaded");
    },
    onError: (e: any) => toast.error(e.message),
    onSettled: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: async (att: any) => {
      // Soft delete row + remove from storage
      await supabase
        .from("committee_attachments" as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", att.id);
      if (att.storage_path) {
        await supabase.storage
          .from("committee-attachments")
          .remove([att.storage_path]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-attachments", committeeId] });
      toast.success(bn ? "মুছে ফেলা হয়েছে" : "Removed");
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    uploadMutation.mutate(f);
  };

  return (
    <Card className="p-4 rounded-[20px] bg-card/60 border-border/50 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            {bn ? "ফাইল ও সংযুক্তি" : "Files & Attachments"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {bn
              ? "মিটিং মিনিট, গঠন আদেশ, ছবি ইত্যাদি (সর্বোচ্চ ২০MB)"
              : "Meeting minutes, formation orders, photos etc. (max 20MB)"}
          </div>
        </div>
      </div>

      {/* Upload row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder={bn ? "বিবরণ (ঐচ্ছিক)" : "Description (optional)"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1"
        />
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={handlePick}
          className="hidden"
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !committeeId}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {bn ? "আপলোড" : "Upload"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-3 text-center">
          {bn ? "লোড হচ্ছে..." : "Loading..."}
        </div>
      ) : files.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-xl">
          {bn ? "কোনো ফাইল নেই" : "No files yet"}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f: any) => {
            const Icon = iconFor(f.mime_type);
            const isImg = f.mime_type?.startsWith("image/");
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 border border-border/30"
              >
                {isImg ? (
                  <SecureImage
                    src={f.storage_path ? `committee-attachments/${f.storage_path}` : f.file_url}
                    alt={f.file_name}
                    className="w-10 h-10 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.file_name}</div>
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                    <span>{fmtSize(f.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(f.created_at), "dd/MM/yyyy")}</span>
                    {f.uploaded_by_email && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[140px]">
                          {f.uploaded_by_email}
                        </span>
                      </>
                    )}
                  </div>
                  {f.description && (
                    <div className="text-[11px] text-muted-foreground italic truncate">
                      {f.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    const ref = f.storage_path
                      ? `committee-attachments/${f.storage_path}`
                      : f.file_url;
                    const url = await getSecureUrl(ref);
                    if (!url) {
                      toast.error(bn ? "ফাইল লোড করা যায়নি" : "Could not load file");
                      return;
                    }
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  title={bn ? "ডাউনলোড" : "Download"}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setToDelete(f)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                  title={bn ? "মুছুন" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete)}
        description={
          bn
            ? `"${toDelete?.file_name}" ফাইলটি মুছে ফেলা হবে।`
            : `File "${toDelete?.file_name}" will be removed.`
        }
      />
    </Card>
  );
}
