import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Printer, Trash2, Loader2, Eye, Pencil, PencilOff, Upload, AlignLeft, AlignCenter, AlignRight, AlignJustify, Move, RotateCcw } from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toast } from 'sonner';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

/* ── Editable span helper ────────────────────────────────── */
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

  const handleBlur = () => {
    if (ref.current) onChange(ref.current.innerText.trim());
  };

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

/* ── Draggable wrapper for edit mode ──────────────────── */
interface DraggableProps {
  id: string;
  editing: boolean;
  positions: Record<string, { x: number; y: number }>;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Draggable = ({ id, editing, positions, onMove, children, className = '', style }: DraggableProps) => {
  const pos = positions[id] || { x: 0, y: 0 };
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onMove(id, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className={`${className} ${editing ? 'relative group/drag' : ''}`}
      style={{
        ...style,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: dragRef.current ? 'none' : 'transform 0.15s ease',
      }}
    >
      {editing && (
        <button
          onMouseDown={onMouseDown}
          className="absolute -left-5 top-0 p-0.5 rounded bg-primary/10 text-primary opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-20"
          title="Drag"
        >
          <Move className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </div>
  );
};
const AdminJoiningLetters = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [viewLetter, setViewLetter] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  /* ── Editable overrides ─────────────────── */
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const set = (key: string, val: string) => setOverrides(p => ({ ...p, [key]: val }));
  const get = (key: string, fallback: string) => overrides[key] ?? fallback;

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [bodyAlign, setBodyAlign] = useState<'left' | 'center' | 'right' | 'justify'>('center');
  const [salutationAlign, setSalutationAlign] = useState<'left' | 'center' | 'right'>('left');
  const [nameAlign, setNameAlign] = useState<'left' | 'center' | 'right'>('left');
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});

  const handleDragMove = (id: string, pos: { x: number; y: number }) => {
    setDragPositions(prev => ({ ...prev, [id]: pos }));
  };

  /* ── Load saved overrides when opening a letter ── */
  const loadSavedOverrides = (letter: any) => {
    const saved = letter.letter_data?.overrides as Record<string, any> | undefined;
    if (saved) {
      setOverrides(saved.textOverrides || {});
      setBodyAlign(saved.bodyAlign || 'center');
      setSalutationAlign(saved.salutationAlign || 'left');
      setNameAlign(saved.nameAlign || 'left');
      setDragPositions(saved.dragPositions || {});
    } else {
      setOverrides({});
      setBodyAlign('center');
      setSalutationAlign('left');
      setNameAlign('left');
      setDragPositions({});
    }
    setLocalLogo(null);
    setLocalPhoto(null);
    setEditMode(false);
  };

