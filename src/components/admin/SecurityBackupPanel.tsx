import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Download, Loader2, RefreshCw, ShieldCheck, FileLock2, History } from "lucide-react";
import { format } from "date-fns";
import { DataSensitivityMap } from "./DataSensitivityMap";

interface BackupRow {
  id: string;
  backup_type: string;
  status: string;
  storage_path: string | null;
  file_size_bytes: number | null;
  table_count: number | null;
  row_count: number | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const formatBytes = (b: number | null) => {
  if (!b) return "-";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export function SecurityBackupPanel({ bn = true }: { bn?: boolean }) {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [b, a] = await Promise.all([
      supabase.from("backup_history").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("system_logs")
        .select("id, action, table_name, record_id, description, ip_address, user_agent, created_at")
        .in("action", ["UPDATE", "DELETE", "SOFT_DELETE", "RESTORE"])
        .order("created_at", { ascending: false }).limit(30),
    ]);
    if (b.data) setBackups(b.data as BackupRow[]);
    if (a.data) setAudits(a.data as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const triggerBackup = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-db-backup", { body: {} });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Backup failed");
      toast.success(bn ? `ব্যাকআপ সফল: ${data.table_count} টেবিল, ${data.row_count} সারি` : `Backup OK: ${data.table_count} tables, ${data.row_count} rows`);
      load();
    } catch (e) {
      toast.error(bn ? "ব্যাকআপ ব্যর্থ" : "Backup failed", { description: e instanceof Error ? e.message : String(e) });
    } finally { setRunning(false); }
  };

  const downloadBackup = async (path: string) => {
    const { data, error } = await supabase.storage.from("db-backups").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error(bn ? "ডাউনলোড লিংক তৈরি ব্যর্থ" : "Cannot create download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Encryption status */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <FileLock2 className="w-5 h-5 text-emerald-600" />
          {bn ? "ডেটা এনক্রিপশন (AES-256)" : "Data Encryption (AES-256)"}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            <span>{bn ? "স্টাফ বেতন" : "Staff Salary"}</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">✓ Encrypted</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            <span>{bn ? "প্রশাসনিক বেতন" : "Admin Officer Salary"}</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">✓ Encrypted</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            <span>{bn ? "বেতন রেকর্ডস" : "Salary Records"}</span>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">✓ Encrypted</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <span>{bn ? "পাসওয়ার্ড" : "User Passwords"}</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">✓ BCrypt/scrypt</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 sm:col-span-2">
            <span>{bn ? "ডিস্ক-লেভেল এনক্রিপশন (NID, ব্যক্তিগত তথ্য)" : "Disk-level encryption (NID & personal data)"}</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">✓ AES-256 at rest</Badge>
          </div>
        </div>
      </div>

      {/* Sensitivity Map */}
      <DataSensitivityMap bn={bn} />

      {/* Backup */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            {bn ? "ডাটাবেস ব্যাকআপ" : "Database Backups"}
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={triggerBackup} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Database className="w-4 h-4 mr-1" />}
              {bn ? "এখনই ব্যাকআপ নিন" : "Backup Now"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {bn
            ? "প্রতিদিন রাত ১২টায় (BD সময়) স্বয়ংক্রিয় ব্যাকআপ। ৩০ দিন সংরক্ষিত। Lovable Cloud-এর native PITR (point-in-time recovery)-ও সক্রিয়।"
            : "Auto backup runs daily at 12:00 AM (BD). Kept for 30 days. Lovable Cloud's native PITR is also active."}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-2 font-medium">{bn ? "তারিখ" : "Date"}</th>
                <th className="text-left p-2 font-medium">{bn ? "ধরন" : "Type"}</th>
                <th className="text-left p-2 font-medium">{bn ? "অবস্থা" : "Status"}</th>
                <th className="text-right p-2 font-medium">{bn ? "টেবিল" : "Tables"}</th>
                <th className="text-right p-2 font-medium">{bn ? "সারি" : "Rows"}</th>
                <th className="text-right p-2 font-medium">{bn ? "সাইজ" : "Size"}</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground p-4">{bn ? "এখনো কোনো ব্যাকআপ নেই" : "No backups yet"}</td></tr>
              )}
              {backups.map((b) => (
                <tr key={b.id} className="border-t hover:bg-secondary/30">
                  <td className="p-2">{format(new Date(b.started_at), "dd/MM/yyyy hh:mm a")}</td>
                  <td className="p-2"><Badge variant="outline">{b.backup_type}</Badge></td>
                  <td className="p-2">
                    <Badge variant={b.status === "success" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-right tabular-nums">{b.table_count ?? "-"}</td>
                  <td className="p-2 text-right tabular-nums">{b.row_count?.toLocaleString() ?? "-"}</td>
                  <td className="p-2 text-right tabular-nums">{formatBytes(b.file_size_bytes)}</td>
                  <td className="p-2 text-right">
                    {b.storage_path && b.status === "success" && (
                      <Button size="sm" variant="ghost" onClick={() => downloadBackup(b.storage_path!)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent audit */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {bn ? "সাম্প্রতিক অডিট লগ (UPDATE / DELETE)" : "Recent Audit Log (UPDATE / DELETE)"}
          </h3>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            <ShieldCheck className="w-3 h-3 mr-1" />
            IP + User-Agent {bn ? "ট্র্যাক্ড" : "tracked"}
          </Badge>
        </div>
        <div className="overflow-x-auto rounded-lg border max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">{bn ? "সময়" : "Time"}</th>
                <th className="text-left p-2 font-medium">{bn ? "অ্যাকশন" : "Action"}</th>
                <th className="text-left p-2 font-medium">{bn ? "টেবিল" : "Table"}</th>
                <th className="text-left p-2 font-medium">{bn ? "বিবরণ" : "Description"}</th>
                <th className="text-left p-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground p-4">{bn ? "কোনো লগ পাওয়া যায়নি" : "No logs found"}</td></tr>
              )}
              {audits.map((a) => (
                <tr key={a.id} className="border-t hover:bg-secondary/30">
                  <td className="p-2 whitespace-nowrap">{format(new Date(a.created_at), "dd/MM hh:mm:ss a")}</td>
                  <td className="p-2">
                    <Badge variant={a.action === "DELETE" ? "destructive" : a.action === "SOFT_DELETE" ? "secondary" : "outline"}>
                      {a.action}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-xs">{a.table_name}</td>
                  <td className="p-2 max-w-[400px] truncate" title={a.description ?? ""}>{a.description}</td>
                  <td className="p-2 font-mono text-xs text-muted-foreground">{a.ip_address ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
