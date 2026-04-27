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
import { toast } from "sonner";
import { Mail, Save, Eye, Code2, RotateCcw, Loader2, Send } from "lucide-react";

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

const SAMPLE_VARS: Record<string, Record<string, string>> = {
  otp: { otp: "482917", expiry_minutes: "10", institution_name: "সুবহানী মাদ্রাসা", brand_color: "#10b981", year: String(new Date().getFullYear()) },
  welcome: { user_name: "মোহাম্মদ আলী", institution_name: "সুবহানী মাদ্রাসা", login_url: "https://example.com/login", support_email: "support@example.com", brand_color: "#10b981", year: String(new Date().getFullYear()) },
  password_reset: { user_name: "মোহাম্মদ আলী", reset_code: "739204", expiry_minutes: "15", institution_name: "সুবহানী মাদ্রাসা", year: String(new Date().getFullYear()) },
  notice: { notice_title: "ঈদের ছুটির বিজ্ঞপ্তি", notice_body: "আগামী ১০ই এপ্রিল থেকে ১৫ই এপ্রিল পর্যন্ত মাদ্রাসা বন্ধ থাকবে।", notice_date: "০৫/০৪/২০২৬", notice_url: "https://example.com/notices", institution_name: "সুবহানী মাদ্রাসা", year: String(new Date().getFullYear()) },
};

function substitute(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => vars[k] ?? `{{${k}}}`);
}

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<EmailTemplate>>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("name");
    if (error) {
      toast.error("টেমপ্লেট লোড করা যায়নি: " + error.message);
    } else {
      const list = (data || []) as any as EmailTemplate[];
      setTemplates(list);
      if (list.length && !activeKey) setActiveKey(list[0].template_key);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = templates.find(t => t.template_key === activeKey);
  const edit = active ? { ...active, ...edits[active.template_key] } : null;

  const updateField = (key: keyof EmailTemplate, value: any) => {
    if (!active) return;
    setEdits(prev => ({
      ...prev,
      [active.template_key]: { ...prev[active.template_key], [key]: value },
    }));
  };

  const save = async () => {
    if (!active || !edit) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: edit.subject,
        html_body: edit.html_body,
        brand_color: edit.brand_color,
        is_enabled: edit.is_enabled,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) toast.error("সেভ ব্যর্থ: " + error.message);
    else {
      toast.success("টেমপ্লেট সেভ হয়েছে ✓");
      setEdits(prev => { const n = { ...prev }; delete n[active.template_key]; return n; });
      load();
    }
  };

  const reset = () => {
    if (!active) return;
    setEdits(prev => { const n = { ...prev }; delete n[active.template_key]; return n; });
    toast.info("পরিবর্তন বাতিল করা হয়েছে");
  };

  const sendTest = async () => {
    if (!active || !edit) return;
    if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail)) {
      toast.error("সঠিক ইমেইল দিন");
      return;
    }
    setSending(true);
    try {
      const sample = SAMPLE_VARS[active.template_key] || {};
      const subject = substitute(edit.subject, sample);
      const html = substitute(edit.html_body, sample);
      const { data, error } = await supabase.functions.invoke("test-email-template", {
        body: { to: testEmail, subject, html, template_key: active.template_key },
      });
      if (error) throw error;
      if ((data as any)?.success) toast.success(`টেস্ট ইমেইল পাঠানো হয়েছে → ${testEmail}`);
      else throw new Error((data as any)?.error || "Unknown error");
    } catch (e: any) {
      toast.error("টেস্ট ব্যর্থ: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const previewHtml = edit ? substitute(edit.html_body, SAMPLE_VARS[active!.template_key] || {}) : "";
  const previewSubject = edit ? substitute(edit.subject, SAMPLE_VARS[active!.template_key] || {}) : "";
  const isDirty = active ? !!edits[active.template_key] : false;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="max-w-[1440px] mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ইমেইল টেমপ্লেট</h1>
          <p className="text-sm text-muted-foreground">প্রতিটি ইমেইলের জন্য আলাদা প্রফেশনাল ডিজাইন কাস্টমাইজ করুন</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <Card className="rounded-[24px] p-3 backdrop-blur-xl bg-white/70 border-white/40">
            <div className="space-y-1">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveKey(t.template_key)}
                  className={`w-full text-left p-3 rounded-2xl transition-all ${
                    activeKey === t.template_key
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                      : "hover:bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{t.name}</div>
                    {edits[t.template_key] && <Badge variant="secondary" className="text-[10px]">●</Badge>}
                  </div>
                  <div className={`text-xs mt-1 ${activeKey === t.template_key ? "text-white/80" : "text-muted-foreground"}`}>
                    {t.description}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={t.is_enabled ? "default" : "secondary"} className="text-[10px]">
                      {t.is_enabled ? "চালু" : "বন্ধ"}
                    </Badge>
                    <code className={`text-[10px] ${activeKey === t.template_key ? "text-white/80" : "text-muted-foreground"}`}>
                      {t.template_key}
                    </code>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Editor */}
        {edit && (
          <div className="col-span-12 lg:col-span-9 space-y-4">
            <Card className="rounded-[24px] p-6 backdrop-blur-xl bg-white/70 border-white/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{edit.name}</h2>
                  <p className="text-sm text-muted-foreground">{edit.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={edit.is_enabled}
                      onCheckedChange={(v) => updateField("is_enabled", v)}
                    />
                    <Label className="text-sm">{edit.is_enabled ? "চালু" : "বন্ধ"}</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label className="text-xs">ইমেইল সাবজেক্ট</Label>
                  <Input
                    value={edit.subject}
                    onChange={(e) => updateField("subject", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">ব্র্যান্ড কালার</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="color"
                      value={edit.brand_color}
                      onChange={(e) => updateField("brand_color", e.target.value)}
                      className="w-16 p-1 h-10"
                    />
                    <Input
                      value={edit.brand_color}
                      onChange={(e) => updateField("brand_color", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Variables hint */}
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-900 mb-2">উপলব্ধ ভেরিয়েবল (HTML বডিতে ব্যবহার করুন):</div>
                <div className="flex flex-wrap gap-1.5">
                  {(edit.variables || []).map(v => (
                    <code key={v} className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-700">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview"><Eye className="w-4 h-4 mr-1" /> প্রিভিউ</TabsTrigger>
                  <TabsTrigger value="html"><Code2 className="w-4 h-4 mr-1" /> HTML কোড</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    <div className="px-4 py-2 bg-slate-200 text-xs">
                      <strong>Subject:</strong> {previewSubject}
                    </div>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[600px] bg-white"
                      title="Email Preview"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="html" className="mt-4">
                  <Textarea
                    value={edit.html_body}
                    onChange={(e) => updateField("html_body", e.target.value)}
                    className="font-mono text-xs h-[600px]"
                    spellCheck={false}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
                <Button onClick={save} disabled={!isDirty || saving} className="bg-gradient-to-r from-emerald-500 to-teal-600">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  সেভ করুন
                </Button>
                <Button variant="outline" onClick={reset} disabled={!isDirty}>
                  <RotateCcw className="w-4 h-4 mr-2" /> পরিবর্তন বাতিল
                </Button>
                <div className="flex-1" />
                <Input
                  type="email"
                  placeholder="test@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-[240px]"
                />
                <Button onClick={sendTest} disabled={sending || !testEmail} variant="secondary">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  টেস্ট ইমেইল পাঠান
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
