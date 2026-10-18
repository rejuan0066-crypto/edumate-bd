import {
  User, Calendar, Heart, Phone, Mail, MapPin, CreditCard, ClipboardList,
  Fingerprint, Building2, GraduationCap, Briefcase, Clock, Users, Home, FileText, DollarSign, Hash
} from 'lucide-react';
import ProfileInfoItem from './ProfileInfoItem';
import ProfileSectionCard from './ProfileSectionCard';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StaffProfileModalProps {
  staff: any;
  bn: boolean;
  showSalary?: boolean;
}

const translateReligion = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = { islam: ['ইসলাম', 'Islam'], hinduism: ['হিন্দু', 'Hinduism'], christianity: ['খ্রিস্টান', 'Christianity'], buddhism: ['বৌদ্ধ', 'Buddhism'], other: ['অন্যান্য', 'Other'] };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const translateGender = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = { male: ['পুরুষ', 'Male'], female: ['মহিলা', 'Female'], other: ['অন্যান্য', 'Other'] };
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
  const map: Record<string, [string, string]> = { residential: ['আবাসিক', 'Residential'], non_residential: ['অনাবাসিক', 'Non-Residential'], day_scholar: ['ডে স্কলার', 'Day Scholar'] };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

const StaffProfileModal = ({ staff, bn, showSalary = true }: StaffProfileModalProps) => {
  const sd = staff.staff_data || {};
  const parents = sd.parents || {};
  const father = parents.father || {};
  const mother = parents.mother || {};
  const guardian = sd.guardian || {};
  const identifier = sd.identifier || {};
  const approver = sd.approver || {};
  const presentAddr = sd.present_address || {};
  const permanentAddr = sd.permanent_address || {};
  const docs = sd.documents || [];

  const formatAddr = (a: any) => [a?.village, a?.postOffice, a?.union, a?.upazila, a?.district, a?.division].filter(Boolean).join(', ');

  const [activeTab, setActiveTab] = useState<'profile' | 'employment' | 'others'>('profile');

  const tabs = [
    { id: 'profile' as const, label: bn ? 'প্রোফাইল' : 'Profile', icon: User },
    { id: 'employment' as const, label: bn ? 'কর্মসংস্থান' : 'Employment', icon: Briefcase },
    { id: 'others' as const, label: bn ? 'অন্যান্য' : 'Others', icon: ClipboardList },
  ];

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
    <div className="space-y-5">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative rounded-[20px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#064e3b] to-[#065f46]" />

        <div className="relative p-6 flex items-start gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-2xl bg-white/25 blur-md" />
            {staff.photo_url ? (
              <img src={staff.photo_url} className="relative w-28 h-32 rounded-2xl object-cover border-[3px] border-white shadow-xl" alt="" />
            ) : (
              <div className="relative w-28 h-32 rounded-2xl bg-white/15 flex items-center justify-center border-[3px] border-white/50">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight truncate">
              {bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn) || '-'}
            </h3>
            {staff.name_bn && staff.name_en && (
              <p className="text-sm text-white/80 truncate">{bn ? staff.name_en : staff.name_bn}</p>
            )}
            {staff.designation && (
              <p className="text-sm font-bold text-white">{staff.designation}</p>
            )}
            {staff.department && <p className="text-xs text-white/70">{staff.department}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {staff.staff_id && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/20">
                  <Hash className="w-3 h-3 text-white" /> {staff.staff_id}
                </span>
              )}
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-lg bg-gradient-to-r',
                statusColor
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {statusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/40 border border-border/20 backdrop-blur-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
                : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/60'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PROFILE TAB ═══════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <ProfileSectionCard title={bn ? 'ব্যক্তিগত তথ্য' : 'Personal Info'} icon={User}>
            <ProfileInfoItem icon={Calendar} label={bn ? 'জন্ম তারিখ' : 'DOB'} value={staff.date_of_birth} />
            <ProfileInfoItem icon={Heart} label={bn ? 'ধর্ম' : 'Religion'} value={translateReligion(staff.religion || sd.religion, bn)} />
            <ProfileInfoItem icon={User} label={bn ? 'লিঙ্গ' : 'Gender'} value={translateGender(staff.gender || sd.gender, bn)} />
            <ProfileInfoItem icon={CreditCard} label="NID" value={staff.nid} />
            <ProfileInfoItem icon={Phone} label={bn ? 'ফোন' : 'Phone'} value={staff.phone ? `${sd.mobile_code || ''}${staff.phone}` : undefined} />
            <ProfileInfoItem icon={Mail} label={bn ? 'ইমেইল' : 'Email'} value={staff.email} />
            <ProfileInfoItem icon={Home} label={bn ? 'আবাসিক' : 'Residence'} value={translateResidence(staff.residence_type || sd.residence_type, bn)} />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'ঠিকানা' : 'Address'} icon={MapPin} columns={2}>
            <ProfileInfoItem icon={MapPin} label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={formatAddr(presentAddr) || staff.address} fullWidth />
            <ProfileInfoItem icon={MapPin} label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={formatAddr(permanentAddr)} fullWidth />
          </ProfileSectionCard>

          {(father.name || mother.name) && (
            <ProfileSectionCard title={bn ? 'পিতা-মাতার তথ্য' : 'Parents Info'} icon={Users}>
              {father.name && <ProfileInfoItem icon={User} label={bn ? 'পিতার নাম' : 'Father'} value={father.name} />}
              {father.occupation && <ProfileInfoItem icon={Briefcase} label={bn ? 'পিতার পেশা' : "Father's Occupation"} value={father.occupation} />}
              {father.nid && <ProfileInfoItem icon={CreditCard} label={bn ? 'পিতার NID' : "Father's NID"} value={father.nid} />}
              {father.mobile && <ProfileInfoItem icon={Phone} label={bn ? 'পিতার ফোন' : "Father's Phone"} value={`${father.mobile_code || ''}${father.mobile}`} />}
              {(father.name && mother.name) && <div className="col-span-full border-t border-border/15 my-1" />}
              {mother.name && <ProfileInfoItem icon={User} label={bn ? 'মাতার নাম' : 'Mother'} value={mother.name} />}
              {mother.occupation && <ProfileInfoItem icon={Briefcase} label={bn ? 'মাতার পেশা' : "Mother's Occupation"} value={mother.occupation} />}
              {mother.nid && <ProfileInfoItem icon={CreditCard} label={bn ? 'মাতার NID' : "Mother's NID"} value={mother.nid} />}
              {mother.mobile && <ProfileInfoItem icon={Phone} label={bn ? 'মাতার ফোন' : "Mother's Phone"} value={`${mother.mobile_code || ''}${mother.mobile}`} />}
            </ProfileSectionCard>
          )}
        </div>
      )}

      {/* ═══════════ EMPLOYMENT TAB ═══════════ */}
      {activeTab === 'employment' && (
        <div className="space-y-4">
          <ProfileSectionCard title={bn ? 'কর্মসংস্থান তথ্য' : 'Employment Info'} icon={Briefcase}>
            <ProfileInfoItem icon={Briefcase} label={bn ? 'কর্মের ধরন' : 'Employment Type'} value={staff.employment_type || sd.employment_type} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'যোগদানের তারিখ' : 'Joining Date'} value={staff.joining_date} />
            <ProfileInfoItem icon={GraduationCap} label={bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'} value={staff.education || sd.education} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'অভিজ্ঞতা' : 'Experience'} value={staff.experience || sd.experience} />
            {showSalary && <ProfileInfoItem icon={DollarSign} label={bn ? 'বেতন' : 'Salary'} value={staff.salary ? `৳${staff.salary}` : undefined} />}
            <ProfileInfoItem icon={Building2} label={bn ? 'পূর্বের প্রতিষ্ঠান' : 'Previous Institute'} value={staff.previous_institute || sd.previous_institute} />
            <ProfileInfoItem icon={Clock} label={bn ? 'ডিউটি শুরু' : 'Duty Start'} value={formatDutyTime(staff.duty_start_time, bn)} />
            <ProfileInfoItem icon={Clock} label={bn ? 'ডিউটি শেষ' : 'Duty End'} value={formatDutyTime(staff.duty_end_time, bn)} />
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ OTHERS TAB ═══════════ */}
      {activeTab === 'others' && (
        <div className="space-y-4">
          {(guardian.name || guardian.relation) && (
            <ProfileSectionCard title={bn ? 'অভিভাবক তথ্য' : 'Guardian Info'} icon={Users}>
              {guardian.name && <ProfileInfoItem icon={User} label={bn ? 'নাম' : 'Name'} value={guardian.name} />}
              {guardian.relation && <ProfileInfoItem icon={Users} label={bn ? 'সম্পর্ক' : 'Relation'} value={guardian.relation} />}
              {guardian.nid && <ProfileInfoItem icon={CreditCard} label="NID" value={guardian.nid} />}
              {guardian.mobile && <ProfileInfoItem icon={Phone} label={bn ? 'ফোন' : 'Phone'} value={`${guardian.mobile_code || ''}${guardian.mobile}`} />}
              {formatAddr(guardian.present_address) && <ProfileInfoItem icon={MapPin} label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={formatAddr(guardian.present_address)} fullWidth />}
              {formatAddr(guardian.permanent_address) && <ProfileInfoItem icon={MapPin} label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={formatAddr(guardian.permanent_address)} fullWidth />}
            </ProfileSectionCard>
          )}

          {(identifier.name || identifier.relation) && (
            <ProfileSectionCard title={bn ? 'পরিচয়দাতা' : 'Referee / Identifier'} icon={Fingerprint}>
              {identifier.name && <ProfileInfoItem icon={User} label={bn ? 'নাম' : 'Name'} value={identifier.name} />}
              {identifier.relation && <ProfileInfoItem icon={Users} label={bn ? 'সম্পর্ক' : 'Relation'} value={identifier.relation} />}
              {identifier.nid && <ProfileInfoItem icon={CreditCard} label="NID" value={identifier.nid} />}
              {identifier.mobile && <ProfileInfoItem icon={Phone} label={bn ? 'ফোন' : 'Phone'} value={`${identifier.mobile_code || ''}${identifier.mobile}`} />}
              {formatAddr(identifier.address) && <ProfileInfoItem icon={MapPin} label={bn ? 'ঠিকানা' : 'Address'} value={formatAddr(identifier.address)} fullWidth />}
            </ProfileSectionCard>
          )}

          {(approver.name || approver.position) && (
            <ProfileSectionCard title={bn ? 'অনুমোদনকারী' : 'Approver'} icon={ClipboardList}>
              {approver.name && <ProfileInfoItem icon={User} label={bn ? 'নাম' : 'Name'} value={approver.name} />}
              {approver.position && <ProfileInfoItem icon={Briefcase} label={bn ? 'পদবী' : 'Position'} value={approver.position} />}
              {approver.date && <ProfileInfoItem icon={Calendar} label={bn ? 'তারিখ' : 'Date'} value={approver.date} />}
            </ProfileSectionCard>
          )}

          {docs.length > 0 && (
            <ProfileSectionCard title={bn ? 'ডকুমেন্টস' : 'Documents'} icon={FileText}>
              <div className="col-span-full space-y-2">
                {docs.map((doc: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="flex-1 text-sm font-bold truncate">{doc.name || doc.type || `Document ${i + 1}`}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 hover:bg-emerald-500/15 transition-colors shrink-0">
                        {bn ? 'দেখুন' : 'View'}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </ProfileSectionCard>
          )}

          {!guardian.name && !identifier.name && !approver.name && docs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground/50 text-sm">
              {bn ? 'কোনো অতিরিক্ত তথ্য নেই' : 'No additional information'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffProfileModal;
