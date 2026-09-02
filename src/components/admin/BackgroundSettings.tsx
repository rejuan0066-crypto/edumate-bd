import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Image, Paintbrush, Palette, Monitor, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import type { BackgroundStyle } from '@/hooks/useWebsiteSettings';

interface BackgroundSettingsProps {
  value: BackgroundStyle;
  onChange: (value: BackgroundStyle) => void;
  disabled?: boolean;
}

const PRESET_GRADIENTS = [
  { label: 'Emerald Glow', value: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' },
  { label: 'Ocean Blue', value: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)' },
  { label: 'Royal Purple', value: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #7c3aed 100%)' },
  { label: 'Sunset Warm', value: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)' },
  { label: 'Midnight', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
];

const BackgroundSettings = ({ value, onChange, disabled }: BackgroundSettingsProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [local, setLocal] = useState<BackgroundStyle>(value);
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const update = (patch: Partial<BackgroundStyle>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const save = () => {
    onChange(local);
    toast.success(bn ? 'ব্যাকগ্রাউন্ড সেটিংস সংরক্ষিত' : 'Background settings saved');
  };

  const previewStyle = (): React.CSSProperties => {
    const isDark = activeTab === 'dark';
    const base: React.CSSProperties = {
      minHeight: '120px',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
    };

    if (local.type === 'color') {
      base.background = isDark ? local.color_dark || local.color || '#0f172a' : local.color || '#f8fafc';
    } else if (local.type === 'gradient') {
      base.background = isDark ? local.gradient_dark || local.gradient || '#0f172a' : local.gradient || '#f8fafc';
    } else if (local.type === 'image') {
      const img = isDark ? local.image_url_dark || local.image_url : local.image_url;
      if (img) {
        base.backgroundImage = `url(${img})`;
        base.backgroundPosition = local.position;
        base.backgroundSize = local.size;
        base.backgroundRepeat = local.repeat;
        base.backgroundAttachment = local.fixed ? 'fixed' : 'scroll';
      } else {
        base.background = isDark
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
      }
    }

    return base;
  };

  const overlayOpacity = Math.max(0, Math.min(100, local.overlay_opacity || 0));

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'color', icon: Paintbrush, label: bn ? 'সলিড রং' : 'Solid Color' },
          { key: 'gradient', icon: Palette, label: bn ? 'গ্রেডিয়েন্ট' : 'Gradient' },
          { key: 'image', icon: Image, label: bn ? 'ছবি' : 'Image' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => update({ type: opt.key as BackgroundStyle['type'] })}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              local.type === opt.key
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-muted-foreground/30'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <opt.icon className={`w-5 h-5 mx-auto mb-1.5 ${local.type === opt.key ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Light/Dark tab */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> {bn ? 'লাইট মোড' : 'Light Mode'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="w-3.5 h-3.5" /> {bn ? 'ডার্ক মোড' : 'Dark Mode'}
        </button>
      </div>

      {/* Color inputs */}
      {local.type === 'color' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">
              {activeTab === 'light' ? (bn ? 'লাইট মোড রং' : 'Light Mode Color') : (bn ? 'ডার্ক মোড রং' : 'Dark Mode Color')}
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                disabled={disabled}
                value={activeTab === 'light' ? (local.color || '#f8fafc') : (local.color_dark || '#0f172a')}
                onChange={(e) =>
                  update(activeTab === 'light' ? { color: e.target.value } : { color_dark: e.target.value })
                }
                className="w-12 h-10 rounded-lg border border-input p-0.5 cursor-pointer disabled:opacity-60"
              />
              <Input
                disabled={disabled}
                value={activeTab === 'light' ? (local.color || '') : (local.color_dark || '')}
                onChange={(e) =>
                  update(activeTab === 'light' ? { color: e.target.value } : { color_dark: e.target.value })
                }
                placeholder="#f8fafc"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gradient inputs */}
      {local.type === 'gradient' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">
              {activeTab === 'light' ? (bn ? 'লাইট মোড গ্রেডিয়েন্ট' : 'Light Mode Gradient') : (bn ? 'ডার্ক মোড গ্রেডিয়েন্ট' : 'Dark Mode Gradient')}
            </Label>
            <select
              disabled={disabled}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mb-2"
              value=""
              onChange={(e) => {
                const preset = PRESET_GRADIENTS.find((p) => p.value === e.target.value);
                if (preset) {
                  update(activeTab === 'light' ? { gradient: preset.value } : { gradient_dark: preset.value });
                }
              }}
            >
              <option value="">{bn ? 'প্রিসেট বাছুন' : 'Choose preset'}</option>
              {PRESET_GRADIENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <textarea
              disabled={disabled}
              value={activeTab === 'light' ? (local.gradient || '') : (local.gradient_dark || '')}
              onChange={(e) =>
                update(activeTab === 'light' ? { gradient: e.target.value } : { gradient_dark: e.target.value })
              }
              placeholder="linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}

      {/* Image inputs */}
      {local.type === 'image' && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">
              {activeTab === 'light' ? (bn ? 'লাইট মোড ছবি' : 'Light Mode Image') : (bn ? 'ডার্ক মোড ছবি' : 'Dark Mode Image')}
            </Label>
            <ImageUpload
              value={activeTab === 'light' ? (local.image_url || '') : (local.image_url_dark || '')}
              onChange={(url) =>
                update(activeTab === 'light' ? { image_url: url } : { image_url_dark: url })
              }
              folder="background"
              aspectRatio="aspect-video"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">{bn ? 'পজিশন' : 'Position'}</Label>
              <Select
                disabled={disabled}
                value={local.position}
                onValueChange={(v) => update({ position: v })}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{bn ? 'সাইজ' : 'Size'}</Label>
              <Select
                disabled={disabled}
                value={local.size}
                onValueChange={(v) => update({ size: v })}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['cover', 'contain', 'auto', '100% 100%'].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{bn ? 'রিপিট' : 'Repeat'}</Label>
              <Select
                disabled={disabled}
                value={local.repeat}
                onValueChange={(v) => update({ repeat: v })}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'space', 'round'].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">{bn ? 'ফিক্সড' : 'Fixed'}</Label>
              <div className="flex items-center h-9">
                <Switch
                  disabled={disabled}
                  checked={local.fixed}
                  onCheckedChange={(v) => update({ fixed: v })}
                />
                <span className="ml-2 text-xs text-muted-foreground">{local.fixed ? (bn ? 'হ্যাঁ' : 'Yes') : (bn ? 'না' : 'No')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">{bn ? 'ওভারলে অপাসিটি' : 'Overlay Opacity'}</Label>
          <span className="text-xs text-muted-foreground">{overlayOpacity}%</span>
        </div>
        <Slider
          disabled={disabled}
          value={[overlayOpacity]}
          onValueChange={([v]) => update({ overlay_opacity: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Preview */}
      <div>
        <Label className="text-xs mb-1.5 block flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5" /> {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}
        </Label>
        <div style={previewStyle()} className="border border-border">
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: activeTab === 'dark'
                ? `rgba(0,0,0,${overlayOpacity / 100})`
                : `rgba(255,255,255,${overlayOpacity / 100})`,
            }}
          >
            <span className="text-sm font-medium text-foreground/80 drop-shadow">
              {bn ? 'ব্যাকগ্রাউন্ড প্রিভিউ' : 'Background Preview'}
            </span>
          </div>
        </div>
      </div>

      <Button
        disabled={disabled || saving}
        onClick={save}
        className="btn-primary-gradient w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'ব্যাকগ্রাউন্ড সংরক্ষণ করুন' : 'Save Background')}
      </Button>
    </div>
  );
};

export default BackgroundSettings;
