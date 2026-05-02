// Centralized BN/EN dictionary for donation form messages.
// Single source of truth — keep all donation-flow validation, toast and
// gateway error strings here so BN and EN never drift apart.

export type Lang = 'bn' | 'en';

type MsgFn = (vars?: Record<string, string | number>) => string;
type Entry = { bn: string | MsgFn; en: string | MsgFn };

const interp = (tpl: string, vars?: Record<string, string | number>) =>
  vars
    ? tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''))
    : tpl;

const DICT = {
  // ---- Field validation (inline + toast) ----
  emailInvalid: {
    bn: 'সঠিক ইমেইল ঠিকানা দিন (যেমন: name@example.com)',
    en: 'Please enter a valid email address (e.g. name@example.com)',
  },
  phoneInvalid: {
    bn: 'সঠিক মোবাইল নম্বর দিন (যেমন: 01712345678 অথবা +8801712345678)',
    en: 'Enter a valid mobile number (e.g. 01712345678 or +8801712345678)',
  },
  phoneInvalidShort: {
    bn: 'সঠিক মোবাইল নম্বর দিন',
    en: 'Please enter a valid mobile number',
  },
  step1Required: {
    bn: 'নাম, ফোন, পরিমাণ ও উদ্দেশ্য আবশ্যক',
    en: 'Name, phone, amount & purpose required',
  },

  // ---- Manual payment ----
  selectMethod: {
    bn: 'মাধ্যম নির্বাচন করুন',
    en: 'Select payment method',
  },
  trxIdRequired: {
    bn: 'ট্রানজেকশন আইডি আবশ্যক',
    en: 'Transaction ID required',
  },
  senderRequired: {
    bn: 'প্রেরকের নম্বর আবশ্যক',
    en: 'Sender number required',
  },

  // ---- Gateway / online ----
  gatewayDisabled: {
    bn: 'অনলাইন গেটওয়ে সক্রিয় নয়',
    en: 'Online gateway not configured',
  },
  gatewayError: {
    bn: 'পেমেন্ট গেটওয়ে ত্রুটি',
    en: 'Payment gateway error',
  },
  noGatewayResponse: {
    bn: 'গেটওয়ে রেসপন্স পাওয়া যায়নি',
    en: 'No gateway response',
  },

  // ---- Submit results ----
  trxVerified: {
    bn: 'ট্রানজেকশন যাচাই সম্পন্ন!',
    en: 'Transaction verified!',
  },
  paymentVerified: {
    bn: 'পেমেন্ট যাচাই সম্পন্ন!',
    en: 'Payment verified!',
  },
  trxRateLimited: {
    bn: (v) =>
      `অনেকবার ভুল TrxID — ${v?.mins ?? 10} মিনিট পর আবার চেষ্টা করুন। জমাটি pending হিসেবে রইল ও অ্যাডমিনকে জানানো হয়েছে।`,
    en: (v) =>
      `Too many wrong TrxID attempts — try again in ${v?.mins ?? 10} min. Saved as pending; admin notified.`,
  },
  trxMismatch: {
    bn: (v) =>
      `TrxID মিল হয়নি — pending হিসেবে রইল, অ্যাডমিন যাচাই করবেন।${
        v?.remaining != null ? ` (বাকি চেষ্টা: ${v.remaining})` : ''
      }`,
    en: (v) =>
      `TrxID did not match — saved as pending for admin review.${
        v?.remaining != null ? ` (Attempts left: ${v.remaining})` : ''
      }`,
  },
} satisfies Record<string, Entry>;

export type DonationMsgKey = keyof typeof DICT;

export function dMsg(
  lang: Lang,
  key: DonationMsgKey,
  vars?: Record<string, string | number>,
): string {
  const entry = DICT[key];
  const v = lang === 'bn' ? entry.bn : entry.en;
  return typeof v === 'function' ? v(vars) : interp(v, vars);
}
