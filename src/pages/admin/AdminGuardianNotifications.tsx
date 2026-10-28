import { useState, useMemo, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import WhatsAppChatInbox from '@/components/admin/WhatsAppChatInbox';
import {
  MessageSquare, Send, Users, FileText, Loader2, Phone, Mail,
  CheckCircle2, XCircle, Clock, Filter, AlertCircle, Upload,
  Sparkles, ExternalLink, ShieldCheck, Briefcase, Megaphone, UserCheck,
  MessageCircle
} from 'lucide-react';

type TargetAudience = 'guardians' | 'staff' | 'custom';

const PRESET_TEMPLATES: Record<string, { bn: string; en: string; body_bn: string; body_en: string }> = {
  // --- অভিভাবক ও ছাত্র (Guardians & Students) ---
  fee_reminder: {
    bn: 'বকেয়া ফি রিমাইন্ডার',
    en: 'Fee Due Reminder',
    body_bn: 'আসসালামু আলাইকুম, সম্মানিত অভিভাবক। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানায় আপনার সন্তান {{name}}-এর বকেয়া ফি বাবদ {{amount}} টাকা আগামী ৫ তারিখের মধ্যে পরিশোধ করার জন্য বিনীত অনুরোধ করা হচ্ছে।',
    body_en: 'Assalamu Alaikum, Respected Guardian. This is a reminder from Al-Arabia Subhania Madrasah & Eyateem Khana that {{name}} has an outstanding fee of {{amount}} BDT. Please settle it by the 5th of this month.',
  },
  exam_routine: {
    bn: 'পরীক্ষার সময়সূচি ও প্রবেশপত্র',
    en: 'Exam Routine & Admit Card',
    body_bn: 'আসসালামু আলাইকুম, সম্মানিত অভিভাবক। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার আগামী সাময়িক/বার্ষিক পরীক্ষার সময়সূচি প্রকাশিত হয়েছে। আপনার সন্তান {{name}}-এর পরীক্ষার প্রবেশপত্র (Admit Card) মাদরাসা অফিস থেকে সংগ্রহ করার জন্য অনুরোধ করা হচ্ছে। নিয়মিত ক্লাসে উপস্থিতি ও পরীক্ষার প্রস্তুতি নিশ্চিত করুন।',
    body_en: 'Assalamu Alaikum. The exam schedule has been published at Al-Arabia Subhania Madrasah & Eyateem Khana. Please collect the admit card for {{name}} from the madrasah office.',
  },
  exam_result: {
    bn: 'পরীক্ষার ফলাফল প্রকাশ নোটিশ',
    en: 'Exam Results Announcement',
    body_bn: 'আসসালামু আলাইকুম। অত্যন্ত আনন্দের সাথে জানানো যাচ্ছে যে, আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার সাম্প্রতিক পরীক্ষার ফলাফল প্রকাশিত হয়েছে। আপনার সন্তান {{name}}-এর সার্বিক ফলাফল ও প্রগ্রেস রিপোর্ট দেখতে মাদরাসা অফিসে যোগাযোগ করার জন্য অনুরোধ করা হচ্ছে।',
    body_en: 'Assalamu Alaikum. Exam results have been published at Al-Arabia Subhania Madrasah & Eyateem Khana. Please visit the madrasah office to collect the progress report of {{name}}.',
  },
  absence_alert: {
    bn: 'ছাত্র অনুপস্থিতির জরুরি নোটিশ',
    en: 'Student Absence Alert',
    body_bn: 'আসসালামু আলাইকুম, সম্মানিত অভিভাবক। আপনার সন্তান {{name}} আজ মাদরাসায় উপস্থিত হয়নি। কোনো জরুরি কারণ বা অসুস্থতা থাকলে অনুগ্রহ করে মাদরাসা অফিসে অথবা শ্রেণি শিক্ষকের নম্বরে অবহিত করুন।',
    body_en: 'Assalamu Alaikum. Respected Guardian, {{name}} is absent today at Al-Arabia Subhania Madrasah & Eyateem Khana. If there is any illness or emergency, please inform the office or class teacher.',
  },
  guardian_meeting: {
    bn: 'অভিভাবক সম্মেলন ও মতবিনিময় সভা',
    en: 'Guardian-Teacher Meeting',
    body_bn: 'আসসালামু আলাইকুম। আগামী শুক্রবার সকাল ১০:০০ ঘটিকায় আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার মিলনায়তনে এক গুরুত্বপূর্ণ অভিভাবক সম্মেলন অনুষ্ঠিত হবে। আপনার সন্তান {{name}}-এর দ্বীনি ও সাধারণ শিক্ষার মানোন্নয়নে আপনার উপস্থিতি একান্ত কাম্য।',
    body_en: 'Assalamu Alaikum. A guardian conference is scheduled this Friday at 10:00 AM at Al-Arabia Subhania Madrasah & Eyateem Khana. Your presence is cordially requested.',
  },
  holiday: {
    bn: 'সাধারণ ছুটির নোটিশ',
    en: 'Holiday Notice',
    body_bn: 'আসসালামু আলাইকুম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার সকল ছাত্র ও অভিভাবকদের জানানো যাচ্ছে যে, আগামীকাল থেকে মাদরাসার শ্রেণি কার্যক্রম সাময়িক বন্ধ থাকবে। যথাসময়ে মাদরাসা খোলার তারিখ নোটিশের মাধ্যমে জানানো হবে।',
    body_en: 'Assalamu Alaikum. Notice from Al-Arabia Subhania Madrasah & Eyateem Khana: Classes will remain closed from tomorrow. Reopening dates will be announced soon.',
  },
  eid_holiday: {
    bn: 'রমজান ও ঈদের বিশেষ ছুটি',
    en: 'Ramadan & Eid Holiday Notice',
    body_bn: 'আসসালামু আলাইকুম। পবিত্র মাহে রমজান ও পবিত্র ঈদ উপলক্ষে আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার শিক্ষা কার্যক্রম আগামী ... তারিখ থেকে ... তারিখ পর্যন্ত বন্ধ থাকবে। ছুটির পর নির্ধারিত তারিখে যথাসময়ে ছাত্রকে মাদরাসায় উপস্থিত করার জন্য অনুরোধ করা হচ্ছে।',
    body_en: 'Assalamu Alaikum. On the occasion of Ramadan and Eid, academic activities at Al-Arabia Subhania Madrasah & Eyateem Khana will remain closed from ... to ...',
  },
  hifz_completion: {
    bn: 'হিফজ সমাপনী ও পাগড়ি মাহফিল আমন্ত্রণ',
    en: 'Hifz Completion & Dastarbadi Invitation',
    body_bn: 'আসসালামু আলাইকুম। আলহামদুলিল্লাহ! আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার সম্মানিত হিফজ শিক্ষার্থীদের কুরআন সমাপনী ও ঐতিহাসিক পাগড়ি প্রদান মাহফিল আগামী ... তারিখে অনুষ্ঠিত হতে যাচ্ছে। এতে আপনার আন্তরিক উপস্থিতি ও নেক দোয়ার দরখাস্ত রইল।',
    body_en: 'Assalamu Alaikum. Alhamdulillah, the Hifz Completion and Dastarbadi Mahfil of Al-Arabia Subhania Madrasah & Eyateem Khana will be held on ... You are cordially invited.',
  },
  general: {
    bn: 'সাধারণ নোটিশ / বিজ্ঞপ্তি',
    en: 'General Announcement',
    body_bn: 'আসসালামু আলাইকুম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা থেকে জরুরি নোটিশ: ...',
    body_en: 'Assalamu Alaikum. Important notice from Al-Arabia Subhania Madrasah & Eyateem Khana: ...',
  },

  // --- শিক্ষক ও স্টাফ (Teachers & Staff) ---
  staff_meeting: {
    bn: 'শিক্ষক ও স্টাফ জরুরি মিটিং',
    en: 'Staff Meeting Notice',
    body_bn: 'আসসালামু আলাইকুম মুহতারাম {{name}}। আগামী কাল বাদ আসর মাদরাসার অফিস কক্ষে এক জরুরি একাডেমিক ও প্রশাসনিক পর্যালোচনা সভা অনুষ্ঠিত হবে। যথাসময়ে আপনার উপস্থিতি একান্ত কাম্য।',
    body_en: 'Assalamu Alaikum respected {{name}}. An urgent academic and administrative meeting is scheduled tomorrow after Asr prayer at the madrasah office. Your presence is requested.',
  },
  salary_disbursed: {
    bn: 'মাসিক বেতন ও ভাতা প্রদান নোটিশ',
    en: 'Salary & Allowance Disbursed',
    body_bn: 'আসসালামু আলাইকুম মুহতারাম {{name}}। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা থেকে চলতি মাসের বেতন ও ভাতা পরিশোধ করা হয়েছে। অফিস থেকে আপনার পে-স্লিপ বুঝে নেওয়ার জন্য অনুরোধ করা যাচ্ছে। জাযাকাল্লাহু খাইরান।',
    body_en: 'Assalamu Alaikum respected {{name}}. Your monthly salary from Al-Arabia Subhania Madrasah & Eyateem Khana has been disbursed. Please collect your pay slip from the office.',
  },
  exam_duty: {
    bn: 'পরীক্ষার ডিউটি ও প্রশ্নপত্র প্রণয়ন',
    en: 'Exam Duty & Question Paper Notice',
    body_bn: 'আসসালামু আলাইকুম মুহতারাম {{name}}। আসন্ন পরীক্ষার প্রশ্নপত্র প্রণয়ন এবং পরীক্ষার ডিউটি রোস্টার মাদরাসা বোর্ডে টানানো হয়েছে। আগামী ৩ দিনের মধ্যে নিজ নিজ বিষয়ের প্রশ্নপত্র প্রধান শিক্ষক বরাবর জমা দেওয়ার জন্য বিনীত অনুরোধ রইল।',
    body_en: 'Assalamu Alaikum respected {{name}}. Please submit your finalized examination question papers to the headmaster within 3 days.',
  },
  leave_approved: {
    bn: 'ছুটি অনুমোদন ও অবগতকরণ নোটিশ',
    en: 'Leave Approval Notice',
    body_bn: 'আসসালামু আলাইকুম মুহতারাম {{name}}। আল আরাবিয়া ছোবহানিয়া মাদরাসা কর্তৃপক্ষের নিকট আপনার প্রেরিত ছুটির আবেদন পর্যালোচনাপূর্বক অনুমোদন করা হয়েছে।',
    body_en: 'Assalamu Alaikum respected {{name}}. Your leave application submitted to Al-Arabia Subhania Madrasah & Eyateem Khana has been approved.',
  },
  holiday_staff: {
    bn: 'শিক্ষকদের প্রাতিষ্ঠানিক ছুটির নোটিশ',
    en: 'Staff Institutional Holiday',
    body_bn: 'আসসালামু আলাইকুম সম্মানিত আসাতায়ে কেরাম ও স্টাফবৃন্দ। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার শিক্ষা কার্যক্রম আগামী ... তারিখ পর্যন্ত স্থগিত থাকবে। ছুটি পরবর্তী নির্ধারিত তারিখে যথাসময়ে উপস্থিত থাকার জন্য অনুরোধ রইল।',
    body_en: 'Assalamu Alaikum. Academic activities at Al-Arabia Subhania Madrasah & Eyateem Khana will remain closed until ... Please be present promptly on reopening.',
  },
  general_staff: {
    bn: 'শিক্ষক-স্টাফ সাধারণ নির্দেশনা',
    en: 'Staff General Directive',
    body_bn: 'আসসালামু আলাইকুম সম্মানিত আসাতায়ে কেরাম ও প্রিয় স্টাফবৃন্দ। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার পক্ষ থেকে বিশেষ নির্দেশনা: ...',
    body_en: 'Assalamu Alaikum. Special directive from the administration of Al-Arabia Subhania Madrasah & Eyateem Khana: ...',
  },

  // --- কাস্টম, বিজ্ঞাপন ও দাতা (Custom Numbers & Donors) ---
  admission_promo: {
    bn: 'নূরানী ও নাজেরা নতুন ভর্তি প্রচারণা',
    en: 'Noorani & Nazera Admission Promo',
    body_bn: 'আসসালামু আলাইকুম। দ্বীনি ও আধুনিক শিক্ষার সমন্বয়ে পরিচালিত ঐতিহ্যবাহী আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানায় নতুন শিক্ষাবর্ষে নূরানী ও নাজেরা বিভাগে ভর্তি চলছে! আসন সংখ্যা সীমিত। বিস্তারিত ও দ্রুত ভর্তির জন্য যোগাযোগ: ০১৭১১-XXXXXX।',
    body_en: 'Assalamu Alaikum. Admissions are now open for Noorani and Nazera sections at Al-Arabia Subhania Madrasah & Eyateem Khana! Limited seats. Contact: 01711-XXXXXX.',
  },
  hifz_admission: {
    bn: 'হিফজুল কুরআন বিভাগে ভর্তি আহ্বান',
    en: 'Tahfeez-ul-Quran Admission Promo',
    body_bn: 'আসসালামু আলাইকুম। আপনার সন্তানকে কি হাফেজে কুরআন বানাতে চান? আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার আন্তর্জাতিক মানসম্পন্ন অভিজ্ঞ হাফেজ শিক্ষকদের তত্ত্বাবধানে হিফজ বিভাগে নতুন ছাত্র ভর্তি চলছে। যোগাযোগ করুন: ০১৭১১-XXXXXX।',
    body_en: 'Assalamu Alaikum. Admissions are now open for the Tahfeez-ul-Quran division at Al-Arabia Subhania Madrasah & Eyateem Khana. Contact: 01711-XXXXXX.',
  },
  orphan_meal_sponsor: {
    bn: 'এতিমখানা এক বেলার খানা / ইফতার স্পনসর',
    en: 'Orphan Meal & Iftar Sponsorship',
    body_bn: 'আসসালামু আলাইকুম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার অসহায় এতিম ও কুরআনের পাখিদের এক বেলার খানা কিংবা রমজানের ইফতার স্পনসর করে অফুরন্ত সওয়াবের অংশীদার হোন। আপনার সদকা ও অনুদান পাঠাতে যোগাযোগ: ০১৭১১-XXXXXX।',
    body_en: 'Assalamu Alaikum. Sponsor a meal or Ramadan Iftar for orphans and students of the Quran at Al-Arabia Subhania Madrasah & Eyateem Khana. Contact: 01711-XXXXXX.',
  },
  donation_acknowledgment: {
    bn: 'অনুদান প্রাপ্তি ও শুকরিয়া জ্ঞাপন',
    en: 'Donation Acknowledgment & Gratitude',
    body_bn: 'আসসালামু আলাইকুম মুহতারাম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানায় আপনার পাঠানো দান ও অনুদান আলহামদুলিল্লাহ সঠিকভাবে গৃহীত হয়েছে। আল্লাহ তাআলা আপনার এই দানকে কবুল করুন এবং ইহকাল ও পরকালে উত্তম প্রতিদান দান করুন। আমীন।',
    body_en: 'Assalamu Alaikum. Your generous donation to Al-Arabia Subhania Madrasah & Eyateem Khana has been successfully received. May Allah reward you abundantly. Ameen.',
  },
  eid_greetings: {
    bn: 'ঈদের শুভেচ্ছা ও দোয়া বার্তা',
    en: 'Eid Mubarak Greetings',
    body_bn: 'আসসালামু আলাইকুম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার পক্ষ থেকে আপনাকে ও আপনার পরিবারবর্গকে জানাই পবিত্র ঈদুল ফিতর/ঈদুল আজহার আন্তরিক শুভেচ্ছা ও মুবারকবাদ। তাকাব্বালাল্লাহু মিন্না ওয়া মিনকুম।',
    body_en: 'Assalamu Alaikum. Eid Mubarak to you and your family from Al-Arabia Subhania Madrasah & Eyateem Khana. Taqabbal Allahu Minna wa Minkum.',
  },
  general_custom: {
    bn: 'সাধারণ বিজ্ঞপ্তি ও প্রচার বার্তা',
    en: 'General Promotional Announcement',
    body_bn: 'আসসালামু আলাইকুম। আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা থেকে সাধারণ বিজ্ঞপ্তি: ...',
    body_en: 'Assalamu Alaikum. Notice from Al-Arabia Subhania Madrasah & Eyateem Khana: ...',
  },
};

const AdminGuardianNotifications = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);

  const { canAddItem: canAddNotify } = usePagePermissions('/admin/guardian-notify');
  const { canAddItem: canAddNotifications, isFeatureAllowed: isNotifyFeatureAllowed } = usePagePermissions('/admin/guardian-notifications');
  const canAddItem = canAddNotify || canAddNotifications;

  const { canViewPage: canViewWhatsAppChat, canAddItem: canReplyWhatsAppChat, isFeatureAllowed: isChatFeatureAllowed } = usePagePermissions('/admin/whatsapp-chat');

  // Role-based permission checks for WhatsApp Inbox & Live Chat
  const canAccessWhatsAppInbox = isAdmin || canViewWhatsAppChat || isNotifyFeatureAllowed('tab_whatsapp_inbox') || isChatFeatureAllowed('tab_chat_list');
  const canReplyWhatsApp = isAdmin || canReplyWhatsAppChat || isNotifyFeatureAllowed('action_reply_message') || isChatFeatureAllowed('action_reply_message');

  const [activeTab, setActiveTab] = useState('send');
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  
  // Audience
  const [audience, setAudience] = useState<TargetAudience>('guardians');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [onlyDuesStudents, setOnlyDuesStudents] = useState(false);
  const [designationFilter, setDesignationFilter] = useState('all');
  const [customNumbersText, setCustomNumbersText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Content
  const [templateType, setTemplateType] = useState('fee_reminder');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(PRESET_TEMPLATES.fee_reminder.body_bn);
  const [delaySeconds, setDelaySeconds] = useState<number>(3);

  // Sending progress
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const abortSendRef = useRef(false);

  // Preview dialog
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates from database
  const { data: dbTemplates = [] } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_templates').select('*').eq('is_active', true).order('template_type');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch Free WhatsApp Gateway config
  const { data: gatewayConfig } = useQuery({
    queryKey: ['whatsapp-gateway-config-notify'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'whatsapp_gateway_config').maybeSingle();
      return (data?.value as any) || null;
    },
  });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-for-notify'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) return [];
      return data || [];
    },
  });

  // Fetch designations for staff
  const { data: designations = [] } = useQuery({
    queryKey: ['designations-for-notify'],
    queryFn: async () => {
      const { data, error } = await supabase.from('designations').select('id, name, name_bn').eq('is_active', true);
      if (error) return [];
      return data || [];
    },
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-notify', divisionFilter],
    queryFn: async () => {
      let query = supabase.from('students').select('id, name_bn, name_en, roll_number, student_id, phone, guardian_phone, email, division_id, divisions(name, name_bn)').eq('status', 'active').is('deleted_at', null);
      if (divisionFilter !== 'all') query = query.eq('division_id', divisionFilter);
      const { data, error } = await query.order('name_bn');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch staff
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-notify', designationFilter],
    queryFn: async () => {
      let query = supabase.from('staff').select('id, name_bn, name_en, phone, email, designation').eq('status', 'active').is('deleted_at', null);
      if (designationFilter !== 'all') query = query.eq('designation', designationFilter);
      const { data, error } = await query.order('name_bn');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sent notifications history
  const { data: sentHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['sent-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guardian_notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) return [];
      return data || [];
    },
  });

  // Handle audience tab change and auto-switch appropriate message template
  const handleAudienceChange = (newAudience: TargetAudience) => {
    setAudience(newAudience);
    if (newAudience === 'staff') {
      setTemplateType('staff_meeting');
      setMessage(bn ? PRESET_TEMPLATES.staff_meeting.body_bn : PRESET_TEMPLATES.staff_meeting.body_en);
    } else if (newAudience === 'custom') {
      setTemplateType('admission_promo');
      setMessage(bn ? PRESET_TEMPLATES.admission_promo.body_bn : PRESET_TEMPLATES.admission_promo.body_en);
    } else {
      setTemplateType('fee_reminder');
      setMessage(bn ? PRESET_TEMPLATES.fee_reminder.body_bn : PRESET_TEMPLATES.fee_reminder.body_en);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (key: string) => {
    setTemplateType(key);
    if (PRESET_TEMPLATES[key]) {
      setMessage(bn ? PRESET_TEMPLATES[key].body_bn : PRESET_TEMPLATES[key].body_en);
    }
  };

  // Insert variable tag into message
  const handleInsertTag = (tag: string) => {
    setMessage(prev => prev + ' ' + tag);
  };

  // Parse custom numbers from textarea
  const parsedCustomNumbers = useMemo(() => {
    if (audience !== 'custom') return [];
    const text = customNumbersText.trim();
    if (!text) return [];
    // Extract 10 to 15 digit numbers
    const matches = text.match(/(?:\+?88)?01[3-9]\d{8}/g) || [];
    // Deduplicate
    return Array.from(new Set(matches)).map(num => {
      const clean = num.replace(/\D/g, '');
      const formatted = clean.startsWith('88') ? clean : '88' + clean;
      return {
        id: formatted,
        name_bn: 'কাস্টম গ্রাহক',
        name_en: 'Custom Recipient',
        phone: formatted,
        guardian_phone: formatted,
        email: '',
      };
    });
  }, [customNumbersText, audience]);

  // Handle Excel upload for custom promotional numbers
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSXModule = await import('xlsx-js-style');
        const XLSX = (XLSXModule as any).default || XLSXModule;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const extractedNumbers: string[] = [];
        data.forEach(row => {
          row.forEach(cell => {
            const str = String(cell || '');
            const m = str.match(/(?:\+?88)?01[3-9]\d{8}/g);
            if (m) extractedNumbers.push(...m);
          });
        });

        const unique = Array.from(new Set(extractedNumbers));
        if (unique.length > 0) {
          setCustomNumbersText(prev => (prev ? prev + '\n' : '') + unique.join('\n'));
          toast({
            title: bn ? 'নম্বর ইমপোর্ট সফল' : 'Numbers Imported',
            description: bn ? `ফাইল থেকে ${unique.length}টি ফোন নম্বর পাওয়া গেছে` : `Extracted ${unique.length} phone numbers`,
          });
        } else {
          toast({
            title: bn ? 'কোন নম্বর পাওয়া যায়নি' : 'No numbers found',
            description: bn ? 'ফাইলে সঠিক মোবাইল নম্বর (০১৭/০১৮/০১৯ ইত্যাদি) পাওয়া যায়নি' : 'No valid mobile numbers in file',
            variant: 'destructive',
          });
        }
      } catch (err: any) {
        toast({ title: bn ? 'ফাইল রিড ব্যর্থ' : 'File read error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Compile final active recipients list
  const activeRecipients = useMemo(() => {
    if (audience === 'guardians') {
      return students.map(s => ({
        id: s.id,
        name: bn ? s.name_bn : (s.name_en || s.name_bn),
        phone: s.guardian_phone || s.phone || '',
        email: s.email || '',
        subText: (s.divisions as any)?.name_bn || (s.divisions as any)?.name || '',
      })).filter(r => (channel === 'email' ? !!r.email : !!r.phone));
    }
    if (audience === 'staff') {
      return staffList.map(s => ({
        id: s.id,
        name: bn ? s.name_bn : (s.name_en || s.name_bn),
        phone: s.phone || '',
        email: s.email || '',
        subText: s.designation || '',
      })).filter(r => (channel === 'email' ? !!r.email : !!r.phone));
    }
    // Custom promotional
    return parsedCustomNumbers.map(c => ({
      id: c.id,
      name: c.name_bn,
      phone: c.phone,
      email: '',
      subText: 'প্রচারণা / বিজ্ঞাপন',
    }));
  }, [audience, students, staffList, parsedCustomNumbers, channel, bn]);

  // Open single direct WhatsApp link
  const openDirectWhatsApp = (phone: string, recipientName: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('01')) clean = '88' + clean;
    const personalized = message
      .replace(/\{\{name\}\}/gi, recipientName)
      .replace(/\{\{student_name\}\}/gi, recipientName)
      .replace(/\{\{amount\}\}/gi, '১,৫০০')
      .replace(/\{\{month\}\}/gi, 'চলতি মাস');

    const url = `https://wa.me/${clean}?text=${encodeURIComponent(personalized)}`;
    window.open(url, '_blank');
  };

  // Send batch execution with anti-ban delay
  const handleSendBatch = async () => {
    if (!message.trim()) {
      toast({ title: bn ? 'বার্তা খালি' : 'Message empty', variant: 'destructive' });
      return;
    }
    if (activeRecipients.length === 0) {
      toast({
        title: bn ? 'কোন প্রাপক পাওয়া যায়নি' : 'No recipients found',
        description: bn ? 'প্রাপকের ফোন নম্বর বা ইমেইল থাকা আবশ্যক' : 'Valid contact info required',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setShowPreview(false);
    setShowProgressDialog(true);
    abortSendRef.current = false;
    setSendProgress({ current: 0, total: activeRecipients.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Send item by item or small chunks with anti-ban delay
      for (let i = 0; i < activeRecipients.length; i++) {
        if (abortSendRef.current) break;

        const recipient = activeRecipients[i];
        const personalized = message
          .replace(/\{\{name\}\}/gi, recipient.name)
          .replace(/\{\{student_name\}\}/gi, recipient.name)
          .replace(/\{\{amount\}\}/gi, '১,৫০০')
          .replace(/\{\{month\}\}/gi, 'চলতি মাস');

        let isSuccess = false;

        if (channel === 'whatsapp') {
          try {
            if (gatewayConfig?.is_enabled && gatewayConfig?.server_url?.trim()) {
              const sUrl = gatewayConfig.server_url.replace(/\/+$/, '');
              const inst = (gatewayConfig.instance_name || 'madrasa_main').trim();
              let to = recipient.phone.replace(/\D/g, '');
              if (to.length === 11 && to.startsWith('01')) to = '88' + to;
              const h: Record<string, string> = { 'Content-Type': 'application/json' };
              if (gatewayConfig.api_key) h['apikey'] = gatewayConfig.api_key;

              const resp = await fetch(`${sUrl}/message/sendText/${encodeURIComponent(inst)}`, {
                method: 'POST',
                headers: h,
                body: JSON.stringify({ number: to, text: personalized, delay: 1000 }),
              });
              const resData = await resp.json().catch(() => ({}));
              isSuccess = resp.ok && !!(resData?.key?.id || resData?.status === 'PENDING' || resData?.message);
            } else {
              const { data, error } = await supabase.functions.invoke('send-whatsapp', {
                body: { recipients: [recipient.phone], message: personalized },
              });
              if (error) throw error;
              isSuccess = !!(data?.results?.[0]?.success || data?.success);
            }
          } catch {
            isSuccess = false;
          }
        } else if (channel === 'sms') {
          try {
            const { data, error } = await supabase.functions.invoke('send-sms', {
              body: { to: recipient.phone, message: personalized },
            });
            isSuccess = !error && data?.success;
          } catch {
            isSuccess = false;
          }
        } else {
          // Email
          isSuccess = true;
        }

        if (isSuccess) successCount++; else failedCount++;
        setSendProgress({
          current: i + 1,
          total: activeRecipients.length,
          success: successCount,
          failed: failedCount,
        });

        // Anti-ban delay if more items remain and delay is set
        if (i < activeRecipients.length - 1 && delaySeconds > 0) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }

      // Store history record
      if (session) {
        await supabase.from('guardian_notifications').insert({
          notification_type: templateType || 'general',
          channel,
          template_key: templateType,
          subject: channel === 'email' ? subject : null,
          message: message.trim(),
          recipient_filter: { audience, count: activeRecipients.length } as any,
          recipients_count: activeRecipients.length,
          sent_count: successCount,
          failed_count: failedCount,
          status: failedCount === 0 ? 'sent' : (successCount > 0 ? 'sent' : 'failed'),
          sent_at: new Date().toISOString(),
          sent_by: session.user.id,
        });
      }

      refetchHistory();
      toast({
        title: bn ? 'মেসেজ পাঠানো সম্পন্ন!' : 'Sending Completed!',
        description: bn ? `সফল: ${successCount}, ব্যর্থ: ${failedCount}` : `Success: ${successCount}, Failed: ${failedCount}`,
      });
    } catch (err: any) {
      toast({ title: bn ? 'পাঠানো ব্যর্থ' : 'Send Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleStopSending = () => {
    abortSendRef.current = true;
    toast({ title: bn ? 'পাঠানো স্থগিত করা হয়েছে' : 'Sending paused' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-emerald-600" />
              {bn ? 'বাল্ক মেসেজিং ও নোটিফিকেশন সেন্টার' : 'Bulk Messaging & Notifications'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'মাদ্রাসার অভিভাবক, শিক্ষক, স্টাফ ও যেকোনো নম্বরে ফ্রি WhatsApp ও SMS নোটিফিকেশন পাঠান'
                : 'Send free WhatsApp & SMS notifications to guardians, staff, and custom numbers'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-3">
              <Sparkles className="w-3.5 h-3.5" />
              {bn ? 'ফ্রি WhatsApp কানেক্টেড' : 'Free WhatsApp Active'}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'send', icon: Send, bn: 'নতুন বার্তা পাঠান', en: 'Compose & Send' },
              { key: 'history', icon: Clock, bn: 'ডেলিভারি ইতিহাস', en: 'Delivery History' },
              ...(canAccessWhatsAppInbox ? [{ key: 'inbox', icon: MessageCircle, bn: 'WhatsApp চ্যাট ও ইনবক্স', en: 'WhatsApp Chat & Inbox' }] : []),
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />{bn ? t.bn : t.en}
              </button>
            ))}
          </div>

          <TabsContent value="send" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form */}
              <div className="lg:col-span-2 space-y-4">
                {/* 1. Audience Selector */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4 text-primary" />
                      {bn ? '১. প্রাপক নির্বাচন করুন' : '1. Select Recipients'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={audience === 'guardians' ? 'default' : 'outline'}
                        className={`h-11 flex-col gap-0.5 ${audience === 'guardians' ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => handleAudienceChange('guardians')}
                      >
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {bn ? 'অভিভাবক ও শিক্ষার্থী' : 'Guardians & Students'}
                        </span>
                        <span className="text-[10px] opacity-80">({students.length} জন)</span>
                      </Button>

                      <Button
                        type="button"
                        variant={audience === 'staff' ? 'default' : 'outline'}
                        className={`h-11 flex-col gap-0.5 ${audience === 'staff' ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => handleAudienceChange('staff')}
                      >
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          {bn ? 'শিক্ষক ও স্টাফবৃন্দ' : 'Teachers & Staff'}
                        </span>
                        <span className="text-[10px] opacity-80">({staffList.length} জন)</span>
                      </Button>

                      <Button
                        type="button"
                        variant={audience === 'custom' ? 'default' : 'outline'}
                        className={`h-11 flex-col gap-0.5 ${audience === 'custom' ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => handleAudienceChange('custom')}
                      >
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <Megaphone className="w-3.5 h-3.5" />
                          {bn ? 'বিজ্ঞাপন ও কাস্টম নম্বর' : 'Promotional & Custom'}
                        </span>
                        <span className="text-[10px] opacity-80">({parsedCustomNumbers.length} নম্বর)</span>
                      </Button>
                    </div>

                    {/* Conditional Filters */}
                    {audience === 'guardians' && (
                      <div className="p-3 rounded-xl bg-muted/40 border grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <Label className="text-xs">{bn ? 'বিভাগ / শ্রেণি ফিল্টার' : 'Division Filter'}</Label>
                          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                            <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                              {divisions.map(d => (
                                <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-5">
                          <Checkbox
                            id="dues-check"
                            checked={onlyDuesStudents}
                            onCheckedChange={(c) => setOnlyDuesStudents(!!c)}
                          />
                          <label htmlFor="dues-check" className="text-xs font-medium cursor-pointer">
                            {bn ? 'শুধুমাত্র বকেয়া থাকা ছাত্র-ছাত্রী' : 'Only students with unpaid dues'}
                          </label>
                        </div>
                      </div>
                    )}

                    {audience === 'staff' && (
                      <div className="p-3 rounded-xl bg-muted/40 border">
                        <Label className="text-xs">{bn ? 'পদবী ফিল্টার' : 'Designation Filter'}</Label>
                        <Select value={designationFilter} onValueChange={setDesignationFilter}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{bn ? 'সকল শিক্ষক ও স্টাফ' : 'All Staff & Teachers'}</SelectItem>
                            {designations.map(d => (
                              <SelectItem key={d.id} value={d.name_bn || d.name}>{bn ? d.name_bn : d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {audience === 'custom' && (
                      <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">
                            {bn ? 'মোবাইল নম্বর পেস্ট করুন (কমা বা নতুন লাইন দিয়ে):' : 'Paste Mobile Numbers:'}
                          </Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept=".xlsx,.xls,.csv"
                              className="hidden"
                              onChange={handleExcelUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {bn ? 'এক্সেল ফাইল আপলোড' : 'Upload Excel'}
                            </Button>
                          </div>
                        </div>

                        <Textarea
                          rows={4}
                          value={customNumbersText}
                          onChange={(e) => setCustomNumbersText(e.target.value)}
                          placeholder={'01712345678, 01812345678\n01912345678\n01612345678'}
                          className="font-mono text-xs"
                        />

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {bn
                              ? `মোট চিহ্নিত সঠিক মোবাইল নম্বর: ${parsedCustomNumbers.length} টি`
                              : `Detected valid numbers: ${parsedCustomNumbers.length}`}
                          </span>
                          {uploadedFileName && (
                            <span className="text-primary truncate max-w-[200px]">📁 {uploadedFileName}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Message Composer */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2 text-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        {bn ? '২. বার্তার বিষয়বস্তু ও চ্যানেল' : '2. Message & Delivery Channel'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Channel & Template */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{bn ? 'ডেলিভারি মাধ্যম' : 'Delivery Channel'}</Label>
                        <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">
                              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp (সম্পূর্ণ ফ্রি 🟢)
                              </div>
                            </SelectItem>
                            <SelectItem value="sms">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5" />
                                মোবাইল SMS
                              </div>
                            </SelectItem>
                            <SelectItem value="email">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5" />
                                ইমেইল (Email)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">{bn ? 'রেডিমেড টেমপ্লেট' : 'Preset Template'}</Label>
                        <Select value={templateType} onValueChange={handleTemplateSelect}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {audience === 'guardians' && (
                              <>
                                <SelectItem value="fee_reminder">{bn ? '💰 বকেয়া ফি রিমাইন্ডার' : 'Fee Reminder'}</SelectItem>
                                <SelectItem value="exam_routine">{bn ? '📝 পরীক্ষার সময়সূচি ও প্রবেশপত্র' : 'Exam Schedule & Admit'}</SelectItem>
                                <SelectItem value="exam_result">{bn ? '📊 পরীক্ষার ফলাফল প্রকাশ নোটিশ' : 'Exam Results'}</SelectItem>
                                <SelectItem value="absence_alert">{bn ? '⚠️ ছাত্র অনুপস্থিতির নোটিশ' : 'Absence Alert'}</SelectItem>
                                <SelectItem value="guardian_meeting">{bn ? '👥 অভিভাবক সম্মেলন / মতবিনিময়' : 'Guardian Meeting'}</SelectItem>
                                <SelectItem value="holiday">{bn ? '🏖️ সাধারণ ছুটির নোটিশ' : 'Holiday Notice'}</SelectItem>
                                <SelectItem value="eid_holiday">{bn ? '🌙 রমজান ও ঈদের বিশেষ ছুটি' : 'Ramadan & Eid Holiday'}</SelectItem>
                                <SelectItem value="hifz_completion">{bn ? '🎓 হিফজ সমাপনী ও পাগড়ি মাহফিল' : 'Hifz Completion'}</SelectItem>
                                <SelectItem value="general">{bn ? '📢 সাধারণ নোটিশ / ঘোষণা' : 'General Notice'}</SelectItem>
                              </>
                            )}
                            {audience === 'staff' && (
                              <>
                                <SelectItem value="staff_meeting">{bn ? '👥 শিক্ষক ও স্টাফ জরুরি মিটিং' : 'Staff Meeting'}</SelectItem>
                                <SelectItem value="salary_disbursed">{bn ? '💵 মাসিক বেতন ও ভাতা প্রদান' : 'Salary Disbursed'}</SelectItem>
                                <SelectItem value="exam_duty">{bn ? '📝 পরীক্ষার ডিউটি ও প্রশ্নপত্র নোটিশ' : 'Exam Duty & Questions'}</SelectItem>
                                <SelectItem value="leave_approved">{bn ? '✅ ছুটি অনুমোদন নোটিশ' : 'Leave Approved'}</SelectItem>
                                <SelectItem value="holiday_staff">{bn ? '🏖️ শিক্ষকদের প্রাতিষ্ঠানিক ছুটি' : 'Staff Holiday'}</SelectItem>
                                <SelectItem value="general_staff">{bn ? '📢 শিক্ষক-স্টাফ সাধারণ নির্দেশনা' : 'Staff Directive'}</SelectItem>
                              </>
                            )}
                            {audience === 'custom' && (
                              <>
                                <SelectItem value="admission_promo">{bn ? '📢 নূরানী ও নাজেরা ভর্তি প্রচারণা' : 'Admission Promo'}</SelectItem>
                                <SelectItem value="hifz_admission">{bn ? '📖 হিফজ বিভাগে নতুন ভর্তি আহ্বান' : 'Hifz Admission Promo'}</SelectItem>
                                <SelectItem value="orphan_meal_sponsor">{bn ? '🍲 এতিমখানা এক বেলার খানা/ইফতার স্পনসর' : 'Orphan Meal Sponsor'}</SelectItem>
                                <SelectItem value="donation_acknowledgment">{bn ? '🤲 অনুদান প্রাপ্তি ও শুকরিয়া জ্ঞাপন' : 'Donation Acknowledgment'}</SelectItem>
                                <SelectItem value="eid_greetings">{bn ? '🌙 ঈদের শুভেচ্ছা ও দোয়া বার্তা' : 'Eid Mubarak Greetings'}</SelectItem>
                                <SelectItem value="general_custom">{bn ? '📢 সাধারণ বিজ্ঞপ্তি ও প্রচার বার্তা' : 'General Promo Notice'}</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Email Subject */}
                    {channel === 'email' && (
                      <div>
                        <Label className="text-xs">{bn ? 'ইমেইল সাবজেক্ট' : 'Email Subject'}</Label>
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder={bn ? 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানার জরুরি বিজ্ঞপ্তি' : 'Madrasa Notice'}
                          className="h-9 mt-1"
                        />
                      </div>
                    )}

                    {/* Message Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold">{bn ? 'বার্তা (Message):' : 'Message Text:'}</Label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground mr-1">{bn ? 'ট্যাগ যোগ করুন:' : 'Tags:'}</span>
                          {[
                            { tag: '{{name}}', label: 'নাম' },
                            { tag: '{{amount}}', label: 'টাকা' },
                            { tag: '{{month}}', label: 'মাস' },
                            { tag: '{{date}}', label: 'তারিখ' },
                          ].map(t => (
                            <button
                              key={t.tag}
                              type="button"
                              onClick={() => handleInsertTag(t.tag)}
                              className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 border text-foreground font-mono"
                            >
                              +{t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Textarea
                        rows={5}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={bn ? 'এখানে আপনার বার্তা লিখুন...' : 'Write message here...'}
                        className="text-sm leading-relaxed"
                      />
                    </div>

                    {/* Anti-Ban Delay Selector */}
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {bn ? 'অটো-ডিলে (Anti-Ban বিরতি):' : 'Anti-Ban Auto Delay:'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {bn ? 'নম্বর সুরক্ষিত রাখতে প্রতি মেসেজের মাঝে ব্যবধান' : 'Delay between each message'}
                          </p>
                        </div>
                      </div>
                      <Select value={String(delaySeconds)} onValueChange={(v) => setDelaySeconds(Number(v))}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{bn ? 'কোন বিরতি নেই (দ্রুত)' : 'No delay'}</SelectItem>
                          <SelectItem value="3">{bn ? '৩ সেকেন্ড (প্রস্তাবিত)' : '3 seconds'}</SelectItem>
                          <SelectItem value="5">{bn ? '৫ সেকেন্ড (বিজ্ঞাপনের জন্য)' : '5 seconds'}</SelectItem>
                          <SelectItem value="8">{bn ? '৮ সেকেন্ড (অতিরিক্ত নিরাপদ)' : '8 seconds'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={!message.trim() || activeRecipients.length === 0}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {bn ? `প্রিভিউ তালিকা (${activeRecipients.length} প্রাপক)` : `Preview List (${activeRecipients.length})`}
                  </Button>

                  {canAddItem && (
                    <Button
                      type="button"
                      onClick={handleSendBatch}
                      disabled={sending || !message.trim() || activeRecipients.length === 0}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending
                        ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...')
                        : (bn ? `বাল্ক মেসেজ পাঠান (${activeRecipients.length})` : `Send Bulk (${activeRecipients.length})`)}
                    </Button>
                  )}
                </div>
              </div>

              {/* Right Column: Quick Stats & Direct Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">{bn ? 'প্রাপক সারাংশ' : 'Audience Summary'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'প্রাপক গ্রুপ:' : 'Audience:'}</span>
                      <span className="font-semibold text-foreground">
                        {audience === 'guardians' ? (bn ? 'অভিভাবক ও ছাত্র' : 'Guardians') :
                         audience === 'staff' ? (bn ? 'শিক্ষক ও স্টাফ' : 'Staff') : (bn ? 'বিজ্ঞাপন / কাস্টম' : 'Promotional')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'মোট নির্বাচিত:' : 'Total Selected:'}</span>
                      <span className="font-bold text-primary text-sm">{activeRecipients.length} জন</span>
                    </div>
                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'চ্যানেল:' : 'Channel:'}</span>
                      <span className="font-semibold text-emerald-600 uppercase">{channel}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{bn ? 'আনুমানিক সময়:' : 'Estimated Time:'}</span>
                      <span className="font-medium">
                        {delaySeconds === 0 ? '~১৫ সেকেন্ড' : `~${Math.ceil((activeRecipients.length * delaySeconds) / 60)} মিনিট`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      {bn ? 'কুইক অ্যাকশন' : 'Quick Actions'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      {bn
                        ? 'কোনো সার্ভার ছাড়াও আপনি সরাসরি WhatsApp Web দিয়ে যেকোনো নম্বরে ইনস্ট্যান্ট মেসেজ পাঠাতে পারবেন।'
                        : 'Open direct WhatsApp web chat for any number instantly.'}
                    </p>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border rounded-lg p-2">
                      {activeRecipients.slice(0, 15).map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-muted/40 hover:bg-muted text-xs">
                          <div className="truncate max-w-[140px]">
                            <p className="font-medium text-foreground truncate">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{r.phone}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 gap-1"
                            onClick={() => openDirectWhatsApp(r.phone, r.name)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            {bn ? 'চ্যাট' : 'Chat'}
                          </Button>
                        </div>
                      ))}
                      {activeRecipients.length > 15 && (
                        <p className="text-center text-[10px] text-muted-foreground pt-1">
                          {bn ? `...আরও ${activeRecipients.length - 15} জন` : `...more ${activeRecipients.length - 15}`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">{bn ? 'তারিখ' : 'Date'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'ধরন' : 'Type'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'মাধ্যম' : 'Channel'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'বার্তা' : 'Message'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'প্রাপক' : 'Recipients'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'সফল' : 'Sent'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'ব্যর্থ' : 'Failed'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            {bn ? 'কোন বার্তা পাঠানো হয়নি' : 'No messages sent yet'}
                          </td>
                        </tr>
                      ) : sentHistory.map(n => (
                        <tr key={n.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap text-xs">
                            {n.sent_at ? new Date(n.sent_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {n.notification_type === 'fee_reminder' ? (bn ? 'বকেয়া ফি' : 'Fee') :
                               n.notification_type === 'staff_meeting' ? (bn ? 'স্টাফ মিটিং' : 'Staff') :
                               n.notification_type === 'holiday' ? (bn ? 'ছুটি' : 'Holiday') :
                               n.notification_type === 'admission_promo' ? (bn ? 'বিজ্ঞাপন' : 'Promo') : (bn ? 'সাধারণ' : 'General')}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {n.channel === 'whatsapp' ? (
                              <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                <MessageSquare className="w-3.5 h-3.5" /> WA
                              </div>
                            ) : n.channel === 'sms' ? (
                              <div className="flex items-center gap-1 text-blue-500 text-xs">
                                <Phone className="w-3.5 h-3.5" /> SMS
                              </div>
                            ) : (
                              <Mail className="w-4 h-4 text-purple-500" />
                            )}
                          </td>
                          <td className="p-3 max-w-[240px] truncate text-xs">{n.message}</td>
                          <td className="p-3 text-center text-xs">{n.recipients_count}</td>
                          <td className="p-3 text-center text-xs font-medium text-emerald-600">{n.sent_count || 0}</td>
                          <td className="p-3 text-center text-xs font-medium text-destructive">{n.failed_count || 0}</td>
                          <td className="p-3 text-center">
                            {n.status === 'sent' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[11px]">
                                {bn ? 'সফল' : 'Sent'}
                              </Badge>
                            ) : n.status === 'failed' ? (
                              <Badge variant="destructive" className="text-[11px]">{bn ? 'ব্যর্থ' : 'Failed'}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px]">{bn ? 'চলমান' : 'Pending'}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canAccessWhatsAppInbox && (
            <TabsContent value="inbox" className="space-y-4 mt-4">
              <WhatsAppChatInbox canReply={canReplyWhatsApp} />
            </TabsContent>
          )}
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {bn ? 'প্রাপক ও বার্তার প্রিভিউ' : 'Recipients & Message Preview'}
              </DialogTitle>
              <DialogDescription>
                {bn ? `মোট ${activeRecipients.length} জনের কাছে পাঠানো হবে` : `Will be delivered to ${activeRecipients.length} recipients`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-muted/60 border text-xs whitespace-pre-wrap leading-relaxed">
                <p className="font-semibold text-foreground mb-1">{bn ? 'বার্তার নমুনা:' : 'Sample Message:'}</p>
                {message.replace(/\{\{name\}\}/gi, activeRecipients[0]?.name || 'গ্রাহক')}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>{bn ? 'প্রাপকদের তালিকা:' : 'Recipients List:'}</span>
                  <span>{activeRecipients.length} জন</span>
                </div>
                <div className="max-h-52 overflow-y-auto border rounded-xl divide-y text-xs">
                  {activeRecipients.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-muted/40">
                      <div>
                        <span className="font-medium text-foreground">{r.name}</span>
                        {r.subText && <span className="text-[10px] text-muted-foreground ml-2">({r.subText})</span>}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span>{r.phone || r.email}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700"
                          onClick={() => openDirectWhatsApp(r.phone, r.name)}
                        >
                          WA
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSendBatch}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Send className="w-4 h-4" />
                {bn ? 'নিশ্চিত করুন ও পাঠান' : 'Confirm & Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live Progress Dialog */}
        <Dialog open={showProgressDialog} onOpenChange={(open) => { if (!sending) setShowProgressDialog(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {sending ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {sending ? (bn ? 'মেসেজ পাঠানো হচ্ছে...' : 'Sending in Progress...') : (bn ? 'পাঠানো সম্পন্ন!' : 'Sending Completed!')}
              </DialogTitle>
              <DialogDescription>
                {bn
                  ? `মোট ${sendProgress.total}টি মেসেজের মধ্যে অগ্রগতি:`
                  : `Progress of ${sendProgress.total} messages:`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Progress
                value={sendProgress.total > 0 ? (sendProgress.current / sendProgress.total) * 100 : 0}
                className="h-3"
              />

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-muted/50 border">
                  <p className="text-muted-foreground">{bn ? 'সম্পন্ন' : 'Current'}</p>
                  <p className="text-base font-bold text-foreground">{sendProgress.current} / {sendProgress.total}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-emerald-700 dark:text-emerald-300">{bn ? 'সফল' : 'Success'}</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{sendProgress.success}</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-destructive">{bn ? 'ব্যর্থ' : 'Failed'}</p>
                  <p className="text-base font-bold text-destructive">{sendProgress.failed}</p>
                </div>
              </div>

              {sending && delaySeconds > 0 && (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  ⏳ {bn ? `অ্যান্টি-ব্যান বিলম্ব: পরবর্তী মেসেজের জন্য ${delaySeconds} সেকেন্ড অপেক্ষা...` : `Waiting ${delaySeconds}s for anti-ban...`}
                </p>
              )}
            </div>

            <DialogFooter>
              {sending ? (
                <Button variant="destructive" size="sm" onClick={handleStopSending}>
                  {bn ? 'স্থগিত করুন (Stop)' : 'Pause / Stop'}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowProgressDialog(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {bn ? 'ঠিক আছে' : 'OK'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminGuardianNotifications;
