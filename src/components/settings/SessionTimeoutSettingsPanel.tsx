import React, { useState, useEffect } from 'react';
import {
  Clock,
  Shield,
  Save,
  RotateCcw,
  Smartphone,
  MousePointerClick,
  AlertCircle,
  BellRing,
  UserCog,
  GraduationCap,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useSessionTimeoutSettings,
  type SessionTimeoutSettings,
  DEFAULT_SESSION_TIMEOUT_SETTINGS,
} from '@/hooks/useSessionTimeoutSettings';
import { cn } from '@/lib/utils';

interface SessionTimeoutSettingsPanelProps {
  bn?: boolean;
}

const BG_PRESETS_ADMIN = [
  { labelBn: '৫ মিনিট', labelEn: '5 mins', val: 5 },
  { labelBn: '১০ মিনিট', labelEn: '10 mins', val: 10 },
  { labelBn: '১৫ মিনিট (প্রস্তাবিত)', labelEn: '15 mins (Rec)', val: 15 },
  { labelBn: '৩০ মিনিট', labelEn: '30 mins', val: 30 },
  { labelBn: '১ ঘণ্টা', labelEn: '1 hour', val: 60 },
  { labelBn: 'বন্ধ', labelEn: 'Disabled', val: 0 },
];

const IDLE_PRESETS_ADMIN = [
  { labelBn: '১০ মিনিট', labelEn: '10 mins', val: 10 },
  { labelBn: '১৫ মিনিট', labelEn: '15 mins', val: 15 },
  { labelBn: '২০ মিনিট (প্রস্তাবিত)', labelEn: '20 mins (Rec)', val: 20 },
  { labelBn: '৩০ মিনিট', labelEn: '30 mins', val: 30 },
  { labelBn: '১ ঘণ্টা', labelEn: '1 hour', val: 60 },
  { labelBn: 'বন্ধ', labelEn: 'Disabled', val: 0 },
];

const BG_PRESETS_STAFF = [
  { labelBn: '১০ মিনিট', labelEn: '10 mins', val: 10 },
  { labelBn: '১৫ মিনিট', labelEn: '15 mins', val: 15 },
  { labelBn: '৩০ মিনিট (প্রস্তাবিত)', labelEn: '30 mins (Rec)', val: 30 },
  { labelBn: '৪৫ মিনিট', labelEn: '45 mins', val: 45 },
  { labelBn: '১ ঘণ্টা', labelEn: '1 hour', val: 60 },
  { labelBn: 'বন্ধ', labelEn: 'Disabled', val: 0 },
];

const IDLE_PRESETS_STAFF = [
  { labelBn: '১৫ মিনিট', labelEn: '15 mins', val: 15 },
  { labelBn: '৩০ মিনিট', labelEn: '30 mins', val: 30 },
  { labelBn: '৪০ মিনিট (প্রস্তাবিত)', labelEn: '40 mins (Rec)', val: 40 },
  { labelBn: '১ ঘণ্টা', labelEn: '1 hour', val: 60 },
  { labelBn: '২ ঘণ্টা', labelEn: '2 hours', val: 120 },
  { labelBn: 'বন্ধ', labelEn: 'Disabled', val: 0 },
];

const COUNTDOWN_PRESETS = [
  { labelBn: '১৫ সেকেন্ড', labelEn: '15s', val: 15 },
  { labelBn: '২০ সেকেন্ড', labelEn: '20s', val: 20 },
  { labelBn: '৩০ সেকেন্ড', labelEn: '30s', val: 30 },
  { labelBn: '৬০ সেকেন্ড', labelEn: '60s', val: 60 },
];

