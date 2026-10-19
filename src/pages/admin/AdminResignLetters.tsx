import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Printer, Download, Trash2, Loader2, Eye, Pencil, PencilOff, Upload, Plus, UserCheck } from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toast } from 'sonner';
import { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { downloadLetterAsPdf } from '@/lib/letterPdfDownload';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { getStaffDisplayNames } from '@/lib/nameFormatter';

/* ── Editable span helper ─────────────────────────── */
interface EditableProps {
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  className?: string;
  style?: React.CSSProperties;
  tag?: 'span' | 'p' | 'h2' | 'h3';
}

const Editable = ({ value, onChange, editing, className = '', style, tag: Tag = 'span' }: EditableProps) => {
  const ref = useRef<HTMLElement>(null);
  const handleBlur = () => { if (ref.current) onChange(ref.current.innerText.trim()); };
  return (
    <Tag
      ref={ref as any}
      contentEditable={editing}
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`${className} ${editing ? 'outline-none ring-1 ring-primary/30 rounded px-0.5 hover:ring-primary/60 focus:ring-primary/80 transition-shadow' : ''}`}
      style={{ ...style, cursor: editing ? 'text' : 'default' }}
    >
      {value}
    </Tag>
  );
};

const AdminResignLetters = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/resign-letters');
  const [viewLetter, setViewLetter] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [resignDate, setResignDate] = useState('');
  const [reason, setReason] = useState('');
  // Financial settlement & clearance fields
  const [depositAmount, setDepositAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState<'refunded' | 'pending' | 'none'>('none');
  const [salaryDueAmount, setSalaryDueAmount] = useState('');
  const [salaryDueStatus, setSalaryDueStatus] = useState<'paid' | 'pending' | 'none'>('none');

  /* ── Editable overrides ─────────────────── */
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const set = (key: string, val: string) => setOverrides(p => ({ ...p, [key]: val }));
  const get = (key: string, fallback: string) => overrides[key] ?? fallback;

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);

  const resetOverrides = () => {
    setOverrides({});
    setEditMode(false);
    setLocalLogo(null);
    setLocalPhoto(null);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ── Queries ─────────────────── */
  const { data: letters = [], isLoading } = useQuery({
    queryKey: ['resign-letters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resign_letters')
        .select('*, staff:staff_id(photo_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-resign'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_bn, name_en, designation, status, photo_url, staff_data, user_id').eq('status', 'active');
      return data || [];
    },
    enabled: showCreate,
  });

  const { data: institution } = useQuery({
    queryKey: ['institution-info'],
    queryFn: fetchInstitutionInfo,
  });

  const { data: principalInfo } = useQuery({
    queryKey: ['principal-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('key, value')
        .in('key', ['principal_name', 'principal_title_bn', 'principal_title_en']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = typeof r.value === 'string' ? r.value : ''; });
      return map;
    },
  });

  /* ── Generate letter number (Atomic DB RPC) ─── */
  const generateLetterNumber = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('generate_resignation_letter_number');
      if (!error && data) return data;
    } catch {}
    const year = new Date().getFullYear();
    const serial = String(letters.length + 1).padStart(3, '0');
    return `RL-${year}-${serial}`;
  };

  /* ── Create mutation ─────────── */
  const createMutation = useMutation({
    mutationFn: async () => {
      const staff = staffList.find((s: any) => s.id === selectedStaffId);
      if (!staff) throw new Error('Staff not found');
      const letterNumber = await generateLetterNumber();
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('resign_letters').insert({
        letter_number: letterNumber,
        staff_name: (staff as any).name_en || '',
        staff_name_bn: (staff as any).name_bn || '',
        designation: (staff as any).designation || '',
        staff_id: staff.id,
        letter_date: today,
        resign_date: resignDate || today,
        reason: reason || '',
        letter_data: {
          photo_url: (staff as any).photo_url || '',
          settlement: {
            deposit_amount: depositAmount || '',
            deposit_status: depositStatus,
            salary_due_amount: salaryDueAmount || '',
            salary_due_status: salaryDueStatus,
          },
        },
        status: 'issued',
      });
      if (error) throw error;

      // Set staff status to inactive and save resignation metadata
      const nextStaffData = {
        ...((staff as any).staff_data || {}),
        resign_date: resignDate || today,
        resign_reason: reason || '',
        status_reason: 'resigned',
      };
      const { error: staffErr } = await supabase
        .from('staff')
        .update({
          status: 'inactive',
          staff_data: nextStaffData,
        })
        .eq('id', staff.id);
      if (staffErr) console.error('Failed to deactivate staff:', staffErr);

      // Ban user account if linked
      if ((staff as any).user_id) {
        try {
          await supabase.functions.invoke('manage-users', {
            body: { action: 'ban_user', user_id: (staff as any).user_id },
          });
        } catch (e) {
          console.error('Failed to ban user account:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resign-letters'] });
      queryClient.invalidateQueries({ queryKey: ['staff-for-resign'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['resigned-staff-dates'] });
      queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      queryClient.invalidateQueries({ queryKey: ['duty-roster-staff'] });
      toast.success(bn ? 'পদত্যাগ পত্র তৈরি হয়েছে ও স্টাফ নিষ্ক্রিয় হয়েছে' : 'Resign letter created & staff deactivated');
      setShowCreate(false);
      setSelectedStaffId('');
      setResignDate('');
      setReason('');
      setDepositAmount('');
      setDepositStatus('none');
      setSalaryDueAmount('');
      setSalaryDueStatus('none');
    },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error creating letter'),
  });

  /* ── Save settlement edits to DB ── */
  const saveSettlementMutation = useMutation({
    mutationFn: async (letter: any) => {
      const st = ((letter.letter_data as any)?.settlement) || {};
      const nextData = {
        ...((letter.letter_data as any) || {}),
        settlement: {
          deposit_amount: overrides.depositAmount ?? st.deposit_amount ?? '',
          deposit_status: overrides.depositStatus ?? st.deposit_status ?? 'none',
          salary_due_amount: overrides.salaryDueAmount ?? st.salary_due_amount ?? '',
          salary_due_status: overrides.salaryDueStatus ?? st.salary_due_status ?? 'none',
          statement: overrides.settlementStatement ?? st.statement ?? '',
        },
      };
      const { error } = await supabase
        .from('resign_letters')
        .update({ letter_data: nextData })
        .eq('id', letter.id);
      if (error) throw error;
      return nextData;
    },
    onSuccess: (nextData) => {
      queryClient.invalidateQueries({ queryKey: ['resign-letters'] });
      setViewLetter((prev: any) => prev ? { ...prev, letter_data: nextData } : prev);
      toast.success(bn ? 'আর্থিক নিষ্পত্তির তথ্য সংরক্ষিত হয়েছে' : 'Financial settlement saved');
    },
    onError: () => toast.error(bn ? 'সংরক্ষণ করা যায়নি' : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resign_letters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resign-letters'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['resigned-staff-dates'] });
      queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      queryClient.invalidateQueries({ queryKey: ['duty-roster-staff'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      setDeleteId(null);
    },
  });

  /* ── Rejoin (re-activate staff + create joining letter) ── */
  const [rejoinId, setRejoinId] = useState<string | null>(null);
  const rejoinMutation = useMutation({
    mutationFn: async (letter: any) => {
      if (!letter.staff_id) throw new Error('No staff linked');

      // 1. Re-activate staff
      const { error: staffErr } = await supabase
        .from('staff')
        .update({ status: 'active' })
        .eq('id', letter.staff_id);
      if (staffErr) throw staffErr;

      // 2. Generate joining letter number atomically
      let jlNumber = '';
      try {
        const { data, error } = await (supabase as any).rpc('generate_joining_letter_number');
        if (!error && data) jlNumber = data;
      } catch {}
      if (!jlNumber) {
        jlNumber = `JL-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
      }
      const today = new Date().toISOString().split('T')[0];

      // 3. Create reinstatement letter (পুনর্বহাল পত্র)
      const { error: jlErr } = await supabase.from('joining_letters').insert({
        letter_number: jlNumber,
        staff_name: letter.staff_name,
        staff_name_bn: letter.staff_name_bn,
        designation: letter.designation,
        staff_id: letter.staff_id,
        letter_date: today,
        joining_date: today,
        letter_data: letter.letter_data || {},
        status: 'issued',
        letter_type: 'reinstatement',
      });
      if (jlErr) throw jlErr;

      // 4. Update resign letter status
      await supabase
        .from('resign_letters')
        .update({ status: 'rejoined' })
        .eq('id', letter.id);

      // 5. Unban user account if linked
      const { data: staffData } = await supabase
        .from('staff')
        .select('user_id')
        .eq('id', letter.staff_id)
        .maybeSingle();
      if (staffData?.user_id) {
        try {
          // Unban user account
          await supabase.functions.invoke('manage-users', {
            body: { action: 'unban_user', user_id: staffData.user_id },
          });
          // Set profile status to pending (requires admin approval)
          await supabase.functions.invoke('manage-users', {
            body: { action: 'update_status', user_id: staffData.user_id, status: 'pending' },
          });
        } catch (e) {
          console.error('Failed to unban/reset user account:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resign-letters'] });
      queryClient.invalidateQueries({ queryKey: ['joining-letters'] });
      queryClient.invalidateQueries({ queryKey: ['staff-for-resign'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['resigned-staff-dates'] });
      queryClient.invalidateQueries({ queryKey: ['salary-staff'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      queryClient.invalidateQueries({ queryKey: ['duty-roster-staff'] });
      toast.success(bn ? 'পুনর্বহাল করা হয়েছে এবং নতুন যোগদান পত্র তৈরি হয়েছে' : 'Staff rejoined and new joining letter created');
      setRejoinId(null);
    },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error during rejoin'),
  });

  /* ── Build resolved values ──── */
  const resolved = useCallback((letter: any) => {
    const inst = institution || { name: '', name_en: '', address: '', phone: '', logo_url: '' } as any;
    const pName = principalInfo?.principal_name || '';
    const pTitle = principalInfo?.principal_title_bn || (bn ? 'মুহতামিম / প্রিন্সিপাল' : 'Principal / Head');

    const defaultBody = bn
      ? `এই পত্র দ্বারা জানানো যাচ্ছে যে, ${letter.staff_name_bn || letter.staff_name || ''} (পত্র নং: ${letter.letter_number}), "${letter.designation || ''}" পদে কর্মরত, ${inst.name || 'প্রতিষ্ঠান'} থেকে পদত্যাগ করেছেন। পদত্যাগের তারিখ: ${letter.resign_date ? new Date(letter.resign_date).toLocaleDateString('bn-BD') : ''}।`
      : `This is to inform that ${letter.staff_name || ''} (Ref: ${letter.letter_number}), serving as "${letter.designation || ''}", has resigned from ${inst.name_en || inst.name || 'the institution'}. The effective date of resignation is: ${letter.resign_date ? new Date(letter.resign_date).toLocaleDateString('en-US') : ''}.`;

    const defaultClosing = bn
      ? 'তাঁর প্রতি আমরা কৃতজ্ঞতা জ্ঞাপন করছি এবং ভবিষ্যৎ জীবনে সাফল্য কামনা করছি।'
      : 'We express our gratitude for their service and wish them success in future endeavors.';

    const st = ((letter.letter_data as any)?.settlement) || {};
    const depositAmount = get('depositAmount', st.deposit_amount || '');
    const depositStatus = get('depositStatus', st.deposit_status || 'none');
    const salaryDueAmount = get('salaryDueAmount', st.salary_due_amount || '');
    const salaryDueStatus = get('salaryDueStatus', st.salary_due_status || 'none');
    const settlementStatement = get('settlementStatement', st.statement || (bn
      ? 'ঘোষণা: উপরোক্ত সকল আর্থিক দায়-দেনা সম্পূর্ণ নিষ্পত্তি (Full and Final Settlement) করা হয়েছে এবং উভয় পক্ষের মধ্যে প্রতিষ্ঠান সংক্রান্ত কোনো পাওনা-দেনা অবশিষ্ট নেই বলে ঘোষণা করা হলো।'
      : 'Declaration: The above financial settlement constitutes the Full and Final Settlement between the staff member and the institution; no further dues remain outstanding from either side.'));

    return {
      settlement: { depositAmount, depositStatus, salaryDueAmount, salaryDueStatus, settlementStatement },
      instName: get('instName', inst.name || ''),
      instNameEn: get('instNameEn', inst.name_en || ''),
      instAddress: get('instAddress', inst.address || ''),
      instPhone: get('instPhone', inst.phone || ''),
      salutation: get('salutation', bn ? 'জনাব,' : 'Dear,'),
      staffName: get('staffName', letter.staff_name_bn || letter.staff_name || ''),
      designation: get('designation', letter.designation || ''),
      reason: get('reason', letter.reason || (bn ? 'ব্যক্তিগত কারণে' : 'Personal reasons')),
      bodyText: get('bodyText', defaultBody),
      closingText: get('closingText', defaultClosing),
      pName: get('pName', pName),
      pTitle: get('pTitle', pTitle),
      candidateSigLabel: get('candidateSigLabel', bn ? 'পদত্যাগকারীর স্বাক্ষর' : "Resignee's Signature"),
      authoritySigLabel: get('authoritySigLabel', bn ? 'অনুমোদনকারীর স্বাক্ষর' : "Authority's Signature"),
      logoUrl: localLogo || inst.logo_url || '',
      photoUrl: localPhoto || (letter.letter_data as any)?.photo_url || (letter as any).staff?.photo_url || '',
    };
  }, [institution, principalInfo, bn, overrides, localLogo, localPhoto]);

  /* ── Letter HTML builder ────── */
  const buildLetterHtml = (letter: any, r: any, qrSvg: string) => {
    const bodyText = `${r.bodyText}<br/><br/><strong>${bn ? 'কারণ:' : 'Reason:'}</strong> ${r.reason}<br/><br/>${r.closingText}`;

    /* ── Financial settlement & clearance section ── */
    const s = (r as any).settlement || {};
    const fmtMoney = (v: string) => v ? `${bn ? '৳' : 'BDT '}${v}` : (bn ? '—' : '—');
    const depositLabel = s.depositStatus === 'refunded'
      ? (bn ? 'সম্পূর্ণ ফেরত প্রদান করা হয়েছে' : 'Fully refunded')
      : s.depositStatus === 'pending'
        ? (bn ? 'এখনো ফেরত দেওয়া হয়নি (বাকি আছে)' : 'Pending refund')
        : (bn ? 'প্রযোজ্য নয়' : 'Not applicable');
    const salaryLabel = s.salaryDueStatus === 'paid'
      ? (bn ? 'সম্পূর্ণ পরিশোধ করা হয়েছে' : 'Fully paid')
      : s.salaryDueStatus === 'pending'
        ? (bn ? 'এখনো পরিশোধ করা হয়নি (বাকি আছে)' : 'Pending payment')
        : (bn ? 'প্রযোজ্য নয়' : 'Not applicable');
    const settlementHtml = `
    <div class="settlement">
      <h3>${bn ? 'আর্থিক নিষ্পত্তি ও ছাড়পত্র' : 'FINANCIAL SETTLEMENT & CLEARANCE'}</h3>
      <table class="settle-table">
        <tr>
          <th>${bn ? 'জামানত / সিকিউরিটি ডিপোজিট' : 'Security Deposit / Guarantee Money'}</th>
          <td>${fmtMoney(s.depositAmount)}</td>
          <td>${depositLabel}</td>
        </tr>
        <tr>
          <th>${bn ? 'সর্বশেষ বেতন / বকেয়া বেতন' : 'Final Salary / Salary Dues'}</th>
          <td>${fmtMoney(s.salaryDueAmount)}</td>
          <td>${salaryLabel}</td>
        </tr>
      </table>
      <p class="settle-decl"><strong>${bn ? 'পূর্ণ ও চূড়ান্ত নিষ্পত্তি (Full and Final Settlement):' : 'Full and Final Settlement Declaration:'}</strong> ${s.settlementStatement}</p>
    </div>`;

    return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${bn ? 'পদত্যাগ পত্র' : 'Resign Letter'}</title>
<style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:0}
  html,body{width:210mm;height:297mm;margin:0!important;padding:0!important;font-family:'Noto Serif Bengali','Georgia',serif;color:#1a1a1a;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;background:#fff;overflow:hidden}
  .page{width:210mm;height:297mm;padding:12mm;box-sizing:border-box;border:3px double #444;position:relative;break-inside:avoid;page-break-inside:avoid;overflow:hidden}
  .inner-border{border:1px solid #ccc;padding:8mm;position:relative;overflow:hidden;height:calc(297mm - 24mm - 6px);box-sizing:border-box;display:flex;flex-direction:column}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.06;pointer-events:none;z-index:0}
  .watermark img{width:200px;height:200px;object-fit:contain}
  .content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column}
  .header{text-align:center;border-bottom:3px double #333;padding-bottom:14px;margin-bottom:20px;display:flex;align-items:center;gap:12px}
  .header-logo{width:52px;height:52px;object-fit:contain;border-radius:4px}
  .header-text{flex:1;text-align:center}
  .header-text h1{font-size:20px;font-weight:700}
  .header-text p{font-size:12px;color:#555}
  .header-spacer{width:52px}
  .formal-title{text-align:center;margin-bottom:18px}
  .formal-title h2{font-size:18px;font-weight:700;letter-spacing:2px}
  .formal-title .sub{font-size:11px;color:#666;letter-spacing:1px}
  .formal-title .underline{width:80px;border-bottom:2px solid #444;margin:6px auto 0}
  .meta{display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px;color:#555}
  .meta strong{color:#1a1a1a}
  .letter-body{font-size:14px;line-height:2.2;margin-bottom:20px;flex:1}
  .letter-body p{margin-bottom:10px}
  .letter-body .highlight{color:#991b1b;font-weight:700}
  .settlement{margin:4px 0 14px;border:1px solid #bbb;border-radius:6px;padding:10px 12px;background:#fafaf8}
  .settlement h3{font-size:13px;font-weight:700;letter-spacing:1px;color:#1f4d3a;text-align:center;margin-bottom:8px;text-transform:uppercase}
  .settle-table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
  .settle-table th,.settle-table td{border:0.5pt solid #bbb;padding:6px 8px;text-align:left;vertical-align:middle}
  .settle-table th{background:#eef3ef;color:#1f4d3a;width:42%;font-weight:600}
  .settle-decl{font-size:12px;line-height:1.8;text-align:justify;color:#1a1a1a}
  .body-flex{display:flex;gap:20px}
  .body-text{flex:1}
  .photo-box{flex-shrink:0;text-align:center}
  .photo-box .avatar{width:80px;height:80px;border:2px solid #ccc;border-radius:6px;object-fit:cover;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:28px;color:#999}
  .photo-label{font-size:9px;color:#888;margin-top:4px}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:30px}
  .qr-block{text-align:center}
  .qr-block svg,.qr-block img{width:60px;height:60px}
  .qr-label{font-size:8px;color:#888;margin-top:3px}
  .sig{text-align:center}
  .sig .line{width:160px;border-top:1px solid #444;margin-bottom:3px}
  .sig .name{font-size:12px;font-weight:600;margin-bottom:1px}
  .sig .label{font-size:11px;color:#555}
  .sig .date{font-size:10px;color:#666;margin-top:4px}
  .sig-right{display:flex;align-items:flex-end;gap:12px}
  .seal{width:50px;height:50px;border-radius:50%;border:2px dashed #bbb;display:flex;align-items:center;justify-content:center}
  .seal span{font-size:7px;color:#999;text-align:center;line-height:1.2}
  @media print{html,body{margin:0!important;padding:0!important;overflow:hidden}.page{box-shadow:none;border:3px double #444}}
</style>
</head><body>
<div class="page"><div class="inner-border">
  ${r.logoUrl ? `<div class="watermark"><img src="${r.logoUrl}" alt="" /></div>` : ''}
  <div class="content">
    <div class="header">
      ${r.logoUrl ? `<img src="${r.logoUrl}" class="header-logo" alt="Logo" />` : ''}
      <div class="header-text">
        <h1>${r.instName}</h1>
        ${r.instNameEn ? `<p>${r.instNameEn}</p>` : ''}
        ${r.instAddress ? `<p>${r.instAddress}</p>` : ''}
        ${r.instPhone ? `<p>${bn ? 'ফোন' : 'Phone'}: ${r.instPhone}</p>` : ''}
      </div>
      <div class="header-spacer"></div>
    </div>
    <div class="formal-title">
      <h2>${bn ? 'পদত্যাগ পত্র' : 'RESIGNATION LETTER'}</h2>
      <p class="sub">${bn ? 'RESIGNATION LETTER' : 'পদত্যাগ পত্র'}</p>
      <div class="underline"></div>
    </div>
    <div class="meta">
      <span>${bn ? 'পত্র নং' : 'Ref'}: <strong>${letter.letter_number || ''}</strong></span>
      <span>${bn ? 'তারিখ' : 'Date'}: <strong>${letter.letter_date ? new Date(letter.letter_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : ''}</strong></span>
    </div>
    <div class="letter-body">
      <div class="body-flex">
        <div class="body-text">
          <p>${r.salutation}</p>
          <p class="highlight" style="font-size:15px;">${r.staffName}</p>
          <p>${bodyText}</p>
        </div>
        <div class="photo-box">
          <div class="avatar">${r.photoUrl ? `<img src="${r.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />` : (r.staffName || '?').charAt(0)}</div>
          <p class="photo-label">${bn ? 'ছবি' : 'Photo'}</p>
        </div>
      </div>
    </div>
    ${settlementHtml}
    <div class="footer">
      <div class="qr-block" id="qr-container">
        ${qrSvg}
        <p class="qr-label">${bn ? 'ডিজিটাল যাচাই' : 'Digital Verification'}</p>
      </div>
      <div class="sig">
        <div class="line"></div>
        <p class="label">${r.candidateSigLabel}</p>
        <p class="date">${bn ? 'তারিখ: __________' : 'Date: __________'}</p>
      </div>
      <div class="sig-right">
        <div class="seal"><span>${bn ? 'সিল' : 'Official<br/>Seal'}</span></div>
        <div class="sig">
          <div class="line"></div>
          ${r.pName ? `<p class="name">${r.pName}</p>` : ''}
          <p class="label">${r.authoritySigLabel}</p>
          <p class="label">${r.pTitle}</p>
          <p class="date">${bn ? 'তারিখ: __________' : 'Date: __________'}</p>
        </div>
      </div>
    </div>
  </div>
</div></div>
</body></html>`;
  };

  /* ── Print handler ──────────── */
  const handlePrint = async (letter: any) => {
    const r = resolved(letter);
    const qrValue = `RL:${letter.letter_number}|${letter.staff_name}|${letter.resign_date}`;
    const qrSvg = await QRCode.toString(qrValue, { type: 'svg', width: 60, margin: 0 });
    const html = buildLetterHtml(letter, r, qrSvg);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        if (w.document.fonts) {
          w.document.fonts.ready.then(() => w.print()).catch(() => w.print());
        } else {
          w.print();
        }
      }, 800);
    }
  };

  /* ── Direct PDF download handler ─ */
  const handleDownloadPdf = async (letter: any) => {
    try {
      const r = resolved(letter);
      const qrValue = `RL:${letter.letter_number}|${letter.staff_name}|${letter.resign_date}`;
      const qrSvg = await QRCode.toString(qrValue, { type: 'svg', width: 60, margin: 0 });
      const html = buildLetterHtml(letter, r, qrSvg);
      const filename = `resign-letter-${letter.letter_number || 'unknown'}.pdf`;
      await downloadLetterAsPdf(html, filename);
      toast.success(bn ? 'PDF ডাউনলোড সম্পন্ন হয়েছে' : 'PDF downloaded');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || (bn ? 'PDF ডাউনলোড ব্যর্থ' : 'PDF download failed'));
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-destructive" />
            {bn ? 'পদত্যাগ পত্র' : 'Resign Letters'}
            <Badge variant="outline" className="ml-2">{letters.length}</Badge>
          </h1>
          {canAddItem && (
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              {bn ? 'নতুন পদত্যাগ পত্র' : 'New Resign Letter'}
            </Button>
          )}
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : letters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {bn ? 'কোনো পদত্যাগ পত্র পাওয়া যায়নি।' : 'No resign letters found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'পত্র নং' : 'Letter No'}</TableHead>
                  <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'পদবী' : 'Designation'}</TableHead>
                  <TableHead>{bn ? 'পদত্যাগের তারিখ' : 'Resign Date'}</TableHead>
                    <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                    <TableHead className="text-center w-40">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {letters.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-sm">{l.letter_number}</TableCell>
                    <TableCell>
                      {(() => {
                        const displayNames = getStaffDisplayNames(l.staff_name_bn, l.staff_name, bn);
                        return (
                          <>
                            <p className="font-medium">{displayNames.primary || '—'}</p>
                            {displayNames.secondary && <p className="text-xs text-muted-foreground">{displayNames.secondary}</p>}
                          </>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{l.designation}</TableCell>
                    <TableCell>{l.resign_date ? new Date(l.resign_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '—'}</TableCell>
                    <TableCell>
                      {l.status === 'rejoined' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">{bn ? 'পুনর্বহাল' : 'Rejoined'}</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{bn ? 'পদত্যাগী' : 'Resigned'}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => { resetOverrides(); setViewLetter(l); }} title={bn ? 'দেখুন' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-500/10" onClick={() => handlePrint(l)} title={bn ? 'প্রিন্ট' : 'Print'}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-500/10" onClick={() => handleDownloadPdf(l)} title={bn ? 'PDF ডাউনলোড' : 'Download PDF'}>
                          <Download className="w-4 h-4" />
                        </Button>
                        {canEditItem && l.status !== 'rejoined' && l.staff_id && (
                          <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-500/10" onClick={() => setRejoinId(l.id)} title={bn ? 'পুনর্বহাল' : 'Rejoin'}>
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteItem && (
                          <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(l.id)} title={bn ? 'মুছুন' : 'Delete'}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ── Create Dialog ─────────────────────────── */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'নতুন পদত্যাগ পত্র তৈরি করুন' : 'Create Resign Letter'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{bn ? 'স্টাফ নির্বাচন করুন' : 'Select Staff'}</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder={bn ? 'স্টাফ বাছুন...' : 'Choose staff...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name_bn || s.name_en} {s.designation ? `(${s.designation})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'পদত্যাগের তারিখ' : 'Resign Date'}</Label>
                <DatePicker bengali={bn} value={resignDate} onChange={v => setResignDate(v)} />
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'কারণ' : 'Reason'}</Label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={bn ? 'পদত্যাগের কারণ লিখুন...' : 'Enter reason for resignation...'}
                  rows={3}
                />
              </div>

              {/* Financial settlement & clearance */}
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-sm font-semibold text-foreground">{bn ? 'আর্থিক নিষ্পত্তি ও ছাড়পত্র' : 'Financial Settlement & Clearance'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{bn ? 'জামানত/ডিপোজিট (৳)' : 'Security Deposit (BDT)'}</Label>
                    <Input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder={bn ? 'পরিমাণ' : 'Amount'} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{bn ? 'জামানতের অবস্থা' : 'Deposit Status'}</Label>
                    <Select value={depositStatus} onValueChange={v => setDepositStatus(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{bn ? 'প্রযোজ্য নয়' : 'Not applicable'}</SelectItem>
                        <SelectItem value="refunded">{bn ? 'ফেরত প্রদান হয়েছে' : 'Fully refunded'}</SelectItem>
                        <SelectItem value="pending">{bn ? 'বাকি আছে' : 'Pending'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{bn ? 'বকেয়া বেতন (৳)' : 'Salary Dues (BDT)'}</Label>
                    <Input value={salaryDueAmount} onChange={e => setSalaryDueAmount(e.target.value)} placeholder={bn ? 'পরিমাণ' : 'Amount'} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{bn ? 'বেতনের অবস্থা' : 'Salary Status'}</Label>
                    <Select value={salaryDueStatus} onValueChange={v => setSalaryDueStatus(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{bn ? 'প্রযোজ্য নয়' : 'Not applicable'}</SelectItem>
                        <SelectItem value="paid">{bn ? 'পরিশোধ করা হয়েছে' : 'Fully paid'}</SelectItem>
                        <SelectItem value="pending">{bn ? 'বাকি আছে' : 'Pending'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!selectedStaffId || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {bn ? 'পদত্যাগ পত্র তৈরি করুন' : 'Create Resign Letter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── View / Edit Dialog ───────────────────── */}
        <Dialog open={!!viewLetter} onOpenChange={(o) => { if (!o) { setViewLetter(null); resetOverrides(); } }}>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>{bn ? 'পদত্যাগ পত্র' : 'Resignation Letter'}</DialogTitle>
            </DialogHeader>
            {viewLetter && (() => {
              const r = resolved(viewLetter);
              return (
                <div className="flex flex-col">
                  {/* Edit mode toggle */}
                  {canEditItem && (
                    <div className="flex items-center justify-end gap-2 px-4 pt-3">
                      <Button size="sm" variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode(!editMode)} className="gap-1.5">
                        {editMode ? <PencilOff className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        {editMode ? (bn ? 'এডিট বন্ধ' : 'Exit Edit') : (bn ? 'এডিট মোড' : 'Edit Mode')}
                      </Button>
                      {editMode && (
                        <Button
                          size="sm"
                          onClick={() => saveSettlementMutation.mutate(viewLetter)}
                          disabled={saveSettlementMutation.isPending}
                          className="gap-1.5"
                        >
                          {bn ? 'আর্থিক তথ্য সংরক্ষণ' : 'Save Settlement'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Hidden file inputs */}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setLocalLogo)} />
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setLocalPhoto)} />

                  {/* Document */}
                  <div className="m-4 mt-2 border-[3px] border-double border-foreground/30 p-1" style={{ aspectRatio: '210/297', maxWidth: '100%' }}>
                    <div className="border border-foreground/15 p-7 relative overflow-hidden h-full flex flex-col" style={{ color: '#1a1a1a' }}>

                      {/* Watermark */}
                      {r.logoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                          <img src={r.logoUrl} alt="" className="w-56 h-56 object-contain opacity-[0.06]" />
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-4 border-b-[3px] border-double border-foreground/40 pb-4 mb-5">
                          <div
                            className={`relative w-14 h-14 flex-shrink-0 ${editMode ? 'cursor-pointer group' : ''}`}
                            onClick={() => editMode && logoInputRef.current?.click()}
                          >
                            {r.logoUrl ? (
                              <img src={r.logoUrl} alt="Logo" className="w-14 h-14 object-contain rounded" />
                            ) : (
                              <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                            )}
                            {editMode && (
                              <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-center">
                            <Editable tag="h2" value={r.instName} onChange={v => set('instName', v)} editing={editMode} className="text-xl font-bold text-foreground" />
                            {(r.instNameEn || editMode) && <Editable tag="p" value={r.instNameEn} onChange={v => set('instNameEn', v)} editing={editMode} className="text-sm text-muted-foreground" />}
                            {(r.instAddress || editMode) && <Editable tag="p" value={r.instAddress} onChange={v => set('instAddress', v)} editing={editMode} className="text-xs text-muted-foreground mt-0.5" />}
                            {(r.instPhone || editMode) && (
                              <p className="text-xs text-muted-foreground">
                                {bn ? 'ফোন' : 'Phone'}: <Editable value={r.instPhone} onChange={v => set('instPhone', v)} editing={editMode} />
                              </p>
                            )}
                          </div>
                          <div className="w-14" />
                        </div>

                        {/* Title */}
                        <div className="text-center mb-5">
                          <h3 className="text-lg font-bold tracking-wider text-foreground uppercase">
                            {bn ? 'পদত্যাগ পত্র' : 'RESIGNATION LETTER'}
                          </h3>
                          <p className="text-xs text-muted-foreground tracking-wide">{bn ? 'RESIGNATION LETTER' : 'পদত্যাগ পত্র'}</p>
                          <div className="mx-auto mt-1.5 w-24 border-b-2 border-foreground/30" />
                        </div>

                        {/* Meta */}
                        <div className="flex justify-between text-sm mb-5" style={{ color: '#888' }}>
                          <span>{bn ? 'পত্র নং' : 'Ref'}: <span className="font-mono font-semibold" style={{ color: '#1a1a1a' }}>{viewLetter.letter_number}</span></span>
                          <span>{bn ? 'তারিখ' : 'Date'}: <span className="font-medium" style={{ color: '#1a1a1a' }}>{viewLetter.letter_date ? new Date(viewLetter.letter_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '—'}</span></span>
                        </div>

                        {/* Body + Photo */}
                        <div className="flex gap-5 mb-6 flex-1">
                          <div className="flex-1 text-sm space-y-3" style={{ lineHeight: '2.2', color: '#1a1a1a' }}>
                            <Editable tag="p" value={r.salutation} onChange={v => set('salutation', v)} editing={editMode} />
                            <Editable tag="p" value={r.staffName} onChange={v => set('staffName', v)} editing={editMode} className="font-bold text-base" style={{ color: 'hsl(var(--destructive))' }} />
                            <Editable tag="p" value={r.bodyText} onChange={v => set('bodyText', v)} editing={editMode} />
                            <p>
                              <strong>{bn ? 'কারণ:' : 'Reason:'}</strong>{' '}
                              <Editable value={r.reason} onChange={v => set('reason', v)} editing={editMode} />
                            </p>
                            <Editable tag="p" value={r.closingText} onChange={v => set('closingText', v)} editing={editMode} />
                          </div>

                          {/* Photo */}
                          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                            <div
                              className={`relative ${editMode ? 'cursor-pointer group' : ''}`}
                              onClick={() => editMode && photoInputRef.current?.click()}
                            >
                              <Avatar className="w-[88px] h-[88px] border-2 border-foreground/20 rounded-md">
                                <AvatarImage src={r.photoUrl} className="object-cover" />
                                <AvatarFallback className="rounded-md bg-muted text-muted-foreground text-2xl">
                                  {(r.staffName || '?').charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {editMode && (
                                <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Upload className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{bn ? 'ছবি' : 'Photo'}</p>
                          </div>
                        </div>

                        {/* Financial settlement & clearance */}
                        <div className="rounded-md border border-foreground/25 p-3 mb-4 bg-muted/30">
                          <p className="text-[13px] font-bold tracking-wide text-center mb-2 uppercase" style={{ color: '#1f4d3a' }}>
                            {bn ? 'আর্থিক নিষ্পত্তি ও ছাড়পত্র' : 'FINANCIAL SETTLEMENT & CLEARANCE'}
                          </p>
                          <table className="w-full text-xs border-collapse mb-2">
                            <tbody>
                              <tr>
                                <th className="border border-foreground/20 px-2 py-1.5 text-left font-semibold w-2/5" style={{ background: '#eef3ef', color: '#1f4d3a' }}>{bn ? 'জামানত / সিকিউরিটি ডিপোজিট' : 'Security Deposit / Guarantee Money'}</th>
                                <td className="border border-foreground/20 px-2 py-1.5">
                                  {editMode
                                    ? <Editable value={r.settlement.depositAmount} onChange={v => set('depositAmount', v)} editing={editMode} />
                                    : (r.settlement.depositAmount ? `${bn ? '৳' : 'BDT '}${r.settlement.depositAmount}` : '—')}
                                </td>
                                <td className="border border-foreground/20 px-2 py-1.5">
                                  {editMode ? (
                                    <select
                                      className="w-full bg-background border border-border rounded px-1 py-0.5 text-xs"
                                      value={r.settlement.depositStatus}
                                      onChange={e => set('depositStatus', e.target.value)}
                                    >
                                      <option value="none">{bn ? 'প্রযোজ্য নয়' : 'Not applicable'}</option>
                                      <option value="refunded">{bn ? 'ফেরত প্রদান হয়েছে' : 'Fully refunded'}</option>
                                      <option value="pending">{bn ? 'বাকি আছে' : 'Pending'}</option>
                                    </select>
                                  ) : (
                                    r.settlement.depositStatus === 'refunded'
                                      ? (bn ? 'সম্পূর্ণ ফেরত প্রদান করা হয়েছে' : 'Fully refunded')
                                      : r.settlement.depositStatus === 'pending'
                                        ? (bn ? 'এখনো ফেরত দেওয়া হয়নি (বাকি আছে)' : 'Pending refund')
                                        : (bn ? 'প্রযোজ্য নয়' : 'Not applicable')
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th className="border border-foreground/20 px-2 py-1.5 text-left font-semibold" style={{ background: '#eef3ef', color: '#1f4d3a' }}>{bn ? 'সর্বশেষ বেতন / বকেয়া বেতন' : 'Final Salary / Salary Dues'}</th>
                                <td className="border border-foreground/20 px-2 py-1.5">
                                  {editMode
                                    ? <Editable value={r.settlement.salaryDueAmount} onChange={v => set('salaryDueAmount', v)} editing={editMode} />
                                    : (r.settlement.salaryDueAmount ? `${bn ? '৳' : 'BDT '}${r.settlement.salaryDueAmount}` : '—')}
                                </td>
                                <td className="border border-foreground/20 px-2 py-1.5">
                                  {editMode ? (
                                    <select
                                      className="w-full bg-background border border-border rounded px-1 py-0.5 text-xs"
                                      value={r.settlement.salaryDueStatus}
                                      onChange={e => set('salaryDueStatus', e.target.value)}
                                    >
                                      <option value="none">{bn ? 'প্রযোজ্য নয়' : 'Not applicable'}</option>
                                      <option value="paid">{bn ? 'পরিশোধ করা হয়েছে' : 'Fully paid'}</option>
                                      <option value="pending">{bn ? 'বাকি আছে' : 'Pending'}</option>
                                    </select>
                                  ) : (
                                    r.settlement.salaryDueStatus === 'paid'
                                      ? (bn ? 'সম্পূর্ণ পরিশোধ করা হয়েছে' : 'Fully paid')
                                      : r.settlement.salaryDueStatus === 'pending'
                                        ? (bn ? 'এখনো পরিশোধ করা হয়নি (বাকি আছে)' : 'Pending payment')
                                        : (bn ? 'প্রযোজ্য নয়' : 'Not applicable')
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <p className="text-xs leading-relaxed text-justify" style={{ color: '#1a1a1a' }}>
                            <strong>{bn ? 'পূর্ণ ও চূড়ান্ত নিষ্পত্তি (Full and Final Settlement):' : 'Full and Final Settlement Declaration:'}</strong>{' '}
                            <Editable value={r.settlement.settlementStatement} onChange={v => set('settlementStatement', v)} editing={editMode} />
                          </p>
                        </div>

                        {/* Signature area */}
                        <div className="flex justify-between items-end mt-6 pt-4">
                          <div className="flex flex-col items-center gap-1">
                            <QRCodeSVG
                              value={`RL:${viewLetter.letter_number}|${viewLetter.staff_name}|${viewLetter.resign_date}`}
                              size={64}
                              level="M"
                              className="opacity-80"
                            />
                            <p className="text-[9px] text-muted-foreground">{bn ? 'ডিজিটাল যাচাই' : 'Digital Verification'}</p>
                          </div>
                          <div className="text-center">
                            <div className="w-36 border-t border-foreground/40 mb-1" />
                            <Editable tag="p" value={r.candidateSigLabel} onChange={v => set('candidateSigLabel', v)} editing={editMode} className="text-[11px] text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'তারিখ: __________' : 'Date: __________'}</p>
                          </div>
                          <div className="flex items-end gap-3">
                            <div className="w-14 h-14 rounded-full border-2 border-dashed border-foreground/25 flex items-center justify-center">
                              <span className="text-[7px] text-muted-foreground text-center leading-tight">{bn ? 'সিল' : 'Official'}<br />{bn ? '' : 'Seal'}</span>
                            </div>
                            <div className="text-center">
                              <div className="w-36 border-t border-foreground/40 mb-1" />
                              <Editable tag="p" value={r.pName} onChange={v => set('pName', v)} editing={editMode} className="text-[11px] font-semibold text-foreground" />
                              <Editable tag="p" value={r.authoritySigLabel} onChange={v => set('authoritySigLabel', v)} editing={editMode} className="text-[11px] text-muted-foreground font-medium" />
                              <Editable tag="p" value={r.pTitle} onChange={v => set('pTitle', v)} editing={editMode} className="text-[10px] text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'তারিখ: __________' : 'Date: __________'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handlePrint(viewLetter)}>
                      <Printer className="w-4 h-4 mr-2" />{bn ? 'প্রিন্ট' : 'Print'}
                    </Button>
                    <Button onClick={() => handleDownloadPdf(viewLetter)}>
                      <Download className="w-4 h-4 mr-2" />{bn ? 'PDF' : 'PDF'}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bn ? 'মুছে ফেলতে চান?' : 'Delete this letter?'}</AlertDialogTitle>
              <AlertDialogDescription>{bn ? 'এটি স্থায়ীভাবে মুছে যাবে।' : 'This will be permanently deleted.'}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'না' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">
                {bn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rejoin Confirm */}
        <AlertDialog open={!!rejoinId} onOpenChange={(o) => { if (!o) setRejoinId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bn ? 'পুনর্বহাল করতে চান?' : 'Rejoin this staff?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {bn
                  ? 'এই স্টাফকে আবার সক্রিয় করা হবে এবং একটি নতুন যোগদান পত্র স্বয়ংক্রিয়ভাবে তৈরি হবে।'
                  : 'This staff will be reactivated and a new joining letter will be automatically created.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'না' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const letter = letters.find((l: any) => l.id === rejoinId);
                  if (letter) rejoinMutation.mutate(letter);
                }}
                className="bg-primary text-primary-foreground"
              >
                {rejoinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {bn ? 'হ্যাঁ, পুনর্বহাল করুন' : 'Yes, Rejoin'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
};

export default AdminResignLetters;
