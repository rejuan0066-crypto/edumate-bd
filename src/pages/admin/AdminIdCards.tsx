import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Printer, CreditCard, Filter, Loader2, Eye, CheckSquare, Square, Upload, X, Save, Users, GraduationCap, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StudentIdCard from '@/components/idcard/StudentIdCard';
import StaffIdCard from '@/components/idcard/StaffIdCard';
import { printIdCard, printMultipleIdCards } from '@/lib/idCardPrint';
import { toast } from 'sonner';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { sortStaffByDepartment } from '@/lib/staffOrderHelper';
const AdminIdCards = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { isFeatureAllowed, canEditItem } = usePagePermissions('/admin/id-cards');

  // Granular tab permissions
  const canViewStudentTab = isFeatureAllowed('tab_student_card', 'view');
  const canViewStaffTab = isFeatureAllowed('tab_staff_card', 'view');
  const canPrintStudentCards = isFeatureAllowed('tab_student_card', 'print') && isFeatureAllowed('action_bulk_print');
  const canPrintStaffCards = isFeatureAllowed('tab_staff_card', 'print') && isFeatureAllowed('action_bulk_print');
  const canSaveSettings = canEditItem && isFeatureAllowed('tab_card_template', 'edit');

  const { settings } = useWebsiteSettings();
  const [activeTab, setActiveTab] = useState(canViewStudentTab ? 'student' : (canViewStaffTab ? 'staff' : ''));
  const [search, setSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [filterSessionId, setFilterSessionId] = useState('');
  const [filterDivisionId, setFilterDivisionId] = useState('all');
  const [filterClassId, setFilterClassId] = useState('all');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState('all');
  const [previewStudent, setPreviewStudent] = useState<any>(null);
  const [previewStaff, setPreviewStaff] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [validUntil, setValidUntil] = useState('');
  const [validUntilBn, setValidUntilBn] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalNameEn, setPrincipalNameEn] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const staffCardRef = useRef<HTMLDivElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  // Load all ID card settings
  const { data: idcardSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['idcard-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('key, value').in('key', [
        'idcard_valid_until', 'idcard_valid_until_bn', 'idcard_principal_signature_url'
      ]);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.key] = String(r.value || ''); });
      return map;
    },
  });

  useEffect(() => {
    // Principal name always comes from the single source (administrative officer record)
    const resolvedPrincipalName = settings.principal_name || '';
    const resolvedPrincipalNameEn = settings.principal_name_en || '';

    if (principalName !== resolvedPrincipalName) setPrincipalName(resolvedPrincipalName);
    if (principalNameEn !== resolvedPrincipalNameEn) setPrincipalNameEn(resolvedPrincipalNameEn);

    if (idcardSettings) {
      if (idcardSettings.idcard_valid_until && !validUntil) setValidUntil(idcardSettings.idcard_valid_until);
      if (idcardSettings.idcard_valid_until_bn && !validUntilBn) setValidUntilBn(idcardSettings.idcard_valid_until_bn);
      if (idcardSettings.idcard_principal_signature_url && !signatureUrl) setSignatureUrl(idcardSettings.idcard_principal_signature_url);
    }
  }, [idcardSettings, settings.principal_name, settings.principal_name_en, principalName, principalNameEn, validUntil, validUntilBn, signatureUrl]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const pairs = [
        { key: 'idcard_valid_until', value: validUntil },
        { key: 'idcard_valid_until_bn', value: validUntilBn },
      ];

      for (const { key, value } of pairs) {
        const { data: existing } = await supabase.from('website_settings').select('id').eq('key', key).maybeSingle();
        if (existing) {
          await supabase.from('website_settings').update({ value }).eq('key', key);
        } else {
          await supabase.from('website_settings').insert({ key, value });
        }
      }
      refetchSettings();
      toast.success(bn ? 'সেটিংস সংরক্ষিত হয়েছে' : 'Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error(bn ? 'ফাইল সাইজ ৩০০KB এর বেশি' : 'File size exceeds 300KB');
      return;
    }
    setUploadingSignature(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `principal-signature-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('institution-logos').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('institution-logos').getPublicUrl(path);
      const url = urlData.publicUrl;
      setSignatureUrl(url);
      const { data: existing } = await supabase.from('website_settings').select('id').eq('key', 'idcard_principal_signature_url').maybeSingle();
      if (existing) {
        await supabase.from('website_settings').update({ value: url }).eq('key', 'idcard_principal_signature_url');
      } else {
        await supabase.from('website_settings').insert({ key: 'idcard_principal_signature_url', value: url });
      }
      toast.success(bn ? 'স্বাক্ষর আপলোড হয়েছে' : 'Signature uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingSignature(false);
      if (sigInputRef.current) sigInputRef.current.value = '';
    }
  };

  const removeSignature = async () => {
    setSignatureUrl('');
    await supabase.from('website_settings').update({ value: '' }).eq('key', 'idcard_principal_signature_url');
    toast.success(bn ? 'স্বাক্ষর সরানো হয়েছে' : 'Signature removed');
  };

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: fetchInstitutionInfo,
  });

  // Fetch active academic session for valid-until
  const { data: activeSession } = useQuery({
    queryKey: ['active-academic-session-idcard'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).maybeSingle();
      return data;
    },
  });

  // Fetch all academic sessions
  const { data: allSessions = [] } = useQuery({
    queryKey: ['all-academic-sessions-idcard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Auto-select active session
  useEffect(() => {
    if (!filterSessionId && allSessions.length > 0) {
      const active = allSessions.find((s: any) => s.is_active);
      setFilterSessionId(active?.id || allSessions[0]?.id || 'all');
    }
  }, [allSessions, filterSessionId]);

  // Selected session for validUntil
  const selectedSession = useMemo(() => {
    if (!filterSessionId || filterSessionId === 'all') return activeSession;
    return allSessions.find((s: any) => s.id === filterSessionId) || activeSession;
  }, [filterSessionId, allSessions, activeSession]);

  // Auto-set validUntil from active session end_date
  useEffect(() => {
    if (selectedSession?.end_date) {
      const d = new Date(selectedSession.end_date);
      const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const bnMonths = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
      const toBnDigit = (s: string) => s.replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[parseInt(c)]);
      setValidUntil(`${enMonths[d.getMonth()]} ${d.getFullYear()}`);
      setValidUntilBn(`${bnMonths[d.getMonth()]} ${toBnDigit(String(d.getFullYear()))}`);
    } else if (selectedSession?.name) {
      setValidUntil(selectedSession.name);
      setValidUntilBn(selectedSession.name_bn || selectedSession.name);
    } else {
      if (!validUntil) setValidUntil('December 2026');
      if (!validUntilBn) setValidUntilBn('ডিসেম্বর ২০২৬');
    }
  }, [selectedSession]);

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-idcard', filterSessionId],
    queryFn: async () => {
      let query = supabase.from('students').select('*, divisions(name, name_bn)').is('deleted_at', null);
      if (filterSessionId && filterSessionId !== 'all') {
        query = query.eq('session_id', filterSessionId);
      }
      const { data, error } = await query.order('roll_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!filterSessionId,
  });

  const { data: staffList = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff-idcard'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').eq('status', 'active');
      if (error) throw error;
      return sortStaffByDepartment(data || []);
    },
  });

  const filteredClasses = filterDivisionId !== 'all' ? classes.filter((c: any) => c.division_id === filterDivisionId) : classes;

  const getClassName = (classId: string | null) => {
    if (!classId) return '-';
    const cls = classes.find((c: any) => c.id === classId);
    return cls ? (bn ? cls.name_bn : cls.name) : '-';
  };

  const parseRoll = (r: string | null) => { const n = parseInt(r || '', 10); return isNaN(n) ? Infinity : n; };

  const filtered = students
    .filter((s: any) => {
      if (filterDivisionId !== 'all' && s.division_id !== filterDivisionId) return false;
      if (filterClassId !== 'all' && s.class_id !== filterClassId) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a: any, b: any) => parseRoll(a.roll_number) - parseRoll(b.roll_number));

  const filteredStaff = staffList
    .filter((s: any) => {
      if (staffCategoryFilter !== 'all' && s.staff_category !== staffCategoryFilter) return false;
      if (staffSearch) {
        const q = staffSearch.toLowerCase();
        return s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.staff_id?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q);
      }
      return true;
    });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((s: any) => s.id)));
  };

  const toggleStaffSelect = (id: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllStaff = () => {
    if (selectedStaffIds.size === filteredStaff.length) setSelectedStaffIds(new Set());
    else setSelectedStaffIds(new Set(filteredStaff.map((s: any) => s.id)));
  };

  const getClassNameBn = (classId: string | null) => {
    if (!classId) return '-';
    const cls = classes.find((c: any) => c.id === classId);
    return cls ? cls.name_bn : '-';
  };
  const getClassNameEn = (classId: string | null) => {
    if (!classId) return '-';
    const cls = classes.find((c: any) => c.id === classId);
    return cls ? cls.name : '-';
  };

  const buildStudentData = (s: any) => ({
    name_bn: s.name_bn,
    name_en: s.name_en,
    student_id: s.student_id,
    roll_number: s.roll_number,
    photo_url: s.photo_url,
    blood_group: s.blood_group,
    class_name: getClassNameBn(s.class_id),
    class_name_en: getClassNameEn(s.class_id),
    division_name: s.divisions?.name_bn,
    division_name_en: s.divisions?.name,
    father_name: s.father_name_bn || s.father_name,
    phone: s.phone,
    guardian_phone: s.guardian_phone,
    address: s.address,
  });

  const getProfileUrl = (s: any) => `${window.location.origin}/student/${s.student_id || s.id}`;

  const [bulkDownloading, setBulkDownloading] = useState(false);

  const handleBulkDownloadPdf = useCallback(async () => {
    const ids = activeTab === 'student' ? selectedIds : selectedStaffIds;
    if (ids.size === 0) {
      toast.error(bn ? 'প্রথমে নির্বাচন করুন' : 'Select items first');
      return;
    }
    setBulkDownloading(true);
    toast.info(bn ? 'PDF তৈরি হচ্ছে...' : 'Generating PDF...');

    try {
      const selectedItems = activeTab === 'student'
        ? filtered.filter((s: any) => selectedIds.has(s.id))
        : filteredStaff.filter((s: any) => selectedStaffIds.has(s.id));

      // Create off-screen container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Render cards in pages of 8 (2 cols x 4 rows)
      const CARDS_PER_PAGE = 8;
      const COLS = 2;
      const pages: HTMLDivElement[] = [];

      for (let i = 0; i < selectedItems.length; i += CARDS_PER_PAGE) {
        const pageItems = selectedItems.slice(i, i + CARDS_PER_PAGE);
        const pageDiv = document.createElement('div');
        pageDiv.style.width = '210mm';
        pageDiv.style.minHeight = '297mm';
        pageDiv.style.padding = '8mm';
        pageDiv.style.background = '#ffffff';
        pageDiv.style.display = 'grid';
        pageDiv.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
        pageDiv.style.gap = '6mm';
        pageDiv.style.alignContent = 'start';
        pageDiv.style.justifyItems = 'center';
        container.appendChild(pageDiv);
        pages.push(pageDiv);

        // Render each card
        await new Promise<void>((resolve) => {
          import('react-dom/client').then(({ createRoot }) => {
            let rendered = 0;
            pageItems.forEach((item: any) => {
              const cardWrapper = document.createElement('div');
              pageDiv.appendChild(cardWrapper);
              const root = createRoot(cardWrapper);
              if (activeTab === 'student') {
                root.render(
                  <StudentIdCard
                    student={buildStudentData(item)}
                    {...commonCardProps}
                    profileUrl={getProfileUrl(item)}
                  />
                );
              } else {
                root.render(
                  <StaffIdCard
                    staff={buildStaffData(item)}
                    {...commonCardProps}
                  />
                );
              }
              rendered++;
              if (rendered === pageItems.length) {
                setTimeout(resolve, 300);
              }
            });
          });
        });
      }

      // Wait for images to load
      const allImgs = container.querySelectorAll('img');
      await Promise.all(
        Array.from(allImgs).map(
          (img) => new Promise<void>((res) => {
            if (img.complete) res();
            else { img.onload = () => res(); img.onerror = () => res(); }
          })
        )
      );
      await new Promise((r) => setTimeout(r, 500));

      // Generate PDF with crop marks
      const pdf = new jsPDF('p', 'mm', 'a4');
      const CARD_W_MM = 54; // 2.125in
      const CARD_H_MM = 85.7; // 3.375in
      const MARGIN_X = (210 - CARD_W_MM * 2 - 10) / 2; // center 2 cols with 10mm gap
      const MARGIN_Y = (297 - CARD_H_MM * 4 - 6) / 2; // center 4 rows with 2mm gap
      const CROP_LEN = 4;
      const CROP_OFFSET = 1.5;

      const drawCropMarks = (p: typeof pdf, x: number, y: number, w: number, h: number) => {
        p.setDrawColor(0);
        p.setLineWidth(0.15);
        // Top-left
        p.line(x - CROP_OFFSET - CROP_LEN, y, x - CROP_OFFSET, y);
        p.line(x, y - CROP_OFFSET - CROP_LEN, x, y - CROP_OFFSET);
        // Top-right
        p.line(x + w + CROP_OFFSET, y, x + w + CROP_OFFSET + CROP_LEN, y);
        p.line(x + w, y - CROP_OFFSET - CROP_LEN, x + w, y - CROP_OFFSET);
        // Bottom-left
        p.line(x - CROP_OFFSET - CROP_LEN, y + h, x - CROP_OFFSET, y + h);
        p.line(x, y + h + CROP_OFFSET, x, y + h + CROP_OFFSET + CROP_LEN);
        // Bottom-right
        p.line(x + w + CROP_OFFSET, y + h, x + w + CROP_OFFSET + CROP_LEN, y + h);
        p.line(x + w, y + h + CROP_OFFSET, x + w, y + h + CROP_OFFSET + CROP_LEN);
      };

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: pages[i].scrollWidth,
          height: pages[i].scrollHeight,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));

        // Draw crop marks for each card position
        const pageItems = selectedItems.slice(i * CARDS_PER_PAGE, (i + 1) * CARDS_PER_PAGE);
        for (let j = 0; j < pageItems.length; j++) {
          const col = j % COLS;
          const row = Math.floor(j / COLS);
          const cx = MARGIN_X + col * (CARD_W_MM + 10);
          const cy = MARGIN_Y + row * (CARD_H_MM + 2);
          drawCropMarks(pdf, cx, cy, CARD_W_MM, CARD_H_MM);
        }
      }

      pdf.save(`id-cards-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.removeChild(container);
      toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error(bn ? 'PDF তৈরিতে সমস্যা' : 'PDF generation failed');
    } finally {
      setBulkDownloading(false);
    }
  }, [activeTab, selectedIds, selectedStaffIds, filtered, filteredStaff, institution, validUntil, validUntilBn, principalName, principalNameEn, signatureUrl, language, classes]);

  // Map raw category/department keys to friendly Bangla labels
  const departmentLabel = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const key = String(raw).trim().toLowerCase();
    const map: Record<string, string> = {
      general: 'সাধারণ',
      teacher: 'শিক্ষা বিভাগ',
      teaching: 'শিক্ষা বিভাগ',
      administrative: 'প্রশাসন',
      admin: 'প্রশাসন',
      support: 'সহায়ক বিভাগ',
      accounts: 'হিসাব বিভাগ',
      library: 'লাইব্রেরি',
      kitchen: 'রান্না বিভাগ',
    };
    return map[key] || raw;
  };

  const buildStaffData = (s: any) => {
    const sd = s.staff_data || {};
    // Department resolution priority:
    // 1) If staff_category is "teacher" → always show "শিক্ষা বিভাগ" (category wins for consistency)
    // 2) Else use the stored department if it's not a raw key like "general"
    // 3) Else fall back to a friendly label derived from staff_category
    const cat = String(s.staff_category || '').toLowerCase();
    const rawDept = s.department && String(s.department).trim();
    let friendlyDept = '';
    if (cat === 'teacher' || cat === 'teaching') {
      friendlyDept = 'শিক্ষা বিভাগ';
    } else if (rawDept && rawDept.toLowerCase() !== 'general') {
      friendlyDept = rawDept;
    } else {
      friendlyDept = departmentLabel(s.staff_category);
    }
    return {
      name_bn: s.name_bn,
      name_en: s.name_en,
      staff_id: s.staff_id,
      photo_url: s.photo_url,
      designation: s.designation,
      designation_bn: s.designation,
      designation_en: sd.designation_en || '',
      department: friendlyDept,
      staff_category: s.staff_category,
      father_name: sd.father_name || sd.father_name_bn,
      phone: s.phone,
      blood_group: sd.blood_group || s.blood_group,
      nid: s.nid || sd.nid,
      address: s.address || '',
    };
  };

  const commonCardProps = {
    institution: institution || undefined,
    validUntil,
    validUntilBn,
    principalName,
    principalNameEn,
    principalSignatureUrl: signatureUrl,
    lang: language as 'bn' | 'en',
  };

  const previewScrollAreaStyle = {
    maxHeight: '80vh',
  } as const;

  const previewCardShellStyle = {
    width: '400px',
    maxWidth: '100%',
    paddingBottom: '40px',
  } as const;

  const previewCardScaleStyle = {
    transform: 'scale(0.9)',
    transformOrigin: 'top center',
  } as const;

  const handlePrintSingle = useCallback((student: any) => {
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(tempDiv);
      root.render(
        <StudentIdCard
          student={buildStudentData(student)}
          {...commonCardProps}
          ref={(el) => {
            if (el) {
              setTimeout(() => { printIdCard(el.outerHTML); root.unmount(); document.body.removeChild(tempDiv); }, 100);
            }
          }}
        />
      );
    });
  }, [institution, validUntil, validUntilBn, principalName, principalNameEn, signatureUrl, language, classes]);

  const handlePrintStaffSingle = useCallback((staff: any) => {
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(tempDiv);
      root.render(
        <StaffIdCard
          staff={buildStaffData(staff)}
          {...commonCardProps}
          ref={(el) => {
            if (el) {
              setTimeout(() => { printIdCard(el.outerHTML); root.unmount(); document.body.removeChild(tempDiv); }, 100);
            }
          }}
        />
      );
    });
  }, [institution, validUntil, validUntilBn, principalName, principalNameEn, signatureUrl, language]);

  const handlePrintSelected = useCallback(() => {
    if (selectedIds.size === 0) { toast.error(bn ? 'ছাত্র নির্বাচন করুন' : 'Select students first'); return; }
    const selectedStudents = filtered.filter((s: any) => selectedIds.has(s.id));
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(tempDiv);
      const cards: string[] = [];
      let rendered = 0;
      const Cards = () => (
        <>
          {selectedStudents.map((s: any) => (
            <StudentIdCard
              key={s.id}
              student={buildStudentData(s)}
              {...commonCardProps}
              ref={(el) => {
                if (el) {
                  cards.push(el.outerHTML);
                  rendered++;
                  if (rendered === selectedStudents.length) {
                    setTimeout(() => { printMultipleIdCards(cards); root.unmount(); document.body.removeChild(tempDiv); }, 100);
                  }
                }
              }}
            />
          ))}
        </>
      );
      root.render(<Cards />);
    });
  }, [selectedIds, filtered, institution, validUntil, validUntilBn, principalName, principalNameEn, signatureUrl, language, classes]);

  const handlePrintSelectedStaff = useCallback(() => {
    if (selectedStaffIds.size === 0) { toast.error(bn ? 'কর্মী নির্বাচন করুন' : 'Select staff first'); return; }
    const selectedStaffList = filteredStaff.filter((s: any) => selectedStaffIds.has(s.id));
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(tempDiv);
      const cards: string[] = [];
      let rendered = 0;
      const Cards = () => (
        <>
          {selectedStaffList.map((s: any) => (
            <StaffIdCard
              key={s.id}
              staff={buildStaffData(s)}
              {...commonCardProps}
              ref={(el) => {
                if (el) {
                  cards.push(el.outerHTML);
                  rendered++;
                  if (rendered === selectedStaffList.length) {
                    setTimeout(() => { printMultipleIdCards(cards); root.unmount(); document.body.removeChild(tempDiv); }, 100);
                  }
                }
              }}
            />
          ))}
        </>
      );
      root.render(<Cards />);
    });
  }, [selectedStaffIds, filteredStaff, institution, validUntil, validUntilBn, principalName, principalNameEn, signatureUrl, language]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {bn ? 'আইডি কার্ড ব্যবস্থাপনা' : 'ID Card Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'student'
              ? (bn ? `মোট ${filtered.length} জন ছাত্র | ${selectedIds.size} জন নির্বাচিত` : `Total ${filtered.length} students | ${selectedIds.size} selected`)
              : (bn ? `মোট ${filteredStaff.length} জন কর্মী | ${selectedStaffIds.size} জন নির্বাচিত` : `Total ${filteredStaff.length} staff | ${selectedStaffIds.size} selected`)
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'student' && selectedIds.size > 0 && canPrintStudentCards && (
            <>
              <Button onClick={handleBulkDownloadPdf} disabled={bulkDownloading} variant="outline" className="flex items-center gap-2">
                {bulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {bn ? `${selectedIds.size} টি PDF` : `PDF ${selectedIds.size}`}
              </Button>
              <Button onClick={handlePrintSelected} className="btn-primary-gradient flex items-center gap-2">
                <Printer className="w-4 h-4" />
                {bn ? `${selectedIds.size} টি প্রিন্ট` : `Print ${selectedIds.size}`}
              </Button>
            </>
          )}
          {activeTab === 'staff' && selectedStaffIds.size > 0 && canPrintStaffCards && (
            <>
              <Button onClick={handleBulkDownloadPdf} disabled={bulkDownloading} variant="outline" className="flex items-center gap-2">
                {bulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {bn ? `${selectedStaffIds.size} টি PDF` : `PDF ${selectedStaffIds.size}`}
              </Button>
              <Button onClick={handlePrintSelectedStaff} className="btn-primary-gradient flex items-center gap-2">
                <Printer className="w-4 h-4" />
                {bn ? `${selectedStaffIds.size} টি প্রিন্ট` : `Print ${selectedStaffIds.size}`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="card-elevated p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'মেয়াদ (ইংরেজি)' : 'Valid Until (English)'}</label>
            <Input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="bg-background" placeholder="December 2026" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'মেয়াদ (বাংলা)' : 'Valid Until (Bangla)'}</label>
            <Input value={validUntilBn} onChange={(e) => setValidUntilBn(e.target.value)} className="bg-background" placeholder="ডিসেম্বর ২০২৬" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'প্রিন্সিপালের নাম (বাংলা)' : 'Principal Name (Bangla)'}</label>
            <Input value={principalName} readOnly disabled className="bg-muted" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {bn ? 'প্রশাসনিক কর্মকর্তা রেকর্ড থেকে স্বয়ংক্রিয়; পরিবর্তনে /admin/administrative দেখুন' : 'Auto from the administrative officer record; edit at /admin/administrative'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'প্রিন্সিপালের নাম (ইংরেজি)' : 'Principal Name (English)'}</label>
            <Input value={principalNameEn} readOnly disabled className="bg-muted" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'প্রিন্সিপালের স্বাক্ষর' : 'Principal Signature'}</label>
            {signatureUrl ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                <img src={signatureUrl} alt="Signature" className="h-8 max-w-[100px] object-contain" />
                <button onClick={removeSignature} className="p-1 rounded hover:bg-destructive/10 text-destructive" title={bn ? 'সরান' : 'Remove'}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input ref={sigInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleSignatureUpload} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => sigInputRef.current?.click()} disabled={uploadingSignature}>
                  {uploadingSignature ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  {bn ? 'আপলোড করুন' : 'Upload'}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">{bn ? 'PNG/JPG, সর্বোচ্চ ৩০০KB' : 'PNG/JPG, max 300KB'}</p>
              </div>
            )}
          </div>
          {canSaveSettings && (
            <div className="flex items-end">
              <Button onClick={saveSettings} disabled={savingSettings} variant="outline" size="sm" className="gap-1.5">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {bn ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          {canViewStudentTab && (
            <TabsTrigger value="student" className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              {bn ? 'ছাত্র' : 'Students'}
            </TabsTrigger>
          )}
          {canViewStaffTab && (
            <TabsTrigger value="staff" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {bn ? 'কর্মী' : 'Staff'}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Student Tab */}
        {canViewStudentTab && (
        <TabsContent value="student" className="space-y-4 mt-4">
          <div className="card-elevated p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={bn ? 'নাম, আইডি বা রোল...' : 'Name, ID or Roll...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filterSessionId} onValueChange={(v) => { setFilterSessionId(v); setSelectedIds(new Set()); }}>
                <SelectTrigger className="bg-background w-full sm:w-44">
                  <GraduationCap className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder={bn ? 'সেশন' : 'Session'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                  {allSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {bn ? s.name_bn || s.name : s.name}{s.is_active ? (bn ? ' (সক্রিয়)' : ' (Active)') : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDivisionId} onValueChange={(v) => { setFilterDivisionId(v); setFilterClassId('all'); }}>
                <SelectTrigger className="bg-background w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                  {divisions.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterClassId} onValueChange={setFilterClassId}>
                <SelectTrigger className="bg-background w-full sm:w-40">
                  <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                  {filteredClasses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="card-elevated overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleAll} className="text-muted-foreground hover:text-primary">
                          {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'রোল' : 'Roll'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম' : 'Name'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'আইডি' : 'ID'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'শ্রেণী' : 'Class'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'বিভাগ' : 'Division'}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelect(s.id)} className="text-muted-foreground hover:text-primary">
                            {selectedIds.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-primary">{s.roll_number || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {s.photo_url ? (
                              <img src={s.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {s.name_bn?.[0] || '?'}
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                              {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{s.student_id}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{getClassName(s.class_id)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{bn ? s.divisions?.name_bn : s.divisions?.name || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setPreviewStudent(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'প্রিভিউ' : 'Preview'}>
                              <Eye className="w-4 h-4" />
                            </button>
                            {canPrintStudentCards && (
                              <button onClick={() => handlePrintSingle(s)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary" title={bn ? 'প্রিন্ট' : 'Print'}>
                                <Printer className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
        )}

        {/* Staff Tab */}
        {canViewStaffTab && (
        <TabsContent value="staff" className="space-y-4 mt-4">
          <div className="card-elevated p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={bn ? 'নাম, আইডি বা পদবী...' : 'Name, ID or Designation...'} className="pl-10 bg-background" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} />
              </div>
              <Select value={staffCategoryFilter} onValueChange={setStaffCategoryFilter}>
                <SelectTrigger className="bg-background w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট' : 'Department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল ডিপার্টমেন্ট' : 'All Departments'}</SelectItem>
                  <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                  <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                  <SelectItem value="support">{bn ? 'অফিস কর্মচারী' : 'Support Staff'}</SelectItem>
                  <SelectItem value="general">{bn ? 'সহায়ক কর্মী' : 'General Staff'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="card-elevated overflow-hidden">
            {staffLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button onClick={toggleAllStaff} className="text-muted-foreground hover:text-primary">
                          {selectedStaffIds.size === filteredStaff.length && filteredStaff.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম' : 'Name'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'আইডি' : 'ID'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পদবী' : 'Designation'}</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'মোবাইল' : 'Mobile'}</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStaff.map((s: any) => (
                      <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => toggleStaffSelect(s.id)} className="text-muted-foreground hover:text-primary">
                            {selectedStaffIds.has(s.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {s.photo_url ? (
                              <img src={s.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {(bn ? s.name_bn : s.name_en)?.[0] || '?'}
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-foreground text-sm block">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</span>
                              {s.name_bn && s.name_en && <span className="text-xs text-muted-foreground">{bn ? s.name_en : s.name_bn}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{s.staff_id || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{s.designation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setPreviewStaff(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'প্রিভিউ' : 'Preview'}>
                              <Eye className="w-4 h-4" />
                            </button>
                            {canPrintStaffCards && (
                              <button onClick={() => handlePrintStaffSingle(s)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary" title={bn ? 'প্রিন্ট' : 'Print'}>
                                <Printer className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStaff.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff found'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
        )}
      </Tabs>

      {/* Student Preview Dialog */}
      <Dialog open={!!previewStudent} onOpenChange={(o) => { if (!o) setPreviewStudent(null); }}>
        <DialogContent
          className="flex max-h-[90vh] flex-col p-6 sm:max-w-[32rem]"
        >
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>{bn ? 'আইডি কার্ড প্রিভিউ' : 'ID Card Preview'}</DialogTitle>
          </DialogHeader>
          <div
            className="id-preview-scroll flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-2"
            style={previewScrollAreaStyle}
          >
            {previewStudent && (
              <div
                className="flex w-full justify-center"
                style={previewCardShellStyle}
              >
                <div className="flex w-full justify-center" style={previewCardScaleStyle}>
                  <StudentIdCard
                    ref={cardRef}
                    student={buildStudentData(previewStudent)}
                    {...commonCardProps}
                    profileUrl={getProfileUrl(previewStudent)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <Button
              onClick={() => { if (cardRef.current) printIdCard(cardRef.current.outerHTML); }}
              className="btn-primary-gradient mx-auto flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {bn ? 'প্রিন্ট করুন' : 'Print Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Preview Dialog */}
      <Dialog open={!!previewStaff} onOpenChange={(o) => { if (!o) setPreviewStaff(null); }}>
        <DialogContent
          className="flex max-h-[90vh] flex-col p-6 sm:max-w-[32rem]"
        >
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>{bn ? 'কর্মী আইডি কার্ড প্রিভিউ' : 'Staff ID Card Preview'}</DialogTitle>
          </DialogHeader>
          <div
            className="id-preview-scroll flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-2"
            style={previewScrollAreaStyle}
          >
            {previewStaff && (
              <div
                className="flex w-full justify-center"
                style={previewCardShellStyle}
              >
                <div className="flex w-full justify-center" style={previewCardScaleStyle}>
                  <StaffIdCard
                    ref={staffCardRef}
                    staff={buildStaffData(previewStaff)}
                    {...commonCardProps}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 pt-4">
            <Button
              onClick={() => { if (staffCardRef.current) printIdCard(staffCardRef.current.outerHTML); }}
              className="btn-primary-gradient mx-auto flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {bn ? 'প্রিন্ট করুন' : 'Print Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIdCards;