export const SessionTimeoutSettingsPanel: React.FC<SessionTimeoutSettingsPanelProps> = ({
  bn = true,
}) => {
  const { settings, updateSettings, isSaving } = useSessionTimeoutSettings();
  const [formData, setFormData] = useState<SessionTimeoutSettings>(settings);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(formData);
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_SESSION_TIMEOUT_SETTINGS });
  };

  const renderPresetButtons = (
    currentVal: number,
    presets: { labelBn: string; labelEn: string; val: number }[],
    onSelect: (val: number) => void
  ) => {
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {presets.map((preset) => {
          const isActive = currentVal === preset.val;
          return (
            <button
              key={preset.val}
              type="button"
              onClick={() => onSelect(preset.val)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border',
                isActive
                  ? preset.val === 0
                    ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400'
                    : 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/40'
                  : 'bg-background hover:bg-muted text-foreground border-border/80'
              )}
            >
              {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{bn ? preset.labelBn : preset.labelEn}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card-elevated p-6 space-y-6 border border-border/60">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                {bn ? 'অটো লগআউট ও সেশন টাইমআউট' : 'Auto-Logout & Session Timeout'}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5',
                    formData.enabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {formData.enabled
                    ? bn
                      ? 'সক্রিয় (Active)'
                      : 'Active'
                    : bn
                    ? 'নিষ্ক্রিয় (Disabled)'
                    : 'Disabled'}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn
                  ? 'স্টাফ ও এডমিন ব্যাকগ্রাউন্ডে গেলে (ট্যাব মিনিমাইজ / স্ক্রিন লক) বা দীর্ঘক্ষণ নিষ্ক্রিয় থাকলে স্বয়ংক্রিয়ভাবে লগআউট করার নিরাপত্তা ব্যবস্থা।'
                  : 'Automatic logout rules when staff or admin are in background or inactive.'}
              </p>
            </div>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-xl border border-border/40">
          <Label htmlFor="master-timeout-toggle" className="text-sm font-semibold cursor-pointer">
            {bn ? 'ফিচার চালু রাখুন' : 'Enable Feature'}
          </Label>
          <Switch
            id="master-timeout-toggle"
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>
      </div>

      {formData.enabled ? (
        <div className="space-y-6">
          {/* Card 1: Admin Timeouts */}
          <div className="p-4 sm:p-5 rounded-xl border border-indigo-200/50 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/40 to-transparent dark:from-indigo-950/15 space-y-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h4 className="font-bold text-foreground text-sm sm:text-base">
                {bn ? 'অ্যাডমিন ও সুপার অ্যাডমিন সেশন কন্ট্রোল' : 'Admin & Super Admin Controls'}
              </h4>
              <Badge variant="secondary" className="text-[11px] ml-auto">
                {bn ? 'উচ্চ নিরাপত্তা' : 'High Security'}
              </Badge>
            </div>

            <div className="space-y-4 pt-1">
              {/* Admin Background */}
              <div className="space-y-2 bg-background/80 p-3.5 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>
                    {bn
                      ? 'ট্যাব মিনিমাইজ / ব্যাকগ্রাউন্ডে গেলে অটো লগআউট'
                      : 'Auto-logout on tab minimize / background'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'ব্রাউজার ট্যাব পরিবর্তন, উইন্ডো মিনিমাইজ বা ফোন লক করে ব্যাকগ্রাউন্ডে রাখলে নির্ধারিত সময় পর স্বয়ংক্রিয় লগআউট হবে।'
                    : 'Auto-logouts when browser tab is inactive, minimized, or screen locked.'}
                </p>
                {renderPresetButtons(
                  formData.admin_background_minutes,
                  BG_PRESETS_ADMIN,
                  (val) => setFormData({ ...formData, admin_background_minutes: val })
                )}
              </div>

              {/* Admin Idle */}
              <div className="space-y-2 bg-background/80 p-3.5 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MousePointerClick className="w-4 h-4 text-primary" />
                  <span>
                    {bn
                      ? 'স্ক্রিনে কোনো কাজ না করলে (নিষ্ক্রিয় / ইনঅ্যাক্টিভ) অটো লগআউট'
                      : 'Auto-logout on idle inactivity (no mouse/key/touch)'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'ট্যাব ওপেন থাকা সত্ত্বেও নির্দিষ্ট সময়ে মাউস না নাড়ালে বা কোনো কাজ না করলে লগআউট হবে।'
                    : 'Auto-logouts when active tab has no mouse/keyboard interaction.'}
                </p>
                {renderPresetButtons(
                  formData.admin_idle_minutes,
                  IDLE_PRESETS_ADMIN,
                  (val) => setFormData({ ...formData, admin_idle_minutes: val })
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Staff Timeouts */}
          <div className="p-4 sm:p-5 rounded-xl border border-sky-200/50 dark:border-sky-900/40 bg-gradient-to-br from-sky-50/40 to-transparent dark:from-sky-950/15 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h4 className="font-bold text-foreground text-sm sm:text-base">
                {bn ? 'শিক্ষক ও স্টাফ সেশন কন্ট্রোল' : 'Teachers & Staff Controls'}
              </h4>
              <Badge variant="secondary" className="text-[11px] ml-auto">
                {bn ? 'স্ট্যান্ডার্ড' : 'Standard'}
              </Badge>
            </div>

            <div className="space-y-4 pt-1">
              {/* Staff Background */}
              <div className="space-y-2 bg-background/80 p-3.5 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>
                    {bn
                      ? 'ট্যাব মিনিমাইজ / ব্যাকগ্রাউন্ডে গেলে অটো লগআউট'
                      : 'Auto-logout on tab minimize / background'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'স্টাফরা কাজ রেখে অন্য অ্যাপে গেলে বা ফোন লক রাখলে নির্ধারিত সময় পর অ্যাকাউন্ট নিরাপদ রাখতে লগআউট হবে।'
                    : 'Protects staff accounts when phone is locked or app is left in background.'}
                </p>
                {renderPresetButtons(
                  formData.staff_background_minutes,
                  BG_PRESETS_STAFF,
                  (val) => setFormData({ ...formData, staff_background_minutes: val })
                )}
              </div>

              {/* Staff Idle */}
              <div className="space-y-2 bg-background/80 p-3.5 rounded-lg border border-border/60">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MousePointerClick className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>
                    {bn
                      ? 'স্ক্রিনে কোনো কাজ না করলে (নিষ্ক্রিয় / ইনঅ্যাক্টিভ) অটো লগআউট'
                      : 'Auto-logout on idle inactivity (no mouse/key/touch)'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'স্টাফদের ব্রাউজারে সাইট খোলা রেখে দীর্ঘক্ষণ কোনো কাজ না করলে অ্যাকাউন্ট নিরাপদ রাখতে লগআউট হবে।'
                    : 'Auto-logouts when staff are idle on screen without interaction.'}
                </p>
                {renderPresetButtons(
                  formData.staff_idle_minutes,
                  IDLE_PRESETS_STAFF,
                  (val) => setFormData({ ...formData, staff_idle_minutes: val })
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Warning Dialog Configuration */}
          <div className="p-4 sm:p-5 rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/15 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-bold text-foreground text-sm sm:text-base">
                  {bn ? 'লগআউটের পূর্বে সতর্কবার্তা পপ-আপ' : 'Warning Dialog Before Logout'}
                </h4>
              </div>
              <Switch
                checked={formData.show_warning_dialog}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, show_warning_dialog: checked })
                }
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {bn
                ? 'লগআউট হওয়ার ঠিক পূর্ব মুহূর্তে ব্যবহারকারীর সামনে একটি সতর্কবার্তা ও কাউন্টডাউন দেখানো হবে। ব্যবহারকারী চাইলে "লগইন বজায় রাখুন" বাটনে ক্লিক করে কাজ চালিয়ে যেতে পারবেন।'
                : 'Displays a popup warning with a countdown before force logout occurs.'}
            </p>

            {formData.show_warning_dialog && (
              <div className="space-y-2 bg-background/80 p-3.5 rounded-lg border border-border/60">
                <Label className="text-xs font-semibold text-foreground">
                  {bn ? 'সতর্কবার্তা প্রদর্শনের সময় (কাউন্টডাউন)' : 'Countdown duration before logout'}
                </Label>
                {renderPresetButtons(
                  formData.warning_countdown_seconds,
                  COUNTDOWN_PRESETS,
                  (val) => setFormData({ ...formData, warning_countdown_seconds: val })
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-border text-center space-y-2 bg-muted/20">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">
            {bn ? 'স্বয়ংক্রিয় লগআউট সুবিধা বর্তমানে বন্ধ রয়েছে' : 'Auto-logout is currently disabled'}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {bn
              ? 'নিরাপত্তা বৃদ্ধি করতে উপরোক্ত সুইচটি অন করে স্টাফ ও এডমিনদের জন্য ব্যাকগ্রাউন্ড ও ইনঅ্যাক্টিভিটি টাইমআউট সক্রিয় করুন।'
              : 'Turn on the switch above to protect accounts from unauthorized access when unattended.'}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isSaving}
          className="w-full sm:w-auto text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {bn ? 'ডিফল্ট সেটিংসে ফিরুন' : 'Reset to Defaults'}
        </Button>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto gap-2 text-xs sm:text-sm font-semibold px-6 bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4" />
          {isSaving
            ? bn
              ? 'সংরক্ষণ হচ্ছে...'
              : 'Saving...'
            : bn
            ? 'সেশন সেটিংস সংরক্ষণ করুন'
            : 'Save Session Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SessionTimeoutSettingsPanel;
