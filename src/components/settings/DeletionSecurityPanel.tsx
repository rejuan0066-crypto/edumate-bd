import { useState } from 'react';
import { Shield, KeyRound, Type, CheckCircle, Save, RotateCcw, Info, Mail, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDeletionSecuritySettings,
  type DeletionProtectionLevel,
  type DeletionSecuritySettings,
  DEFAULT_DELETION_SECURITY_SETTINGS,
} from '@/hooks/useDeletionSecuritySettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeletionSecurityPanelProps {
  bn?: boolean;
}

interface ModuleConfigItem {
  key: keyof DeletionSecuritySettings;
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  recommended: DeletionProtectionLevel;
}

const MODULES: ModuleConfigItem[] = [
  {
    key: 'student',
    titleBn: 'শিক্ষার্থী প্রোফাইল ডিলিট',
    titleEn: 'Student Profile Deletion',
    descBn: 'শিক্ষার্থীর ভর্তি, ছবি, ফলাফল ও সকল ব্যক্তিগত ফাইল মুছে ফেলার নীতিমালা।',
    descEn: 'Policy for removing student admission, marks, files, and profiles.',
    recommended: 'type',
  },
  {
    key: 'staff',
    titleBn: 'শিক্ষক ও স্টাফ প্রোফাইল ডিলিট',
    titleEn: 'Staff & Teacher Profiles',
    descBn: 'শিক্ষক/স্টাফ প্রোফাইল, তথ্য ও ইউজার অ্যাকাউন্ট মুছে ফেলার নীতিমালা।',
    descEn: 'Policy for deleting teacher/staff profiles and login access.',
    recommended: 'type',
  },
  {
    key: 'committee',
    titleBn: 'পরিচালনা কমিটি প্রোফাইল ডিলিট',
    titleEn: 'Committee Members Deletion',
    descBn: 'কমিটি সদস্য, পদবি ও পরিচালনা পর্ষদ ডাটাবেজ থেকে মুছে ফেলার নিরাপত্তা।',
    descEn: 'Removing governing committee members and designation records.',
    recommended: 'type',
  },
  {
    key: 'fee_payment',
    titleBn: 'ফি আদায় ও পেমেন্ট হিস্ট্রি ডিলিট',
    titleEn: 'Fee Collections & Receipts',
    descBn: 'পরিশোধিত ফি আনপেইড করা বা ফি রসিদ ডাটাবেজ থেকে মুছে ফেলা।',
    descEn: 'Marking fee receipts unpaid or deleting collection history.',
    recommended: 'otp',
  },
  {
    key: 'expense',
    titleBn: 'আয়-ব্যয়, ক্যাশ ভাউচার ও উত্তোলন ডিলিট',
    titleEn: 'Expenses, Deposits & Vouchers',
    descBn: 'মাদ্রাসার খরচের এন্ট্রি, টাকা আয়/উত্তোলন ও ক্যাশ ট্রানজেকশন মুছে ফেলার সুরক্ষা।',
    descEn: 'Removing institutional expenditure records, cash deposits, and vouchers.',
    recommended: 'type',
  },
  {
    key: 'academic_session',
    titleBn: 'শিক্ষাবর্ষ (Session), ক্লাস ও বিভাগ ডিলিট',
    titleEn: 'Academic Sessions, Classes & Divisions',
    descBn: 'পুরো শিক্ষাবর্ষ, ক্লাস বা বিভাগ সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা।',
    descEn: 'Removing academic years, classes, or divisions permanently.',
    recommended: 'otp',
  },
  {
    key: 'exam',
    titleBn: 'পরীক্ষা ও ফলাফল (Marksheet) ডিলিট',
    titleEn: 'Exams & Exam Results',
    descBn: 'পরীক্ষার নম্বর, গ্রেডিং শিট বা মেধার তালিকা ডিলিট করার নীতিমালা।',
    descEn: 'Deleting student marks, grading sheets, and results.',
    recommended: 'type',
  },
  {
    key: 'certificate',
    titleBn: 'সনদ ও প্রশংসাপত্র রেকর্ড ডিলিট',
    titleEn: 'Certificates & Testimonials',
    descBn: 'ইস্যুকৃত প্রশংসাপত্র, প্রত্যয়নপত্র ও ছাড়পত্র রেকর্ড মুছে ফেলার সুরক্ষা।',
    descEn: 'Removing issued certificates, testimonials, and transfer records.',
    recommended: 'type',
  },
  {
    key: 'inventory',
    titleBn: 'ইনভেন্টরি মালামাল ও সম্পদ রেকর্ড ডিলিট',
    titleEn: 'Inventory & Fixed Assets',
    descBn: 'মাদ্রাসার স্থায়ী সম্পদ, যন্ত্রপাতি ও খাদ্য স্টক মালামাল মুছে ফেলার নীতিমালা।',
    descEn: 'Deleting fixed assets, equipment, and hostel stock items.',
    recommended: 'type',
  },
  {
    key: 'hostel',
    titleBn: 'হোস্টেল ও বোর্ডিং রেকর্ড ডিলিট',
    titleEn: 'Hostel & Boarding Records',
    descBn: 'হোস্টেল মিল হিসাব, বোর্ডিং মেম্বার ও সিট বণ্টন মুছে ফেলা।',
    descEn: 'Deleting hostel meal logs, boarding members, and seat allocations.',
    recommended: 'type',
  },
  {
    key: 'library',
    titleBn: 'লাইব্রেরি বই ও রেকর্ড ডিলিট',
    titleEn: 'Library Books & Records',
    descBn: 'লাইব্রেরির বই ক্যাটালগ ও বই ইস্যুর হিস্ট্রি মুছে ফেলা।',
    descEn: 'Removing library catalog books and lending history records.',
    recommended: 'confirm',
  },
  {
    key: 'notice_routine',
    titleBn: 'নোটিশ, বিজ্ঞপ্তি ও ক্লাস রুটিন ডিলিট',
    titleEn: 'Notices, Events & Routines',
    descBn: 'প্রকাশিত নোটিশ, ইভেন্ট ও ক্লাসের সময়সূচি মুছে ফেলার নীতিমালা।',
    descEn: 'Deleting published notices, academic calendar events, and routines.',
    recommended: 'confirm',
  },
  {
    key: 'user_account',
    titleBn: 'অ্যাডমিন ও ইউজার অ্যাকাউন্ট ডিলিট',
    titleEn: 'Admin & User Accounts',
    descBn: 'অ্যাডমিন/স্টাফের সিস্টেমে লগইন অ্যাকাউন্ট ও পাসওয়ার্ড এক্সেস মুছে ফেলা।',
    descEn: 'Revoking or removing administrative user accounts and logins.',
    recommended: 'otp',
  },
  {
    key: 'general',
    titleBn: 'অন্যান্য সাধারণ আইটেম',
    titleEn: 'General Items',
    descBn: 'ছুটির তালিকা, সিস্টেম সেটিংস ও অন্যান্য সাধারণ রেকর্ড।',
    descEn: 'Holiday calendars, general settings, and other minor records.',
    recommended: 'confirm',
  },
];