  const resetOverrides = () => {
    setOverrides({});
    setEditMode(false);
    setLocalLogo(null);
    setLocalPhoto(null);
    setBodyAlign('center');
    setSalutationAlign('left');
    setNameAlign('left');
    setDragPositions({});
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

  const { data: letters = [], isLoading } = useQuery({
    queryKey: ['joining-letters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('joining_letters')
        .select('*, staff:staff_id(photo_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
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
  /* ── Save mutation ─────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('joining_letters')
        .update({ letter_data: data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joining-letters'] });
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved successfully');
    },
    onError: () => {
      toast.error(bn ? 'সেভ করা যায়নি' : 'Failed to save');
    },
  });

  const handleSave = () => {
    if (!viewLetter) return;
    const existingData = (viewLetter.letter_data && typeof viewLetter.letter_data === 'object') ? viewLetter.letter_data : {};
    const newData = {
      ...existingData,
      overrides: {
        textOverrides: overrides,
        bodyAlign,
        salutationAlign,
        nameAlign,
        dragPositions,
      },
    };
    saveMutation.mutate({ id: viewLetter.id, data: newData });
    // Update the local viewLetter so subsequent prints use saved data
    setViewLetter((prev: any) => prev ? { ...prev, letter_data: newData } : prev);
  };

  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('joining_letters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joining-letters'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      setDeleteId(null);
    },
  });

  /* ── Build resolved values (uses overrides or defaults) ─── */
  const resolved = useCallback((letter: any) => {
    const inst = institution || { name: '', name_en: '', address: '', phone: '', logo_url: '' } as any;
    const pName = principalInfo?.principal_name || '';
    const pTitle = principalInfo?.principal_title_bn || (bn ? 'মুহতামিম / প্রিন্সিপাল' : 'Principal / Head');
    const instName = get('instName', inst.name || '');
    const instNameEn = get('instNameEn', inst.name_en || '');
    const instAddress = get('instAddress', inst.address || '');
    const instPhone = get('instPhone', inst.phone || '');
    const salutation = get('salutation', bn ? 'জনাব,' : 'Dear,');
    const staffName = get('staffName', letter.staff_name_bn || letter.staff_name || '');
    const designation = get('designation', letter.designation || '');
    const joiningDate = letter.joining_date ? new Date(letter.joining_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '';
    const bodyText = get(
      'bodyText',
      letter.letter_type === 'reinstatement'
        ? (bn
            ? `এতদ্বারা জানানো যাচ্ছে যে, জনাব ${staffName} (আইডি: ${letter.letter_number}), পূর্বে পদত্যাগের পর অদ্য ${joiningDate} খ্রিষ্টাব্দে ${instName || 'প্রতিষ্ঠান'}-এ "${designation}" পদে পুনরায় কর্মে বহাল করা হয়েছে। আমরা আশা করি, তিনি পূর্বের ন্যায় তাঁর মেধা, আন্তরিকতা ও নিষ্ঠার মাধ্যমে অত্র প্রতিষ্ঠানের শিক্ষা ও প্রশাসনিক মান উন্নয়নে গুরুত্বপূর্ণ ভূমিকা পালন করবেন। পরম করুণাময় আল্লাহ তাআলা তাঁর এই খিদমতকে কবুল করুন এবং তাঁকে উত্তম তাওফিক দান করুন।`
            : `This is to certify that ${staffName} (ID: ${letter.letter_number}) has been reinstated to the position of "${designation}" at ${instNameEn || instName || 'the institution'} after a prior resignation. The date of reinstatement is ${joiningDate}. We wish them continued success in their role.`)
        : (bn
            ? `এতদ্বারা প্রত্যয়ন করা যাচ্ছে যে, জনাব ${staffName} (আইডি: ${letter.letter_number}), অদ্য ${joiningDate} খ্রিষ্টাব্দে ${instName || 'প্রতিষ্ঠান'}-এ "${designation}" পদে আনুষ্ঠানিকভাবে যোগদান করেছেন। আমরা তাঁর এই নতুন পথচলাকে স্বাগত জানাচ্ছি। আশা করি, তিনি তাঁর মেধা, আন্তরিকতা ও নিষ্ঠার মাধ্যমে অত্র প্রতিষ্ঠানের শিক্ষা ও প্রশাসনিক মান উন্নয়নে গুরুত্বপূর্ণ ভূমিকা পালন করবেন। পরম করুণাময় আল্লাহ তাআলা তাঁর এই খিদমতকে কবুল করুন এবং তাঁকে উত্তম তাওফিক দান করুন।`
            : `This is to certify that ${staffName} (ID: ${letter.letter_number}) has officially joined ${instNameEn || instName || 'the institution'} as "${designation}". The date of joining is ${joiningDate}. We welcome them to our institution and wish them a successful career.`)
    );

    return {
      instName,
      instNameEn,
      instAddress,
      instPhone,
      salutation,
      staffName,
      designation,
      bodyText,
      pName: get('pName', pName),
      pTitle: get('pTitle', pTitle),
      candidateSigLabel: get('candidateSigLabel', bn ? 'নিয়োগপ্রাপ্তের স্বাক্ষর' : "Candidate's Signature"),
      authoritySigLabel: get('authoritySigLabel', bn ? 'অনুমোদনকারীর স্বাক্ষর' : "Authority's Signature"),
      logoUrl: localLogo || inst.logo_url || '',
      photoUrl: localPhoto || (letter.letter_data as any)?.photo_url || (letter as any).staff?.photo_url || '',
    };
  }, [institution, principalInfo, bn, overrides, localLogo, localPhoto]);

  /* ── Print handler (uses overrides) ────────────────────── */
  const handlePrint = (letter: any) => {
    const r = resolved(letter);
    const qrValue = `JL:${letter.letter_number}|${letter.staff_name}|${letter.joining_date}`;

    const isReinstatement = letter.letter_type === 'reinstatement';
    const escapeHtml = (value: string) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      const salutationHtml = escapeHtml(r.salutation).replace(/\n/g, '<br/>');
      const staffNameHtml = escapeHtml(r.staffName).replace(/\n/g, '<br/>');
      const bodyTextHtml = escapeHtml(r.bodyText).replace(/\n/g, '<br/>');

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${isReinstatement ? (bn ? 'পুনর্বহাল পত্র' : 'Reinstatement Letter') : (bn ? 'নিয়োগপত্র' : 'Joining Letter')}</title>
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
  .letter-body .highlight{color:hsl(142,50%,30%);font-weight:700}
  .body-flex{display:flex;gap:20px}
  .body-text{flex:1}
  .photo-box{flex-shrink:0;text-align:center}
  .photo-box .avatar{width:80px;height:80px;border:2px solid #ccc;border-radius:6px;object-fit:cover;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:28px;color:#999}
  .photo-label{font-size:9px;color:#888;margin-top:4px}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:30px}
  .qr-block{text-align:center}
  .qr-block canvas,.qr-block svg,.qr-block img{width:60px;height:60px}
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
      <h2>${isReinstatement ? (bn ? 'পুনর্বহাল পত্র' : 'OFFICIAL REINSTATEMENT LETTER') : (bn ? 'নিয়োগপত্র' : 'OFFICIAL JOINING LETTER')}</h2>
      <p class="sub">${isReinstatement ? (bn ? 'OFFICIAL REINSTATEMENT LETTER' : 'পুনর্বহাল পত্র') : (bn ? 'OFFICIAL JOINING LETTER' : 'নিয়োগপত্র')}</p>
      <div class="underline"></div>
    </div>
    <div class="meta">
      <span>${bn ? 'পত্র নং' : 'Ref'}: <strong>${letter.letter_number || ''}</strong></span>
      <span>${bn ? 'তারিখ' : 'Date'}: <strong>${letter.letter_date ? new Date(letter.letter_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : ''}</strong></span>
    </div>
    <div class="letter-body">
      <div class="body-flex">
        <div class="body-text">
          <p style="text-align:${salutationAlign};">${salutationHtml}</p>
          <p class="highlight" style="font-size:15px;text-align:${nameAlign};">${staffNameHtml}</p>
          <p style="text-align:${bodyAlign};white-space:pre-line;">${bodyTextHtml}</p>
        </div>
        <div class="photo-box">
          <div class="avatar">${r.photoUrl ? `<img src="${r.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />` : (r.staffName || '?').charAt(0)}</div>
          <p class="photo-label">${bn ? 'প্রার্থীর ছবি' : 'Photo'}</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="qr-block" id="qr-container">
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
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
<script>
  function tryQR(attempts) {
    if (typeof QRCode === 'undefined') {
      if (attempts < 20) setTimeout(function(){ tryQR(attempts+1); }, 200);
      else setTimeout(function(){ window.print(); }, 300);
      return;
    }
    var container = document.getElementById('qr-container');
    var svgStr = '';
    QRCode.toString('${qrValue.replace(/'/g, "\\'")}', {type:'svg',width:60,margin:0}, function(err,svg){
      if(!err && svg){
        container.insertAdjacentHTML('afterbegin', svg);
      }
      setTimeout(function(){ window.print(); }, 500);
    });
  }
  tryQR(0);
<\/script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            {bn ? 'যোগদান পত্র' : 'Joining Letters'}
            <Badge variant="outline" className="ml-2">{letters.length}</Badge>
          </h1>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : letters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {bn ? 'কোনো যোগদান পত্র পাওয়া যায়নি। স্টাফ অনুমোদন করলে স্বয়ংক্রিয়ভাবে তৈরি হবে।' : 'No joining letters found. They are auto-created when staff applications are approved.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'পত্র নং' : 'Letter No'}</TableHead>
                  <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                  <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                  <TableHead>{bn ? 'পদবী' : 'Designation'}</TableHead>
                  <TableHead>{bn ? 'যোগদানের তারিখ' : 'Joining Date'}</TableHead>
                  <TableHead>{bn ? 'পত্রের তারিখ' : 'Letter Date'}</TableHead>
                  <TableHead className="text-center w-32">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {letters.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-sm">{l.letter_number}</TableCell>
                    <TableCell>
                      <p className="font-medium">{l.staff_name_bn || l.staff_name}</p>
                      {l.staff_name && l.staff_name_bn && <p className="text-xs text-muted-foreground">{l.staff_name}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.letter_type === 'reinstatement' ? 'secondary' : 'default'} className="text-xs">
                        {l.letter_type === 'reinstatement' ? (bn ? 'পুনর্বহাল' : 'Reinstatement') : (bn ? 'যোগদান' : 'Joining')}
                      </Badge>
                    </TableCell>
                    <TableCell>{l.designation}</TableCell>
                    <TableCell>{l.joining_date ? new Date(l.joining_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '—'}</TableCell>
                    <TableCell>{l.letter_date ? new Date(l.letter_date).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => { loadSavedOverrides(l); setViewLetter(l); }} title={bn ? 'দেখুন' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-green-600 hover:bg-green-500/10" onClick={() => handlePrint(l)} title={bn ? 'প্রিন্ট' : 'Print'}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(l.id)} title={bn ? 'মুছুন' : 'Delete'}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* ── View / Edit Dialog ────────────────────────────── */}
        <Dialog open={!!viewLetter} onOpenChange={(o) => { if (!o) { setViewLetter(null); resetOverrides(); } }}>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] p-0 overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>{bn ? 'নিয়োগপত্র' : 'Official Joining Letter'}</DialogTitle>
            </DialogHeader>
            {viewLetter && (() => {
              const r = resolved(viewLetter);
              return (
                <div className="flex flex-col">
                  {/* Edit mode toggle */}
                  <div className="flex items-center justify-end gap-2 px-4 pt-3">
                    {editMode && Object.keys(dragPositions).length > 0 && (
                      <Button size="sm" variant="outline" onClick={() => setDragPositions({})} className="gap-1.5 text-xs">
                        <RotateCcw className="w-3 h-3" />
                        {bn ? 'পজিশন রিসেট' : 'Reset Positions'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={editMode ? 'default' : 'outline'}
                      onClick={() => setEditMode(!editMode)}
                      className="gap-1.5"
                    >
                      {editMode ? <PencilOff className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      {editMode ? (bn ? 'এডিট বন্ধ' : 'Exit Edit') : (bn ? 'এডিট মোড' : 'Edit Mode')}
                    </Button>
                  </div>

                  {/* Hidden file inputs */}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setLocalLogo)} />
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e, setLocalPhoto)} />

                  {/* Document with A4 proportions */}
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
                          {/* Logo – clickable in edit mode */}
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
                            {(r.instNameEn || editMode) && (
                              <Editable tag="p" value={r.instNameEn} onChange={v => set('instNameEn', v)} editing={editMode} className="text-sm text-muted-foreground" />
                            )}
                            {(r.instAddress || editMode) && (
                              <Editable tag="p" value={r.instAddress} onChange={v => set('instAddress', v)} editing={editMode} className="text-xs text-muted-foreground mt-0.5" />
                            )}
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
                            {viewLetter.letter_type === 'reinstatement' ? (bn ? 'পুনর্বহাল পত্র' : 'OFFICIAL REINSTATEMENT LETTER') : (bn ? 'নিয়োগপত্র' : 'OFFICIAL JOINING LETTER')}
                          </h3>
                          <p className="text-xs text-muted-foreground tracking-wide">{viewLetter.letter_type === 'reinstatement' ? (bn ? 'OFFICIAL REINSTATEMENT LETTER' : 'পুনর্বহাল পত্র') : (bn ? 'OFFICIAL JOINING LETTER' : 'নিয়োগপত্র')}</p>
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
                            {/* Alignment toolbar in edit mode */}
                            {editMode && (
                              <div className="flex flex-wrap gap-3 items-center pb-2 border-b border-dashed border-muted-foreground/20 mb-2 text-xs">
                                <span className="text-muted-foreground font-medium">{bn ? 'সম্বোধন:' : 'Salutation:'}</span>
                                <div className="flex gap-0.5 border rounded-md overflow-hidden">
                                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                                    <button key={a} onClick={() => setSalutationAlign(a)} className={`p-1 ${salutationAlign === a ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Icon className="w-3.5 h-3.5" /></button>
                                  ))}
                                </div>
                                <span className="text-muted-foreground font-medium">{bn ? 'নাম:' : 'Name:'}</span>
                                <div className="flex gap-0.5 border rounded-md overflow-hidden">
                                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                                    <button key={a} onClick={() => setNameAlign(a)} className={`p-1 ${nameAlign === a ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Icon className="w-3.5 h-3.5" /></button>
                                  ))}
                                </div>
                                <span className="text-muted-foreground font-medium">{bn ? 'বডি:' : 'Body:'}</span>
                                <div className="flex gap-0.5 border rounded-md overflow-hidden">
                                  {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify]] as const).map(([a, Icon]) => (
                                    <button key={a} onClick={() => setBodyAlign(a)} className={`p-1 ${bodyAlign === a ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Icon className="w-3.5 h-3.5" /></button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Draggable id="salutation" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                              <Editable tag="p" value={r.salutation} onChange={v => set('salutation', v)} editing={editMode} className="" style={{ textAlign: salutationAlign }} />
                            </Draggable>
                            <Draggable id="staffName" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                              <Editable tag="p" value={r.staffName} onChange={v => set('staffName', v)} editing={editMode} className="font-bold text-base" style={{ color: 'hsl(var(--primary))', textAlign: nameAlign }} />
                            </Draggable>
                            <Draggable id="bodyText" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                              <Editable
                                tag="p"
                                value={r.bodyText}
                                onChange={v => set('bodyText', v)}
                                editing={editMode}
                                className=""
                                style={{ textAlign: bodyAlign, whiteSpace: 'pre-line' }}
                              />
                            </Draggable>
                          </div>

                          {/* Photo – clickable in edit mode */}
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
                            <p className="text-[10px] text-muted-foreground">{bn ? 'প্রার্থীর ছবি' : 'Photo'}</p>
                          </div>
                        </div>

                        {/* Signature area */}
                        <div className="flex justify-between items-end mt-12 pt-4">
                          {/* QR */}
                          <Draggable id="qrBlock" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                            <div className="flex flex-col items-center gap-1">
                              <QRCodeSVG
                                value={`JL:${viewLetter.letter_number}|${viewLetter.staff_name}|${viewLetter.joining_date}`}
                                size={64}
                                level="M"
                                className="opacity-80"
                              />
                              <p className="text-[9px] text-muted-foreground">{bn ? 'ডিজিটাল যাচাই' : 'Digital Verification'}</p>
                            </div>
                          </Draggable>

                          {/* Candidate sig */}
                          <Draggable id="candidateSig" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                            <div className="text-center">
                              <div className="w-36 border-t border-foreground/40 mb-1" />
                              <Editable tag="p" value={r.candidateSigLabel} onChange={v => set('candidateSigLabel', v)} editing={editMode} className="text-[11px] text-muted-foreground" />
                              <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'তারিখ: __________' : 'Date: __________'}</p>
                            </div>
                          </Draggable>

                          {/* Authority sig + Seal */}
                          <Draggable id="authoritySig" editing={editMode} positions={dragPositions} onMove={handleDragMove}>
                            <div className="flex items-end gap-3">
                              <div className="w-14 h-14 rounded-full border-2 border-dashed border-foreground/25 flex items-center justify-center">
                                <span className="text-[7px] text-muted-foreground text-center leading-tight">{bn ? 'সিল' : 'Official'}<br/>{bn ? '' : 'Seal'}</span>
                              </div>
                              <div className="text-center">
                                <div className="w-36 border-t border-foreground/40 mb-1" />
                                <Editable tag="p" value={r.pName} onChange={v => set('pName', v)} editing={editMode} className="text-[11px] font-semibold text-foreground" />
                                <Editable tag="p" value={r.authoritySigLabel} onChange={v => set('authoritySigLabel', v)} editing={editMode} className="text-[11px] text-muted-foreground font-medium" />
                                <Editable tag="p" value={r.pTitle} onChange={v => set('pTitle', v)} editing={editMode} className="text-[10px] text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'তারিখ: __________' : 'Date: __________'}</p>
                              </div>
                            </div>
                          </Draggable>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    {editMode && (
                      <Button variant="default" className="flex-1 gap-2" onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {bn ? 'সেভ করুন' : 'Save Changes'}
                      </Button>
                    )}
                    <Button variant={editMode ? 'outline' : 'default'} className="flex-1" onClick={() => handlePrint(viewLetter)}>
                      <Printer className="w-4 h-4 mr-2" />{bn ? 'প্রিন্ট করুন' : 'Print'}
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
      </div>
  );
};

export default AdminJoiningLetters;
