
INSERT INTO public.email_templates (template_key, name, description, subject, html_body, brand_color, variables, is_system) VALUES
(
  'payment_receipt',
  'পেমেন্ট রিসিট',
  'ফি/পেমেন্ট সফল হওয়ার পর পাঠানো রসিদ ইমেইল',
  '✓ পেমেন্ট সফল — রসিদ #{{receiptNumber}} ({{appName}})',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#0f766e);padding:40px 32px;text-align:center;">
          <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:72px;font-size:36px;color:#ffffff;">✓</div>
          <h1 style="color:#ffffff;font-size:28px;margin:16px 0 4px;font-weight:700;">পেমেন্ট সফল হয়েছে</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Payment Successful</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 24px;">প্রিয় <strong>{{studentName}}</strong>,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 28px;line-height:1.6;">আপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে। বিস্তারিত তথ্য নিচে দেওয়া হলো:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">রসিদ নম্বর</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{receiptNumber}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">ফি ধরন</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{feeType}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">তারিখ</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{paymentDate}}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">পেমেন্ট মাধ্যম</td><td style="padding:8px 0;color:#111827;font-weight:600;text-align:right;">{{paymentMethod}}</td></tr>
            <tr><td colspan="2" style="padding:12px 0;"><div style="border-top:1px dashed #d1d5db;"></div></td></tr>
            <tr><td style="padding:8px 0;color:#111827;font-size:18px;font-weight:700;">মোট পরিশোধিত</td><td style="padding:8px 0;color:{{brandColor}};font-weight:800;font-size:22px;text-align:right;">৳{{amount}}</td></tr>
          </table>
          <p style="font-size:13px;color:#6b7280;margin:0;text-align:center;">এই রসিদটি সংরক্ষণ করুন। কোনো প্রশ্ন থাকলে প্রতিষ্ঠানে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}} — স্বয়ংক্রিয় ইমেইল</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#0d9488',
  '["studentName","receiptNumber","feeType","amount","paymentDate","paymentMethod","appName","brandColor"]'::jsonb,
  true
),
(
  'account_created',
  'একাউন্ট তৈরি নিশ্চিতকরণ',
  'নতুন ইউজার একাউন্ট সফলভাবে তৈরি হওয়ার পর পাঠানো ইমেইল',
  '🎉 আপনার একাউন্ট প্রস্তুত — {{appName}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#7c3aed);padding:48px 32px;text-align:center;">
          <div style="font-size:56px;line-height:1;margin-bottom:12px;">🎉</div>
          <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:700;">স্বাগতম, {{userName}}!</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">আপনার একাউন্ট সফলভাবে তৈরি হয়েছে</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 24px;">{{appName}}-এ আপনাকে স্বাগতম। আপনার একাউন্টের বিস্তারিত তথ্য:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:28px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">ইমেইল</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{email}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">একাউন্ট ধরন</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{accountType}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">তৈরির তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{createdDate}}</td></tr>
          </table>
          <div style="text-align:center;margin:32px 0;">
            <a href="{{loginUrl}}" style="display:inline-block;background:linear-gradient(135deg,{{brandColor}},#7c3aed);color:#ffffff;padding:14px 36px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">এখনই লগইন করুন →</a>
          </div>
          <p style="font-size:13px;color:#6b7280;text-align:center;margin:0;">যদি আপনি এই একাউন্ট তৈরি না করে থাকেন, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#6366f1',
  '["userName","email","accountType","createdDate","loginUrl","appName","brandColor"]'::jsonb,
  true
),
(
  'application_submitted',
  'আবেদন সাবমিট নিশ্চিতকরণ',
  'স্টাফ/চাকরির আবেদন সফলভাবে জমা হওয়ার পর',
  '📋 আবেদন গৃহীত — ট্র্যাকিং #{{applicationId}}',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#1e40af);padding:40px 32px;text-align:center;">
          <div style="width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;display:inline-block;line-height:72px;font-size:32px;">📋</div>
          <h1 style="color:#ffffff;font-size:26px;margin:16px 0 4px;font-weight:700;">আবেদন সফলভাবে জমা হয়েছে</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Application Received</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">প্রিয় <strong>{{applicantName}}</strong>,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 24px;line-height:1.7;">{{appName}}-এ <strong>{{position}}</strong> পদের জন্য আপনার আবেদন আমরা সফলভাবে পেয়েছি। আমাদের নিয়োগ কমিটি আপনার আবেদনটি পর্যালোচনা করবে।</p>
          <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="font-size:12px;color:#1e40af;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">আপনার ট্র্যাকিং নম্বর</p>
            <p style="font-size:24px;color:{{brandColor}};margin:0;font-weight:800;letter-spacing:2px;">{{applicationId}}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">পদ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{position}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">জমার তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{submittedDate}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">বর্তমান অবস্থা</td><td style="padding:6px 0;text-align:right;"><span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">পর্যালোচনাধীন</span></td></tr>
          </table>
          <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.6;">পরবর্তী ধাপ সম্পর্কে আমরা আপনাকে ইমেইলের মাধ্যমে জানাব। অনুগ্রহ করে ট্র্যাকিং নম্বরটি সংরক্ষণ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#3b82f6',
  '["applicantName","position","applicationId","submittedDate","appName","brandColor"]'::jsonb,
  true
),
(
  'admission_submitted',
  'এডমিশন আবেদন নিশ্চিতকরণ',
  'ছাত্র ভর্তি আবেদন সফলভাবে জমা হওয়ার পর পাঠানো ইমেইল',
  '🎓 ভর্তি আবেদন গৃহীত — #{{admissionId}} ({{appName}})',
  '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,{{brandColor}},#047857);padding:40px 32px;text-align:center;">
          <div style="font-size:48px;line-height:1;margin-bottom:8px;">🎓</div>
          <h1 style="color:#ffffff;font-size:26px;margin:8px 0 4px;font-weight:700;">ভর্তি আবেদন সফল</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:0;">Admission Application Received</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">সম্মানিত অভিভাবক,</p>
          <p style="font-size:15px;color:#4b5563;margin:0 0 24px;line-height:1.7;">আপনার সন্তান <strong>{{studentName}}</strong>-এর ভর্তি আবেদন আমরা সফলভাবে পেয়েছি। নিচে আবেদনের বিস্তারিত তথ্য দেওয়া হলো:</p>
          <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
            <p style="font-size:12px;color:#047857;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">আবেদন নম্বর</p>
            <p style="font-size:24px;color:{{brandColor}};margin:0;font-weight:800;letter-spacing:2px;">{{admissionId}}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">শিক্ষার্থীর নাম</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{studentName}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">আবেদিত শ্রেণী</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{className}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">শিক্ষাবর্ষ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{session}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">জমার তারিখ</td><td style="padding:6px 0;color:#111827;font-weight:600;text-align:right;">{{submittedDate}}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">অবস্থা</td><td style="padding:6px 0;text-align:right;"><span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">যাচাইয়ের অপেক্ষায়</span></td></tr>
          </table>
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;"><strong>পরবর্তী ধাপ:</strong> আবেদনটি পর্যালোচনার পর ভর্তি পরীক্ষা/সাক্ষাৎকারের তারিখ আপনাকে ইমেইল ও SMS-এর মাধ্যমে জানানো হবে।</p>
          </div>
          <p style="font-size:13px;color:#6b7280;margin:0;text-align:center;">আবেদন নম্বরটি সংরক্ষণ করুন। যেকোনো প্রশ্নে প্রতিষ্ঠানে যোগাযোগ করুন।</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:12px;margin:0;">© {{appName}} — স্বয়ংক্রিয় বার্তা</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>',
  '#10b981',
  '["studentName","className","session","admissionId","submittedDate","appName","brandColor"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO NOTHING;
