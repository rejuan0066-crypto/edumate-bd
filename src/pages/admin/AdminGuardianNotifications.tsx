import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
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
  MessageCircle, Calendar, Repeat, Play, Pause, Trash2, RefreshCw, Search,
  User, Check, ChevronRight, Bell
} from 'lucide-react';

type TargetAudience = 'guardians' | 'staff' | 'custom';
type MessageMode = 'bulk' | 'single';
type SingleAudience = 'guardian' | 'staff' | 'custom';

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

const INTERVAL_OPTIONS = [
  { value: 'once', label_bn: 'একবারই (কোন পুনরাবৃত্তি নেই)', label_en: 'Once (No repetition)', minutes: 0 },
  { value: '15m', label_bn: 'প্রতি ১৫ মিনিট পর পর', label_en: 'Every 15 minutes', minutes: 15 },
  { value: '30m', label_bn: 'প্রতি ৩০ মিনিট পর পর', label_en: 'Every 30 minutes', minutes: 30 },
  { value: '1h', label_bn: 'প্রতি ১ ঘণ্টা পর পর', label_en: 'Every 1 hour', minutes: 60 },
  { value: '2h', label_bn: 'প্রতি ২ ঘণ্টা পর পর', label_en: 'Every 2 hours', minutes: 120 },
  { value: '6h', label_bn: 'প্রতি ৬ ঘণ্টা পর পর', label_en: 'Every 6 hours', minutes: 360 },
  { value: '12h', label_bn: 'প্রতি ১২ ঘণ্টা পর পর', label_en: 'Every 12 hours', minutes: 720 },
  { value: '24h', label_bn: 'প্রতিদিন (২৪ ঘণ্টা পর পর)', label_en: 'Daily (Every 24 hours)', minutes: 1440 },
  { value: '7d', label_bn: 'প্রতি সপ্তাহে (৭ দিন পর পর)', label_en: 'Weekly (Every 7 days)', minutes: 10080 },
  { value: '30d', label_bn: 'প্রতি মাসে (৩০ দিন পর পর)', label_en: 'Monthly (Every 30 days)', minutes: 43200 },
];

const REPEAT_COUNT_OPTIONS = [
  { value: '1', label_bn: '১ বার (Only 1 time)', label_en: '1 time' },
  { value: '2', label_bn: '২ বার', label_en: '2 times' },
  { value: '3', label_bn: '৩ বার', label_en: '3 times' },
  { value: '5', label_bn: '৫ বার', label_en: '5 times' },
  { value: '10', label_bn: '১০ বার', label_en: '10 times' },
  { value: 'custom', label_bn: 'কাস্টম সংখ্যা...', label_en: 'Custom count...' },
  { value: 'unlimited', label_bn: 'বিরতিহীন / বন্ধ না করা পর্যন্ত', label_en: 'Unlimited until stopped' },
];

const getIntervalMinutes = (interval: string): number => {
  const found = INTERVAL_OPTIONS.find(i => i.value === interval);
  return found ? found.minutes : 0;
};

const getIntervalLabel = (interval: string, bn: boolean): string => {
  const found = INTERVAL_OPTIONS.find(i => i.value === interval);
  if (!found) return interval;
  return bn ? found.label_bn : found.label_en;
};