const LEVEL_OPTIONS: Array<{
  id: DeletionProtectionLevel;
  labelBn: string;
  labelEn: string;
  icon: typeof KeyRound;
  activeClass: string;
}> = [
  {
    id: 'otp',
    labelBn: 'ইমেইল OTP + টাইপ',
    labelEn: 'Email OTP + Type',
    icon: KeyRound,
    activeClass: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600 font-bold',
  },
  {
    id: 'type',
    labelBn: 'শুধু নাম টাইপ',
    labelEn: 'Type to Confirm',
    icon: Type,
    activeClass: 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600 font-bold',
  },
  {
    id: 'confirm',
    labelBn: 'সাধারণ কনফার্মেশন',
    labelEn: 'Simple Confirm',
    icon: CheckCircle,
    activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 font-bold',
  },
];

export default function DeletionSecurityPanel({ bn = true }: DeletionSecurityPanelProps) {
  const { settings, updateSettings, isSaving } = useDeletionSecuritySettings();
  const [localSettings, setLocalSettings] = useState<DeletionSecuritySettings>(settings);

  // Sync if settings updated from server
  const [lastServerSettings, setLastServerSettings] = useState(settings);
  if (settings !== lastServerSettings) {
    setLastServerSettings(settings);
    setLocalSettings(settings);
  }

  const handleLevelChange = (key: keyof DeletionSecuritySettings, level: DeletionProtectionLevel) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: level,
    }));
  };

  const handleResetDefaults = () => {
    setLocalSettings(DEFAULT_DELETION_SECURITY_SETTINGS);
    toast.info(bn ? 'ডিফল্ট নীতিমালায় রিসেট করা হয়েছে' : 'Reset to default policies');
  };

  const handleSave = async () => {
    if (localSettings.otp_target_type === 'custom' && !localSettings.otp_custom_email?.trim()) {
      toast.error(bn ? 'অনুগ্রহ করে মূল অ্যাডমিন ইমেইল ঠিকানা প্রদান করুন' : 'Please enter the master admin email');
      return;
    }
    await updateSettings(localSettings);
  };

  return (
    <div className="card-elevated p-5 sm:p-7 space-y-6 rounded-2xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>{bn ? 'ডাটা ডিলিট নিরাপত্তা ও কনফার্মেশন নীতি' : 'Data Deletion Security & Confirmation Policies'}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {bn
              ? 'কোন ধরনের ডাটা মুছে ফেলার সময় কী ধরনের নিরাপত্তা যাচাই কার্যকর হবে তা নিয়ন্ত্রণ করুন।'
              : 'Configure security verification levels required before permanently deleting data.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs h-9 rounded-xl border-border/60 cursor-pointer"
            title={bn ? 'ডিফল্ট নীতিতে ফেরত যান' : 'Reset to recommended defaults'}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <span>{bn ? 'ডিফল্ট' : 'Default'}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary-gradient text-xs h-9 rounded-xl font-bold px-4 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            <span>{isSaving ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ করুন' : 'Save Policies')}</span>
          </Button>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold">
            {bn ? 'যেকোনো বিকল্পেই ডিলিট হওয়ার আইটেমের সম্পূর্ণ বিবরণ দেখানো হবে' : 'Item identification is always presented'}
          </p>
          <p className="text-[11px] opacity-90">
            {bn
              ? 'ডিলিট পপআপে কার নাম, কত রোল বা কোন রসিদ ডিলিট হচ্ছে তা সবসময় দৃশ্যমান থাকবে। "ইমেইল OTP" সিলেক্ট থাকলে মূল অ্যাডমিন ইমেইলে প্রেরিত কোড ছাড়া ডিলিট হবে না।'
              : 'The item name, ID, or receipt being removed will always be clearly visible in the dialog before execution.'}
          </p>
        </div>
      </div>

      {/* ═══════════ OTP TARGET EMAIL CONFIGURATION ═══════════ */}
      <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3.5">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground">
            {bn ? 'ডিলিট OTP প্রেরণের নির্ধারিত ইমেইল ঠিকানা' : 'Target Email Address for Deletion OTP'}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {bn
            ? 'যেসব আইটেমে "ইমেইল OTP" নিরাপত্তা নির্ধারণ করা হয়েছে, সেগুলো ডিলিট করতে চাইলে কোন ইমেইলে ওটিপি কোড যাবে তা এখান থেকে নির্ধারণ করুন।'
            : 'Configure which email address should receive the 6-digit verification code when deleting items protected by Email OTP.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <label
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold select-none',
              localSettings.otp_target_type === 'custom'
                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                : 'border-border/60 hover:bg-background/80 text-muted-foreground'
            )}
          >
            <input
              type="radio"
              name="otp_target_type"
              checked={localSettings.otp_target_type === 'custom'}
              onChange={() => setLocalSettings(s => ({ ...s, otp_target_type: 'custom' }))}
              className="text-primary cursor-pointer"
            />
            <span>{bn ? 'নির্দিষ্ট মূল অ্যাডমিন ইমেইল' : 'Custom Master Admin Email'}</span>
          </label>

          <label
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold select-none',
              localSettings.otp_target_type === 'site_email'
                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                : 'border-border/60 hover:bg-background/80 text-muted-foreground'
            )}
          >
            <input
              type="radio"
              name="otp_target_type"
              checked={localSettings.otp_target_type === 'site_email'}
              onChange={() => setLocalSettings(s => ({ ...s, otp_target_type: 'site_email' }))}
              className="text-primary cursor-pointer"
            />
            <span>{bn ? 'প্রতিষ্ঠানের প্রোফাইল ইমেইল' : 'Institution Profile Email'}</span>
          </label>

          <label
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold select-none',
              localSettings.otp_target_type === 'actor'
                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                : 'border-border/60 hover:bg-background/80 text-muted-foreground'
            )}
          >
            <input
              type="radio"
              name="otp_target_type"
              checked={localSettings.otp_target_type === 'actor'}
              onChange={() => setLocalSettings(s => ({ ...s, otp_target_type: 'actor' }))}
              className="text-primary cursor-pointer"
            />
            <span>{bn ? 'বর্তমান লগইনকৃত অ্যাডমিন' : 'Current Logged-in Admin'}</span>
          </label>
        </div>

        {localSettings.otp_target_type === 'custom' && (
          <div className="pt-2 space-y-1.5 max-w-md">
            <Label className="text-xs font-semibold">
              {bn ? 'মূল অ্যাডমিনের ইমেইল ঠিকানা *' : 'Master Admin Email Address *'}
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="email"
                placeholder={bn ? 'যেমন: principal@subhaniabd.com' : 'e.g. principal@subhaniabd.com'}
                value={localSettings.otp_custom_email || ''}
                onChange={(e) => setLocalSettings(s => ({ ...s, otp_custom_email: e.target.value }))}
                className="pl-9 h-9 text-xs sm:text-sm bg-background rounded-xl border-border/70"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {bn
                ? '⚠️ যে কোনো শিক্ষক বা স্টাফ ডিলিট করার চেষ্টা করলে এই ইমেইলে কোড যাবে। মূল অ্যাডমিনের কোড ছাড়া ডাটা ডিলিট হবে না।'
                : '⚠️ Any critical deletion will strictly dispatch OTP to this designated email address.'}
            </p>
          </div>
        )}
      </div>

      {/* Modules List */}
      <div className="divide-y divide-border/40">
        {MODULES.map((mod) => {
          const currentLevel = localSettings[mod.key] || 'confirm';
          return (
            <div key={mod.key} className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {bn ? mod.titleBn : mod.titleEn}
                  </span>
                  {mod.recommended === 'otp' && (
                    <Badge variant="outline" className="text-[10px] py-0 border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/20 font-bold">
                      {bn ? 'অতি সংবেদনশীল' : 'Critical'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? mod.descBn : mod.descEn}
                </p>
              </div>

              {/* 3-Level Radio / Segment Control with High Contrast Selection */}
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0 gap-1 self-start lg:self-auto">
                {LEVEL_OPTIONS.map((opt) => {
                  const isActive = currentLevel === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleLevelChange(mod.key, opt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 select-none cursor-pointer',
                        isActive
                          ? opt.activeClass
                          : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-background/80 font-medium'
                      )}
                    >
                      {isActive ? (
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5 opacity-60" />
                      )}
                      <span>{bn ? opt.labelBn : opt.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary-gradient text-xs h-9 rounded-xl font-bold px-6 shadow-sm cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}</span>
        </Button>
      </div>
    </div>
  );
}
