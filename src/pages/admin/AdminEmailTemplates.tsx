import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Mail, Save, Eye, Code2, RotateCcw, Loader2, Send, History, Plus, Copy, Trash2, BookOpen, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useRateLimitConfig } from "@/hooks/useRateLimitConfig";

type EmailTemplate = {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  subject: string;
  html_body: string;
  variables: string[];
  brand_color: string;
  is_enabled: boolean;
  is_system: boolean;
};

type TemplateVersion = {
  id: string;
  version_number: number;
  subject: string;
  html_body: string;
  brand_color: string | null;
  changed_by_email: string | null;
  created_at: string;
};

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  otp: { otp: "482917", expiry_minutes: "10", institution_name: "সুবহানী মাদ্রাসা", brand_color: "#10b981", year: String(new Date().getFullYear()) },
  welcome: { user_name: "মোহাম্মদ আলী", institution_name: "সুবহানী মাদ্রাসা", login_url: "https://example.com/login", support_email: "support@example.com", brand_color: "#10b981", year: String(new Date().getFullYear()) },
  password_reset: { user_name: "মোহাম্মদ আলী", reset_code: "739204", expiry_minutes: "15", institution_name: "সুবহানী মাদ্রাসা", year: String(new Date().getFullYear()) },
  notice: { notice_title: "ঈদের ছুটির বিজ্ঞপ্তি", notice_body: "আগামী ১০ই এপ্রিল থেকে ১৫ই এপ্রিল পর্যন্ত মাদ্রাসা বন্ধ থাকবে।", notice_date: "০৫/০৪/২০২৬", notice_url: "https://example.com/notices", institution_name: "সুবহানী মাদ্রাসা", year: String(new Date().getFullYear()) },
};

// Documentation for all known placeholders
const PLACEHOLDER_DOCS: { key: string; desc: string; example: string }[] = [
  { key: "otp", desc: "৬-ডিজিট ভেরিফিকেশন কোড", example: "482917" },
  { key: "reset_code", desc: "পাসওয়ার্ড রিসেট কোড", example: "739204" },
  { key: "expiry_minutes", desc: "কোডের বৈধতা (মিনিট)", example: "10" },
  { key: "user_name", desc: "ব্যবহারকারীর পূর্ণ নাম", example: "মোহাম্মদ আলী" },
  { key: "institution_name", desc: "প্রতিষ্ঠানের নাম (ব্র্যান্ড)", example: "সুবহানী মাদ্রাসা" },
  { key: "brand_color", desc: "ব্র্যান্ড কালার (hex)", example: "#10b981" },
  { key: "login_url", desc: "লগইন পেজের লিংক", example: "https://app.com/login" },
  { key: "support_email", desc: "সাপোর্টের ইমেইল", example: "support@app.com" },
  { key: "notice_title", desc: "নোটিশের শিরোনাম", example: "ঈদের ছুটি" },
  { key: "notice_body", desc: "নোটিশের বিস্তারিত", example: "১০ এপ্রিল বন্ধ থাকবে।" },
  { key: "notice_date", desc: "নোটিশের তারিখ", example: "০৫/০৪/২০২৬" },
  { key: "notice_url", desc: "নোটিশ পেজের লিংক", example: "https://app.com/notices" },
  { key: "year", desc: "বর্তমান বছর", example: String(new Date().getFullYear()) },
];

function substitute(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => vars[k] ?? `{{${k}}}`);
}

const BLANK_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f7;padding:40px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <h2 style="color:{{brand_color}};">{{institution_name}}</h2>
    <p>Hello {{user_name}},</p>
    <p>Write your email content here. Use {{placeholders}} from the right panel.</p>
    <p style="color:#999;font-size:12px;margin-top:32px;">© {{year}} {{institution_name}}</p>
  </div>
