import { supabase } from '@/integrations/supabase/client';

export interface CorrectionFieldDef {
  key: string;
  label_bn: string;
  label_en: string;
}

export const STUDENT_CORRECTION_FIELDS: CorrectionFieldDef[] = [
  { key: 'first_name', label_bn: 'শিক্ষার্থীর নাম (বাংলা)', label_en: 'Student Name (Bangla)' },
  { key: 'last_name', label_bn: 'শিক্ষার্থীর নাম (ইংরেজি)', label_en: 'Student Name (English)' },
  { key: 'photo_url', label_bn: 'শিক্ষার্থীর ছবি (স্পষ্ট ও রঙিন)', label_en: 'Student Photo' },
  { key: 'birth_reg_no', label_bn: 'জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)', label_en: 'Birth Registration No' },
  { key: 'date_of_birth', label_bn: 'জন্ম তারিখ', label_en: 'Date of Birth' },
  { key: 'admission_class', label_bn: 'ভর্তির বিভাগ ও শ্রেণি', label_en: 'Admission Class & Division' },
  { key: 'father_name', label_bn: 'পিতার নাম', label_en: 'Father Name' },
  { key: 'father_nid', label_bn: 'পিতার জাতীয় পরিচয়পত্র (NID)', label_en: 'Father NID' },
  { key: 'mother_name', label_bn: 'মাতার নাম', label_en: 'Mother Name' },
  { key: 'mother_nid', label_bn: 'মাতার জাতীয় পরিচয়পত্র (NID)', label_en: 'Mother NID' },
  { key: 'guardian_info', label_bn: 'অভিভাবকের তথ্য ও এনআইডি', label_en: 'Guardian Information & NID' },
  { key: 'father_phone', label_bn: 'যোগাযোগের মোবাইল নম্বর', label_en: 'Contact Phone Number' },
  { key: 'address_present', label_bn: 'বর্তমান ঠিকানা', label_en: 'Present Address' },
  { key: 'address_permanent', label_bn: 'স্থায়ী ঠিকানা', label_en: 'Permanent Address' },
  { key: 'documents', label_bn: 'সংযুক্ত সনদপত্র/কাগজপত্র', label_en: 'Attached Documents' },
];

export const STAFF_CORRECTION_FIELDS: CorrectionFieldDef[] = [
  { key: 'first_name', label_bn: 'প্রার্থীর নাম (বাংলা)', label_en: 'Applicant Name (Bangla)' },
  { key: 'last_name', label_bn: 'প্রার্থীর নাম (ইংরেজি)', label_en: 'Applicant Name (English)' },
  { key: 'photo_url', label_bn: 'প্রার্থীর ছবি (পাসপোর্ট সাইজ)', label_en: 'Applicant Photo' },
  { key: 'nid', label_bn: 'জাতীয় পরিচয়পত্র নম্বর (NID)', label_en: 'National ID (NID)' },
  { key: 'phone', label_bn: 'মোবাইল নম্বর', label_en: 'Phone Number' },
  { key: 'email', label_bn: 'ইমেইল অ্যাড্রেস', label_en: 'Email Address' },
  { key: 'education', label_bn: 'শিক্ষাগত যোগ্যতা ও সনদ', label_en: 'Educational Qualifications & Certificate' },
  { key: 'experience', label_bn: 'পূর্ববর্তী কর্ম-অভিজ্ঞতা', label_en: 'Previous Experience' },
  { key: 'father_name', label_bn: 'পিতা/স্বামীর নাম', label_en: 'Father/Husband Name' },
  { key: 'mother_name', label_bn: 'মাতার নাম', label_en: 'Mother Name' },
  { key: 'address_present', label_bn: 'বর্তমান ঠিকানা', label_en: 'Present Address' },
  { key: 'address_permanent', label_bn: 'স্থায়ী ঠিকানা', label_en: 'Permanent Address' },
  { key: 'documents', label_bn: 'সংযুক্ত সনদ/কাগজপত্র (অস্পষ্ট/অসম্পূর্ণ)', label_en: 'Attached Documents' },
];

interface NotificationParams {
  type: 'student' | 'staff';
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  appNo?: string | null;
  userId?: string | null;
  correctionFields?: string[];
  correctionNotes?: string;
  rejectionReason?: string;
  institutionName?: string;
}

/**
 * Dispatches notifications (In-app, SMS, Email) when an application needs revision
 */
