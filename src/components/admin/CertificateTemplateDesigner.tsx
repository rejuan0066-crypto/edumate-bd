import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, RotateCcw, Award, FileText, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CertType, CertTemplateConfig, DEFAULT_TEMPLATE, mergeTemplate, renderCertificateHTML,
} from '@/lib/certificateTemplate';

const TYPE_TABS: { key: CertType; bn: string; en: string; icon: any; titleBn: string; titleEn: string; titleAr: string }[] = [
  { key: 'certificate', bn: 'সার্টিফিকেট', en: 'Certificate', icon: Award, titleBn: 'প্রশংসা সনদপত্র', titleEn: 'Certificate of Achievement', titleAr: 'شهادة تقدير' },
  { key: 'transfer', bn: 'ছাড়পত্র', en: 'Transfer Certificate', icon: FileText, titleBn: 'ছাড়পত্র', titleEn: 'Transfer Certificate', titleAr: 'شهادة انتقال' },
  { key: 'testimonial', bn: 'প্রশংসাপত্র', en: 'Testimonial', icon: ScrollText, titleBn: 'প্রশংসাপত্র', titleEn: 'Testimonial', titleAr: 'شهادة حسن سيرة وسلوك' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SAMPLE_DATA = {
  institutionNameBn: 'আদর্শ শিক্ষা প্রতিষ্ঠান',
  institutionNameEn: 'Ideal Educational Institution',
  institutionAddress: 'ঢাকা, বাংলাদেশ',
  institutionPhone: '+880 1700-000000',
  institutionEmail: 'info@ideal.edu.bd',
  institutionLogo: '',
  monogram: 'I',
  serial: 'CERT-2026-0001',
  issueDateBn: '২১/০৪/২০২৬',
  issueDateEn: '21/04/2026',
  nameBn: 'মোহাম্মদ আব্দুল্লাহ',
  nameEn: 'Mohammad Abdullah',
  fatherName: 'মোহাম্মদ রহিম',
  motherName: 'রাহেলা বেগম',
  classBn: 'দশম শ্রেণী',
  classEn: 'Class 10',
  sessionName: '2025-2026',
  studentId: 'STD-2024-101',
  rollNumber: '15',
  dobBn: '০১/০১/২০১০',
  dobEn: '01/01/2010',
  admissionDateBn: '১৫/০১/২০২০',
  admissionDateEn: '15/01/2020',
  leavingDateBn: '১০/০৩/২০২৬',
  leavingDateEn: '10/03/2026',
  conduct: 'উত্তম / Excellent',
  reason: 'পারিবারিক স্থানান্তর / Family relocation',
  achievements: 'বিজ্ঞান প্রতিযোগিতায় ১ম স্থান',
  purpose: 'উচ্চ শিক্ষার জন্য',
  remarks: '',
  lastClass: 'দশম শ্রেণী',
  categoryBn: 'একাডেমিক কৃতিত্ব',
  categoryEn: 'Academic Achievement',
  bodyBn: 'এই সনদপত্র দ্বারা প্রত্যয়ন করা যাচ্ছে যে, <span class="hl">মোহাম্মদ আব্দুল্লাহ</span>, পিতা: <b>মোহাম্মদ রহিম</b>, একজন কৃতী শিক্ষার্থী।',
  bodyEn: 'This is to certify that <span class="hl">Mohammad Abdullah</span>, son of <b>Mohammad Rahim</b>, has been a meritorious student.',
  bodyAr: 'يشهد هذا بأن <span class="hl">محمد عبد الله</span>، ابن <b>محمد رحيم</b>، كان طالبًا متفوقًا في هذه المؤسسة، وقد أظهر سلوكًا حسنًا والتزامًا مثاليًا. نسأل الله له التوفيق والنجاح في حياته.',
  nameAr: 'محمد عبد الله',
  fatherNameAr: 'محمد رحيم',
  motherNameAr: 'راحلة بيغم',
  classAr: 'الصف العاشر',
  conductAr: 'ممتاز',
  reasonAr: 'الانتقال العائلي',
  achievementsAr: 'المركز الأول في مسابقة العلوم',
  purposeAr: 'للدراسات العليا',
  remarksAr: '',
  lastClassAr: 'الصف العاشر',
  categoryAr: 'التفوق الأكاديمي',
  institutionNameAr: 'مؤسسة المثالية التعليمية',
  institutionAddressAr: 'دكا، بنغلاديش',
  principalName: 'মোহাম্মদ ইব্রাহিম',
  principalNameAr: 'محمد إبراهيم',
  principalTitleBn: 'প্রিন্সিপাল',
  principalTitleEn: 'Principal',
  principalTitleAr: 'المدير',
};

const CertificateTemplateDesigner = ({ open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<CertType>('certificate');
  const [cfg, setCfg] = useState<CertTemplateConfig>(DEFAULT_TEMPLATE);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('certificate_templates').select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Live principal/institution info for accurate preview
  const { data: livePrincipal } = useQuery({
    queryKey: ['designer-principal-info'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['principal_name', 'principal_name_en', 'principal_name_ar', 'principal_title_bn', 'principal_title_en', 'principal_title_ar']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = typeof r.value === 'string' ? r.value : ''; });
      return map;
    },
    enabled: open,
  });

  const { data: liveInstitution } = useQuery({
    queryKey: ['designer-institution'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
    enabled: open,
  });

  // Load active type's config
  useEffect(() => {
    const t = templates.find((x: any) => x.template_type === activeType);
    setCfg(mergeTemplate((t?.config ?? null) as Partial<CertTemplateConfig> | null));
  }, [activeType, templates]);

  const meta = TYPE_TABS.find(t => t.key === activeType)!;

  const previewHtml = useMemo(() => {
    const mergedData: any = { ...SAMPLE_DATA };
    if (livePrincipal) {
      if (livePrincipal.principal_name) mergedData.principalName = livePrincipal.principal_name;
      if (livePrincipal.principal_name_en) mergedData.principalNameEn = livePrincipal.principal_name_en;
      if (livePrincipal.principal_name_ar) mergedData.principalNameAr = livePrincipal.principal_name_ar;
      if (livePrincipal.principal_title_bn) mergedData.principalTitleBn = livePrincipal.principal_title_bn;
      if (livePrincipal.principal_title_en) mergedData.principalTitleEn = livePrincipal.principal_title_en;
      if (livePrincipal.principal_title_ar) mergedData.principalTitleAr = livePrincipal.principal_title_ar;
    }
    if (liveInstitution) {
      if (liveInstitution.name) mergedData.institutionNameBn = liveInstitution.name;
      if (liveInstitution.name_en) mergedData.institutionNameEn = liveInstitution.name_en;
      if (liveInstitution.address) mergedData.institutionAddress = liveInstitution.address;
      if (liveInstitution.phone) mergedData.institutionPhone = liveInstitution.phone;
      if (liveInstitution.email) mergedData.institutionEmail = liveInstitution.email;
      if (liveInstitution.logo_url) mergedData.institutionLogo = liveInstitution.logo_url;
    }
    return renderCertificateHTML({
      cfg,
      certType: activeType,
      defaultTitleBn: meta.titleBn,
      defaultTitleEn: meta.titleEn,
      defaultTitleAr: meta.titleAr,
      data: mergedData,
    });
  }, [cfg, activeType, meta, livePrincipal, liveInstitution]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('certificate_templates')
        .update({ config: cfg as any })
        .eq('template_type', activeType);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate-templates'] });
      toast.success(bn ? 'টেমপ্লেট সংরক্ষণ হয়েছে' : 'Template saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = <K extends keyof CertTemplateConfig>(k: K, v: CertTemplateConfig[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[96vw] h-[92vh] p-0 overflow-hidden rounded-[38px]">
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-card/60 backdrop-blur">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <meta.icon className="w-5 h-5 text-primary" />
            </div>
            <span>{bn ? 'টেমপ্লেট ডিজাইনার' : 'Template Designer'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(92vh-72px)] overflow-hidden">
          {/* Sidebar settings */}
          <div className="w-[420px] border-r border-border/40 overflow-y-auto p-5 space-y-5 bg-background">
            {/* Type tabs */}
            <div className="grid grid-cols-3 gap-2">
              {TYPE_TABS.map(t => {
                const Icon = t.icon;
                const active = activeType === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveType(t.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border-2 text-xs font-semibold transition-all ${
                      active ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span>{bn ? t.bn : t.en}</span>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <>
                {/* Title */}
                <Section title={bn ? 'শিরোনাম' : 'Title'}>
                  <Field label={bn ? 'শিরোনাম (বাংলা)' : 'Title (Bengali)'}>
                    <Input value={cfg.titleBn} onChange={e => set('titleBn', e.target.value)} placeholder={meta.titleBn} />
                  </Field>
                  <Field label={bn ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}>
                    <Input value={cfg.titleEn} onChange={e => set('titleEn', e.target.value)} placeholder={meta.titleEn} />
                  </Field>
                  <Field label={bn ? 'শিরোনাম (আরবি)' : 'Title (Arabic)'}>
                    <Input value={cfg.titleAr} onChange={e => set('titleAr', e.target.value)} placeholder={meta.titleAr} dir="rtl" style={{ fontFamily: 'Amiri, serif' }} />
                  </Field>
                  <SliderField label={bn ? 'ফন্ট সাইজ' : 'Font size'} value={cfg.titleFontSize} min={18} max={48} onChange={v => set('titleFontSize', v)} />
                  <ColorField label={bn ? 'শিরোনাম রং' : 'Title color'} value={cfg.titleColor} onChange={v => set('titleColor', v)} />
                  <ToggleField label={bn ? 'ক্যাটেগরি সাবটাইটেল' : 'Category subtitle'} value={cfg.showCategorySubtitle} onChange={v => set('showCategorySubtitle', v)} />
                </Section>

                {/* Logo / Header */}
                <Section title={bn ? 'লোগো ও হেডার' : 'Logo & Header'}>
                  <ToggleField label={bn ? 'লোগো দেখান' : 'Show logo'} value={cfg.showLogo} onChange={v => set('showLogo', v)} />
                  <Field label={bn ? 'কাস্টম লোগো URL (ঐচ্ছিক)' : 'Custom Logo URL (optional)'}>
                    <Input value={cfg.logoUrlOverride} onChange={e => set('logoUrlOverride', e.target.value)} placeholder="https://..." />
                  </Field>
                  <SliderField label={bn ? 'লোগো সাইজ' : 'Logo size'} value={cfg.logoSize} min={32} max={120} onChange={v => set('logoSize', v)} />
                  <Field label={bn ? 'লোগো অবস্থান' : 'Logo position'}>
                    <Select value={cfg.logoPosition} onValueChange={v => set('logoPosition', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <ToggleField label={bn ? 'প্রতিষ্ঠানের নাম' : 'Institution name'} value={cfg.showInstitutionName} onChange={v => set('showInstitutionName', v)} />
                  <ToggleField label={bn ? 'ঠিকানা দেখান' : 'Show address'} value={cfg.showAddress} onChange={v => set('showAddress', v)} />
                  <ColorField label={bn ? 'হেডার অ্যাকসেন্ট' : 'Header accent'} value={cfg.headerAccentColor} onChange={v => set('headerAccentColor', v)} />
                </Section>

                {/* Borders / Frame */}
                <Section title={bn ? 'বর্ডার ও ফ্রেম' : 'Borders & Frame'}>
                  <ColorField label={bn ? 'বাইরের বর্ডার রং' : 'Outer border color'} value={cfg.borderColor} onChange={v => set('borderColor', v)} />
                  <ColorField label={bn ? 'ভেতরের বর্ডার রং' : 'Inner border color'} value={cfg.innerBorderColor} onChange={v => set('innerBorderColor', v)} />
                  <Field label={bn ? 'বর্ডার স্টাইল' : 'Border style'}>
                    <Select value={cfg.borderStyle} onValueChange={v => set('borderStyle', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="double">Double</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <ToggleField label={bn ? 'কোণার অলংকরণ' : 'Corner ornaments'} value={cfg.showCornerOrnaments} onChange={v => set('showCornerOrnaments', v)} />
                  <ToggleField label={bn ? 'ওয়াটারমার্ক' : 'Watermark'} value={cfg.showWatermark} onChange={v => set('showWatermark', v)} />
                  {cfg.showWatermark && (
                    <SliderField label={bn ? 'ওয়াটারমার্ক স্বচ্ছতা' : 'Watermark opacity'} value={Math.round(cfg.watermarkOpacity * 100)} min={2} max={20} onChange={v => set('watermarkOpacity', v / 100)} suffix="%" />
                  )}
                </Section>

                {/* Background */}
                <Section title={bn ? 'ব্যাকগ্রাউন্ড' : 'Background'}>
                  <ColorField label={bn ? 'উপরের রং' : 'Top color'} value={cfg.bgGradientFrom} onChange={v => set('bgGradientFrom', v)} />
                  <ColorField label={bn ? 'নিচের রং' : 'Bottom color'} value={cfg.bgGradientTo} onChange={v => set('bgGradientTo', v)} />
                </Section>

                {/* Body / Text */}
                <Section title={bn ? 'মূল টেক্সট' : 'Body Text'}>
                  <Field label={bn ? 'লেআউট' : 'Layout'}>
                    <Select value={cfg.bodyLayout} onValueChange={v => set('bodyLayout', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bilingual">{bn ? 'দ্বিভাষিক (বাংলা + ইংরেজি)' : 'Bilingual (Bn + En)'}</SelectItem>
                        <SelectItem value="bn-only">{bn ? 'শুধু বাংলা' : 'Bengali only'}</SelectItem>
                        <SelectItem value="en-only">{bn ? 'শুধু ইংরেজি' : 'English only'}</SelectItem>
                        <SelectItem value="ar-only">{bn ? 'শুধু আরবি' : 'Arabic only'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <SliderField label={bn ? 'ফন্ট সাইজ' : 'Font size'} value={Math.round(cfg.bodyFontSize * 10)} min={100} max={180} step={5} onChange={v => set('bodyFontSize', v / 10)} />
                  <ColorField label={bn ? 'হাইলাইট রং' : 'Highlight color'} value={cfg.highlightColor} onChange={v => set('highlightColor', v)} />
                  <Field label={bn ? 'কাস্টম বাংলা টেক্সট (ঐচ্ছিক)' : 'Custom Bengali text (optional)'}>
                    <Textarea rows={4} value={cfg.customBodyBn} onChange={e => set('customBodyBn', e.target.value)}
                      placeholder={bn ? 'প্লেসহোল্ডার: {nameBn} {fatherName} {classBn} {conduct} ...' : 'Placeholders: {nameBn} {fatherName} {classBn} {conduct}'} />
                  </Field>
                  <Field label={bn ? 'কাস্টম ইংরেজি টেক্সট (ঐচ্ছিক)' : 'Custom English text (optional)'}>
                    <Textarea rows={4} value={cfg.customBodyEn} onChange={e => set('customBodyEn', e.target.value)}
                      placeholder="Placeholders: {nameEn} {fatherName} {classEn} {conduct}" />
                  </Field>
                  <Field label={bn ? 'কাস্টম আরবি টেক্সট (ঐচ্ছিক)' : 'Custom Arabic text (optional)'}>
                    <Textarea rows={4} value={cfg.customBodyAr} onChange={e => set('customBodyAr', e.target.value)}
                      dir="rtl" style={{ fontFamily: 'Amiri, serif', fontSize: '14px', lineHeight: 1.8 }}
                      placeholder={bn ? 'প্লেসহোল্ডার: {nameAr} {fatherNameAr} {classAr} {conductAr} ...' : 'Placeholders: {nameAr} {fatherNameAr} {classAr} {conductAr}'} />
                  </Field>
                </Section>

                {/* Info grid */}
                <Section title={bn ? 'তথ্য টেবিল' : 'Info Grid'}>
                  <ToggleField label={bn ? 'ছাত্র তথ্য টেবিল দেখান' : 'Show student info grid'} value={cfg.showInfoGrid} onChange={v => set('showInfoGrid', v)} />
                  {cfg.showInfoGrid && (
                    <Field label={bn ? 'কলাম সংখ্যা' : 'Columns'}>
                      <Select value={String(cfg.infoColumns)} onValueChange={v => set('infoColumns', Number(v) as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </Section>

                {/* Signature / Footer */}
                <Section title={bn ? 'স্বাক্ষর ও ফুটার' : 'Signature & Footer'}>
                  <Field label={bn ? 'স্বাক্ষরের অবস্থান' : 'Signature position'}>
                    <Select value={cfg.signaturePosition} onValueChange={v => set('signaturePosition', v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <ToggleField label={bn ? 'অফিসিয়াল সিল' : 'Official seal'} value={cfg.showSeal} onChange={v => set('showSeal', v)} />
                  <ToggleField label={bn ? '"Best Wishes" দেখান' : 'Show "Best Wishes"'} value={cfg.showWishes} onChange={v => set('showWishes', v)} />
                  <Field label={bn ? 'ফুটার ওভাররাইড (ঐচ্ছিক)' : 'Footer override (optional)'}>
                    <Textarea
                      rows={2}
                      value={cfg.footerText}
                      onChange={e => set('footerText', e.target.value)}
                      placeholder={bn ? 'খালি রাখলে গ্লোবাল ফুটার ব্যবহৃত হবে' : 'Leave empty to use global footer'}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {bn
                        ? '💡 এই টেমপ্লেটের জন্য আলাদা ফুটার দিতে চাইলে এখানে লিখুন। খালি রাখলে ড্যাশবোর্ডে সেট করা গ্লোবাল ফুটার ব্যবহৃত হবে।'
                        : '💡 Set a custom footer for this template only. Leave blank to fall back to the global footer set in the dashboard.'}
                    </p>
                  </Field>
                </Section>

                {/* Spacing */}
                <Section title={bn ? 'স্পেসিং' : 'Spacing'}>
                  <SliderField label={bn ? 'পেজ প্যাডিং' : 'Page padding'} value={cfg.pagePadding} min={10} max={30} onChange={v => set('pagePadding', v)} suffix="mm" />
                </Section>

                {/* Action buttons */}
                <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-background/95 backdrop-blur border-t border-border/40 flex gap-2">
                  <Button variant="outline" onClick={() => setCfg(DEFAULT_TEMPLATE)} className="rounded-full flex-1">
                    <RotateCcw className="w-4 h-4" />
                    {bn ? 'রিসেট' : 'Reset'}
                  </Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-full flex-1">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {bn ? 'সংরক্ষণ' : 'Save'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 bg-muted/30 overflow-auto p-6 flex justify-center items-start">
            <div className="shadow-2xl rounded-lg overflow-hidden bg-white" style={{ width: '210mm', minHeight: '297mm', transform: 'scale(0.8)', transformOrigin: 'top center' }}>
              <iframe
                title="preview"
                srcDoc={previewHtml}
                style={{ width: '210mm', height: '297mm', border: 'none', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Tiny field helpers (kept inline for cohesion) ────────── */
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
    <div className="space-y-3 pl-1">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const ToggleField = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-1">
    <Label className="text-xs cursor-pointer">{label}</Label>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-transparent" />
      <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-xs h-9" />
    </div>
  </Field>
);

const SliderField = ({ label, value, min, max, step = 1, onChange, suffix = 'px' }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) => (
  <Field label={`${label} — ${value}${suffix}`}>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={v => onChange(v[0])} />
  </Field>
);

export default CertificateTemplateDesigner;
