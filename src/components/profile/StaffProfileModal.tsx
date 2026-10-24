import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveStaffShift, fetchSpecialShifts, fetchDepartmentSchedules } from '@/lib/shiftResolution';
import {
  User, Calendar, Heart, Phone, Mail, MapPin, CreditCard, ClipboardList,
  Fingerprint, Building2, GraduationCap, Briefcase, Clock, Users, Home, FileText, 
  DollarSign, Hash, CheckCircle2, ShieldCheck, UserCheck, ChevronLeft, ChevronRight,
  Eye, Download
} from 'lucide-react';
import ProfileInfoItem from './ProfileInfoItem';
import ProfileSectionCard from './ProfileSectionCard';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStaffDisplayNames } from '@/lib/nameFormatter';
import { formatAddress } from '@/lib/banglaAddressHelper';
import { formatPhoneNumber } from '@/lib/phoneUtils';

interface StaffProfileModalProps {
  staff: any;
  bn: boolean;
  showSalary?: boolean;
}

const translateReligion = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = { 
    islam: ['ইসলাম', 'Islam'], 
    hinduism: ['হিন্দু', 'Hinduism'], 
    christianity: ['খ্রিস্টান', 'Christianity'], 
    buddhism: ['বৌদ্ধ', 'Buddhism'], 
    other: ['অন্যান্য', 'Other'] 
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const translateGender = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = { 
    male: ['পুরুষ', 'Male'], 
    female: ['মহিলা', 'Female'], 
    other: ['অন্যান্য', 'Other'] 
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const translateDepartment = (val: string | undefined, bn: boolean): string => {
  if (!val) return '';
  const map: Record<string, [string, string]> = {
    teacher: ['শিক্ষক', 'Teacher'],
    staff: ['স্টাফ', 'Staff'],
    admin: ['অ্যাডমিন', 'Admin'],
    management: ['ব্যবস্থাপনা', 'Management'],
    academic: ['একাডেমিক', 'Academic'],
    accounts: ['হিসাব শাখা', 'Accounts'],
    general: ['সাধারণ', 'General'],
    principal: ['অধ্যক্ষ', 'Principal'],
    headmaster: ['প্রধান শিক্ষক', 'Headmaster'],
    assistant_teacher: ['সহকারী শিক্ষক', 'Assistant Teacher'],
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const translateEmploymentType = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = {
    full_time: ['পূর্ণকালীন', 'Full Time'],
    'full time': ['পূর্ণকালীন', 'Full Time'],
    part_time: ['খণ্ডকালীন', 'Part Time'],
    'part time': ['খণ্ডকালীন', 'Part Time'],
    contractual: ['চুক্তিভিত্তিক', 'Contractual'],
    guest: ['অতিথি', 'Guest'],
    permanent: ['স্থায়ী', 'Permanent'],
    probation: ['শিক্ষানবিস', 'Probation'],
    intern: ['ইন্টার্ন', 'Intern'],
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const formatDutyTime = (t: string | null | undefined, bn: boolean): string | undefined => {
  if (!t) return undefined;
  const [hStr, mStr] = String(t).split(':');
  const h24 = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h24) || isNaN(m)) return t as string;
  const period = h24 >= 12 ? (bn ? 'অপরাহ্ন' : 'PM') : (bn ? 'পূর্বাহ্ন' : 'AM');
  let h12 = h24 % 12; if (h12 === 0) h12 = 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  const toBn = (s: string) => bn ? s.replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : s;
  return `${toBn(pad(h12))}:${toBn(pad(m))} ${period} (${toBn(pad(h24))}:${toBn(pad(m))})`;
};

const translateResidence = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = { 
    residential: ['আবাসিক', 'Residential'], 
    non_residential: ['অনাবাসিক', 'Non-Residential'], 
    day_scholar: ['ডে স্কলার', 'Day Scholar'] 
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

export type ProfileStepId = 'personal' | 'address' | 'parents' | 'guardian' | 'identifier' | 'introducer' | 'documents' | 'salary';

const StaffProfileModal = ({ staff, bn, showSalary = true }: StaffProfileModalProps) => {
  const sd = staff.staff_data || {};
  const parents = sd.parents || {};
  const father = parents.father || {};
  const mother = parents.mother || {};
  const guardian = sd.guardian || {};
  const identifier = sd.identifier || {};
  const relId = sd.relatives_identifier || {};
  const approver = sd.approver || {};
  const presentAddr = sd.present_address || {};
  const permanentAddr = sd.permanent_address || {};
  const docs = sd.documents || [];

  const formatAddr = (a: any) => formatAddress(a, bn);

  // Dynamically resolve duty time across all 3 tiers (Special Shift, Profile Shift, Department Schedule / Category Default)
  const { data: dynamicShift } = useQuery({
    queryKey: ['staff_dynamic_shift', staff?.id, staff?.duty_start_time, staff?.duty_end_time],
    queryFn: async () => {
      if (!staff?.id) return null;
      const today = new Date().toISOString().slice(0, 10);
      const [specialShifts, departmentSchedules, catRes] = await Promise.all([
        fetchSpecialShifts(supabase),
        fetchDepartmentSchedules(supabase),
        supabase.from('website_settings').select('value').eq('key', 'category_shift_times').maybeSingle(),
      ]);

      const catMap = ((catRes?.data?.value as any) || {}) as Record<string, { start?: string; end?: string }>;
      const cat = staff?.staff_category || staff?.department || null;

      const resolved = resolveStaffShift({
        staffId: staff.id,
        staffCategory: cat,
        targetDate: today,
        profileDuty: {
          start: staff.duty_start_time || sd.duty_start_time,
          end: staff.duty_end_time || sd.duty_end_time,
        },
        specialShifts,
        departmentSchedules,
        categoryTimes: catMap,
        defaultTime: { start: '09:00', end: '17:00' },
      });

      return resolved;
    },
    enabled: !!staff?.id,
    staleTime: 30 * 1000,
  });

  const effectiveStart = dynamicShift?.start || staff.duty_start_time || sd.duty_start_time || '09:00';
  const effectiveEnd = dynamicShift?.end || staff.duty_end_time || sd.duty_end_time || '17:00';

  // Stepper state
  const [activeStep, setActiveStep] = useState<ProfileStepId>('personal');
  const [identifierSubTab, setIdentifierSubTab] = useState<'identifier' | 'introducer'>('identifier');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string } | null>(null);

  // 7-step definition
  const steps: { id: ProfileStepId; stepNumber: number; bn: string; en: string; icon: any; count?: number }[] = [
    { id: 'personal', stepNumber: 1, bn: 'ব্যক্তিগত তথ্য', en: 'Personal Info', icon: User },
    { id: 'address', stepNumber: 2, bn: 'ঠিকানা', en: 'Address', icon: MapPin },
    { id: 'parents', stepNumber: 3, bn: 'পিতা-মাতা', en: 'Parents', icon: Users },
    { id: 'guardian', stepNumber: 4, bn: 'অভিভাবক', en: 'Guardian', icon: UserCheck },
    { id: 'identifier', stepNumber: 5, bn: 'সনাক্তকারী', en: 'Identifier', icon: ShieldCheck },
    { id: 'introducer', stepNumber: 6, bn: 'পরিচয়কারী', en: 'Introducer', icon: Users },
    { id: 'documents', stepNumber: 7, bn: 'ডকুমেন্ট আপলোড', en: 'Documents', icon: FileText, count: docs.length },
    { id: 'salary', stepNumber: 8, bn: 'অনুমোদন ও বেতন', en: 'Approval & Salary', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === activeStep);

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setActiveStep(steps[currentStepIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(steps[currentStepIndex - 1].id);
    }
  };

  const statusColor = staff.status === 'active'
    ? 'from-emerald-400 to-emerald-600 shadow-emerald-500/40'
    : staff.status === 'pending'
    ? 'from-amber-400 to-amber-500 shadow-amber-500/40'
    : 'from-rose-400 to-rose-600 shadow-rose-500/40';

  const statusLabel = staff.status === 'active'
    ? (bn ? 'সক্রিয়' : 'Active')
    : staff.status === 'pending'
    ? (bn ? 'আবেদন' : 'Pending')
    : (bn ? 'নিষ্ক্রিয়' : 'Inactive');

  return (
    <div className="space-y-6">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative rounded-[22px] overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#047857]" />

        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-white/20 blur-sm" />
            {staff.photo_url ? (
              <img src={staff.photo_url} className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl object-cover border-[3px] border-white shadow-lg" alt="" />
            ) : (
              <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-white/15 flex items-center justify-center border-[3px] border-white/50 text-white shadow-lg">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>

          {(() => {
            const displayNames = getStaffDisplayNames(staff.name_bn, staff.name_en, bn);
            return (
              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {displayNames.primary || '-'}
                </h3>
                {displayNames.secondary && (
                  <p className="text-sm text-white/80 truncate font-medium">{displayNames.secondary}</p>
                )}
                {staff.designation && (
                  <p className="text-sm font-semibold text-emerald-100">{staff.designation}</p>
                )}
                {staff.department && (
                  <p className="text-xs text-white/75">{translateDepartment(staff.department, bn)}</p>
                )}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                  {staff.staff_id && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/25 shadow-xs">
                      <Hash className="w-3 h-3 text-white" /> {staff.staff_id}
                    </span>
                  )}
                  <span className={cn(
                    'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-sm bg-gradient-to-r',
                    statusColor
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ═══════════ STEPPER NAVIGATION (7-STEP STRUCTURE) ═══════════ */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <div className="min-w-[650px] sm:min-w-full flex items-center justify-between relative px-2 sm:px-4">
            {/* Horizontal Line behind badges */}
            <div className="absolute top-[18px] left-[35px] right-[35px] h-[3px] bg-muted -z-0" />

            {steps.map((step, idx) => {
              const isActive = activeStep === step.id;
              const isPast = currentStepIndex > idx;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className="flex flex-col items-center group relative z-10 focus:outline-none transition-all px-1"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2',
                      isActive
                        ? 'bg-emerald-800 text-white border-emerald-700 ring-4 ring-emerald-600/20 shadow-md scale-110'
                        : isPast
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-background text-muted-foreground border-border hover:border-emerald-600/50 hover:text-foreground'
                    )}
                  >
                    {step.stepNumber}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-2 font-medium tracking-tight whitespace-nowrap transition-colors text-center leading-tight max-w-[85px] sm:max-w-[100px] truncate',
                      isActive
                        ? 'text-emerald-800 dark:text-emerald-400 font-bold border-b-2 border-emerald-700 pb-0.5'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {bn ? step.bn : step.en}
                    {typeof step.count === 'number' && step.count > 0 && (
                      <span className="ml-1 text-[10px] px-1 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">
                        {step.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ STEP 1: ব্যক্তিগত তথ্য (Personal Info) ═══════════ */}
      {activeStep === 'personal' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <ProfileSectionCard title={bn ? '১. ব্যক্তিগত তথ্য' : '1. Personal Information'} icon={User}>
            <ProfileInfoItem icon={Calendar} label={bn ? 'জন্ম তারিখ' : 'Date of Birth'} value={staff.date_of_birth} />
            <ProfileInfoItem icon={Heart} label={bn ? 'ধর্ম' : 'Religion'} value={translateReligion(staff.religion || sd.religion, bn)} />
            <ProfileInfoItem icon={User} label={bn ? 'লিঙ্গ' : 'Gender'} value={translateGender(staff.gender || sd.gender, bn)} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'জাতীয় পরিচয়পত্র (NID)' : 'National ID'} value={staff.nid} />
            <ProfileInfoItem icon={Phone} label={bn ? 'ব্যক্তিগত মোবাইল' : 'Personal Mobile'} value={formatPhoneNumber(staff.phone, sd.mobile_code)} />
            <ProfileInfoItem icon={Mail} label={bn ? 'ইমেইল' : 'Email'} value={staff.email} />
            <ProfileInfoItem icon={Home} label={bn ? 'আবাসিক অবস্থা' : 'Residence Type'} value={translateResidence(staff.residence_type || sd.residence_type, bn)} />
            <ProfileInfoItem icon={Heart} label={bn ? 'রক্তের গ্রুপ' : 'Blood Group'} value={staff.blood_group || sd.blood_group} />
            <ProfileInfoItem icon={Users} label={bn ? 'বৈবাহিক অবস্থা' : 'Marital Status'} value={staff.marital_status || sd.marital_status} />
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ STEP 2: ঠিকানা (Address) ═══════════ */}
      {activeStep === 'address' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <ProfileSectionCard title={bn ? '২. বর্তমান ঠিকানা (Present Address)' : '2. Present Address'} icon={MapPin} columns={2}>
            {presentAddr.division && <ProfileInfoItem icon={MapPin} label={bn ? 'বিভাগ' : 'Division'} value={presentAddr.division} />}
            {presentAddr.district && <ProfileInfoItem icon={MapPin} label={bn ? 'জেলা' : 'District'} value={presentAddr.district} />}
            {presentAddr.upazila && <ProfileInfoItem icon={MapPin} label={bn ? 'উপজেলা/থানা' : 'Upazila'} value={presentAddr.upazila} />}
            {presentAddr.union && <ProfileInfoItem icon={MapPin} label={bn ? 'ইউনিয়ন' : 'Union'} value={presentAddr.union} />}
            {presentAddr.postOffice && <ProfileInfoItem icon={MapPin} label={bn ? 'ডাকঘর' : 'Post Office'} value={presentAddr.postOffice} />}
            {presentAddr.village && <ProfileInfoItem icon={MapPin} label={bn ? 'গ্রাম/মহল্লা' : 'Village/Street'} value={presentAddr.village} />}
            <ProfileInfoItem 
              icon={MapPin} 
              label={bn ? 'পূর্ণ বর্তমান ঠিকানা' : 'Full Present Address'} 
              value={formatAddr(presentAddr) || (staff.address ? formatAddress(staff.address, bn) : undefined)} 
              fullWidth 
            />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'স্থায়ী ঠিকানা (Permanent Address)' : 'Permanent Address'} icon={Home} columns={2}>
            {permanentAddr.division && <ProfileInfoItem icon={Home} label={bn ? 'বিভাগ' : 'Division'} value={permanentAddr.division} />}
            {permanentAddr.district && <ProfileInfoItem icon={Home} label={bn ? 'জেলা' : 'District'} value={permanentAddr.district} />}
            {permanentAddr.upazila && <ProfileInfoItem icon={Home} label={bn ? 'উপজেলা/থানা' : 'Upazila'} value={permanentAddr.upazila} />}
            {permanentAddr.union && <ProfileInfoItem icon={Home} label={bn ? 'ইউনিয়ন' : 'Union'} value={permanentAddr.union} />}
            {permanentAddr.postOffice && <ProfileInfoItem icon={Home} label={bn ? 'ডাকঘর' : 'Post Office'} value={permanentAddr.postOffice} />}
            {permanentAddr.village && <ProfileInfoItem icon={Home} label={bn ? 'গ্রাম/মহল্লা' : 'Village/Street'} value={permanentAddr.village} />}
            <ProfileInfoItem 
              icon={Home} 
              label={bn ? 'পূর্ণ স্থায়ী ঠিকানা' : 'Full Permanent Address'} 
              value={formatAddr(permanentAddr)} 
              fullWidth 
            />
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ STEP 3: পিতা-মাতা (Parents) ═══════════ */}
      {activeStep === 'parents' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <ProfileSectionCard title={bn ? '৩. পিতার বিবরণ (Father Details)' : "3. Father's Details"} icon={Users}>
            <ProfileInfoItem icon={User} label={bn ? 'পিতার নাম' : "Father's Name"} value={father.name} />
            <ProfileInfoItem icon={Briefcase} label={bn ? 'পেশা' : 'Occupation'} value={father.occupation} />
            <ProfileInfoItem icon={Phone} label={bn ? 'মোবাইল' : 'Mobile'} value={formatPhoneNumber(father.mobile, father.mobile_code)} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'NID' : 'National ID'} value={father.nid} />
            {formatAddr(father.address) && <ProfileInfoItem icon={MapPin} label={bn ? 'পিতার ঠিকানা' : 'Address'} value={formatAddr(father.address)} fullWidth />}
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'মাতার বিবরণ (Mother Details)' : "Mother's Details"} icon={Heart}>
            <ProfileInfoItem icon={User} label={bn ? 'মাতার নাম' : "Mother's Name"} value={mother.name} />
            <ProfileInfoItem icon={Briefcase} label={bn ? 'পেশা' : 'Occupation'} value={mother.occupation} />
            <ProfileInfoItem icon={Phone} label={bn ? 'মোবাইল' : 'Mobile'} value={formatPhoneNumber(mother.mobile, mother.mobile_code)} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'NID' : 'National ID'} value={mother.nid} />
            {formatAddr(mother.address) && <ProfileInfoItem icon={MapPin} label={bn ? 'মাতার ঠিকানা' : 'Address'} value={formatAddr(mother.address)} fullWidth />}
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ STEP 4: অভিভাবক (Guardian) ═══════════ */}
      {activeStep === 'guardian' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {(guardian.name || guardian.relation || guardian.mobile || guardian.nid) ? (
            <ProfileSectionCard title={bn ? '৪. অভিভাবকের তথ্য (Guardian Details)' : '4. Guardian Details'} icon={UserCheck}>
              <ProfileInfoItem icon={User} label={bn ? 'অভিভাবকের নাম' : 'Guardian Name'} value={guardian.name} />
              <ProfileInfoItem icon={Users} label={bn ? 'সম্পর্ক' : 'Relation'} value={guardian.relation} />
              <ProfileInfoItem icon={Phone} label={bn ? 'মোবাইল নম্বর' : 'Mobile'} value={formatPhoneNumber(guardian.mobile, guardian.mobile_code)} />
              <ProfileInfoItem icon={CreditCard} label={bn ? 'NID (১০/১৭ ডিজিট)' : 'National ID'} value={guardian.nid} />
              {formatAddr(guardian.present_address) && (
                <ProfileInfoItem icon={MapPin} label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={formatAddr(guardian.present_address)} fullWidth />
              )}
              {formatAddr(guardian.permanent_address) && (
                <ProfileInfoItem icon={Home} label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={formatAddr(guardian.permanent_address)} fullWidth />
              )}
            </ProfileSectionCard>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border/80 bg-muted/15">
              <UserCheck className="w-12 h-12 text-muted-foreground/35 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                {bn ? 'কোনো অভিভাবকের তথ্য প্রদান করা হয়নি' : 'No guardian details provided'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ STEP 5: সনাক্তকারী ও পরিচয়কারী (Two Tabs) ═══════════ */}
      {activeStep === 'identifier' && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <div className="card-elevated p-6 space-y-6">
            <div className="text-center border-b border-border pb-3">
              <h2 className="font-display font-bold text-foreground text-xl sm:text-2xl">
                {bn ? '৫. সনাক্তকারী ও পরিচয়কারীর তথ্য' : '5. Identifier & Introducer Details'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {bn ? 'স্টাফের ব্যক্তিগত সনাক্তকারী ও পরিচয় প্রদানকারীর বিবরণ' : 'Details of staff identifier and referee'}
              </p>
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-border gap-2">
              <button
                type="button"
                onClick={() => setIdentifierSubTab('identifier')}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                  identifierSubTab === 'identifier'
                    ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{bn ? 'সনাক্তকারী' : 'Identifier'}</span>
                {identifier.name && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">✓</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIdentifierSubTab('introducer')}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all rounded-t-lg',
                  identifierSubTab === 'introducer'
                    ? 'border-emerald-700 text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 shadow-xs'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Users className="w-4 h-4" />
                <span>{bn ? 'পরিচয়কারী' : 'Introducer'}</span>
                {relId.name && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 font-bold">✓</span>
                )}
              </button>
            </div>

            {/* Sub Tab 1: সনাক্তকারী */}
            {identifierSubTab === 'identifier' && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    {bn ? 'সনাক্তকারীর তথ্য (Identifier Details)' : 'Identifier Details'}
                  </h3>
                </div>

                {identifier.name || identifier.relation || identifier.mobile || identifier.nid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileInfoItem icon={User} label={bn ? 'পূর্ণ নাম' : 'Full Name'} value={identifier.name} />
                    <ProfileInfoItem icon={Users} label={bn ? 'সম্পর্ক' : 'Relation'} value={identifier.relation} />
                    <ProfileInfoItem icon={Phone} label={bn ? 'মোবাইল নম্বর' : 'Mobile'} value={formatPhoneNumber(identifier.mobile, identifier.mobile_code)} />
                    <ProfileInfoItem icon={CreditCard} label={bn ? 'NID (১০/১৭ ডিজিট)' : 'National ID'} value={identifier.nid} />
                    {formatAddr(identifier.address) && (
                      <ProfileInfoItem icon={MapPin} label={bn ? 'ঠিকানা' : 'Address'} value={formatAddr(identifier.address)} fullWidth />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl border border-dashed border-border/70 bg-muted/10">
                    <ShieldCheck className="w-10 h-10 text-muted-foreground/35 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      {bn ? 'কোনো সনাক্তকারীর তথ্য সংরক্ষিত নেই' : 'No identifier details available'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub Tab 2: পরিচয়কারী */}
            {identifierSubTab === 'introducer' && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-700" />
                    {bn ? 'পরিচয়কারীর তথ্য (Introducer Details)' : 'Introducer Details'}
                  </h3>
                </div>

                {relId.name || relId.relation || relId.mobile || relId.nid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ProfileInfoItem icon={User} label={bn ? 'পূর্ণ নাম' : 'Full Name'} value={relId.name} />
                    <ProfileInfoItem icon={Users} label={bn ? 'সম্পর্ক' : 'Relation'} value={relId.relation} />
                    <ProfileInfoItem icon={Phone} label={bn ? 'মোবাইল নম্বর' : 'Mobile'} value={formatPhoneNumber(relId.mobile, relId.mobile_code)} />
                    <ProfileInfoItem icon={CreditCard} label={bn ? 'NID (১০/১৭ ডিজিট)' : 'National ID'} value={relId.nid} />
                    {formatAddr(relId.address) && (
                      <ProfileInfoItem icon={MapPin} label={bn ? 'ঠিকানা' : 'Address'} value={formatAddr(relId.address)} fullWidth />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-xl border border-dashed border-border/70 bg-muted/10">
                    <Users className="w-10 h-10 text-muted-foreground/35 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      {bn ? 'কোনো পরিচয়কারীর তথ্য সংরক্ষিত নেই' : 'No introducer details available'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ STEP 6: ডকুমেন্ট আপলোড (Documents) ═══════════ */}
      {activeStep === 'documents' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {docs.length > 0 ? (
            <ProfileSectionCard title={bn ? '৬. সংযুক্ত ডকুমেন্টসমূহ (Attached Documents)' : '6. Attached Documents'} icon={FileText}>
              <div className="col-span-full space-y-3">
                {docs.map((doc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-emerald-500/40 hover:shadow-xs transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate text-foreground">{doc.name || doc.type || (bn ? `ডকুমেন্ট ${i + 1}` : `Document ${i + 1}`)}</p>
                        {doc.type && doc.name && <p className="text-xs text-muted-foreground truncate">{doc.type}</p>}
                      </div>
                    </div>
                    {doc.url ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPreviewDoc({ url: doc.url, name: doc.name || doc.type })}
                        className="gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{bn ? 'ভিউ ডকুমেন্ট' : 'View Document'}</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic shrink-0">{bn ? 'ফাইল নেই' : 'No file'}</span>
                    )}
                  </div>
                ))}
              </div>
            </ProfileSectionCard>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border/80 bg-muted/15">
              <FileText className="w-12 h-12 text-muted-foreground/35 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                {bn ? 'কোনো ডকুমেন্ট আপলোড করা হয়নি' : 'No documents uploaded'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ STEP 7: অনুমোদন ও বেতন (Approval & Salary) ═══════════ */}
      {activeStep === 'salary' && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <ProfileSectionCard title={bn ? '৮. কর্মসংস্থান ও ডিউটি বিবরণ (Employment & Duty Details)' : '8. Employment & Duty Details'} icon={Briefcase}>
            <ProfileInfoItem icon={Briefcase} label={bn ? 'পদবী' : 'Designation'} value={staff.designation} />
            <ProfileInfoItem icon={Building2} label={bn ? 'ডিপার্টমেন্ট' : 'Department'} value={translateDepartment(staff.department, bn)} />
            <ProfileInfoItem icon={Briefcase} label={bn ? 'কর্মের ধরন' : 'Employment Type'} value={translateEmploymentType(staff.employment_type || sd.employment_type, bn)} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'যোগদানের তারিখ' : 'Joining Date'} value={staff.joining_date} />
            <ProfileInfoItem icon={GraduationCap} label={bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'} value={staff.education || sd.education} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'অভিজ্ঞতা' : 'Experience'} value={staff.experience || sd.experience} />
            <ProfileInfoItem icon={Building2} label={bn ? 'পূর্বের প্রতিষ্ঠান' : 'Previous Institute'} value={staff.previous_institute || sd.previous_institute} />
            <ProfileInfoItem 
              icon={Clock} 
              label={bn ? 'ডিউটি শুরু' : 'Duty Start'} 
              value={`${formatDutyTime(effectiveStart, bn) || '-'}${dynamicShift?.isCustomDuty ? (bn ? ' (বিশেষ শিফট)' : ' (Special Shift)') : ''}`} 
            />
            <ProfileInfoItem 
              icon={Clock} 
              label={bn ? 'ডিউটি শেষ' : 'Duty End'} 
              value={formatDutyTime(effectiveEnd, bn) || '-'} 
            />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'অনুমোদন ও বেতন স্কেল (Approval & Salary)' : 'Approval & Salary'} icon={CheckCircle2}>
            <ProfileInfoItem 
              icon={CheckCircle2} 
              label={bn ? 'বর্তমান স্ট্যাটাস' : 'Status'} 
              value={statusLabel} 
            />
            {showSalary && (
              <ProfileInfoItem 
                icon={DollarSign} 
                label={bn ? 'মূল বেতন' : 'Salary'} 
                value={staff.salary ? `৳${staff.salary}` : (bn ? 'নির্ধারিত হয়নি' : 'Not set')} 
              />
            )}
            <ProfileInfoItem icon={User} label={bn ? 'অনুমোদনকারী কর্মকর্তা' : 'Approver Name'} value={approver.name} />
            <ProfileInfoItem icon={Briefcase} label={bn ? 'অনুমোদনকারীর পদবী' : 'Approver Designation'} value={approver.position} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'অনুমোদনের তারিখ' : 'Approval Date'} value={approver.date} />
            {approver.comments && (
              <ProfileInfoItem icon={FileText} label={bn ? 'অনুমোদনকারীর মন্তব্য' : 'Approver Comments'} value={approver.comments} fullWidth />
            )}
            {approver.signature && (
              <div className="col-span-full pt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">{bn ? 'অনুমোদনকারীর স্বাক্ষর' : 'Approver Signature'}</p>
                <div className="inline-block p-2 rounded-xl bg-white border border-border shadow-xs">
                  <img src={approver.signature} alt="Signature" className="h-16 max-w-[200px] object-contain" />
                </div>
              </div>
            )}
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ BOTTOM STEPPER NAVIGATION BUTTONS ═══════════ */}
      <div className="flex items-center justify-between pt-4 border-t border-border/70">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToPrevStep}
          disabled={currentStepIndex === 0}
          className="gap-2 rounded-xl text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{bn ? 'পূর্ববর্তী ধাপ' : 'Previous Step'}</span>
        </Button>

        <span className="text-xs font-semibold text-muted-foreground">
          {bn ? `ধাপ ${currentStepIndex + 1} / ${steps.length} : ${steps[currentStepIndex].bn}` : `Step ${currentStepIndex + 1} of ${steps.length} : ${steps[currentStepIndex].en}`}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToNextStep}
          disabled={currentStepIndex === steps.length - 1}
          className="gap-2 rounded-xl text-xs font-semibold"
        >
          <span>{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={() => setPreviewDoc(null)}
        fileUrl={previewDoc?.url}
        fileName={previewDoc?.name}
        title={previewDoc?.name || (bn ? 'ডকুমেন্ট প্রিভিউ' : 'Document Preview')}
      />
    </div>
  );
};

export default StaffProfileModal;
