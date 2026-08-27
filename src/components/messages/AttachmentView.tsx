import { useEffect, useState } from "react";
import { getSecureUrl } from "@/lib/secureStorage";
import { FileText, Download, Loader2 } from "lucide-react";
import type { ChatAttachment } from "@/hooks/useMessaging";

function formatSize(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AttachmentView = ({ attachment }: { attachment: ChatAttachment }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isImage = (attachment.mime || "").startsWith("image/");

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSecureUrl(`chat-attachments/${attachment.path}`)
      .then((u) => {
        if (active) setUrl(u);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attachment.path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs opacity-70 py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> লোড হচ্ছে…
      </div>
    );
  }

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-1">
        <img
          src={url}
          alt={attachment.name}
          loading="lazy"
          className="max-h-56 rounded-[18px] border border-border/50 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex items-center gap-2 rounded-[18px] border border-border/50 bg-background/40 px-3 py-2 backdrop-blur transition hover:-translate-y-[2px]"
    >
      <FileText className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-xs">{attachment.name}</span>
      <span className="text-[10px] opacity-70">{formatSize(attachment.size)}</span>
      <Download className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
};

export default AttachmentView;