export async function dispatchRevisionNotification(params: NotificationParams) {
  const { type, id, name, phone, email, appNo, userId, correctionFields = [], correctionNotes = '', institutionName } = params;
  const isStudent = type === 'student';
  const roleTitle = isStudent ? 'ভর্তি আবেদন' : 'নিয়োগ আবেদন';
  const roleTitleEn = isStudent ? 'Admission Application' : 'Staff Application';
  const identifier = appNo || id?.slice(0, 8);
  const inst = institutionName || 'আমাদের প্রতিষ্ঠানে';

  // Revision link
  const editLink = isStudent
    ? `/admission?mode=apply&id=${encodeURIComponent(identifier)}`
    : `/staff-apply?id=${encodeURIComponent(identifier)}`;

  // 1. In-app Notification for dashboard / user portal
  try {
    await supabase.from('notifications').insert({
      title: `${roleTitleEn} Correction Required: ${identifier}`,
      title_bn: `${roleTitle}-এ তথ্য সংশোধনের নির্দেশ: ${identifier}`,
      message: `Your ${roleTitleEn.toLowerCase()} has been marked for revision. Please review and update: ${correctionNotes}`,
      message_bn: `আপনার ${roleTitle}-এ কিছু ভুল তথ্য সংশোধনের নির্দেশ দেওয়া হয়েছে। কারণ: ${correctionNotes}। অবিলম্বে ফরমটি আপডেট করে পুনরায় জমা দিন।`,
      type: 'warning',
      category: isStudent ? 'admission' : 'staff',
      link: editLink,
    });
  } catch (err) {
    console.warn('[RevisionService] Failed to insert in-app notification:', err);
  }

  // 2. SMS Notification
  if (phone) {
    try {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const smsText = `প্রিয় ${name || 'আবেদনকারী'}, ${inst}-এ আপনার ${roleTitle} (${identifier}) এ কিছু তথ্য সংশোধনের নির্দেশ দেওয়া হয়েছে। কারণ: ${correctionNotes.slice(0, 80)}. অনুগ্রহ করে ওয়েবসাইট ভিজিট করে ট্র্যাকিং অথবা লিংকে গিয়ে সংশোধন সম্পন্ন করুন।`;
      await supabase.functions.invoke('send-sms', {
        body: { phone: cleanPhone, message: smsText },
      });
    } catch (err) {
      console.warn('[RevisionService] SMS dispatch skipped or failed:', err);
    }
  }

  // 3. Email Notification
  if (email) {
    try {
      const subject = `${roleTitle}-এ তথ্য সংশোধনের নির্দেশ (${identifier}) - ${inst}`;
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email.trim(),
          full_name: name || undefined,
          subject,
          kind: isStudent ? 'student' : 'user',
          metadata: {
            appNo: identifier,
            type,
            notes: correctionNotes,
            fields: correctionFields,
            link: editLink,
          },
        },
      });
    } catch (err) {
      console.warn('[RevisionService] Email dispatch skipped or failed:', err);
    }
  }
}

/**
 * Dispatches notifications (In-app, SMS, Email) when an application is rejected
 */
export async function dispatchRejectionNotification(params: NotificationParams) {
  const { type, id, name, phone, email, appNo, rejectionReason = '', institutionName } = params;
  const isStudent = type === 'student';
  const roleTitle = isStudent ? 'ভর্তি আবেদন' : 'নিয়োগ আবেদন';
  const roleTitleEn = isStudent ? 'Admission Application' : 'Staff Application';
  const identifier = appNo || id?.slice(0, 8);
  const inst = institutionName || 'আমাদের প্রতিষ্ঠানে';

  // 1. In-app Notification
  try {
    await supabase.from('notifications').insert({
      title: `${roleTitleEn} Rejected: ${identifier}`,
      title_bn: `${roleTitle} প্রত্যাখ্যাত: ${identifier}`,
      message: `Your ${roleTitleEn.toLowerCase()} was not approved. Reason: ${rejectionReason}`,
      message_bn: `আপনার ${roleTitle} (${identifier}) গৃহীত হয়নি। কারণ: ${rejectionReason}`,
      type: 'destructive',
      category: isStudent ? 'admission' : 'staff',
      link: isStudent ? '/track' : '/staff-apply?mode=track',
    });
  } catch (err) {
    console.warn('[RevisionService] Failed to insert in-app rejection notification:', err);
  }

  // 2. SMS Notification
  if (phone) {
    try {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const smsText = `প্রিয় ${name || 'আবেদনকারী'}, দুঃখিত! ${inst}-এ আপনার ${roleTitle} (${identifier}) এই মুহূর্তে গৃহীত হয়নি। কারণ: ${rejectionReason.slice(0, 100)}`;
      await supabase.functions.invoke('send-sms', {
        body: { phone: cleanPhone, message: smsText },
      });
    } catch (err) {
      console.warn('[RevisionService] Rejection SMS dispatch skipped or failed:', err);
    }
  }

  // 3. Email Notification
  if (email) {
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email.trim(),
          full_name: name || undefined,
          subject: `${roleTitle} সংক্রান্ত বিজ্ঞপ্তি (${identifier}) - ${inst}`,
          kind: isStudent ? 'student' : 'user',
          metadata: {
            appNo: identifier,
            type,
            status: 'rejected',
            reason: rejectionReason,
          },
        },
      });
    } catch (err) {
      console.warn('[RevisionService] Rejection Email dispatch skipped or failed:', err);
    }
  }
}