</body></html>`;

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  // Session-level guard: max 5 test sends per browser tab session
  const SESSION_MAX = 5;
  const [sessionAttempts, setSessionAttempts] = useState(0);
  const [edits, setEdits] = useState<Record<string, Partial<EmailTemplate>>>({});

  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<TemplateVersion | null>(null);

  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({ template_key: "", name: "", description: "", subject: "", clone_from: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name");
    if (error) toast.error("টেমপ্লেট লোড করা যায়নি: " + error.message);
    else {
      const list = (data || []) as any as EmailTemplate[];
      setTemplates(list);
      if (list.length && !activeKey) setActiveKey(list[0].template_key);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = templates.find(t => t.template_key === activeKey);
  const edit = active ? { ...active, ...edits[active.template_key] } : null;

  const loadVersions = async (templateId: string) => {
    setVersionsLoading(true);
    const { data, error } = await supabase
      .from("email_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version_number", { ascending: false });
    if (!error) setVersions((data || []) as any as TemplateVersion[]);
    setVersionsLoading(false);
  };

  useEffect(() => { if (active) loadVersions(active.id); }, [active?.id]);

  const updateField = (key: keyof EmailTemplate, value: any) => {
    if (!active) return;
    setEdits(prev => ({ ...prev, [active.template_key]: { ...prev[active.template_key], [key]: value } }));
  };

  const save = async () => {
    if (!active || !edit) return;
    setSaving(true);
    const { error } = await supabase.from("email_templates").update({
      subject: edit.subject, html_body: edit.html_body,
      brand_color: edit.brand_color, is_enabled: edit.is_enabled,
    }).eq("id", active.id);
    setSaving(false);
    if (error) toast.error("সেভ ব্যর্থ: " + error.message);
    else {
      toast.success("টেমপ্লেট সেভ হয়েছে ✓ (পুরাতন সংস্করণ ভার্সন হিস্ট্রিতে সংরক্ষিত)");
      setEdits(prev => { const n = { ...prev }; delete n[active.template_key]; return n; });
      load();
      loadVersions(active.id);
    }
  };

  const reset = () => {
    if (!active) return;
    setEdits(prev => { const n = { ...prev }; delete n[active.template_key]; return n; });
    toast.info("পরিবর্তন বাতিল করা হয়েছে");
  };

  const rollback = async (v: TemplateVersion) => {
    if (!active) return;
    if (!confirm(`ভার্সন #${v.version_number}-এ ফিরিয়ে আনবেন? বর্তমান সংস্করণ ভার্সন হিস্ট্রিতে সংরক্ষিত হবে।`)) return;
    const { error } = await supabase.from("email_templates").update({
      subject: v.subject, html_body: v.html_body, brand_color: v.brand_color || active.brand_color,
    }).eq("id", active.id);
    if (error) toast.error("রোলব্যাক ব্যর্থ: " + error.message);
    else {
      toast.success(`ভার্সন #${v.version_number}-এ রোলব্যাক সম্পন্ন ✓`);
      setPreviewVersion(null);
      load();
      loadVersions(active.id);
    }
  };

  const sendTest = async () => {
    if (!active || !edit) return;
    if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail)) { toast.error("সঠিক ইমেইল দিন"); return; }
    if (sessionAttempts >= SESSION_MAX) {
      toast.error(`এই সেশনে সর্বোচ্চ ${SESSION_MAX}টি টেস্ট ইমেইল পাঠানো যাবে। পেজ রিলোড করুন।`);
      return;
    }
    // Confirm-once gate to prevent unauthorized rapid testing
    const confirmed = window.confirm(
      `টেস্ট ইমেইল পাঠানো হবে: ${testEmail}\n\n` +
      `সেশনে বাকি: ${SESSION_MAX - sessionAttempts} বার\nচালিয়ে যেতে চান?`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const sample = SAMPLE_VARS[active.template_key] || SAMPLE_VARS.welcome;
      const subject = substitute(edit.subject, sample);
      const html = substitute(edit.html_body, sample);
      const { data, error } = await supabase.functions.invoke("test-email-template", {
        body: { to: testEmail, subject, html, template_key: active.template_key },
      });
      if (error) {
        // Try to read structured error for rate limits
        const ctxBody = await (error as any)?.context?.json?.().catch(() => null);
        if (ctxBody?.error === "RATE_LIMIT_EXCEEDED") {
          toast.error(ctxBody.message || "সার্ভার রেট-লিমিট পৌঁছে গেছে");
          return;
        }
        throw error;
      }
      if ((data as any)?.success) {
        setSessionAttempts((n) => n + 1);
        const remaining = (data as any).remaining;
        toast.success(`টেস্ট ইমেইল পাঠানো হয়েছে → ${testEmail}` + (typeof remaining === "number" ? ` (সার্ভার বাকি: ${remaining})` : ""));
      } else throw new Error((data as any)?.error || "Unknown error");
    } catch (e: any) {
      toast.error("টেস্ট ব্যর্থ: " + (e?.message || e));
    } finally { setSending(false); }
  };

  const insertPlaceholder = (key: string) => {
    if (!active || !edit) return;
    const placeholder = `{{${key}}}`;
    const ta = document.getElementById("html-editor") as HTMLTextAreaElement | null;
    if (ta) {
      const start = ta.selectionStart, end = ta.selectionEnd;
      const newVal = edit.html_body.slice(0, start) + placeholder + edit.html_body.slice(end);
      updateField("html_body", newVal);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + placeholder.length, start + placeholder.length); }, 10);
    } else {
      updateField("html_body", edit.html_body + placeholder);
    }
    toast.success(`${placeholder} যোগ করা হয়েছে`);
  };

  const deleteTemplate = async () => {
    if (!active || active.is_system) return;
    if (!confirm(`"${active.name}" টেমপ্লেটটি মুছবেন? এই অপারেশন বাতিল করা যাবে না।`)) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", active.id);
    if (error) toast.error("মোছা ব্যর্থ: " + error.message);
    else { toast.success("টেমপ্লেট মোছা হয়েছে"); setActiveKey(""); load(); }
  };

  const createTemplate = async () => {
    if (!newForm.template_key || !newForm.name || !newForm.subject) {
      toast.error("Key, Name এবং Subject প্রয়োজন"); return;
    }
    if (!/^[a-z0-9_]+$/.test(newForm.template_key)) {
      toast.error("Key শুধু lowercase, digit ও underscore"); return;
    }
    setCreating(true);
    let baseHtml = BLANK_HTML;
    let baseVars: string[] = ["user_name", "institution_name", "brand_color", "year"];
    if (newForm.clone_from) {
      const src = templates.find(t => t.template_key === newForm.clone_from);
      if (src) { baseHtml = src.html_body; baseVars = src.variables; }
    }
    const { error } = await supabase.from("email_templates").insert({
      template_key: newForm.template_key, name: newForm.name, description: newForm.description || null,
      subject: newForm.subject, html_body: baseHtml, variables: baseVars,
      brand_color: "#10b981", is_enabled: true, is_system: false,
    });
    setCreating(false);
    if (error) toast.error("তৈরি ব্যর্থ: " + error.message);
    else {
      toast.success("নতুন টেমপ্লেট তৈরি হয়েছে ✓");
      setNewDialog(false); setActiveKey(newForm.template_key);
      setNewForm({ template_key: "", name: "", description: "", subject: "", clone_from: "" });
      load();
    }
  };

  const previewHtml = edit ? substitute(edit.html_body, SAMPLE_VARS[active!.template_key] || SAMPLE_VARS.welcome) : "";
  const previewSubject = edit ? substitute(edit.subject, SAMPLE_VARS[active!.template_key] || SAMPLE_VARS.welcome) : "";
  const isDirty = active ? !!edits[active.template_key] : false;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-[1440px] mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ইমেইল টেমপ্লেট</h1>
            <p className="text-sm text-muted-foreground">প্রতিটি ইমেইলের জন্য আলাদা প্রফেশনাল ডিজাইন কাস্টমাইজ করুন</p>
          </div>
        </div>
        <Button onClick={() => setNewDialog(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          <Plus className="w-4 h-4 mr-2" /> নতুন টেমপ্লেট
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="rounded-[24px] p-3 backdrop-blur-xl bg-white/70 border-white/40">
            <div className="space-y-1">
              {templates.map(t => (
                <button key={t.id} onClick={() => setActiveKey(t.template_key)}
                  className={`w-full text-left p-3 rounded-2xl transition-all ${
                    activeKey === t.template_key ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md" : "hover:bg-emerald-50"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{t.name}</div>
                    {edits[t.template_key] && <Badge variant="secondary" className="text-[10px]">●</Badge>}
                  </div>
                  <div className={`text-xs mt-1 ${activeKey === t.template_key ? "text-white/80" : "text-muted-foreground"}`}>{t.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={t.is_enabled ? "default" : "secondary"} className="text-[10px]">{t.is_enabled ? "চালু" : "বন্ধ"}</Badge>
                    {t.is_system && <Badge variant="outline" className={`text-[10px] ${activeKey === t.template_key ? "border-white/40 text-white" : ""}`}>System</Badge>}
                    <code className={`text-[10px] ${activeKey === t.template_key ? "text-white/80" : "text-muted-foreground"}`}>{t.template_key}</code>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Editor */}
        {edit && active && (
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <Card className="rounded-[24px] p-6 backdrop-blur-xl bg-white/70 border-white/40">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold">{edit.name}</h2>
                  <p className="text-sm text-muted-foreground">{edit.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={edit.is_enabled} onCheckedChange={(v) => updateField("is_enabled", v)} />
                  <Label className="text-sm">{edit.is_enabled ? "চালু" : "বন্ধ"}</Label>
                  {!active.is_system && (
                    <Button size="sm" variant="ghost" onClick={deleteTemplate} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-xs">ইমেইল সাবজেক্ট</Label>
                  <Input value={edit.subject} onChange={(e) => updateField("subject", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">ব্র্যান্ড কালার</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" value={edit.brand_color} onChange={(e) => updateField("brand_color", e.target.value)} className="w-16 p-1 h-10" />
                    <Input value={edit.brand_color} onChange={(e) => updateField("brand_color", e.target.value)} className="flex-1" />
                  </div>
                </div>
              </div>

              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-1" /> প্রিভিউ</TabsTrigger>
                  <TabsTrigger value="html"><Code2 className="w-4 h-4 mr-1" /> HTML</TabsTrigger>
                  <TabsTrigger value="placeholders"><BookOpen className="w-4 h-4 mr-1" /> Placeholders</TabsTrigger>
                  <TabsTrigger value="versions"><History className="w-4 h-4 mr-1" /> ভার্সন ({versions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <div className="px-4 py-2 bg-slate-200 text-xs"><strong>Subject:</strong> {previewSubject}</div>
                    <iframe srcDoc={previewHtml} className="w-full h-[600px] bg-white" title="Email Preview" />
                  </div>
                </TabsContent>

                <TabsContent value="html" className="mt-4">
                  <Textarea id="html-editor" value={edit.html_body}
                    onChange={(e) => updateField("html_body", e.target.value)}
                    className="font-mono text-xs h-[600px]" spellCheck={false} />
                </TabsContent>

                <TabsContent value="placeholders" className="mt-4">
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                      <div className="font-semibold text-emerald-900 mb-1">📌 কীভাবে ব্যবহার করবেন</div>
                      <div className="text-sm text-emerald-800">যেকোনো জায়গায় <code className="bg-white px-1.5 py-0.5 rounded">{`{{variable_name}}`}</code> লিখলে ইমেইল পাঠানোর সময় তা স্বয়ংক্রিয়ভাবে আসল মান দিয়ে replace হবে। নিচের তালিকা থেকে ক্লিক করে editor-এ insert করুন।</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">Placeholder</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">বিবরণ</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-600">উদাহরণ</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {PLACEHOLDER_DOCS.map(p => {
                            const inUse = edit.html_body.includes(`{{${p.key}}}`) || edit.subject.includes(`{{${p.key}}}`);
                            const inSchema = (edit.variables || []).includes(p.key);
                            return (
                              <tr key={p.key} className="border-t border-slate-100 hover:bg-emerald-50/40">
                                <td className="px-4 py-2.5">
                                  <code className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">{`{{${p.key}}}`}</code>
                                  {inUse && <Badge variant="default" className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">used</Badge>}
                                  {inSchema && !inUse && <Badge variant="outline" className="ml-2 text-[10px]">declared</Badge>}
                                </td>
                                <td className="px-4 py-2.5 text-slate-700">{p.desc}</td>
                                <td className="px-4 py-2.5 text-slate-500 text-xs">{p.example}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <Button size="sm" variant="ghost" onClick={() => insertPlaceholder(p.key)}>
                                    <Plus className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="versions" className="mt-4">
                  {versionsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      কোনো পূর্ববর্তী সংস্করণ নেই। এই টেমপ্লেট সেভ করলে স্বয়ংক্রিয়ভাবে এখানে snapshot সংরক্ষিত হবে।
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versions.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                              v{v.version_number}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{v.subject}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(v.created_at), "dd/MM/yyyy HH:mm")}
                                {v.changed_by_email && ` • ${v.changed_by_email}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPreviewVersion(v)}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> প্রিভিউ
                            </Button>
                            <Button size="sm" onClick={() => rollback(v)} className="bg-amber-500 hover:bg-amber-600">
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Rollback
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
                <Button onClick={save} disabled={!isDirty || saving} className="bg-gradient-to-r from-emerald-500 to-teal-600">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} সেভ করুন
                </Button>
                <Button variant="outline" onClick={reset} disabled={!isDirty}>
                  <RotateCcw className="w-4 h-4 mr-2" /> বাতিল
                </Button>
                <div className="flex-1" />
                <Input type="email" placeholder="test@email.com" value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)} className="max-w-[240px]" />
                <Button onClick={sendTest} disabled={sending || !testEmail} variant="secondary">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} টেস্ট পাঠান
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Version preview dialog */}
      <Dialog open={!!previewVersion} onOpenChange={(o) => !o && setPreviewVersion(null)}>
        <DialogContent className="max-w-4xl rounded-[38px]">
          <DialogHeader>
            <DialogTitle>ভার্সন #{previewVersion?.version_number} প্রিভিউ</DialogTitle>
          </DialogHeader>
          {previewVersion && (
            <>
              <div className="text-xs text-muted-foreground">
                <strong>Subject:</strong> {substitute(previewVersion.subject, SAMPLE_VARS[active!.template_key] || SAMPLE_VARS.welcome)}
              </div>
              <iframe
                srcDoc={substitute(previewVersion.html_body, SAMPLE_VARS[active!.template_key] || SAMPLE_VARS.welcome)}
                className="w-full h-[500px] bg-white rounded-2xl border" title="Version Preview"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewVersion(null)}>বন্ধ করুন</Button>
                <Button onClick={() => rollback(previewVersion)} className="bg-amber-500 hover:bg-amber-600">
                  <RotateCcw className="w-4 h-4 mr-2" /> এই ভার্সনে রোলব্যাক
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New template dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-md rounded-[38px]">
          <DialogHeader><DialogTitle>নতুন ইমেইল টেমপ্লেট</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template Key (unique)</Label>
              <Input placeholder="e.g. fee_receipt" value={newForm.template_key}
                onChange={(e) => setNewForm({ ...newForm, template_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
              <div className="text-[11px] text-muted-foreground mt-1">শুধু lowercase, digit ও underscore</div>
            </div>
            <div>
              <Label className="text-xs">নাম</Label>
              <Input placeholder="Fee Receipt Email" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">বিবরণ</Label>
              <Input value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input placeholder="Your receipt #{{receipt_no}}" value={newForm.subject}
                onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">কোনো টেমপ্লেট থেকে ক্লোন করবেন? (ঐচ্ছিক)</Label>
              <select className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={newForm.clone_from} onChange={(e) => setNewForm({ ...newForm, clone_from: e.target.value })}>
                <option value="">— ফাঁকা টেমপ্লেট —</option>
                {templates.map(t => <option key={t.id} value={t.template_key}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>বাতিল</Button>
            <Button onClick={createTemplate} disabled={creating} className="bg-gradient-to-r from-emerald-500 to-teal-600">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} তৈরি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
