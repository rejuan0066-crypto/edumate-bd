import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  col_key: string;
  label_bn: string;
  label_en: string;
  align: "left" | "center" | "right";
  weight: number;
  visible: boolean;
  sort_order: number;
};

const DEFAULTS: Omit<Row, "id">[] = [
  { col_key: "sl",          label_bn: "ক্রঃ",                label_en: "SL",          align: "center", weight: 3,  visible: true, sort_order: 10 },
  { col_key: "name",        label_bn: "কর্মীর নাম ও আইডি",   label_en: "Name & ID",   align: "left",   weight: 15, visible: true, sort_order: 20 },
  { col_key: "designation", label_bn: "পদবি",                label_en: "Designation", align: "left",   weight: 12, visible: true, sort_order: 30 },
  { col_key: "base",        label_bn: "মূল বেতন (৳)",        label_en: "Base (BDT)",  align: "right",  weight: 8,  visible: true, sort_order: 40 },
  { col_key: "present",     label_bn: "উপ",                  label_en: "P",           align: "center", weight: 3,  visible: true, sort_order: 50 },
  { col_key: "absent",      label_bn: "অনু",                 label_en: "A",           align: "center", weight: 3,  visible: true, sort_order: 60 },
  { col_key: "late",        label_bn: "বি",                  label_en: "L",           align: "center", weight: 3,  visible: true, sort_order: 70 },
  { col_key: "leave",       label_bn: "ছু",                  label_en: "Lv",          align: "center", weight: 3,  visible: true, sort_order: 80 },
  { col_key: "deduction",   label_bn: "কর্তন (৳)",           label_en: "Deduction",   align: "right",  weight: 8,  visible: true, sort_order: 90 },
  { col_key: "overtime",    label_bn: "ওভারটাইম (৳)",        label_en: "Overtime",    align: "right",  weight: 7,  visible: true, sort_order: 100 },
  { col_key: "deposit",     label_bn: "জমা (৳)",             label_en: "Deposit",     align: "right",  weight: 8,  visible: true, sort_order: 110 },
  { col_key: "totalDed",    label_bn: "মোট কর্তন (৳)",       label_en: "Total Ded.",  align: "right",  weight: 9,  visible: true, sort_order: 120 },
  { col_key: "net",         label_bn: "নিট প্রদেয় (৳)",      label_en: "Net Payable", align: "right",  weight: 12, visible: true, sort_order: 130 },
];

export default function AdminSalaryPdfColumns() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("salary_pdf_columns")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("লোড করতে ব্যর্থ: " + error.message);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalWeight = useMemo(
    () => rows.filter((r) => r.visible).reduce((a, r) => a + Number(r.weight || 0), 0),
    [rows],
  );

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((r, i) => (r.sort_order = (i + 1) * 10));
    setRows(next);
  };

  const update = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const ordered = rows.map((r, i) => ({ ...r, sort_order: (i + 1) * 10 }));
      const updates = await Promise.all(
        ordered.map((r) =>
          supabase
            .from("salary_pdf_columns")
            .update({
              label_bn: r.label_bn,
              label_en: r.label_en,
              align: r.align,
              weight: Number(r.weight) || 1,
              visible: r.visible,
              sort_order: r.sort_order,
            })
            .eq("id", r.id),
        ),
      );
      const failed = updates.find((u) => u.error);
      if (failed?.error) throw failed.error;
      toast.success("সংরক্ষিত হয়েছে");
      await load();
    } catch (e: any) {
      toast.error("সংরক্ষণে সমস্যা: " + (e?.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try {
      const updates = await Promise.all(
        DEFAULTS.map((d) =>
          supabase.from("salary_pdf_columns").update({
            label_bn: d.label_bn,
            label_en: d.label_en,
            align: d.align,
            weight: d.weight,
            visible: d.visible,
            sort_order: d.sort_order,
          }).eq("col_key", d.col_key),
        ),
      );
      const failed = updates.find((u) => u.error);
      if (failed?.error) throw failed.error;
      toast.success("ডিফল্টে রিসেট হয়েছে");
      await load();
    } catch (e: any) {
      toast.error("রিসেট ব্যর্থ: " + (e?.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-[1440px] p-6">
      <Card className="rounded-[45px] backdrop-blur-xl bg-white/70 border-white/40 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-2xl">বেতন PDF কলাম সেটিংস</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              কলাম দেখান/লুকান, ক্রম পরিবর্তন করুন এবং প্রস্থ (weight) ঠিক করুন। কোড পরিবর্তন ছাড়াই বেতন PDF আপডেট হবে।
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetDefaults} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-2" /> ডিফল্ট
            </Button>
            <Button onClick={saveAll} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" /> {saving ? "সংরক্ষণ..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-3">
            মোট weight (দৃশ্যমান কলাম): <strong>{totalWeight}</strong> — প্রতিটি কলামের প্রস্থ এই যোগফলের অনুপাতে নির্ধারিত হবে।
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">ক্রম</TableHead>
                    <TableHead>কী</TableHead>
                    <TableHead>লেবেল (বাং)</TableHead>
                    <TableHead>লেবেল (EN)</TableHead>
                    <TableHead className="w-32">এলাইন</TableHead>
                    <TableHead className="w-24">Weight</TableHead>
                    <TableHead className="w-24 text-center">দৃশ্যমান</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={r.id} className="rounded-[20px]">
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1}>
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs">{r.col_key}</code></TableCell>
                      <TableCell>
                        <Input value={r.label_bn} onChange={(e) => update(r.id, { label_bn: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.label_en} onChange={(e) => update(r.id, { label_en: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Select value={r.align} onValueChange={(v) => update(r.id, { align: v as Row["align"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1} step={1}
                          value={r.weight || ''}
                          onChange={(e) => update(r.id, { weight: Number(e.target.value) || 1 })}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={r.visible} onCheckedChange={(v) => update(r.id, { visible: v })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