// Helper: format ISO string to local input datetime-local string (YYYY-MM-DDTHH:mm)
const getLocalDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper: format relative time nicely
const formatRelativeTime = (isoString: string, bn: boolean): string => {
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = target - now;
    const diffMins = Math.round(diffMs / 60000);

    if (Math.abs(diffMins) < 1) {
      return bn ? 'এই মুহূর্তে' : 'Just now';
    }
    if (diffMins > 0) {
      if (diffMins < 60) return bn ? `${diffMins} মিনিট পর` : `In ${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      if (diffHours < 24) {
        return bn
          ? `${diffHours} ঘণ্টা ${remMins > 0 ? `${remMins} মি ` : ''}পর`
          : `In ${diffHours}h ${remMins}m`;
      }
      const days = Math.floor(diffHours / 24);
      return bn ? `${days} দিন পর` : `In ${days}d`;
    } else {
      const pastMins = Math.abs(diffMins);
      if (pastMins < 60) return bn ? `${pastMins} মিনিট আগে` : `${pastMins}m ago`;
      const pastHours = Math.floor(pastMins / 60);
      if (pastHours < 24) return bn ? `${pastHours} ঘণ্টা আগে` : `${pastHours}h ago`;
      const days = Math.floor(pastHours / 24);
      return bn ? `${days} দিন আগে` : `${days}d ago`;
    }
  } catch {
    return isoString;
  }
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

  const [activeTab, setActiveTab] = useState<'send' | 'scheduled' | 'history' | 'inbox'>('send');
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  // Mode: Bulk vs Single
  const [messageMode, setMessageMode] = useState<MessageMode>('bulk');

  // Bulk Audience
  const [audience, setAudience] = useState<TargetAudience>('guardians');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [onlyDuesStudents, setOnlyDuesStudents] = useState(false);
  const [designationFilter, setDesignationFilter] = useState('all');
  const [customNumbersText, setCustomNumbersText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Single Recipient Selection
  const [singleAudience, setSingleAudience] = useState<SingleAudience>('guardian');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [useGuardianPhone, setUseGuardianPhone] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [customSinglePhone, setCustomSinglePhone] = useState('');
  const [customSingleName, setCustomSingleName] = useState('');

  // Content
  const [templateType, setTemplateType] = useState('fee_reminder');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(PRESET_TEMPLATES.fee_reminder.body_bn);
  const [delaySeconds, setDelaySeconds] = useState<number>(3);

  // Scheduling & Recurring State
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 15 * 60000); // 15 mins ahead
    return getLocalDatetimeLocal(d);
  });
  const [repeatInterval, setRepeatInterval] = useState('once');
  const [repeatCountType, setRepeatCountType] = useState('1');
  const [customRepeatCount, setCustomRepeatCount] = useState<number>(3);

  // Sending progress
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const abortSendRef = useRef(false);

  // Preview dialog
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch bulk students (filtered by division)
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-notify', divisionFilter],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, name_bn, name_en, roll_number, student_id, phone, guardian_phone, email, division_id, divisions(name, name_bn)')
        .eq('status', 'active')
        .is('deleted_at', null);
      if (divisionFilter !== 'all') query = query.eq('division_id', divisionFilter);
      const { data, error } = await query.order('name_bn');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all students for Single Recipient search
  const { data: allStudents = [] } = useQuery({
    queryKey: ['all-students-for-single-notify'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, roll_number, student_id, phone, guardian_phone, email, division_id, divisions(name, name_bn)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name_bn');
      if (error) return [];
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
      const { data, error } = await supabase
        .from('guardian_notifications')
        .select('*')
        .neq('status', 'scheduled')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  // Fetch scheduled notifications queue
  const { data: scheduledList = [], refetch: refetchScheduled } = useQuery({
    queryKey: ['scheduled-notifications-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardian_notifications')
        .select('*')
        .in('status', ['scheduled', 'paused', 'completed'])
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Active scheduled tasks count
  const activeSchedulesCount = useMemo(() => {
    return scheduledList.filter(s => s.status === 'scheduled').length;
  }, [scheduledList]);

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

  const handleSingleAudienceChange = (newAudience: SingleAudience) => {
    setSingleAudience(newAudience);
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

  // Parse custom numbers from textarea (for Bulk mode)
  const parsedCustomNumbers = useMemo(() => {
    if (audience !== 'custom') return [];
    const text = customNumbersText.trim();
    if (!text) return [];
    const matches = text.match(/(?:\+?88)?01[3-9]\d{8}/g) || [];
    return Array.from(new Set(matches)).map(num => {
      const clean = num.replace(/\D/g, '');
      const formatted = clean.startsWith('88') ? clean : '88' + clean;
      return {
        id: formatted,
        name: 'কাস্টম গ্রাহক',
        phone: formatted,
        email: '',
        subText: 'বিজ্ঞাপন ও কাস্টম',
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

  // Filter students for Single Recipient search
  const filteredStudentsForSingle = useMemo(() => {
    if (!studentSearch.trim()) return allStudents.slice(0, 8);
    const q = studentSearch.trim().toLowerCase();
    return allStudents.filter(s => {
      const nameBn = (s.name_bn || '').toLowerCase();
      const nameEn = (s.name_en || '').toLowerCase();
      const roll = String(s.roll_number || '');
      const sId = (s.student_id || '').toLowerCase();
      const phone = (s.guardian_phone || s.phone || '');
      return nameBn.includes(q) || nameEn.includes(q) || roll.includes(q) || sId.includes(q) || phone.includes(q);
    }).slice(0, 10);
  }, [allStudents, studentSearch]);

  // Filter staff for Single Recipient search
  const filteredStaffForSingle = useMemo(() => {
    if (!staffSearch.trim()) return staffList.slice(0, 8);
    const q = staffSearch.trim().toLowerCase();
    return staffList.filter(s => {
      const nameBn = (s.name_bn || '').toLowerCase();
      const nameEn = (s.name_en || '').toLowerCase();
      const desig = (s.designation || '').toLowerCase();
      const phone = (s.phone || '');
      return nameBn.includes(q) || nameEn.includes(q) || desig.includes(q) || phone.includes(q);
    }).slice(0, 10);
  }, [staffList, staffSearch]);

  // Single Recipient Object
  const singleRecipientObj = useMemo(() => {
    if (singleAudience === 'guardian') {
      if (!selectedStudent) return null;
      const phone = (useGuardianPhone ? selectedStudent.guardian_phone : selectedStudent.phone) || selectedStudent.guardian_phone || selectedStudent.phone || '';
      return {
        id: selectedStudent.id,
        name: bn ? selectedStudent.name_bn : (selectedStudent.name_en || selectedStudent.name_bn),
        phone: phone,
        email: selectedStudent.email || '',
        subText: `${(selectedStudent.divisions as any)?.name_bn || (selectedStudent.divisions as any)?.name || 'শ্রেণি'} • রোল: ${selectedStudent.roll_number || 'নেই'}`,
        type: 'student',
      };
    }
    if (singleAudience === 'staff') {
      if (!selectedStaff) return null;
      return {
        id: selectedStaff.id,
        name: bn ? selectedStaff.name_bn : (selectedStaff.name_en || selectedStaff.name_bn),
        phone: selectedStaff.phone || '',
        email: selectedStaff.email || '',
        subText: selectedStaff.designation || 'স্টাফ',
        type: 'staff',
      };
    }
    // Custom single
    let clean = customSinglePhone.replace(/\D/g, '');
    if (clean.length === 11 && clean.startsWith('01')) clean = '88' + clean;
    if (!clean) return null;
    return {
      id: clean,
      name: customSingleName.trim() || (bn ? 'কাস্টম প্রাপক' : 'Custom Recipient'),
      phone: clean,
      email: '',
      subText: 'সরাসরি মোবাইল নম্বর',
      type: 'custom',
    };
  }, [singleAudience, selectedStudent, selectedStaff, customSinglePhone, customSingleName, useGuardianPhone, bn]);

  // Bulk active recipients list
  const bulkRecipients = useMemo(() => {
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
    return parsedCustomNumbers;
  }, [audience, students, staffList, parsedCustomNumbers, channel, bn]);

  // Final effective recipients list based on mode
  const effectiveRecipients = useMemo(() => {
    if (messageMode === 'single') {
      return singleRecipientObj ? [singleRecipientObj] : [];
    }
    return bulkRecipients;
  }, [messageMode, singleRecipientObj, bulkRecipients]);

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

  // Helper to dispatch a single message via configured gateway or fallback
  const sendSingleMessage = async (recipient: { phone: string; name: string; email?: string }): Promise<boolean> => {
    const personalized = message
      .replace(/\{\{name\}\}/gi, recipient.name)
      .replace(/\{\{student_name\}\}/gi, recipient.name)
      .replace(/\{\{amount\}\}/gi, '১,৫০০')
      .replace(/\{\{month\}\}/gi, 'চলতি মাস');

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
          return resp.ok && !!(resData?.key?.id || resData?.status === 'PENDING' || resData?.message);
        } else {
          const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { recipients: [recipient.phone], message: personalized },
          });
          if (error) throw error;
          return !!(data?.results?.[0]?.success || data?.success);
        }
      } catch {
        return false;
      }
    } else if (channel === 'sms') {
      try {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: { to: recipient.phone, message: personalized },
        });
        return !error && data?.success;
      } catch {
        return false;
      }
    } else {
      // Email
      return true;
    }
  };

  // Handle immediate dispatch (Single or Bulk)
  const handleImmediateSend = async () => {
    if (!message.trim()) {
      toast({ title: bn ? 'বার্তা খালি' : 'Message empty', variant: 'destructive' });
      return;
    }
    if (effectiveRecipients.length === 0) {
      toast({
        title: bn ? 'কোন প্রাপক নির্বাচন করা হয়নি' : 'No recipient selected',
        description: bn ? 'প্রাপকের নাম বা মোবাইল নম্বর সঠিকভাবে নির্বাচন করুন' : 'Select a valid recipient',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setShowPreview(false);
    setShowProgressDialog(true);
    abortSendRef.current = false;
    setSendProgress({ current: 0, total: effectiveRecipients.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      for (let i = 0; i < effectiveRecipients.length; i++) {
        if (abortSendRef.current) break;

        const recipient = effectiveRecipients[i];
        const isSuccess = await sendSingleMessage(recipient);

        if (isSuccess) successCount++;
        else failedCount++;

        setSendProgress({
          current: i + 1,
          total: effectiveRecipients.length,
          success: successCount,
          failed: failedCount,
        });

        if (i < effectiveRecipients.length - 1 && delaySeconds > 0) {
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
          recipient_filter: {
            mode: messageMode,
            audience: messageMode === 'single' ? singleAudience : audience,
            singleRecipient: messageMode === 'single' ? singleRecipientObj : null,
            count: effectiveRecipients.length,
          } as any,
          recipients_count: effectiveRecipients.length,
          sent_count: successCount,
          failed_count: failedCount,
          status: failedCount === 0 ? 'sent' : (successCount > 0 ? 'sent' : 'failed'),
          sent_at: new Date().toISOString(),
          sent_by: session.user.id,
        });
      }

      refetchHistory();
      toast({
        title: messageMode === 'single'
          ? (successCount > 0 ? (bn ? 'একক মেসেজ সফলভাবে পাঠানো হয়েছে!' : 'Single message sent!') : (bn ? 'মেসেজ পাঠানো ব্যর্থ হয়েছে' : 'Send failed'))
          : (bn ? 'বাল্ক মেসেজ পাঠানো সম্পন্ন!' : 'Bulk send completed!'),
        description: bn ? `সফল: ${successCount}, ব্যর্থ: ${failedCount}` : `Success: ${successCount}, Failed: ${failedCount}`,
      });
    } catch (err: any) {
      toast({ title: bn ? 'পাঠানো ব্যর্থ' : 'Send Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // Handle Create Schedule
  const handleScheduleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: bn ? 'বার্তা খালি' : 'Message empty', variant: 'destructive' });
      return;
    }
    if (effectiveRecipients.length === 0) {
      toast({
        title: bn ? 'কোন প্রাপক নির্বাচন করা হয়নি' : 'No recipient selected',
        description: bn ? 'প্রাপকের নাম বা মোবাইল নম্বর দিন' : 'Select recipient',
        variant: 'destructive',
      });
      return;
    }

    const scheduledDate = new Date(scheduledDateTime);
    if (isNaN(scheduledDate.getTime())) {
      toast({ title: bn ? 'সঠিক তারিখ ও সময় নির্বাচন করুন' : 'Invalid schedule time', variant: 'destructive' });
      return;
    }

    const totalRuns = repeatCountType === 'unlimited' ? 0 : (repeatCountType === 'custom' ? Number(customRepeatCount || 1) : Number(repeatCountType));
    const intervalMinutes = getIntervalMinutes(repeatInterval);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const recipientFilterData = {
        mode: messageMode,
        audience: messageMode === 'single' ? singleAudience : audience,
        singleRecipient: messageMode === 'single' ? singleRecipientObj : null,
        recipients: effectiveRecipients,
        schedule: {
          isScheduled: true,
          scheduledAt: scheduledDate.toISOString(),
          interval: repeatInterval,
          intervalMinutes,
          totalRuns,
          runsCompleted: 0,
          lastRunAt: null,
          nextRunAt: scheduledDate.toISOString(),
          isPaused: false,
        },
      };

      const { error } = await supabase.from('guardian_notifications').insert({
        notification_type: templateType || 'general',
        channel,
        template_key: templateType,
        subject: channel === 'email' ? subject : null,
        message: message.trim(),
        recipient_filter: recipientFilterData as any,
        recipients_count: effectiveRecipients.length,
        sent_count: 0,
        failed_count: 0,
        status: 'scheduled',
        sent_at: null,
        sent_by: session?.user?.id || null,
      });

      if (error) throw error;

      refetchScheduled();
      toast({
        title: bn ? 'মেসেজ সফলভাবে শিডিউল করা হয়েছে! ⏰' : 'Message Scheduled Successfully! ⏰',
        description: bn
          ? `প্রথম রান: ${scheduledDate.toLocaleTimeString(bn ? 'bn-BD' : 'en-US')} • মোট রান: ${totalRuns === 0 ? 'বিরতিহীন' : `${totalRuns} বার`}`
          : `First run: ${scheduledDate.toLocaleTimeString()} • Total runs: ${totalRuns === 0 ? 'Unlimited' : totalRuns}`,
      });

      // Switch to scheduled tab
      setActiveTab('scheduled');
    } catch (err: any) {
      toast({ title: bn ? 'শিডিউল ব্যর্থ হয়েছে' : 'Scheduling failed', description: err.message, variant: 'destructive' });
    }
  };

  // Toggle pause/resume on a scheduled task
  const handleToggleSchedulePause = async (scheduleItem: any) => {
    try {
      const isCurrentlyPaused = scheduleItem.status === 'paused';
      const newStatus = isCurrentlyPaused ? 'scheduled' : 'paused';
      const existingFilter = (scheduleItem.recipient_filter as any) || {};
      const updatedSchedule = {
        ...(existingFilter.schedule || {}),
        isPaused: !isCurrentlyPaused,
      };

      const { error } = await supabase
        .from('guardian_notifications')
        .update({
          status: newStatus,
          recipient_filter: { ...existingFilter, schedule: updatedSchedule },
        })
        .eq('id', scheduleItem.id);

      if (error) throw error;
      refetchScheduled();
      toast({
        title: isCurrentlyPaused
          ? (bn ? 'শিডিউল পুনরায় সক্রিয় করা হয়েছে' : 'Schedule resumed')
          : (bn ? 'শিডিউল সাময়িক স্থগিত করা হয়েছে' : 'Schedule paused'),
      });
    } catch (err: any) {
      toast({ title: bn ? 'অপারেশন ব্যর্থ' : 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  // Run a scheduled task immediately (Trigger 1 run now)
  const handleTriggerScheduleNow = async (scheduleItem: any) => {
    try {
      toast({ title: bn ? 'শিডিউল রান করা হচ্ছে...' : 'Executing schedule run...' });
      const filter = (scheduleItem.recipient_filter as any) || {};
      const recipients: Array<{ phone: string; name: string; email?: string }> = filter.recipients || (filter.singleRecipient ? [filter.singleRecipient] : []);

      if (recipients.length === 0) {
        toast({ title: bn ? 'কোন প্রাপক পাওয়া যায়নি' : 'No recipients', variant: 'destructive' });
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const r of recipients) {
        const ok = await sendSingleMessage(r);
        if (ok) successCount++; else failedCount++;
      }

      const currentSchedule = filter.schedule || {};
      const runsCompleted = (currentSchedule.runsCompleted || 0) + 1;
      const totalRuns = currentSchedule.totalRuns || 1;
      const intervalMinutes = currentSchedule.intervalMinutes || 60;
      const isCompleted = totalRuns > 0 && runsCompleted >= totalRuns;

      const nextRunAt = isCompleted
        ? null
        : new Date(Date.now() + (intervalMinutes || 60) * 60000).toISOString();

      await supabase
        .from('guardian_notifications')
        .update({
          status: isCompleted ? 'completed' : 'scheduled',
          sent_count: (scheduleItem.sent_count || 0) + successCount,
          failed_count: (scheduleItem.failed_count || 0) + failedCount,
          sent_at: new Date().toISOString(),
          recipient_filter: {
            ...filter,
            schedule: {
              ...currentSchedule,
              runsCompleted,
              lastRunAt: new Date().toISOString(),
              nextRunAt,
            },
          },
        })
        .eq('id', scheduleItem.id);

      refetchScheduled();
      refetchHistory();
      toast({
        title: bn ? 'রান সম্পন্ন হয়েছে!' : 'Run Completed!',
        description: bn
          ? `সফল: ${successCount}, মোট সম্পন্ন: ${runsCompleted}/${totalRuns === 0 ? '∞' : totalRuns} বার`
          : `Success: ${successCount}, Progress: ${runsCompleted}/${totalRuns === 0 ? '∞' : totalRuns}`,
      });
    } catch (err: any) {
      toast({ title: bn ? 'রান ব্যর্থ' : 'Run failed', description: err.message, variant: 'destructive' });
    }
  };

  // Delete a scheduled task
  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase.from('guardian_notifications').delete().eq('id', scheduleId);
      if (error) throw error;
      refetchScheduled();
      toast({ title: bn ? 'শিডিউল মুছে ফেলা হয়েছে' : 'Schedule deleted' });
    } catch (err: any) {
      toast({ title: bn ? 'মুছতে ব্যর্থ' : 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  // Background Auto-Runner for Due Scheduled Tasks (Checks every 30 seconds)
  useEffect(() => {
    const intervalTimer = setInterval(async () => {
      const nowIso = new Date().toISOString();
      const dueItems = scheduledList.filter(item => {
        if (item.status !== 'scheduled') return false;
        const sched = (item.recipient_filter as any)?.schedule;
        if (!sched || sched.isPaused) return false;
        return sched.nextRunAt && sched.nextRunAt <= nowIso;
      });

      for (const item of dueItems) {
        try {
          const filter = (item.recipient_filter as any) || {};
          const recipients: Array<{ phone: string; name: string }> = filter.recipients || (filter.singleRecipient ? [filter.singleRecipient] : []);
          if (!recipients.length) continue;

          let successCount = 0;
          for (const r of recipients) {
            const ok = await sendSingleMessage(r);
            if (ok) successCount++;
          }

          const sched = filter.schedule || {};
          const runsCompleted = (sched.runsCompleted || 0) + 1;
          const totalRuns = sched.totalRuns || 1;
          const intervalMinutes = sched.intervalMinutes || 60;
          const isCompleted = totalRuns > 0 && runsCompleted >= totalRuns;
          const nextRunAt = isCompleted ? null : new Date(Date.now() + (intervalMinutes || 60) * 60000).toISOString();

          await supabase
            .from('guardian_notifications')
            .update({
              status: isCompleted ? 'completed' : 'scheduled',
              sent_count: (item.sent_count || 0) + successCount,
              sent_at: new Date().toISOString(),
              recipient_filter: {
                ...filter,
                schedule: {
                  ...sched,
                  runsCompleted,
                  lastRunAt: new Date().toISOString(),
                  nextRunAt,
                },
              },
            })
            .eq('id', item.id);

          refetchScheduled();
          refetchHistory();
        } catch {
          // Keep silent in background timer
        }
      }
    }, 30000);

    return () => clearInterval(intervalTimer);
  }, [scheduledList]);

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
              {bn ? 'বাল্ক ও একক মেসেজিং এবং নোটিফিকেশন সেন্টার' : 'Bulk & Single Messaging & Notifications'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'একক বা বাল্ক মেসেজ তৎক্ষণাৎ পাঠান অথবা নির্দিষ্ট সময় পর পর অটো-শিডিউল করুন'
                : 'Send single or bulk messages instantly or auto-schedule with recurring intervals'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1 px-3">
              <Sparkles className="w-3.5 h-3.5" />
              {bn ? 'ফ্রি WhatsApp কানেক্টেড' : 'Free WhatsApp Active'}
            </Badge>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'send', icon: Send, bn: 'নতুন বার্তা পাঠান', en: 'Compose & Send' },
              {
                key: 'scheduled',
                icon: Clock,
                bn: 'শিডিউল মেসেজ তালিকা',
                en: 'Scheduled Messages',
                badge: activeSchedulesCount > 0 ? activeSchedulesCount : undefined,
              },
              { key: 'history', icon: Bell, bn: 'ডেলিভারি ইতিহাস', en: 'Delivery History' },
              ...(canAccessWhatsAppInbox ? [{ key: 'inbox', icon: MessageCircle, bn: 'WhatsApp চ্যাট ও ইনবক্স', en: 'WhatsApp Chat & Inbox' }] : []),
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {bn ? t.bn : t.en}
                {t.badge !== undefined && (
                  <Badge className="ml-1 bg-amber-500 text-white hover:bg-amber-600 text-[10px] h-5 px-1.5">
                    {t.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* TAB 1: COMPOSE & SEND */}
          <TabsContent value="send" className="space-y-4 mt-4">
            {/* Delivery Mode Toggle (Bulk vs Single) */}
            <div className="p-3 bg-muted/40 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{bn ? 'মেসেজ প্রকার:' : 'Message Mode:'}</span>
                <div className="flex items-center p-1 bg-background rounded-xl border shadow-sm">
                  <Button
                    type="button"
                    size="sm"
                    variant={messageMode === 'bulk' ? 'default' : 'ghost'}
                    onClick={() => setMessageMode('bulk')}
                    className="h-8 gap-1.5 text-xs font-medium rounded-lg"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {bn ? 'বাল্ক মেসেজ (একসাথে সবাইকে)' : 'Bulk Broadcast'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={messageMode === 'single' ? 'default' : 'ghost'}
                    onClick={() => setMessageMode('single')}
                    className="h-8 gap-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {bn ? 'একক মেসেজ (নির্দিষ্ট ১ জনকে)' : 'Single Direct Message'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                {messageMode === 'single' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    👤 {bn ? 'যেকোনো একজন ছাত্র, অভিভাবক, শিক্ষক বা কাস্টম নম্বরে সরাসরি পাঠানো হবে' : 'Targeting 1 recipient'}
                  </span>
                ) : (
                  <span>
                    📢 {bn ? 'নির্বাচিত গ্রুপ বা সম্পূর্ণ বিভাগে একসাথে মেসেজ যাবে' : 'Broadcasting to selected group'}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form */}
              <div className="lg:col-span-2 space-y-4">
                {/* 1. Recipient Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
                      <span className="flex items-center gap-2">
                        {messageMode === 'single' ? <UserCheck className="w-4 h-4 text-emerald-600" /> : <Users className="w-4 h-4 text-primary" />}
                        {bn ? (messageMode === 'single' ? '১. একক প্রাপক নির্বাচন করুন' : '১. বাল্ক প্রাপক নির্বাচন করুন') : (messageMode === 'single' ? '1. Select Single Recipient' : '1. Select Bulk Recipients')}
                      </span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {bn ? `মোট নির্বাচিত: ${effectiveRecipients.length} জন` : `Selected: ${effectiveRecipients.length}`}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* MODE = BULK */}
                    {messageMode === 'bulk' && (
                      <>
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
                              {bn ? 'বিজ্ঞাপন ও কাস্টম' : 'Custom / Promo'}
                            </span>
                            <span className="text-[10px] opacity-80">({parsedCustomNumbers.length} নম্বর)</span>
                          </Button>
                        </div>

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
                      </>
                    )}

                    {/* MODE = SINGLE */}
                    {messageMode === 'single' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant={singleAudience === 'guardian' ? 'default' : 'outline'}
                            className={`h-10 text-xs gap-1.5 ${singleAudience === 'guardian' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                            onClick={() => handleSingleAudienceChange('guardian')}
                          >
                            <User className="w-3.5 h-3.5" />
                            {bn ? 'ছাত্র / অভিভাবক' : 'Student / Guardian'}
                          </Button>

                          <Button
                            type="button"
                            variant={singleAudience === 'staff' ? 'default' : 'outline'}
                            className={`h-10 text-xs gap-1.5 ${singleAudience === 'staff' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                            onClick={() => handleSingleAudienceChange('staff')}
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            {bn ? 'শিক্ষক / স্টাফ' : 'Teacher / Staff'}
                          </Button>

                          <Button
                            type="button"
                            variant={singleAudience === 'custom' ? 'default' : 'outline'}
                            className={`h-10 text-xs gap-1.5 ${singleAudience === 'custom' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                            onClick={() => handleSingleAudienceChange('custom')}
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {bn ? 'কাস্টম নম্বর' : 'Custom Number'}
                          </Button>
                        </div>

                        {/* Single: Student/Guardian Search */}
                        {singleAudience === 'guardian' && (
                          <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                            <div>
                              <Label className="text-xs font-semibold">{bn ? 'ছাত্রের নাম, রোল বা আইডি দিয়ে খুঁজুন:' : 'Search Student by Name/Roll/ID:'}</Label>
                              <div className="relative mt-1">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                                <Input
                                  value={studentSearch}
                                  onChange={(e) => setStudentSearch(e.target.value)}
                                  placeholder={bn ? 'নাম বা রোল লিখুন (যেমন: ১০, আব্দুল্লাহ)...' : 'Type name or roll...'}
                                  className="h-9 pl-9 text-xs"
                                />
                              </div>
                            </div>

                            {/* Dropdown list */}
                            <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-background text-xs">
                              {filteredStudentsForSingle.length === 0 ? (
                                <p className="p-3 text-center text-muted-foreground">{bn ? 'কোন ছাত্র পাওয়া যায়নি' : 'No student found'}</p>
                              ) : (
                                filteredStudentsForSingle.map(st => {
                                  const isSel = selectedStudent?.id === st.id;
                                  return (
                                    <div
                                      key={st.id}
                                      onClick={() => setSelectedStudent(st)}
                                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                        isSel ? 'bg-emerald-500/10 border-l-4 border-emerald-600' : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div>
                                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                                          {bn ? st.name_bn : (st.name_en || st.name_bn)}
                                          {isSel && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          {(st.divisions as any)?.name_bn || (st.divisions as any)?.name || 'বিভাগ'} • রোল: {st.roll_number || 'নেই'}
                                        </p>
                                      </div>
                                      <div className="text-right font-mono text-[11px]">
                                        <p className="text-foreground">{st.guardian_phone || st.phone || 'নম্বর নেই'}</p>
                                        <p className="text-[10px] text-muted-foreground">{st.guardian_phone ? 'অভিভাবকের নম্বর' : 'ছাত্রের নম্বর'}</p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {selectedStudent && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {bn ? selectedStudent.name_bn : (selectedStudent.name_en || selectedStudent.name_bn)}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {bn ? 'অভিভাবকের ফোন:' : 'Guardian Phone:'} <span className="font-mono font-semibold text-foreground">{selectedStudent.guardian_phone || selectedStudent.phone || 'নেই'}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {selectedStudent.phone && selectedStudent.guardian_phone && (
                                    <div className="flex items-center space-x-1.5 text-xs">
                                      <Checkbox
                                        id="phone-choice"
                                        checked={useGuardianPhone}
                                        onCheckedChange={(c) => setUseGuardianPhone(!!c)}
                                      />
                                      <label htmlFor="phone-choice" className="cursor-pointer text-[11px]">
                                        {bn ? 'অভিভাবকের নম্বরে পাঠান' : 'Use Guardian Phone'}
                                      </label>
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openDirectWhatsApp(selectedStudent.guardian_phone || selectedStudent.phone || '', selectedStudent.name_bn)}
                                    className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    WA চ্যাট
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Single: Staff Search */}
                        {singleAudience === 'staff' && (
                          <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                            <div>
                              <Label className="text-xs font-semibold">{bn ? 'শিক্ষক বা স্টাফের নাম দিয়ে খুঁজুন:' : 'Search Teacher/Staff:'}</Label>
                              <div className="relative mt-1">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                                <Input
                                  value={staffSearch}
                                  onChange={(e) => setStaffSearch(e.target.value)}
                                  placeholder={bn ? 'নাম বা পদবী লিখুন...' : 'Type name or designation...'}
                                  className="h-9 pl-9 text-xs"
                                />
                              </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-background text-xs">
                              {filteredStaffForSingle.length === 0 ? (
                                <p className="p-3 text-center text-muted-foreground">{bn ? 'কোন শিক্ষক/স্টাফ পাওয়া যায়নি' : 'No staff found'}</p>
                              ) : (
                                filteredStaffForSingle.map(st => {
                                  const isSel = selectedStaff?.id === st.id;
                                  return (
                                    <div
                                      key={st.id}
                                      onClick={() => setSelectedStaff(st)}
                                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                                        isSel ? 'bg-emerald-500/10 border-l-4 border-emerald-600' : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <div>
                                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                                          {bn ? st.name_bn : (st.name_en || st.name_bn)}
                                          {isSel && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">{st.designation || 'শিক্ষক / স্টাফ'}</p>
                                      </div>
                                      <p className="font-mono text-[11px] text-foreground">{st.phone || 'নম্বর নেই'}</p>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {selectedStaff && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                    {bn ? selectedStaff.name_bn : (selectedStaff.name_en || selectedStaff.name_bn)} ({selectedStaff.designation})
                                  </p>
                                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{selectedStaff.phone}</p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDirectWhatsApp(selectedStaff.phone || '', selectedStaff.name_bn)}
                                  className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  WA চ্যাট
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Single: Custom Direct Mobile */}
                        {singleAudience === 'custom' && (
                          <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-semibold">{bn ? 'মোবাইল নম্বর (০১৭/০১৮...):' : 'Mobile Number:'}</Label>
                                <Input
                                  value={customSinglePhone}
                                  onChange={(e) => setCustomSinglePhone(e.target.value)}
                                  placeholder="01712345678"
                                  className="h-9 mt-1 font-mono text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold">{bn ? 'প্রাপকের নাম (ঐচ্ছিক):' : 'Recipient Name (Optional):'}</Label>
                                <Input
                                  value={customSingleName}
                                  onChange={(e) => setCustomSingleName(e.target.value)}
                                  placeholder={bn ? 'যেমন: জনাব কামরুল হাসান' : 'e.g. Mr. Kamrul Hasan'}
                                  className="h-9 mt-1 text-xs"
                                />
                              </div>
                            </div>
                            {customSinglePhone && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openDirectWhatsApp(customSinglePhone, customSingleName || 'গ্রাহক')}
                                  className="h-7 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  সরাসরি WhatsApp-এ কথা বলুন
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
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
                                WhatsApp (ফ্রি 🟢)
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
                            {((messageMode === 'single' ? singleAudience : audience) === 'guardians' || (messageMode === 'single' && singleAudience === 'guardian')) && (
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
                            {((messageMode === 'single' ? singleAudience : audience) === 'staff') && (
                              <>
                                <SelectItem value="staff_meeting">{bn ? '👥 শিক্ষক ও স্টাফ জরুরি মিটিং' : 'Staff Meeting'}</SelectItem>
                                <SelectItem value="salary_disbursed">{bn ? '💵 মাসিক বেতন ও ভাতা প্রদান' : 'Salary Disbursed'}</SelectItem>
                                <SelectItem value="exam_duty">{bn ? '📝 পরীক্ষার ডিউটি ও প্রশ্নপত্র নোটিশ' : 'Exam Duty & Questions'}</SelectItem>
                                <SelectItem value="leave_approved">{bn ? '✅ ছুটি অনুমোদন নোটিশ' : 'Leave Approved'}</SelectItem>
                                <SelectItem value="holiday_staff">{bn ? '🏖️ শিক্ষকদের প্রাতিষ্ঠানিক ছুটি' : 'Staff Holiday'}</SelectItem>
                                <SelectItem value="general_staff">{bn ? '📢 শিক্ষক-স্টাফ সাধারণ নির্দেশনা' : 'Staff Directive'}</SelectItem>
                              </>
                            )}
                            {((messageMode === 'single' ? singleAudience : audience) === 'custom') && (
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

                    {/* Anti-Ban Delay Selector (For bulk) */}
                    {messageMode === 'bulk' && (
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
                    )}

                    {/* 3. Scheduling & Recurring Settings Box */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="schedule-toggle"
                            checked={isScheduled}
                            onCheckedChange={(c) => setIsScheduled(!!c)}
                          />
                          <label htmlFor="schedule-toggle" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {bn ? '⏰ শিডিউল ও পুনরাবৃত্তি করে পাঠান (Scheduled & Recurring)' : 'Schedule & Recurring Delivery'}
                          </label>
                        </div>
                        {isScheduled && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                            {bn ? 'শিডিউল মোড সক্রিয়' : 'Scheduling Active'}
                          </Badge>
                        )}
                      </div>

                      {isScheduled && (
                        <div className="pt-2 border-t space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Start Date & Time */}
                            <div>
                              <Label className="text-[11px] font-semibold text-foreground">
                                {bn ? 'শুরুর তারিখ ও সময়:' : 'Start Date & Time:'}
                              </Label>
                              <Input
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                className="h-9 mt-1 text-xs"
                              />
                            </div>

                            {/* Interval / Frequency */}
                            <div>
                              <Label className="text-[11px] font-semibold text-foreground">
                                {bn ? 'কত সময় পর পর যাবে:' : 'Repeat Interval:'}
                              </Label>
                              <Select value={repeatInterval} onValueChange={setRepeatInterval}>
                                <SelectTrigger className="h-9 mt-1 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {INTERVAL_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {bn ? opt.label_bn : opt.label_en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Repetition Count */}
                            <div>
                              <Label className="text-[11px] font-semibold text-foreground">
                                {bn ? 'এক মেসেজ কতবার যাবে:' : 'Total Repetitions:'}
                              </Label>
                              <Select value={repeatCountType} onValueChange={setRepeatCountType}>
                                <SelectTrigger className="h-9 mt-1 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {REPEAT_COUNT_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {bn ? opt.label_bn : opt.label_en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Custom count input if custom is chosen */}
                          {repeatCountType === 'custom' && (
                            <div className="w-48">
                              <Label className="text-[11px]">{bn ? 'কাস্টম সংখ্যা (বার):' : 'Custom count:'}</Label>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                value={customRepeatCount}
                                onChange={(e) => setCustomRepeatCount(Number(e.target.value))}
                                className="h-8 mt-1 text-xs"
                              />
                            </div>
                          )}

                          {/* Human-friendly preview note */}
                          <div className="p-2.5 rounded-lg bg-background border text-xs text-muted-foreground flex items-center gap-2">
                            <Repeat className="w-4 h-4 text-primary shrink-0" />
                            <span>
                              {bn
                                ? `📅 প্রথম মেসেজ যাবে: ${new Date(scheduledDateTime).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}। ${
                                    repeatInterval === 'once'
                                      ? 'এটি শুধুমাত্র একবারই পাঠানো হবে।'
                                      : `এরপর ${getIntervalLabel(repeatInterval, true)} মোট ${
                                          repeatCountType === 'unlimited' ? 'বিরতিহীনভাবে' : `${repeatCountType === 'custom' ? customRepeatCount : repeatCountType} বার`
                                        } পাঠানো হবে।`
                                  }`
                                : `📅 Scheduled start: ${new Date(scheduledDateTime).toLocaleString()} • Interval: ${getIntervalLabel(repeatInterval, false)} • Repetitions: ${repeatCountType === 'unlimited' ? 'Unlimited' : repeatCountType}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Send / Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    disabled={!message.trim() || effectiveRecipients.length === 0}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {bn ? `প্রিভিউ তালিকা (${effectiveRecipients.length})` : `Preview List (${effectiveRecipients.length})`}
                  </Button>

                  {canAddItem && (
                    <>
                      {isScheduled ? (
                        <Button
                          type="button"
                          onClick={handleScheduleSubmit}
                          disabled={!message.trim() || effectiveRecipients.length === 0}
                          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-initial"
                        >
                          <Clock className="w-4 h-4" />
                          {bn ? `⏰ মেসেজ শিডিউল নিশ্চিত করুন (${effectiveRecipients.length})` : `Confirm Schedule (${effectiveRecipients.length})`}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleImmediateSend}
                          disabled={sending || !message.trim() || effectiveRecipients.length === 0}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sending
                            ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...')
                            : messageMode === 'single'
                              ? (bn ? 'একক বার্তা পাঠান' : 'Send Single Message')
                              : (bn ? `বাল্ক মেসেজ পাঠান (${effectiveRecipients.length})` : `Send Bulk (${effectiveRecipients.length})`)}
                        </Button>
                      )}

                      {/* Direct WhatsApp Web link for single mode */}
                      {messageMode === 'single' && singleRecipientObj && channel === 'whatsapp' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openDirectWhatsApp(singleRecipientObj.phone, singleRecipientObj.name)}
                          className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-500/10 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {bn ? 'সরাসরি WhatsApp খুলুন' : 'Open Direct WA Web'}
                        </Button>
                      )}
                    </>
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
                      <span className="text-muted-foreground">{bn ? 'মোড:' : 'Mode:'}</span>
                      <span className="font-semibold text-foreground">
                        {messageMode === 'single' ? (bn ? '👤 একক মেসেজ' : 'Single Recipient') : (bn ? '📢 বাল্ক গ্রুপ' : 'Bulk Broadcast')}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'প্রাপক বিভাগ:' : 'Target:'}</span>
                      <span className="font-semibold text-foreground">
                        {messageMode === 'single'
                          ? (singleAudience === 'guardian' ? (bn ? 'ছাত্র / অভিভাবক' : 'Guardian') :
                             singleAudience === 'staff' ? (bn ? 'শিক্ষক ও স্টাফ' : 'Staff') : (bn ? 'কাস্টম নম্বর' : 'Custom'))
                          : (audience === 'guardians' ? (bn ? 'অভিভাবক ও ছাত্র' : 'Guardians') :
                             audience === 'staff' ? (bn ? 'শিক্ষক ও স্টাফ' : 'Staff') : (bn ? 'বিজ্ঞাপন ও কাস্টম' : 'Promotional'))}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'মোট নির্বাচিত:' : 'Total Selected:'}</span>
                      <span className="font-bold text-primary text-sm">{effectiveRecipients.length} জন</span>
                    </div>

                    <div className="flex justify-between py-1 border-b">
                      <span className="text-muted-foreground">{bn ? 'মাধ্যম:' : 'Channel:'}</span>
                      <span className="font-semibold text-emerald-600 uppercase">{channel}</span>
                    </div>

                    {isScheduled && (
                      <div className="flex justify-between py-1 border-b text-primary">
                        <span className="text-muted-foreground">{bn ? 'পুনরাবৃত্তি:' : 'Recurrence:'}</span>
                        <span className="font-semibold">{getIntervalLabel(repeatInterval, bn)}</span>
                      </div>
                    )}

                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{bn ? 'আনুমানিক সময়:' : 'Estimated Time:'}</span>
                      <span className="font-medium">
                        {messageMode === 'single' ? '~১ সেকেন্ড' : (delaySeconds === 0 ? '~১৫ সেকেন্ড' : `~${Math.ceil((effectiveRecipients.length * delaySeconds) / 60)} মিনিট`)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Instant single WhatsApp cards list */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      {bn ? 'কুইক WhatsApp চ্যাট' : 'Quick WhatsApp Chat'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p className="text-muted-foreground">
                      {bn
                        ? 'সরাসরি ব্রাউজার বা অ্যাপের মাধ্যমে যেকোনো নম্বরে ১-ক্লিকে বার্তা পাঠান।'
                        : 'Open direct WhatsApp web chat for any recipient.'}
                    </p>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border rounded-lg p-2">
                      {effectiveRecipients.slice(0, 15).map((r, idx) => (
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
                      {effectiveRecipients.length > 15 && (
                        <p className="text-center text-[10px] text-muted-foreground pt-1">
                          {bn ? `...আরও ${effectiveRecipients.length - 15} জন` : `...more ${effectiveRecipients.length - 15}`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SCHEDULED MESSAGES QUEUE */}
          <TabsContent value="scheduled" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {bn ? 'শিডিউল ও পুনরাবৃত্তি মেসেজের তালিকা' : 'Scheduled & Recurring Message Queue'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'যেসব বার্তা নির্দিষ্ট সময়ে বা সময় পর পর স্বয়ংক্রিয়ভাবে যাওয়ার জন্য শিডিউল করা আছে'
                    : 'Messages queued to dispatch automatically at designated intervals'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchScheduled()}
                  className="gap-1.5 text-xs h-8"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {bn ? 'রিফ্রেশ' : 'Refresh'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsScheduled(true);
                    setActiveTab('send');
                  }}
                  className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {bn ? 'নতুন শিডিউল যোগ করুন' : 'New Schedule'}
                </Button>
              </div>
            </div>

            {scheduledList.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground">{bn ? 'কোন শিডিউল মেসেজ নেই' : 'No Scheduled Messages'}</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {bn
                      ? 'নতুন বার্তা পাঠান ট্যাব থেকে "শিডিউল ও পুনরাবৃত্তি" টিক দিয়ে মেসেজ শিডিউল করে রাখতে পারেন।'
                      : 'You can schedule automated recurring messages from Compose tab.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsScheduled(true);
                      setActiveTab('send');
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {bn ? 'এখনই একটি শিডিউল তৈরি করুন' : 'Create Schedule Now'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {scheduledList.map((item) => {
                  const filter = (item.recipient_filter as any) || {};
                  const sched = filter.schedule || {};
                  const isPaused = item.status === 'paused';
                  const isCompleted = item.status === 'completed';
                  const totalRuns = sched.totalRuns || 1;
                  const runsCompleted = sched.runsCompleted || 0;

                  return (
                    <Card key={item.id} className="overflow-hidden border">
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Left Details */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`text-[11px] gap-1 ${
                                isCompleted
                                  ? 'bg-muted text-muted-foreground'
                                  : isPaused
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                                  {bn ? 'সম্পন্ন হয়েছে' : 'Completed'}
                                </>
                              ) : isPaused ? (
                                <>
                                  <Pause className="w-3 h-3 text-amber-600" />
                                  {bn ? 'সাময়িক স্থগিত' : 'Paused'}
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                  {bn ? 'সক্রিয় ও অপেক্ষমাণ' : 'Active Scheduled'}
                                </>
                              )}
                            </Badge>

                            <Badge variant="outline" className="text-[11px] gap-1 uppercase font-semibold">
                              {item.channel}
                            </Badge>

                            <span className="text-xs font-semibold text-foreground">
                              {filter.mode === 'single'
                                ? `👤 ${bn ? 'একক:' : 'Single:'} ${filter.singleRecipient?.name || '১ জন'}`
                                : `📢 ${bn ? 'বাল্ক:' : 'Bulk:'} ${item.recipients_count || 0} জন`}
                            </span>

                            {filter.singleRecipient?.phone && (
                              <span className="text-xs font-mono text-muted-foreground">
                                ({filter.singleRecipient.phone})
                              </span>
                            )}
                          </div>

                          {/* Message snippet */}
                          <p className="text-xs text-foreground font-medium line-clamp-2 bg-muted/30 p-2 rounded-lg border">
                            "{item.message}"
                          </p>

                          {/* Schedule rules & next run */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Repeat className="w-3.5 h-3.5 text-primary" />
                              {bn ? 'ব্যবধান:' : 'Interval:'} <strong className="text-foreground">{getIntervalLabel(sched.interval || 'once', bn)}</strong>
                            </span>

                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {bn ? 'অগ্রগতি:' : 'Runs:'} <strong className="text-foreground">{runsCompleted} / {totalRuns === 0 ? 'বিরতিহীন' : `${totalRuns} বার`}</strong>
                            </span>

                            {sched.nextRunAt && !isCompleted && (
                              <span className="flex items-center gap-1 text-primary font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                {bn ? 'পরবর্তী রান:' : 'Next run:'} {new Date(sched.nextRunAt).toLocaleTimeString(bn ? 'bn-BD' : 'en-US')} ({formatRelativeTime(sched.nextRunAt, bn)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {!isCompleted && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerScheduleNow(item)}
                              className="h-8 gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                              title={bn ? 'নির্ধারিত সময়ের আগেই এখনই ১ বার রান করুন' : 'Run 1 cycle right now'}
                            >
                              <Play className="w-3.5 h-3.5" />
                              {bn ? 'এখনই পাঠান' : 'Run Now'}
                            </Button>
                          )}

                          {!isCompleted && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleSchedulePause(item)}
                              className="h-8 gap-1 text-xs"
                            >
                              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                              {isPaused ? (bn ? 'চালু করুন' : 'Resume') : (bn ? 'স্থগিত' : 'Pause')}
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteSchedule(item.id)}
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs"
                            title={bn ? 'শিডিউল মুছে ফেলুন' : 'Delete schedule'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: HISTORY */}
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
                      ) : sentHistory.map(n => {
                        const filter = (n.recipient_filter as any) || {};
                        const isSingle = filter.mode === 'single';
                        return (
                          <tr key={n.id} className="border-b hover:bg-muted/30">
                            <td className="p-3 whitespace-nowrap text-xs">
                              {n.sent_at ? new Date(n.sent_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '-'}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {isSingle ? (bn ? '👤 একক' : 'Single') : (bn ? '📢 বাল্ক' : 'Bulk')}
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
                            <td className="p-3 text-center text-xs">
                              {isSingle && filter.singleRecipient?.name
                                ? filter.singleRecipient.name
                                : `${n.recipients_count || 1} জন`}
                            </td>
                            <td className="p-3 text-center text-xs font-medium text-emerald-600">{n.sent_count || 0}</td>
                            <td className="p-3 text-center text-xs font-medium text-destructive">{n.failed_count || 0}</td>
                            <td className="p-3 text-center">
                              {n.status === 'sent' || n.status === 'completed' ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-none text-[11px]">
                                  {bn ? 'সফল' : 'Sent'}
                                </Badge>
                              ) : n.status === 'failed' ? (
                                <Badge variant="destructive" className="text-[11px]">{bn ? 'ব্যর্থ' : 'Failed'}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px]">{n.status}</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: WHATSAPP LIVE INBOX */}
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
                {bn ? `মোট ${effectiveRecipients.length} জনের কাছে পাঠানো হবে` : `Will be delivered to ${effectiveRecipients.length} recipients`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-muted/60 border text-xs whitespace-pre-wrap leading-relaxed">
                <p className="font-semibold text-foreground mb-1">{bn ? 'বার্তার নমুনা:' : 'Sample Message:'}</p>
                {message.replace(/\{\{name\}\}/gi, effectiveRecipients[0]?.name || 'গ্রাহক')}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>{bn ? 'প্রাপকদের তালিকা:' : 'Recipients List:'}</span>
                  <span>{effectiveRecipients.length} জন</span>
                </div>
                <div className="max-h-52 overflow-y-auto border rounded-xl divide-y text-xs">
                  {effectiveRecipients.map((r, i) => (
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
              {isScheduled ? (
                <Button
                  onClick={handleScheduleSubmit}
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Clock className="w-4 h-4" />
                  {bn ? 'শিডিউল নিশ্চিত করুন' : 'Confirm Schedule'}
                </Button>
              ) : (
                <Button
                  onClick={handleImmediateSend}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="w-4 h-4" />
                  {bn ? 'নিশ্চিত করুন ও পাঠান' : 'Confirm & Send'}
                </Button>
              )}
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

              {sending && delaySeconds > 0 && effectiveRecipients.length > 1 && (
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
