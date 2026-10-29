import { supabase } from '@/integrations/supabase/client';

export interface GatewayConfig {
  is_enabled: boolean;
  provider: string;
  server_url: string;
  instance_name: string;
  api_key: string;
}

let cachedGatewayConfig: GatewayConfig | null = null;
let lastFetchTime = 0;

export async function getWhatsAppGatewayConfig(): Promise<GatewayConfig | null> {
  const now = Date.now();
  if (cachedGatewayConfig && now - lastFetchTime < 60000) {
    return cachedGatewayConfig;
  }
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'whatsapp_gateway_config')
      .maybeSingle();

    if (data?.value) {
      cachedGatewayConfig = data.value as unknown as GatewayConfig;
      lastFetchTime = now;
      return cachedGatewayConfig;
    }
  } catch (err) {
    console.warn('[Notification] Failed to load gateway config:', err);
  }
  return null;
}

export function formatBdPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 11 && clean.startsWith('01')) {
    clean = '88' + clean;
  }
  return clean;
}

/**
 * Dispatch text message via Evolution API or fallback to send-whatsapp edge function
 */
export async function sendDirectWhatsAppMessage(phone: string, text: string): Promise<{ success: boolean; message?: string }> {
  const formattedPhone = formatBdPhone(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return { success: false, message: 'Invalid phone number' };
  }

  const config = await getWhatsAppGatewayConfig();

  // Primary: Free Evolution API Gateway
  if (config?.is_enabled && config?.server_url?.trim()) {
    try {
      const sUrl = config.server_url.replace(/\/+$/, '');
      const inst = (config.instance_name || 'madrasa_main').trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.api_key) headers['apikey'] = config.api_key;

      const resp = await fetch(`${sUrl}/message/sendText/${encodeURIComponent(inst)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: formattedPhone,
          text,
          delay: 1000,
        }),
      });

      const resData = await resp.json().catch(() => ({}));
      if (resp.ok && (resData?.key?.id || resData?.status === 'PENDING' || resData?.message)) {
        return { success: true };
      }
    } catch (e: any) {
      console.warn('[Notification] Evolution API direct dispatch error:', e);
    }
  }

  // Fallback: Supabase edge function
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { recipients: [formattedPhone], message: text },
    });
    if (!error && (data?.results?.[0]?.success || data?.success)) {
      return { success: true };
    }
  } catch (err: any) {
    console.warn('[Notification] Edge function dispatch error:', err);
  }

  return { success: false, message: 'Gateway delivery failed' };
}

/**
 * Build direct WhatsApp click URL (wa.me)
 */
export function buildWaDirectLink(phone: string, text: string): string {
  const clean = formatBdPhone(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

// ================= Donor Notification =================
export interface DonorPaymentDetails {
  donorName: string;
  phone?: string | null;
  amount: number | string;
  purpose?: string | null;
  donationDate?: string | null;
  paymentMethod?: 'cash' | 'online' | string;
  transactionId?: string | null;
  institutionName?: string;
}

export function buildDonorReceiptMessage(details: DonorPaymentDetails): string {
  const instName = details.institutionName || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা';
  const methodText = details.paymentMethod === 'online'
    ? `অনলাইন${details.transactionId ? ` (TrxID: ${details.transactionId})` : ''}`
    : 'নগদ / ক্যাশ';

  const dateStr = details.donationDate || new Date().toISOString().split('T')[0];

  return `আসসালামু আলাইকুম সম্মানিত ${details.donorName} মহোদয়।
${instName}-এ আপনার প্রদত্ত অনুদান আলহামদুলিল্লাহ সঠিকভাবে গৃহীত হয়েছে।

📋 অনুদান রসিদ বিবরণ:
• দাতার নাম: ${details.donorName}
• অনুদানের পরিমাণ: ৳${Number(details.amount).toLocaleString('bn-BD')}
• উদ্দেশ্য / বাবদ: ${details.purpose || 'সাধারণ দান / এতিমখানা ফান্ড'}
• পেমেন্ট মাধ্যম: ${methodText}
• তারিখ: ${dateStr}

আল্লাহ তাআলা আপনার এই দানকে সাদাকায়ে জারিয়া হিসেবে কবুল করুন এবং আপনাকে ও আপনার পরিবারবর্গকে উত্তম জাযা ও বরকত দান করুন। আমীন।

— ${instName}`;
}

export async function sendDonorPaymentNotification(details: DonorPaymentDetails): Promise<{ success: boolean; error?: string }> {
  if (!details.phone) return { success: false, error: 'No phone number provided' };
  const message = buildDonorReceiptMessage(details);
  const res = await sendDirectWhatsAppMessage(details.phone, message);
  return res;
}

// ================= Student Fee Notification =================
export interface StudentFeePaymentDetails {
  studentName: string;
  guardianPhone?: string | null;
  studentPhone?: string | null;
  rollNumber?: string | null;
  studentId?: string | null;
  feeTypeName: string;
  month?: string | null;
  year?: string | number | null;
  amount: number | string;
  receiptNumber?: string | null;
  collectorName?: string | null;
  paymentMethod?: 'cash' | 'online' | string;
  institutionName?: string;
}

export function buildStudentFeeReceiptMessage(details: StudentFeePaymentDetails): string {
  const instName = details.institutionName || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা';
  const phone = details.guardianPhone || details.studentPhone || '';
  const dateStr = new Date().toLocaleDateString('bn-BD');
  const methodText = details.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ';

  return `আসসালামু আলাইকুম, সম্মানিত অভিভাবক।
${instName}-এ আপনার সন্তান ${details.studentName}-এর ফি আলহামদুলিল্লাহ পরিশোধ হয়েছে।

🧾 ফি পরিশোধ রসিদ:
• ছাত্রের নাম: ${details.studentName}
${details.rollNumber ? `• রোল নম্বর: ${details.rollNumber}\n` : ''}${details.studentId ? `• আইডি নং: ${details.studentId}\n` : ''}• ফি-এর ধরন: ${details.feeTypeName}
${details.month ? `• মাস: ${details.month} ${details.year || ''}\n` : ''}• পরিশোধিত পরিমাণ: ৳${Number(details.amount).toLocaleString('bn-BD')}
• মাধ্যম: ${methodText}
${details.receiptNumber ? `• রসিদ নং: ${details.receiptNumber}\n` : ''}${details.collectorName ? `• আদায়কারী: ${details.collectorName}\n` : ''}• তারিখ: ${dateStr}

আপনার আন্তরিক সহযোগিতার জন্য জাযাকাল্লাহু খাইরান।

— ${instName}`;
}

export async function sendStudentFeePaymentNotification(details: StudentFeePaymentDetails): Promise<{ success: boolean; error?: string }> {
  const phone = details.guardianPhone || details.studentPhone;
  if (!phone) return { success: false, error: 'No guardian or student phone number' };
  const message = buildStudentFeeReceiptMessage(details);
  const res = await sendDirectWhatsAppMessage(phone, message);
  return res;
}

// ================= Staff Salary Notification (Amount Hidden) =================
export interface StaffSalaryPaymentDetails {
  staffName: string;
  phone?: string | null;
  monthName: string;
  year?: string | number;
  paymentDate?: string;
  departmentKey?: string;
  templateText?: string;
  customMessage?: string;
  institutionName?: string;
}

export const DEFAULT_SALARY_TEMPLATES: Record<string, string> = {
  // 1. রান্না বিভাগ (Kitchen / Chef Staff)
  chef: `আসসালামু আলাইকুম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

মাদরাসার ছাত্র, শিক্ষক ও এতিম শিশুদের জন্য সময়মতো পুষ্টিকর ও হালাল খাবার প্রস্তুত এবং পাকশালার শৃঙ্খলা ও পরিষ্কার-পরিচ্ছন্নতা বজায় রাখতে আপনার অক্লান্ত মেহনতের জন্য আন্তরিক জাযাকাল্লাহু খাইরান।

মাদরাসার খাদ্যসামগ্রী ও সম্পদের আমানত রক্ষা এবং শিক্ষার্থীদের প্রতি স্নেহ ও মমতা বজায় রাখার জন্য অনুরোধ রইল। আল্লাহ আপনাকে উত্তম প্রতিদান দিন।

— {{institution}}`,

  // 2. হিফজ বিভাগ (Hifz & Nazera Teachers)
  teacher_hifz: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

পবিত্র কুরআনের হিফজ ও নাজেরা পাঠদানে আপনার নিষ্ঠাপূর্ণ সেবার জন্য আন্তরিক জাযাকাল্লাহু খাইরান। ছোট ছোট মাসুম শিক্ষার্থীদের বুকে মহাগ্রন্থ আল-কুরআন ধারণ করানোর মত মহৎ দায়িত্বে আপনার আত্মনিয়োগ মাদরাসা কর্তৃপক্ষ অত্যন্ত শ্রদ্ধার সাথে মূল্যায়ন করে।

আল্লাহ তাআলা আপনার এই মেহনত ও কুরবানিকে ইহকাল ও পরকালের নাজাতের উসিলা বানান।

— {{institution}}`,

  hifz: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

পবিত্র কুরআনের হিফজ ও নাজেরা পাঠদানে আপনার নিষ্ঠাপূর্ণ সেবার জন্য আন্তরিক জাযাকাল্লাহু খাইরান। ছোট ছোট মাসুম শিক্ষার্থীদের বুকে মহাগ্রন্থ আল-কুরআন ধারণ করানোর মত মহৎ দায়িত্বে আপনার আত্মনিয়োগ মাদরাসা কর্তৃপক্ষ অত্যন্ত শ্রদ্ধার সাথে মূল্যায়ন করে।

আল্লাহ তাআলা আপনার এই মেহনত ও কুরবানিকে ইহকাল ও পরকালের নাজাতের উসিলা বানান।

— {{institution}}`,

  // 3. নূরানী ও কিতাব বিভাগ (Noorani & Kitab Teachers)
  teacher_nurani_kitab: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

নূরানী ও কিতাব বিভাগে দ্বীনি শিক্ষা বিস্তার, ইলমে ওহীর গভীর পাঠদান ও শিক্ষার্থীদের নৈতিক চরিত্র গঠনে আপনার নিষ্ঠাপূর্ণ সেবার জন্য জাযাকাল্লাহু খাইরান।

ভবিষ্যতে মাদরাসার শিক্ষা কার্যক্রমে সময়নিষ্ঠা, সর্বোচ্চ আন্তরিকতা ও আমানতদারিতার সাথে অর্পিত দায়িত্ব পালনে আপনার অগ্রণী ভূমিকা মাদরাসা কর্তৃপক্ষ একান্তভাবে প্রত্যাশা করে। আল্লাহ তাআলা আপনার মেহনত কবুল করুন।

— {{institution}}`,

  teacher: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

নূরানী ও কিতাব বিভাগে দ্বীনি শিক্ষা বিস্তার ও শিক্ষার্থীদের কুরআন-সুন্নাহর আলোকে গড়ে তুলতে আপনার নিষ্ঠাপূর্ণ সেবার জন্য জাযাকাল্লাহু খাইরান।

ভবিষ্যতে মাদরাসার শিক্ষা কার্যক্রমে সময়নিষ্ঠা, সর্বোচ্চ আন্তরিকতা ও আমানতদারিতার সাথে অর্পিত দায়িত্ব পালনে আপনার অগ্রণী ভূমিকা মাদরাসা কর্তৃপক্ষ একান্তভাবে প্রত্যাশা করে। আল্লাহ তাআলা আপনার মেহনত কবুল করুন।

— {{institution}}`,

  // 3. প্রশাসন বিভাগ (Administrative Officers)
  administrative: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক সম্মানী/ভাতা পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

মাদরাসার সার্বিক শৃঙ্খলা, সুষ্ঠু শিক্ষা ব্যবস্থাপনা ও প্রশাসনিক তদারকিতে আপনার বলিষ্ঠ নেতৃত্ব ও দায়িত্বশীলতার জন্য আন্তরিক শুকরিয়া ও জাযাকাল্লাহু খাইরান।

প্রতিষ্ঠানের লক্ষ্য অর্জন ও শিক্ষা কার্যক্রমকে অনন্য উচ্চতায় নিয়ে যেতে আপনার দিকনির্দেশনা ও আমানতদারী সবসময় পথপ্রদর্শক হয়ে থাকবে।

— {{institution}}`,

  // 4. সাপোর্ট স্টাফ / অফিস কর্মচারী (Office / Accounts Staff)
  support: `আসসালামু আলাইকুম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

মাদরাসার হিসাবরক্ষণ, অফিসিয়াল নথিপত্র সংরক্ষণ এবং দাপ্তরিক কাজে আপনার একনিষ্ঠ দায়িত্ব পালনের জন্য ধন্যবাদ ও জাযাকাল্লাহু খাইরান।

ভবিষ্যতেও প্রাতিষ্ঠানিক আমানত রক্ষা, সঠিক হিসাব ব্যবস্থাপনা ও দাপ্তরিক শৃঙ্খলা রক্ষায় আপনার নিষ্ঠা ও সতর্কতা অব্যাহত থাকবে বলে কর্তৃপক্ষ প্রত্যাশা করে।

— {{institution}}`,

  // 5. সহায়ক কর্মী / সাধারণ কর্মচারী (General Support Staff: Cook, Guard, Peon, Cleaner)
  general: `আসসালামু আলাইকুম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

মাদরাসার ছাত্র ও এতিম শিশুদের আন্তরিক সেবা, পরিষ্কার-পরিচ্ছন্নতা, নিরাপত্তা ও সুষ্ঠু পরিবেশ বজায় রাখতে আপনার নিষ্ঠাপূর্ণ শ্রমের জন্য জাযাকাল্লাহু খাইরান।

মাদরাসাকে নিজের পরিবার মনে করে প্রতিষ্ঠানের সম্পদ সুরক্ষা, সময়মতো দায়িত্ব পালন ও ছাত্রদের প্রতি সদয় আচরণ সবসময় বজায় রাখার জন্য অনুরোধ রইল। আল্লাহ আপনাকে উত্তম প্রতিদান দিন।

— {{institution}}`,

  // 6. পরিচালক (Director)
  director: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক সম্মানী/ভাতা পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

প্রতিষ্ঠানের সার্বিক উন্নয়ন, তত্ত্বাবধান ও সুষ্ঠু পরিচালনা নিশ্চিতকরণে আপনার মূল্যবান পরামর্শ, দিকনির্দেশনা ও আন্তরিক সহযোগিতার জন্য শুকরিয়া ও জাযাকাল্লাহু খাইরান।

— {{institution}}`,

  // 7. কমিটি সদস্য (Committee Member)
  committee_member: `আসসালামু আলাইকুম মুহতারাম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের সম্মানী পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

প্রতিষ্ঠানের সার্বিক অগ্রগতি ও পরিচালনায় আপনার সক্রিয় অংশগ্রহণ এবং সহযোগিতার জন্য আন্তরিক শুকরিয়া ও জাযাকাল্লাহু খাইরান।

— {{institution}}`,

  general_staff: `আসসালামু আলাইকুম {{name}}।
{{institution}} থেকে আপনার {{month}} মাসের মাসিক বেতন পরিশোধ করা হয়েছে।

• পরিশোধের তারিখ: {{date}}

মাদরাসার ছাত্র ও এতিম শিশুদের আন্তরিক সেবা, পরিষ্কার-পরিচ্ছন্নতা, নিরাপত্তা ও সুষ্ঠু পরিবেশ বজায় রাখতে আপনার নিষ্ঠাপূর্ণ শ্রমের জন্য জাযাকাল্লাহু খাইরান।

মাদরাসাকে নিজের পরিবার মনে করে প্রতিষ্ঠানের সম্পদ সুরক্ষা, সময়মতো দায়িত্ব পালন ও ছাত্রদের প্রতি সদয় আচরণ সবসময় বজায় রাখার জন্য অনুরোধ রইল। আল্লাহ আপনাকে উত্তম প্রতিদান দিন।

— {{institution}}`,
};

/**
 * Notice: The salary amount is strictly omitted from the message.
 * Includes payment date, department-specific dedication reminder, and gratitude.
 */
export function buildStaffSalaryPaymentMessage(details: StaffSalaryPaymentDetails): string {
  if (details.customMessage?.trim()) {
    return details.customMessage.trim();
  }

  const instName = details.institutionName || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা';
  const period = `${details.monthName} ${details.year || ''}`.trim();
  const dateStr = details.paymentDate || new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

  const deptKey = details.departmentKey || 'general';
  const rawTemplate = details.templateText?.trim() || DEFAULT_SALARY_TEMPLATES[deptKey] || DEFAULT_SALARY_TEMPLATES.general;

  return rawTemplate
    .replace(/\{\{name\}\}/gi, details.staffName)
    .replace(/\{\{month\}\}/gi, period)
    .replace(/\{\{date\}\}/gi, dateStr)
    .replace(/\{\{institution\}\}/gi, instName);
}

export async function sendStaffSalaryPaymentNotification(details: StaffSalaryPaymentDetails): Promise<{ success: boolean; error?: string }> {
  if (!details.phone) return { success: false, error: 'No phone number for staff' };
  const message = buildStaffSalaryPaymentMessage(details);
  const res = await sendDirectWhatsAppMessage(details.phone, message);
  return res;
}
