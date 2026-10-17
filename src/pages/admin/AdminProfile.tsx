import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, Eye, EyeOff, User, RefreshCw, CheckCircle2, ShieldCheck, Send, Lock, Phone, MapPin, Briefcase, Calendar, GraduationCap, Building2, Home, Award, BookOpen, Hash, Heart, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOtpService } from '@/hooks/useOtpService';
import { useOtpRequirements, isOtpRequiredFor } from '@/hooks/useOtpRequirements';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getRoleDesignationBadges } from '@/lib/roleBadges';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PasswordStrengthMeter, { isPasswordStrongAgainst, firstFailedRuleMessage, usePasswordPolicy } from '@/components/PasswordStrengthMeter';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { useCurrentStaff } from '@/hooks/useCurrentStaff';
import { usePermissions } from '@/hooks/usePermissions';

const PasswordInput = ({ value, onChange, show, onToggle, placeholder }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string }) => (
  <div className="relative">
    <Input className="bg-background pr-10" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(sanitizePasswordInput(e.target.value))} placeholder={placeholder} inputMode="text" autoComplete="new-password" />
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

const AdminProfile = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const policy = usePasswordPolicy();
  const { sendOtp, sending } = useOtpService();
  const { user, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const { reqs: otpReqs } = useOtpRequirements();
  const emailOtpRequired = isOtpRequiredFor(otpReqs, 'email_change');
  const passwordOtpRequired = isOtpRequiredFor(otpReqs, 'password_change');

  const [currentEmail, setCurrentEmail] = useState('');

  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(true);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [usePwOtp, setUsePwOtp] = useState(true);

  // Sync per-flow OTP toggle with admin global config when it loads/changes
  useEffect(() => {
    if (otpReqs) {
      setUseOtp(emailOtpRequired);
      setUsePwOtp(passwordOtpRequired);
    }
  }, [otpReqs, emailOtpRequired, passwordOtpRequired]);
  const [pwStep, setPwStep] = useState<'form' | 'otp' | 'done'>('form');
  const [pwOtpCode, setPwOtpCode] = useState('');
  const [pwCountdown, setPwCountdown] = useState(0);
  const pwTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch profile and staff data
  const { data: profileData } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: staffData, refetch: refetchStaff, isLoading: staffLoading, isFetched: staffFetched } = useCurrentStaff();
  const noProfileRecord = !!user && staffFetched && !staffLoading && !staffData;
  const queryClient = useQueryClient();

  // ─── Permission to edit designation/department on own profile ───
  const { canEdit } = usePermissions();
  const isAdminOfficerProfile = (staffData as any)?.__source === 'administrative';
  const canEditRoleFields = isAdmin
    || (isAdminOfficerProfile ? canEdit('/admin/administrative') : canEdit('/admin/staff'));

  // ─── Designation & Staff Category editor ───
  const [editingRole, setEditingRole] = useState(false);
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  useEffect(() => {
    if (staffData) {
      setEditDesignation(staffData.designation || '');
      const rawCat = staffData.staff_category || (staffData as any).department || '';
      // If legacy 'হিসাব শাখা' or administrative officer without category, default to 'administrative'
      if (rawCat === 'হিসাব শাখা' || rawCat === 'Accounts' || ((staffData as any).__source === 'administrative' && (!rawCat || rawCat === 'হিসাব শাখা'))) {
        setEditCategory('administrative');
      } else {
        setEditCategory(rawCat);
      }
    }
  }, [staffData?.id, staffData?.designation, staffData?.staff_category, (staffData as any)?.department, (staffData as any)?.__source]);

  const { data: designationsList = [] } = useQuery({
    queryKey: ['designations', 'active'],
    queryFn: async () => {
      const { data } = await supabase.from('designations').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: dbCategoriesList = [] } = useQuery({
    queryKey: ['staff_categories', 'active'],
    queryFn: async () => {
      const { data } = await supabase.from('staff_categories').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      return data || [];
    },
  });

  // Canonical department list ensuring প্রশাসন বিভাগ is Rank #1 and always present
  const categoriesList = useMemo(() => {
    const canonical = [
      { key: 'administrative', name: 'Administrative', name_bn: 'প্রশাসন বিভাগ' },
      { key: 'teacher', name: 'Teaching / Academic', name_bn: 'শিক্ষা বিভাগ' },
      { key: 'support', name: 'Support Staff', name_bn: 'অফিস বিভাগ' },
      { key: 'general', name: 'General Staff', name_bn: 'সহায়ক কর্মী' },
    ];

    const list = [...canonical];
    (dbCategoriesList || []).forEach((c: any) => {
      const idx = list.findIndex(x => x.key === c.key);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...c };
      } else {
        list.push(c);
      }
    });

    return list;
  }, [dbCategoriesList]);

  const filteredDesignations = useMemo(() => {
    if (!editCategory) return designationsList;

    let matching = designationsList.filter((d: any) => {
      if (editCategory === 'administrative') {
        return d.staff_category === 'administrative' ||
          ['কোষাধ্যক্ষ', 'প্রিন্সিপাল', 'অধ্যক্ষ', 'পরিচালক', 'অফিসার', 'এডমিন', 'সুপার এডমিন'].some(k => (d.name_bn || '').includes(k));
      }
      return d.staff_category === editCategory;
    });

    if (matching.length === 0) {
      matching = designationsList;
    }

    if (editDesignation && !matching.some((d: any) => (d.name_bn === editDesignation || d.name === editDesignation))) {
      matching = [{ id: 'current', name: editDesignation, name_bn: editDesignation, staff_category: editCategory }, ...matching];
    }

    const seenNames = new Set<string>();
    const uniqueList: any[] = [];
    matching.forEach((d: any) => {
      const name = bn ? (d.name_bn || d.name) : (d.name || d.name_bn);
      if (name && !seenNames.has(name)) {
        seenNames.add(name);
        uniqueList.push(d);
      }
    });

    return uniqueList;
  }, [editCategory, designationsList, editDesignation, bn]);

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (!staffData?.id) throw new Error('No staff record');
      if (!canEditRoleFields) throw new Error(bn ? 'এই ফিল্ড এডিট করার অনুমতি নেই' : 'You do not have permission to edit these fields');
      const isAdminOfficer = (staffData as any).__source === 'administrative';
      if (isAdminOfficer) {
        const { error } = await supabase
          .from('administrative_officers')
          .update({ designation: editDesignation || null, department: editCategory || null })
          .eq('id', staffData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('staff')
          .update({ designation: editDesignation || null, staff_category: editCategory || null })
          .eq('id', staffData.id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success(bn ? 'পদবি ও ডিপার্টমেন্ট আপডেট হয়েছে' : 'Designation & department updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['staff'] }),
        queryClient.invalidateQueries({ queryKey: ['administrative_officers'] }),
        queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['sidebar-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
      await refetchStaff();
      setEditingRole(false);
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'আপডেট ব্যর্থ' : 'Update failed')),
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.email) setCurrentEmail(authUser.email);
    };
    getUser();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  // PW Countdown timer
  useEffect(() => {
    if (pwCountdown <= 0) {
      if (pwTimerRef.current) clearInterval(pwTimerRef.current);
      return;
    }
    pwTimerRef.current = setInterval(() => {
      setPwCountdown(prev => {
        if (prev <= 1) { if (pwTimerRef.current) clearInterval(pwTimerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (pwTimerRef.current) clearInterval(pwTimerRef.current); };
  }, [pwCountdown]);

  // ─── Email Change: Direct (password only) ───
  const handleDirectEmailChange = useCallback(async () => {
    const targetEmail = newEmail.trim();
    const password = emailPassword.trim();
    if (!targetEmail) { toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email'); return; }
    if (!password) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return; }
    if (targetEmail === currentEmail) { toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current'); return; }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-email', {
        body: { new_email: targetEmail, skip_otp: true, current_password: password },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed'));
        setVerifying(false);
        return;
      }
      setCurrentEmail(targetEmail);
      setStep('done');
      toast.success(bn ? '✅ ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : '✅ Email changed successfully!');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: targetEmail, password });
      }, 1500);
    } catch {
      toast.error(bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed');
    }
    setVerifying(false);
  }, [newEmail, emailPassword, currentEmail, bn]);

  // ─── Email Change: OTP flow ───
  const handleSendOtp = useCallback(async () => {
    const targetEmail = newEmail.trim();
    const password = emailPassword.trim();
    if (!targetEmail) { toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email'); return; }
    if (!password) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return; }
    if (targetEmail === currentEmail) { toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current'); return; }

    setVerifyingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentEmail, password });
    setVerifyingPassword(false);
    if (signInError) { toast.error(bn ? 'পাসওয়ার্ড ভুল' : 'Incorrect password'); return; }

    const result = await sendOtp(targetEmail, 'email_verification', targetEmail, 'email_change');
    if (result.success) {
      setExpiryMinutes(result.expiryMinutes || 10);
      setStep('otp');
      setCountdown(60);
      toast.success(bn ? `${targetEmail} এ OTP কোড পাঠানো হয়েছে` : `OTP code sent to ${targetEmail}`);
    }
  }, [newEmail, emailPassword, currentEmail, bn, sendOtp]);

  const handleResendOtp = useCallback(async () => {
    const result = await sendOtp(newEmail.trim(), 'email_verification', newEmail.trim(), 'email_change');
    if (result.success) { setCountdown(60); setOtpCode(''); toast.success(bn ? 'নতুন কোড পাঠানো হয়েছে' : 'New code sent'); }
  }, [newEmail, bn, sendOtp]);

  const handleVerifyAndChangeEmail = useCallback(async () => {
    if (otpCode.length !== 6) { toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code'); return; }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-email', {
        body: { new_email: newEmail.trim(), otp_code: otpCode },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed'));
        setVerifying(false);
        return;
      }
      setCurrentEmail(newEmail.trim());
      setStep('done');
      toast.success(bn ? '✅ ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : '✅ Email changed successfully!');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: newEmail.trim(), password: emailPassword.trim() });
      }, 1500);
    } catch {
      toast.error(bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed');
    }
    setVerifying(false);
  }, [otpCode, newEmail, emailPassword, bn]);

  const handleEmailReset = () => {
    setStep('form');
    setOtpCode('');
    setNewEmail('');
    setEmailPassword('');
    setCountdown(0);
  };

  // ─── Password Change: validate common fields ───
  const validatePwFields = () => {
    if (!currentPassword.trim()) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return false; }
    if (!isPasswordStrongAgainst(newPassword, policy)) { toast.error(firstFailedRuleMessage(newPassword, policy, bn) || (bn ? 'নতুন পাসওয়ার্ড সব শর্ত পূরণ করছে না' : 'New password does not meet requirements')); return false; }
    if (newPassword !== confirmPassword) { toast.error(bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match'); return false; }
    return true;
  };

  const handleChangePassword = useCallback(async () => {
    if (!validatePwFields()) return;
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { current_password: currentPassword.trim(), new_password: newPassword },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed'));
        setChangingPassword(false);
        return;
      }
      toast.success(bn ? '✅ পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : '✅ Password changed successfully!');
      setPwStep('done');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: currentEmail, password: newPassword });
      }, 1000);
    } catch {
      toast.error(bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed');
    }
    setChangingPassword(false);
  }, [currentPassword, newPassword, confirmPassword, currentEmail, bn]);

  // ─── Password Change: OTP flow ───
  const handlePwSendOtp = useCallback(async () => {
    if (!validatePwFields()) return;
    // Verify current password first
    setChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentEmail, password: currentPassword.trim() });
    if (signInError) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড ভুল' : 'Current password incorrect'); setChangingPassword(false); return; }

    const result = await sendOtp(currentEmail, 'password_reset', currentEmail, 'password_change');
    setChangingPassword(false);
    if (result.success) {
      setPwStep('otp');
      setPwCountdown(60);
      toast.success(bn ? `${currentEmail} এ OTP কোড পাঠানো হয়েছে` : `OTP sent to ${currentEmail}`);
    }
  }, [currentPassword, newPassword, confirmPassword, currentEmail, bn, sendOtp]);

  const handlePwResendOtp = useCallback(async () => {
    const result = await sendOtp(currentEmail, 'password_reset', currentEmail, 'password_change');
    if (result.success) { setPwCountdown(60); setPwOtpCode(''); toast.success(bn ? 'নতুন কোড পাঠানো হয়েছে' : 'New code sent'); }
  }, [currentEmail, bn, sendOtp]);

  const handlePwVerifyAndChange = useCallback(async () => {
    if (pwOtpCode.length !== 6) { toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code'); return; }
    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { current_password: currentPassword.trim(), new_password: newPassword, otp_code: pwOtpCode },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed'));
        setChangingPassword(false);
        return;
      }
      setPwStep('done');
      toast.success(bn ? '✅ পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : '✅ Password changed successfully!');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: currentEmail, password: newPassword });
      }, 1000);
    } catch {
      toast.error(bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed');
    }
    setChangingPassword(false);
  }, [pwOtpCode, currentPassword, newPassword, currentEmail, bn]);

  const handlePwReset = () => {
    setPwStep('form');
    setPwOtpCode('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwCountdown(0);
  };

  // ─── Unified role + designation badges (single source of truth in src/lib/roleBadges.ts) ───
  const roleDesignationBadges = getRoleDesignationBadges({
    role,
    designation: staffData?.designation,
    bn,
  });
  const roleLabel = roleDesignationBadges.find((b) => b.kind === 'role')?.label || '';
  const displayName = (bn ? staffData?.name_bn : staffData?.name_en)
    || staffData?.name_bn
    || staffData?.name_en
    || profileData?.full_name
    || user?.user_metadata?.full_name
    || (bn ? 'নাম সেট করা হয়নি' : 'Name not set');

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8 w-full">

        {/* ═══ Hero Profile Header ═══ */}
        <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-10" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f766e 100%)', boxShadow: '0 20px 60px -15px rgba(6, 78, 59, 0.4)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Cpath d='M30 0l30 30-30 30L0 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            {(staffData?.photo_url || profileData?.avatar_url) ? (
              <img src={staffData?.photo_url || profileData?.avatar_url || ''} alt="" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white/30 shadow-xl" style={{ boxShadow: '0 0 30px rgba(255,255,255,0.15), 0 8px 30px rgba(0,0,0,0.2)' }} />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-bold border-4 border-white/20" style={{ boxShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                {displayName[0]}
              </div>
            )}
            <div className="text-center sm:text-left space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{displayName}</h1>
              {staffData?.name_en && staffData.name_en !== staffData.name_bn && (
                <p className="text-white/70 text-sm">{staffData.name_en}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                {roleDesignationBadges.map((b) =>
                  b.kind === 'role' ? (
                    <span key={b.key} className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                      {b.label}
                    </span>
                  ) : (
                    <span key={b.key} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/10">
                      {b.label}
                    </span>
                  )
                )}
                {staffData?.status && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${staffData.status === 'active' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/20' : 'bg-amber-400/20 text-amber-200 border border-amber-400/20'}`}>
                    {staffData.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'পেন্ডিং' : 'Pending')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ No-record fallback banner ═══ */}
        {noProfileRecord && (
          <div className="rounded-[28px] border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-500/5 backdrop-blur-xl p-6 sm:p-7 flex items-start gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
              <User className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {bn ? 'প্রোফাইল রেকর্ড পাওয়া যায়নি' : 'No profile record found'}
              </p>
              <p className="text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
                {bn
                  ? 'আপনার অ্যাকাউন্টের সাথে এখনও কোনো স্টাফ বা প্রশাসনিক কর্মকর্তা রেকর্ড সংযুক্ত করা হয়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন অথবা User Management থেকে আপনাকে যোগ করতে বলুন। ইতোমধ্যে নিচের মৌলিক তথ্য (ইমেইল, পাসওয়ার্ড) ব্যবহার করতে পারবেন।'
                  : 'No staff or administrative officer record is linked to your account yet. Please contact an administrator or ask them to add you from User Management. You can still use the basic info (email, password) below in the meantime.'}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-[32px] border border-border/15 bg-card/75 dark:bg-card/40 backdrop-blur-xl p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2.5 text-base">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><User className="w-4.5 h-4.5 text-primary" /></div>
            {bn ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
          </h3>
          {(() => {
            const fmtDate = (d?: string | null) => {
              if (!d) return null;
              const dt = new Date(d);
              if (isNaN(dt.getTime())) return null;
              const dd = String(dt.getDate()).padStart(2, '0');
              const mm = String(dt.getMonth() + 1).padStart(2, '0');
              const yy = dt.getFullYear();
              return `${dd}/${mm}/${yy}`;
            };
            const empMap: Record<string, { bn: string; en: string }> = {
              full_time: { bn: 'ফুল-টাইম', en: 'Full-time' },
              part_time: { bn: 'পার্ট-টাইম', en: 'Part-time' },
              contract: { bn: 'চুক্তিভিত্তিক', en: 'Contract' },
              guest: { bn: 'অতিথি', en: 'Guest' },
            };
            const resMap: Record<string, { bn: string; en: string }> = {
              residential: { bn: 'আবাসিক', en: 'Residential' },
              non_residential: { bn: 'অনাবাসিক', en: 'Non-residential' },
            };
            const relMap: Record<string, { bn: string; en: string }> = {
              islam: { bn: 'ইসলাম', en: 'Islam' },
              hindu: { bn: 'হিন্দু', en: 'Hindu' },
              christian: { bn: 'খ্রিষ্টান', en: 'Christian' },
              buddhist: { bn: 'বৌদ্ধ', en: 'Buddhist' },
              other: { bn: 'অন্যান্য', en: 'Other' },
            };
            const lookup = (m: Record<string, { bn: string; en: string }>, v?: string | null) =>
              v ? (m[v] ? (bn ? m[v].bn : m[v].en) : v) : null;

            const fields = [
              { icon: Mail, label: bn ? 'ইমেইল' : 'Email', value: currentEmail },
              { icon: Phone, label: bn ? 'মোবাইল' : 'Mobile', value: staffData?.phone || profileData?.phone },
              { icon: Hash, label: (() => {
                  const desigKey = (staffData?.designation || '').toString().trim();
                  const d: any = desigKey ? designationsList.find((x: any) =>
                    x.key === desigKey ||
                    x.name === desigKey ||
                    x.name_bn === desigKey ||
                    String(x.name || '').toLowerCase() === desigKey.toLowerCase()
                  ) : null;
                  const desigName = d
                    ? (bn ? (d.name_bn || d.name) : (d.name || d.name_bn))
                    : desigKey;
                  if (desigName && String(desigName).trim()) {
                    return bn ? `${desigName} আইডি` : `${desigName} ID`;
                  }
                  return bn ? 'স্টাফ আইডি' : 'Staff ID';
                })(), value: staffData?.staff_id },
              { icon: Building2, label: bn ? 'ডিপার্টমেন্ট' : 'Department', value: (() => {
                  const raw = staffData?.department || staffData?.staff_category;
                  if (raw === 'administrative' || raw === 'admin') return bn ? 'প্রশাসন বিভাগ' : 'Administrative';
                  if (raw === 'হিসাব শাখা' && (staffData as any)?.__source === 'administrative') {
                    return bn ? 'প্রশাসন বিভাগ (হিসাব শাখা)' : 'Administrative (Accounts)';
                  }
                  const found: any = categoriesList.find((c: any) => c.key === raw);
                  return found ? (bn ? found.name_bn : found.name) : raw;
                })() },
              { icon: Calendar, label: bn ? 'যোগদান' : 'Joining Date', value: fmtDate(staffData?.joining_date) },
              { icon: Calendar, label: bn ? 'জন্ম তারিখ' : 'Date of Birth', value: fmtDate(staffData?.date_of_birth) },
              { icon: ShieldCheck, label: 'NID', value: staffData?.nid },
              { icon: Heart, label: bn ? 'ধর্ম' : 'Religion', value: lookup(relMap, staffData?.religion) },
              { icon: Clock, label: bn ? 'কর্মসংস্থান ধরন' : 'Employment Type', value: lookup(empMap, staffData?.employment_type) },
              { icon: Home, label: bn ? 'আবাসিক ধরন' : 'Residence Type', value: lookup(resMap, staffData?.residence_type) },
              { icon: GraduationCap, label: bn ? 'শিক্ষাগত যোগ্যতা' : 'Education', value: staffData?.education },
              { icon: Award, label: bn ? 'অভিজ্ঞতা' : 'Experience', value: staffData?.experience },
              { icon: BookOpen, label: bn ? 'পূর্ববর্তী প্রতিষ্ঠান' : 'Previous Institute', value: staffData?.previous_institute },
              { icon: MapPin, label: bn ? 'ঠিকানা' : 'Address', value: staffData?.address },
            ];
            const visible = fields.filter(f => f.value && String(f.value).trim().length > 0);
            const finalList = visible.length > 0 ? visible : fields;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {finalList.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/30 transition-colors duration-300">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 shrink-0">
                      <item.icon className="w-4 h-4 text-primary/70" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{item.value || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ═══ Designation & Category Editor ═══ */}
        {staffData?.id && (
          <div className="rounded-[32px] border border-border/15 bg-card/75 dark:bg-card/40 backdrop-blur-xl p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <h3 className="font-bold text-foreground flex items-center gap-2.5 text-base">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Briefcase className="w-4.5 h-4.5 text-primary" /></div>
                {bn ? 'পদবি ও ডিপার্টমেন্ট' : 'Designation & Department'}
              </h3>
              {!editingRole ? (
                canEditRoleFields ? (
                  <Button size="sm" variant="outline" onClick={() => setEditingRole(true)} className="rounded-full">
                    {bn ? 'এডিট' : 'Edit'}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border/30">
                    <Lock className="w-3 h-3" />
                    {bn ? 'এডিট অনুমতি নেই' : 'No edit permission'}
                  </span>
                )
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setEditingRole(false); setEditDesignation(staffData.designation || ''); setEditCategory(staffData.staff_category || ''); }} className="rounded-full">{bn ? 'বাতিল' : 'Cancel'}</Button>
                  <Button size="sm" onClick={() => saveRoleMutation.mutate()} disabled={saveRoleMutation.isPending || !canEditRoleFields} className="rounded-full" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', color: 'white' }}>
                    {saveRoleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {bn ? 'সেভ' : 'Save'}
                  </Button>
                </div>
              )}
            </div>

            {!editingRole ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 shrink-0"><Briefcase className="w-4 h-4 text-primary/70" /></div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{bn ? 'পদবি' : 'Designation'}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{staffData.designation || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 shrink-0"><User className="w-4 h-4 text-primary/70" /></div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{bn ? 'ডিপার্টমেন্ট' : 'Department'}</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {(() => {
                        const raw = staffData.department || staffData.staff_category;
                        if (raw === 'administrative' || raw === 'admin') return bn ? 'প্রশাসন বিভাগ' : 'Administrative';
                        if (raw === 'হিসাব শাখা' && (staffData as any)?.__source === 'administrative') {
                          return bn ? 'প্রশাসন বিভাগ (হিসাব শাখা)' : 'Administrative (Accounts)';
                        }
                        const found: any = categoriesList.find((c: any) => c.key === raw);
                        return found ? (bn ? found.name_bn : found.name) : (raw || '-');
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'ডিপার্টমেন্ট' : 'Department'}</Label>
                  <Select value={editCategory} onValueChange={(v) => { setEditCategory(v); setEditDesignation(''); }}>
                    <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder={bn ? 'ডিপার্টমেন্ট বেছে নিন' : 'Select department'} /></SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((c: any) => (
                        <SelectItem key={c.key} value={c.key}>{bn ? c.name_bn : c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'পদবি' : 'Designation'}</Label>
                  <Select value={editDesignation} onValueChange={setEditDesignation}>
                    <SelectTrigger className="mt-1.5 bg-background"><SelectValue placeholder={bn ? 'পদবি বেছে নিন' : 'Select designation'} /></SelectTrigger>
                    <SelectContent>
                      {filteredDesignations.map((d: any) => (
                        <SelectItem key={d.id} value={bn ? (d.name_bn || d.name) : (d.name || d.name_bn)}>
                          {bn ? (d.name_bn || d.name) : (d.name || d.name_bn)}
                        </SelectItem>
                      ))}
                      {filteredDesignations.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">{bn ? 'কোনো পদবি নেই' : 'No designations'}</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Email Change Card ═══ */}
        <div className="rounded-[32px] border border-border/15 bg-card/75 dark:bg-card/40 backdrop-blur-xl p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2.5 text-base">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Mail className="w-4.5 h-4.5 text-primary" /></div>
            {bn ? 'লগইন ইমেইল পরিবর্তন' : 'Change Login Email'}
          </h3>

          <div className="mb-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
            <Input className="mt-1.5 bg-muted/20 border-border/20" value={currentEmail} readOnly />
          </div>

          {step === 'form' && (
            <div className="space-y-5">
              {isAdmin && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/15 border border-border/15">
                  <Switch
                    checked={useOtp}
                    onCheckedChange={setUseOtp}
                    disabled={emailOtpRequired}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {bn ? 'OTP যাচাই ব্যবহার করুন' : 'Use OTP Verification'}
                      {emailOtpRequired && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                          {bn ? '(বাধ্যতামূলক)' : '(Required)'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {emailOtpRequired
                        ? (bn ? 'অ্যাডমিন সেটিংস অনুযায়ী ইমেইল পরিবর্তনে OTP বাধ্যতামূলক।' : 'OTP is required for email change per admin settings.')
                        : (useOtp ? (bn ? 'নতুন ইমেইলে OTP কোড পাঠিয়ে যাচাই করা হবে' : 'OTP code will be sent to new email') : (bn ? 'শুধুমাত্র বর্তমান পাসওয়ার্ড দিয়ে পরিবর্তন হবে' : 'Change with current password only'))}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'নতুন ইমেইল' : 'New Email'}</Label>
                <Input className="mt-1.5" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={bn ? 'নতুন ইমেইল অ্যাড্রেস' : 'New email address'} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
                <div className="mt-1.5">
                  <PasswordInput value={emailPassword} onChange={setEmailPassword} show={showEmailPassword} onToggle={() => setShowEmailPassword(!showEmailPassword)} placeholder={bn ? 'পাসওয়ার্ড দিন' : 'Enter password'} />
                </div>
              </div>
              {useOtp ? (
                <Button onClick={handleSendOtp} disabled={sending || verifyingPassword} className="rounded-full px-8 py-3 font-semibold transition-all duration-500 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 6px 25px -5px rgba(5, 150, 105, 0.4)', color: 'white' }}>
                  {(sending || verifyingPassword) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {bn ? 'OTP কোড পাঠান' : 'Send OTP Code'}
                </Button>
              ) : (
                <Button onClick={handleDirectEmailChange} disabled={verifying} className="rounded-full px-8 py-3 font-semibold transition-all duration-500 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 6px 25px -5px rgba(5, 150, 105, 0.4)', color: 'white' }}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
                </Button>
              )}
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{bn ? 'OTP কোড যাচাই করুন' : 'Verify OTP Code'}</p>
                    <p className="text-sm text-muted-foreground">{bn ? `${newEmail} এ পাঠানো ৬ ডিজিটের কোড দিন। মেয়াদ ${expiryMinutes} মিনিট।` : `Enter the 6-digit code sent to ${newEmail}. Expires in ${expiryMinutes} min.`}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleVerifyAndChangeEmail} disabled={verifying || otpCode.length !== 6} className="rounded-full px-6" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', color: 'white' }}>
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'যাচাই ও পরিবর্তন' : 'Verify & Change'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleResendOtp} disabled={countdown > 0 || sending} className="gap-2 rounded-full">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {countdown > 0 ? `${countdown}s` : (bn ? 'আবার পাঠান' : 'Resend')}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleEmailReset} className="rounded-full">{bn ? 'বাতিল' : 'Cancel'}</Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <p className="font-bold text-foreground text-lg">{bn ? 'ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : 'Email Changed Successfully!'}</p>
                <p className="text-sm text-muted-foreground">{bn ? `নতুন ইমেইল: ${currentEmail}` : `New email: ${currentEmail}`}</p>
              </div>
              <Button variant="outline" onClick={handleEmailReset} className="rounded-full">{bn ? 'ঠিক আছে' : 'OK'}</Button>
            </div>
          )}
        </div>

        {/* ═══ Password Change Card ═══ */}
        <div className="rounded-[32px] border border-border/15 bg-card/75 dark:bg-card/40 backdrop-blur-xl p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2.5 text-base">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Lock className="w-4.5 h-4.5 text-primary" /></div>
            {bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </h3>

          {pwStep === 'form' && (
            <div className="space-y-5">
              {isAdmin && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/15 border border-border/15">
                  <Switch
                    checked={usePwOtp}
                    onCheckedChange={setUsePwOtp}
                    disabled={passwordOtpRequired}
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {bn ? 'OTP যাচাই ব্যবহার করুন' : 'Use OTP Verification'}
                      {passwordOtpRequired && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                          {bn ? '(বাধ্যতামূলক)' : '(Required)'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {passwordOtpRequired
                        ? (bn ? 'অ্যাডমিন সেটিংস অনুযায়ী পাসওয়ার্ড পরিবর্তনে OTP বাধ্যতামূলক।' : 'OTP is required for password change per admin settings.')
                        : (usePwOtp ? (bn ? 'ইমেইলে OTP কোড পাঠিয়ে যাচাই করা হবে' : 'OTP code will be sent to your email') : (bn ? 'শুধুমাত্র বর্তমান পাসওয়ার্ড দিয়ে পরিবর্তন হবে' : 'Change with current password only'))}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
                <div className="mt-1.5">
                  <PasswordInput value={currentPassword} onChange={setCurrentPassword} show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} placeholder={bn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'} />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</Label>
                <div className="mt-1.5">
                  <PasswordInput value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} placeholder={bn ? 'নতুন পাসওয়ার্ড' : 'New password'} />
                </div>
                <PasswordStrengthMeter password={newPassword} bn={bn} />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</Label>
                <Input className="mt-1.5" type="password" value={confirmPassword} onChange={e => setConfirmPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'আবার নতুন পাসওয়ার্ড দিন' : 'Re-enter new password'} />
              </div>
              {usePwOtp ? (
                <Button onClick={handlePwSendOtp} disabled={changingPassword || sending} className="rounded-full px-8 py-3 font-semibold transition-all duration-500 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 6px 25px -5px rgba(5, 150, 105, 0.4)', color: 'white' }}>
                  {(changingPassword || sending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {bn ? 'OTP কোড পাঠান' : 'Send OTP Code'}
                </Button>
              ) : (
                <Button onClick={handleChangePassword} disabled={changingPassword} className="rounded-full px-8 py-3 font-semibold transition-all duration-500 hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 6px 25px -5px rgba(5, 150, 105, 0.4)', color: 'white' }}>
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {bn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Change Password'}
                </Button>
              )}
            </div>
          )}

          {pwStep === 'otp' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{bn ? 'OTP কোড যাচাই করুন' : 'Verify OTP Code'}</p>
                    <p className="text-sm text-muted-foreground">{bn ? `${currentEmail} এ পাঠানো ৬ ডিজিটের কোড দিন।` : `Enter the 6-digit code sent to ${currentEmail}.`}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={pwOtpCode} onChange={setPwOtpCode}>
                  <InputOTPGroup>{[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handlePwVerifyAndChange} disabled={changingPassword || pwOtpCode.length !== 6} className="rounded-full px-6" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', color: 'white' }}>
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'যাচাই ও পরিবর্তন' : 'Verify & Change'}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePwResendOtp} disabled={pwCountdown > 0 || sending} className="gap-2 rounded-full">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {pwCountdown > 0 ? `${pwCountdown}s` : (bn ? 'আবার পাঠান' : 'Resend')}
                </Button>
                <Button size="sm" variant="ghost" onClick={handlePwReset} className="rounded-full">{bn ? 'বাতিল' : 'Cancel'}</Button>
              </div>
            </div>
          )}

          {pwStep === 'done' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <p className="font-bold text-foreground text-lg">{bn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : 'Password Changed Successfully!'}</p>
              </div>
              <Button variant="outline" onClick={handlePwReset} className="rounded-full">{bn ? 'ঠিক আছে' : 'OK'}</Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
