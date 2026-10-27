import { useState } from 'react';
import { Shield, KeyRound, Type, CheckCircle, Save, RotateCcw, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useDeletionSecuritySettings,
  type DeletionProtectionLevel,
  type DeletionSecuritySettings,
  DEFAULT_DELETION_SECURITY_SETTINGS,
} from '@/hooks/useDeletionSecuritySettings';
import { cn } from '@/lib/utils';

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
    descBn: 'শিক্ষার্থীর ভর্তি, ছবি ও ব্যক্তিগত ফাইল মুছে ফেলার নীতিমালা।',
    descEn: 'Policy for removing student admission, personal files, and profiles.',
    recommended: 'type',
  },
  {
    key: 'staff',
    titleBn: 'শিক্ষক ও স্টাফ প্রোফাইল ডিলিট',
    titleEn: 'Staff Profile Deletion',
    descBn: 'শিক্ষক/স্টাফ প্রোফাইল ও ইউজার অ্যাকাউন্ট মুছে ফেলার নীতিমালা।',
    descEn: 'Policy for deleting teacher/staff profiles and login access.',
    recommended: 'type',
  },
  {
    key: 'fee_payment',
    titleBn: 'ফি আদায় ও পেমেন্ট হিস্ট্রি ডিলিট',
    titleEn: 'Fee Payments & Collections Deletion',
    descBn: 'পরিশোধিত ফি আনপেইড করা বা ফি রসিদ ডাটাবেজ থেকে মুছে ফেলা।',
    descEn: 'Marking fee receipts unpaid or deleting collection history.',
    recommended: 'otp',
  },
  {
    key: 'academic_session',
    titleBn: 'শিক্ষাবর্ষ (Session) ও ক্লাস ডিলিট',
    titleEn: 'Academic Sessions & Classes',
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
    key: 'expense',
    titleBn: 'আয়-ব্যয় ও ক্যাশ ভাউচার ডিলিট',
    titleEn: 'Expenses & Cash Vouchers',
    descBn: 'মাদ্রাসার খরচের এন্ট্রি ও ক্যাশ ট্রানজেকশন মুছে ফেলার সুরক্ষা।',
    descEn: 'Removing institutional expenditure records and vouchers.',
    recommended: 'type',
  },
  {
    key: 'general',
    titleBn: 'অন্যান্য সাধারণ আইটেম',
    titleEn: 'General Items',
    descBn: 'ক্লাস রুটিন, নোটিশ, লাইব্রেরি বই রেকর্ড, ছুটির দিন ইত্যাদি।',
    descEn: 'Class routines, public notices, book issues, and holidays.',
    recommended: 'confirm',
  },
];

const LEVEL_OPTIONS: Array<{
  id: DeletionProtectionLevel;
  labelBn: string;
  labelEn: string;
  icon: typeof KeyRound;
  badgeClass: string;
}> = [
  {
    id: 'otp',
    labelBn: 'ইমেইল OTP + টাইপ',
    labelEn: 'Email OTP + Type',
    icon: KeyRound,
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  {
    id: 'type',
    labelBn: 'শুধু নাম টাইপ',
    labelEn: 'Type to Confirm',
    icon: Type,
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: 'confirm',
    labelBn: 'সাধারণ কনফার্মেশন',
    labelEn: 'Simple Confirm',
    icon: CheckCircle,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
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
  };

  const handleSave = async () => {
    await updateSettings(localSettings);
  };

  return (
    <div className="card-elevated p-5 sm:p-6 space-y-5 rounded-2xl">
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
            className="text-xs h-9 rounded-xl border-border/60"
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
            className="btn-primary-gradient text-xs h-9 rounded-xl font-bold px-4 shadow-sm"
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

      {/* Modules List */}
      <div className="divide-y divide-border/40">
        {MODULES.map((mod) => {
          const currentLevel = localSettings[mod.key] || 'confirm';
          return (
            <div key={mod.key} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
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

              {/* 3-Level Radio / Segment Control */}
              <div className="inline-flex rounded-xl p-1 bg-muted/40 border border-border/50 shrink-0 gap-1 self-start md:self-auto">
                {LEVEL_OPTIONS.map((opt) => {
                  const isActive = currentLevel === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleLevelChange(mod.key, opt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 select-none',
                        isActive
                          ? 'bg-background text-foreground shadow-xs border border-border/60'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', isActive ? (opt.id === 'otp' ? 'text-rose-600' : opt.id === 'type' ? 'text-amber-600' : 'text-emerald-600') : 'opacity-60')} />
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
          className="btn-primary-gradient text-xs h-9 rounded-xl font-bold px-6 shadow-sm"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          <span>{isSaving ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}</span>
        </Button>
      </div>
    </div>
  );
}
