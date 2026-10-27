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
