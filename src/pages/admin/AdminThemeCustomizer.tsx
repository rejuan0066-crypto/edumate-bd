import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeSettings, DEFAULT_THEME, FONT_OPTIONS, ThemeSettings } from '@/hooks/useThemeSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Palette, Type, Layout, RotateCcw, Save, Eye } from 'lucide-react';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const ColorPreview = ({ hue, sat, light, label }: { hue: number; sat: number; light: number; label: string }) => (
  <div className="flex items-center gap-3">
    <div
      className="w-12 h-12 rounded-lg border border-border shadow-sm"
      style={{ backgroundColor: `hsl(${hue}, ${sat}%, ${light}%)` }}
    />
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">HSL({hue}, {sat}%, {light}%)</p>
    </div>
  </div>
);

const AdminThemeCustomizer = () => {
  const { language } = useLanguage();
  const { theme, saveTheme } = useThemeSettings();
  const { canEditItem } = usePagePermissions('/admin/theme-customizer');
  const [draft, setDraft] = useState<ThemeSettings>(theme);
  const [previewActive, setPreviewActive] = useState(false);

  useEffect(() => {
    setDraft(theme);
  }, [theme]);

  const updateDraft = (key: keyof ThemeSettings, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveTheme.mutate(draft, {
      onSuccess: () => toast.success(language === 'bn' ? 'থিম সেভ হয়েছে!' : 'Theme saved!'),
      onError: () => toast.error(language === 'bn' ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'),
    });
  };

  const handleReset = () => {
    setDraft(DEFAULT_THEME);
    toast.info(language === 'bn' ? 'ডিফল্ট থিমে রিসেট হয়েছে' : 'Reset to default theme');
  };

  // Live preview
  useEffect(() => {
    if (previewActive) {
      const root = document.documentElement;
      root.style.setProperty('--primary', `${draft.primaryHue} ${draft.primarySaturation}% ${draft.primaryLightness}%`);
      root.style.setProperty('--accent', `${draft.accentHue} ${draft.accentSaturation}% ${draft.accentLightness}%`);
      root.style.setProperty('--background', `${draft.backgroundHue} ${draft.backgroundSaturation}% ${draft.backgroundLightness}%`);
      root.style.setProperty('--sidebar-background', `${draft.primaryHue} 35% ${draft.sidebarDarkness}%`);
      root.style.setProperty('--sidebar-primary', `${draft.accentHue} ${draft.accentSaturation}% ${draft.accentLightness}%`);
      root.style.setProperty('--sidebar-accent', `${draft.primaryHue} 30% ${draft.sidebarDarkness + 6}%`);
      root.style.setProperty('--radius', `${draft.borderRadius / 16}rem`);
    }
  }, [draft, previewActive]);

  const bn = language === 'bn';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              {bn ? '🎨 থিম ও ডিজাইন কাস্টমাইজার' : '🎨 Theme & Design Customizer'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {bn ? 'ওয়েবসাইটের কালার, ফন্ট ও ডিজাইন পরিবর্তন করুন' : 'Change website colors, fonts & design'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewActive(!previewActive)}>
              <Eye className="w-4 h-4 mr-1" />
              {previewActive ? (bn ? 'প্রিভিউ বন্ধ' : 'Stop Preview') : (bn ? 'লাইভ প্রিভিউ' : 'Live Preview')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              {bn ? 'রিসেট' : 'Reset'}
            </Button>
            {canEditItem && <Button size="sm" onClick={handleSave} disabled={saveTheme.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {saveTheme.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
            </Button>}
          </div>
        </div>

        <Tabs defaultValue="colors">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="colors" className="gap-1"><Palette className="w-4 h-4" /> {bn ? 'কালার' : 'Colors'}</TabsTrigger>
            <TabsTrigger value="typography" className="gap-1"><Type className="w-4 h-4" /> {bn ? 'ফন্ট' : 'Fonts'}</TabsTrigger>
            <TabsTrigger value="layout" className="gap-1"><Layout className="w-4 h-4" /> {bn ? 'লেআউট' : 'Layout'}</TabsTrigger>
          </TabsList>

          {/* COLORS TAB */}
          <TabsContent value="colors" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Primary Color */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'প্রাইমারি কালার (মূল রঙ)' : 'Primary Color'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPreview hue={draft.primaryHue} sat={draft.primarySaturation} light={draft.primaryLightness} label={bn ? 'প্রাইমারি' : 'Primary'} />
                  <div>
                    <Label className="text-xs">{bn ? 'হিউ (Hue)' : 'Hue'}: {draft.primaryHue}°</Label>
                    <Slider value={[draft.primaryHue]} min={0} max={360} step={1} onValueChange={([v]) => updateDraft('primaryHue', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'স্যাচুরেশন' : 'Saturation'}: {draft.primarySaturation}%</Label>
                    <Slider value={[draft.primarySaturation]} min={0} max={100} step={1} onValueChange={([v]) => updateDraft('primarySaturation', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'লাইটনেস' : 'Lightness'}: {draft.primaryLightness}%</Label>
                    <Slider value={[draft.primaryLightness]} min={5} max={60} step={1} onValueChange={([v]) => updateDraft('primaryLightness', v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Accent Color */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'অ্যাক্সেন্ট কালার (গোল্ড)' : 'Accent Color'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPreview hue={draft.accentHue} sat={draft.accentSaturation} light={draft.accentLightness} label={bn ? 'অ্যাক্সেন্ট' : 'Accent'} />
                  <div>
                    <Label className="text-xs">{bn ? 'হিউ' : 'Hue'}: {draft.accentHue}°</Label>
                    <Slider value={[draft.accentHue]} min={0} max={360} step={1} onValueChange={([v]) => updateDraft('accentHue', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'স্যাচুরেশন' : 'Saturation'}: {draft.accentSaturation}%</Label>
                    <Slider value={[draft.accentSaturation]} min={0} max={100} step={1} onValueChange={([v]) => updateDraft('accentSaturation', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'লাইটনেস' : 'Lightness'}: {draft.accentLightness}%</Label>
                    <Slider value={[draft.accentLightness]} min={20} max={80} step={1} onValueChange={([v]) => updateDraft('accentLightness', v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Background Color */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'ব্যাকগ্রাউন্ড কালার' : 'Background Color'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ColorPreview hue={draft.backgroundHue} sat={draft.backgroundSaturation} light={draft.backgroundLightness} label={bn ? 'ব্যাকগ্রাউন্ড' : 'Background'} />
                  <div>
                    <Label className="text-xs">{bn ? 'হিউ' : 'Hue'}: {draft.backgroundHue}°</Label>
                    <Slider value={[draft.backgroundHue]} min={0} max={360} step={1} onValueChange={([v]) => updateDraft('backgroundHue', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'স্যাচুরেশন' : 'Saturation'}: {draft.backgroundSaturation}%</Label>
                    <Slider value={[draft.backgroundSaturation]} min={0} max={50} step={1} onValueChange={([v]) => updateDraft('backgroundSaturation', v)} />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'লাইটনেস' : 'Lightness'}: {draft.backgroundLightness}%</Label>
                    <Slider value={[draft.backgroundLightness]} min={85} max={100} step={1} onValueChange={([v]) => updateDraft('backgroundLightness', v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'সাইডবার গাঢ়তা' : 'Sidebar Darkness'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border" style={{ backgroundColor: `hsl(${draft.primaryHue}, 35%, ${draft.sidebarDarkness}%)` }} />
                    <p className="text-sm text-muted-foreground">{draft.sidebarDarkness}%</p>
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'গাঢ়তা' : 'Darkness'}: {draft.sidebarDarkness}%</Label>
                    <Slider value={[draft.sidebarDarkness]} min={5} max={30} step={1} onValueChange={([v]) => updateDraft('sidebarDarkness', v)} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Color presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? 'রেডিমেড থিম' : 'Theme Presets'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: bn ? 'ইসলামিক গ্রিন' : 'Islamic Green', h: 152, s: 55, l: 28, ah: 42, as: 85, al: 55 },
                    { name: bn ? 'রয়েল ব্লু' : 'Royal Blue', h: 220, s: 60, l: 30, ah: 45, as: 90, al: 55 },
                    { name: bn ? 'ক্রিমসন' : 'Crimson', h: 348, s: 65, l: 30, ah: 42, as: 85, al: 55 },
                    { name: bn ? 'টিল' : 'Teal', h: 180, s: 50, l: 28, ah: 38, as: 80, al: 50 },
                    { name: bn ? 'ইন্ডিগো' : 'Indigo', h: 260, s: 55, l: 30, ah: 42, as: 85, al: 55 },
                    { name: bn ? 'আর্থ টোন' : 'Earth Tone', h: 30, s: 45, l: 30, ah: 42, as: 70, al: 50 },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setDraft(prev => ({
                        ...prev,
                        primaryHue: preset.h,
                        primarySaturation: preset.s,
                        primaryLightness: preset.l,
                        accentHue: preset.ah,
                        accentSaturation: preset.as,
                        accentLightness: preset.al,
                      }))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: `hsl(${preset.h}, ${preset.s}%, ${preset.l}%)` }} />
                      <span className="text-sm">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TYPOGRAPHY TAB */}
          <TabsContent value="typography" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'শিরোনাম ফন্ট' : 'Display Font'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={draft.fontDisplay} onValueChange={v => updateDraft('fontDisplay', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p style={{ fontFamily: `"${draft.fontDisplay}", serif` }} className="text-2xl font-bold text-foreground">
                      {bn ? 'শিরোনাম প্রিভিউ' : 'Heading Preview'}
                    </p>
                    <p style={{ fontFamily: `"${draft.fontDisplay}", serif` }} className="text-lg text-muted-foreground">
                      {bn ? 'এটি একটি নমুনা শিরোনাম' : 'This is a sample heading'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'বডি ফন্ট' : 'Body Font'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={draft.fontBody} onValueChange={v => updateDraft('fontBody', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p style={{ fontFamily: `"${draft.fontBody}", sans-serif` }} className="text-base text-foreground">
                      {bn ? 'বডি টেক্সট প্রিভিউ - এটি একটি নমুনা প্যারাগ্রাফ।' : 'Body text preview - This is a sample paragraph.'}
                    </p>
                    <p style={{ fontFamily: `"${draft.fontBody}", sans-serif` }} className="text-sm text-muted-foreground mt-2">
                      {bn ? 'ছোট টেক্সট নমুনা' : 'Small text sample'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LAYOUT TAB */}
          <TabsContent value="layout" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'বর্ডার রেডিয়াস' : 'Border Radius'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">{draft.borderRadius}px</Label>
                    <Slider value={[draft.borderRadius]} min={0} max={24} step={1} onValueChange={([v]) => updateDraft('borderRadius', v)} />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-20 h-14 bg-primary" style={{ borderRadius: `${draft.borderRadius}px` }} />
                    <div className="w-20 h-14 border-2 border-primary" style={{ borderRadius: `${draft.borderRadius}px` }} />
                    <div className="w-20 h-14 bg-accent" style={{ borderRadius: `${draft.borderRadius}px` }} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'বাটন স্টাইল' : 'Button Style'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {(['rounded', 'pill', 'sharp'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => updateDraft('buttonStyle', style)}
                        className={`px-5 py-2 text-sm font-medium transition-all ${
                          draft.buttonStyle === style
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                        style={{
                          borderRadius: style === 'pill' ? '999px' : style === 'sharp' ? '0px' : `${draft.borderRadius}px`,
                        }}
                      >
                        {style === 'rounded' ? (bn ? 'রাউন্ড' : 'Rounded') :
                         style === 'pill' ? (bn ? 'পিল' : 'Pill') : (bn ? 'শার্প' : 'Sharp')}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'হিরো স্টাইল' : 'Hero Style'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {(['gradient', 'solid', 'pattern'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => updateDraft('heroStyle', style)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          draft.heroStyle === style
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {style === 'gradient' ? (bn ? 'গ্রেডিয়েন্ট' : 'Gradient') :
                         style === 'solid' ? (bn ? 'সলিড' : 'Solid') : (bn ? 'প্যাটার্ন' : 'Pattern')}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bn ? 'কার্ড শ্যাডো' : 'Card Shadow'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {(['none', 'soft', 'medium', 'strong'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => updateDraft('cardShadow', style)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                          draft.cardShadow === style
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {style === 'none' ? (bn ? 'নাই' : 'None') :
                         style === 'soft' ? (bn ? 'সফট' : 'Soft') :
                         style === 'medium' ? (bn ? 'মিডিয়াম' : 'Medium') : (bn ? 'স্ট্রং' : 'Strong')}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Live Preview Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{bn ? '📋 প্রিভিউ' : '📋 Preview'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-xl border" style={{
              backgroundColor: `hsl(${draft.backgroundHue}, ${draft.backgroundSaturation}%, ${draft.backgroundLightness}%)`,
              borderRadius: `${draft.borderRadius}px`,
            }}>
              <h2 style={{ fontFamily: `"${draft.fontDisplay}", serif`, color: `hsl(${draft.primaryHue}, ${draft.primarySaturation}%, ${draft.primaryLightness}%)` }} className="text-2xl font-bold mb-2">
                {bn ? 'আল আরাবিয়া সুবহানিয়া' : 'Al-Arabia Subhania'}
              </h2>
              <p style={{ fontFamily: `"${draft.fontBody}", sans-serif` }} className="text-sm mb-4 opacity-70">
                {bn ? 'ইসলামিক শিক্ষার আলোকবর্তিকা' : 'Beacon of Islamic Education'}
              </p>
              <div className="flex gap-3 mb-4">
                <button className="px-5 py-2 text-sm font-semibold text-white" style={{
                  backgroundColor: `hsl(${draft.primaryHue}, ${draft.primarySaturation}%, ${draft.primaryLightness}%)`,
                  borderRadius: draft.buttonStyle === 'pill' ? '999px' : draft.buttonStyle === 'sharp' ? '0px' : `${draft.borderRadius}px`,
                }}>
                  {bn ? 'ভর্তি' : 'Admission'}
                </button>
                <button className="px-5 py-2 text-sm font-semibold" style={{
                  backgroundColor: `hsl(${draft.accentHue}, ${draft.accentSaturation}%, ${draft.accentLightness}%)`,
                  borderRadius: draft.buttonStyle === 'pill' ? '999px' : draft.buttonStyle === 'sharp' ? '0px' : `${draft.borderRadius}px`,
                }}>
                  {bn ? 'ফলাফল' : 'Results'}
                </button>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-1 p-4 bg-white border" style={{
                    borderRadius: `${draft.borderRadius}px`,
                    boxShadow: draft.cardShadow === 'none' ? 'none' :
                      draft.cardShadow === 'soft' ? '0 2px 8px rgba(0,0,0,0.06)' :
                      draft.cardShadow === 'medium' ? '0 4px 16px rgba(0,0,0,0.1)' :
                      '0 8px 30px rgba(0,0,0,0.15)',
                  }}>
                    <div className="w-8 h-8 rounded-full mb-2" style={{ backgroundColor: `hsl(${draft.primaryHue}, ${draft.primarySaturation}%, ${draft.primaryLightness}%)` }} />
                    <p className="text-xs font-medium" style={{ fontFamily: `"${draft.fontBody}", sans-serif` }}>
                      {bn ? `কার্ড ${i}` : `Card ${i}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminThemeCustomizer;