/**
 * Dispatch Approval Notification (In-app, SMS, Email)
 */
export async function dispatchApprovalNotification(params: NotificationParams & { roll?: string; reg?: string; className?: string }) {
  const { type, id, name, phone, email, appNo, institutionName, roll, reg, className } = params;
  const isStudent = type === 'student';
  const roleTitle = isStudent ? 'ভর্তি আবেদন' : 'নিয়োগ আবেদন';
  const roleTitleEn = isStudent ? 'Admission Application' : 'Staff Application';
  const identifier = appNo || id?.slice(0, 8);
  const inst = institutionName || 'আমাদের প্রতিষ্ঠানে';

  // 1. In-app Notification
  try {
    await supabase.from('notifications').insert({
      title: `${roleTitleEn} Approved: ${identifier}`,
      title_bn: `${roleTitle} অনুমোদিত হয়েছে: ${identifier}`,
      message: `Congratulations! Your ${roleTitleEn.toLowerCase()} has been approved.${roll ? ` Roll: ${roll}` : ''}`,
      message_bn: `অভিনন্দন! আপনার ${roleTitle} (${identifier}) অনুমোদিত হয়েছে।${roll ? ` রোল: ${roll}` : ''}${reg ? `, রেজি: ${reg}` : ''}`,
      type: 'success',
      category: isStudent ? 'admission' : 'staff',
      link: isStudent ? `/track?id=${identifier}` : '/staff-apply?mode=track',
    });
  } catch (err) {
    console.warn('[RevisionService] Failed to insert in-app approval notification:', err);
  }

  // 2. SMS Notification
  if (phone) {
    try {
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const smsText = isStudent
        ? `অভিনন্দন ${name || 'শিক্ষার্থী'}! ${inst}-এ আপনার ভর্তি আবেদন (${identifier}) অনুমোদিত হয়েছে। শ্রেণি: ${className || 'নির্ধারিত'}, রোল: ${roll || 'N/A'}, রেজি: ${reg || 'N/A'}। স্লিপ ডাউনলোড করতে ভিজিট করুন: ${window.location.origin}/track?id=${identifier}`
        : `অভিনন্দন ${name || 'সহকর্মী'}! ${inst}-এ আপনার নিয়োগ আবেদন (${identifier}) অনুমোদিত হয়েছে। বিস্তারিত দেখতে লগইন করুন: ${window.location.origin}/login`;
      await supabase.functions.invoke('send-sms', {
        body: { phone: cleanPhone, message: smsText },
      });
    } catch (err) {
      console.warn('[RevisionService] Approval SMS dispatch skipped or failed:', err);
    }
  }

  // 3. Email Notification
  if (email) {
    try {
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: email.trim(),
          full_name: name || undefined,
          subject: `অভিনন্দন! ${roleTitle} অনুমোদিত হয়েছে (${identifier}) - ${inst}`,
          kind: isStudent ? 'student' : 'user',
          metadata: {
            appNo: identifier,
            type,
            status: 'approved',
            roll,
            reg,
          },
        },
      });
    } catch (err) {
      console.warn('[RevisionService] Approval email dispatch skipped or failed:', err);
    }
  }
}
