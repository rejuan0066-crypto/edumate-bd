import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Search, Database, Lock, KeyRound, Eye, RefreshCw, Loader2 } from "lucide-react";

interface ColRow {
  table_name: string;
  column_name: string;
  data_type: string;
  sensitivity: "encrypted_aes256" | "encrypted_mirror" | "hashed_bcrypt" | "sensitive_rls_only" | "non_sensitive";
  protection: string;
  notes: string | null;
}

const SENSITIVITY_META: Record<string, { label_bn: string; label_en: string; color: string; icon: typeof Lock }> = {
  encrypted_aes256:    { label_bn: "এনক্রিপ্টেড (AES-256)", label_en: "Encrypted (AES-256)", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: Lock },
  encrypted_mirror:    { label_bn: "এনক্রিপ্টেড মিরর",    label_en: "Encrypted Mirror",      color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Lock },
  hashed_bcrypt:       { label_bn: "হ্যাশড (BCrypt/scrypt)", label_en: "Hashed (BCrypt/scrypt)", color: "bg-blue-100 text-blue-700 border-blue-300", icon: KeyRound },
  sensitive_rls_only:  { label_bn: "সংবেদনশীল (RLS+ডিস্ক)", label_en: "Sensitive (RLS+Disk)", color: "bg-amber-100 text-amber-800 border-amber-300", icon: ShieldAlert },
  non_sensitive:       { label_bn: "সাধারণ",                label_en: "Non-sensitive",       color: "bg-secondary text-muted-foreground border-border", icon: Eye },
};

export function DataSensitivityMap({ bn = true }: { bn?: boolean }) {
  const [rows, setRows] = useState<ColRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [pwInfo, setPwInfo] = useState<{ table: string; column: string; algorithm: string; user_count: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cols }, { data: pw }] = await Promise.all([
      supabase.rpc("get_data_sensitivity_map"),
      supabase.rpc("get_password_protection_info"),
    ]);
    if (cols) setRows(cols as ColRow[]);
    if (pw) setPwInfo(pw as never);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.sensitivity] = (c[r.sensitivity] ?? 0) + 1;
    return c;
  }, [rows]);

  const tableCount = useMemo(() => new Set(rows.map((r) => r.table_name)).size, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.sensitivity !== filter) return false;
      if (!q) return true;
      return r.table_name.toLowerCase().includes(q) || r.column_name.toLowerCase().includes(q);
    });
  }, [rows, search, filter]);

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          {bn ? "ডেটা সংবেদনশীলতা মানচিত্র" : "Data Sensitivity Map"}
        </h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {bn
          ? `প্রতিটি কলামের সুরক্ষা স্তর — মোট ${tableCount}টি টেবিল ও ${rows.length}টি কলাম স্ক্যান করা হয়েছে।`
          : `Protection level of every column — scanned ${tableCount} tables / ${rows.length} columns.`}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { key: "encrypted_aes256", label_bn: "এনক্রিপ্টেড", label_en: "Encrypted" },
          { key: "encrypted_mirror", label_bn: "মিরর", label_en: "Mirror" },
          { key: "hashed_bcrypt",    label_bn: "হ্যাশড", label_en: "Hashed" },
          { key: "sensitive_rls_only", label_bn: "RLS-সুরক্ষিত", label_en: "RLS-protected" },
          { key: "non_sensitive",    label_bn: "সাধারণ", label_en: "Non-sensitive" },
        ].map((s) => {
          const meta = SENSITIVITY_META[s.key];
          const Icon = meta.icon;
          // Add the password row to hashed count if applicable
          const c = (counts[s.key] ?? 0) + (s.key === "hashed_bcrypt" && pwInfo ? 1 : 0);
          return (
            <button
              key={s.key}
              onClick={() => setFilter(filter === s.key ? "all" : s.key)}
              className={`p-3 rounded-xl border transition-all ${meta.color} ${filter === s.key ? "ring-2 ring-offset-2 ring-primary scale-105" : "hover:scale-[1.02]"}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium opacity-80">{bn ? s.label_bn : s.label_en}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">{c}</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={bn ? "টেবিল বা কলাম দিয়ে খুঁজুন..." : "Search table or column..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {filter !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
            {bn ? "ফিল্টার মুছুন" : "Clear filter"}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 sticky top-0 z-10">
            <tr>
              <th className="text-left p-2 font-medium">{bn ? "টেবিল" : "Table"}</th>
              <th className="text-left p-2 font-medium">{bn ? "কলাম" : "Column"}</th>
              <th className="text-left p-2 font-medium">{bn ? "টাইপ" : "Type"}</th>
              <th className="text-left p-2 font-medium">{bn ? "সুরক্ষা" : "Protection"}</th>
              <th className="text-left p-2 font-medium">{bn ? "নোট" : "Notes"}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center p-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 inline animate-spin mr-2" />{bn ? "লোড হচ্ছে..." : "Loading..."}
              </td></tr>
            )}
            {/* Always show password row first */}
            {!loading && pwInfo && (filter === "all" || filter === "hashed_bcrypt") && (
              <tr className="border-t bg-blue-50/30 dark:bg-blue-950/10">
                <td className="p-2 font-mono text-xs">{pwInfo.table}</td>
                <td className="p-2 font-mono text-xs font-semibold">{pwInfo.column}</td>
                <td className="p-2 text-xs text-muted-foreground">text</td>
                <td className="p-2">
                  <Badge variant="outline" className={SENSITIVITY_META.hashed_bcrypt.color}>
                    <KeyRound className="w-3 h-3 mr-1" />{bn ? "হ্যাশড (BCrypt/scrypt)" : "Hashed (BCrypt/scrypt)"}
                  </Badge>
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {pwInfo.algorithm} • {pwInfo.user_count} {bn ? "ইউজার" : "users"}
                </td>
              </tr>
            )}
            {!loading && filtered.map((r, i) => {
              const meta = SENSITIVITY_META[r.sensitivity];
              const Icon = meta.icon;
              return (
                <tr key={`${r.table_name}.${r.column_name}.${i}`} className="border-t hover:bg-secondary/30">
                  <td className="p-2 font-mono text-xs">{r.table_name}</td>
                  <td className="p-2 font-mono text-xs font-semibold">{r.column_name}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.data_type}</td>
                  <td className="p-2">
                    <Badge variant="outline" className={meta.color}>
                      <Icon className="w-3 h-3 mr-1" />{bn ? meta.label_bn : meta.label_en}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground max-w-[300px]">
                    <div className="font-medium">{r.protection}</div>
                    {r.notes && <div className="opacity-80 mt-0.5">{r.notes}</div>}
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && !pwInfo && (
              <tr><td colSpan={5} className="text-center p-4 text-muted-foreground">{bn ? "কোনো ফলাফল নেই" : "No results"}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
