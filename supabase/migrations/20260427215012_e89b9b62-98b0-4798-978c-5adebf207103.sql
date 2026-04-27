
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  brand_color TEXT DEFAULT '#10b981',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email templates"
  ON public.email_templates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email templates"
  ON public.email_templates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete non-system email templates"
  ON public.email_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') AND is_system = false);

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.email_templates (template_key, name, description, subject, html_body, variables, is_system) VALUES
('otp', 'OTP Verification', 'ভেরিফিকেশন কোড পাঠানোর জন্য', 'আপনার ভেরিফিকেশন কোড: {{otp}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">🔐</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">ভেরিফিকেশন কোড</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">{{institution_name}}</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px;">আসসালামু আলাইকুম,</p>
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 32px;">আপনার অ্যাকাউন্ট ভেরিফাই করতে নিচের কোডটি ব্যবহার করুন:</p>
<div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border:2px dashed {{brand_color}};border-radius:16px;padding:32px;text-align:center;margin:0 0 32px;">
<div style="color:#64748b;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">আপনার OTP কোড</div>
<div style="color:{{brand_color}};font-size:42px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">{{otp}}</div>
</div>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:8px;margin:0 0 24px;">
<p style="color:#92400e;font-size:14px;margin:0;line-height:1.5;">⏱️ এই কোডটি <strong>{{expiry_minutes}} মিনিট</strong> পর্যন্ত বৈধ থাকবে। কাউকে এই কোড শেয়ার করবেন না।</p>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">যদি আপনি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন।</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}. সর্বস্বত্ব সংরক্ষিত।</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["otp","institution_name","expiry_minutes","brand_color","year"]'::jsonb, true),

('welcome', 'Welcome Email', 'নতুন ইউজার রেজিস্ট্রেশনের পর স্বাগতম বার্তা', 'স্বাগতম {{user_name}} - {{institution_name}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);padding:56px 40px;text-align:center;">
<div style="display:inline-block;width:80px;height:80px;background:rgba(255,255,255,0.2);border-radius:24px;line-height:80px;font-size:40px;">🎉</div>
<h1 style="color:#ffffff;font-size:30px;margin:24px 0 8px;font-weight:800;">স্বাগতম!</h1>
<p style="color:rgba(255,255,255,0.95);margin:0;font-size:17px;">{{institution_name}}-এ আপনাকে স্বাগতম</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#0f172a;font-size:18px;line-height:1.6;margin:0 0 16px;font-weight:600;">প্রিয় {{user_name}},</p>
<p style="color:#475569;font-size:16px;line-height:1.7;margin:0 0 28px;">আপনি সফলভাবে আমাদের প্ল্যাটফর্মে রেজিস্টার করেছেন। আপনার অ্যাকাউন্ট এখন সক্রিয় এবং ব্যবহারের জন্য প্রস্তুত।</p>
<div style="background:linear-gradient(135deg,#f0fdf4 0%,#ecfdf5 100%);border-radius:16px;padding:24px;margin:0 0 28px;">
<h3 style="color:#065f46;font-size:16px;margin:0 0 16px;">✨ আপনি যা করতে পারবেন:</h3>
<ul style="color:#047857;font-size:15px;line-height:2;margin:0;padding-left:20px;">
<li>নোটিশ ও আপডেট দেখা</li><li>একাডেমিক রেজাল্ট অ্যাক্সেস</li><li>ফি পেমেন্ট ও রসিদ</li><li>লাইব্রেরি সার্ভিস</li>
</ul></div>
<div style="text-align:center;margin:32px 0;">
<a href="{{login_url}}" style="display:inline-block;background:linear-gradient(135deg,{{brand_color}} 0%,#059669 100%);color:#ffffff;padding:16px 48px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">এখনই লগইন করুন →</a>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:24px 0 0;text-align:center;">কোনো সাহায্যের প্রয়োজন হলে যোগাযোগ করুন: <a href="mailto:{{support_email}}" style="color:{{brand_color}};">{{support_email}}</a></p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["user_name","institution_name","login_url","support_email","brand_color","year"]'::jsonb, true),

('password_reset', 'Password Reset', 'পাসওয়ার্ড রিসেট লিংক/কোড', 'পাসওয়ার্ড রিসেট অনুরোধ',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">🔑</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">পাসওয়ার্ড রিসেট</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">নিরাপত্তা অনুরোধ</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<p style="color:#0f172a;font-size:16px;line-height:1.6;margin:0 0 20px;">প্রিয় {{user_name}},</p>
<p style="color:#475569;font-size:16px;line-height:1.7;margin:0 0 28px;">আমরা আপনার অ্যাকাউন্টের জন্য পাসওয়ার্ড রিসেট করার অনুরোধ পেয়েছি। নিচের কোডটি ব্যবহার করে আপনার পাসওয়ার্ড পরিবর্তন করুন:</p>
<div style="background:#fffbeb;border:2px dashed #f59e0b;border-radius:16px;padding:32px;text-align:center;margin:0 0 28px;">
<div style="color:#92400e;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">রিসেট কোড</div>
<div style="color:#d97706;font-size:38px;font-weight:800;letter-spacing:10px;font-family:'Courier New',monospace;">{{reset_code}}</div>
</div>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:8px;margin:0 0 24px;">
<p style="color:#991b1b;font-size:14px;margin:0;line-height:1.6;"><strong>⚠️ সতর্কতা:</strong> যদি আপনি এই অনুরোধ না করে থাকেন, অবিলম্বে আপনার পাসওয়ার্ড পরিবর্তন করুন এবং সাপোর্ট টিমের সাথে যোগাযোগ করুন।</p>
</div>
<p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">এই কোডটি {{expiry_minutes}} মিনিট পর্যন্ত বৈধ।</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["user_name","reset_code","expiry_minutes","institution_name","year"]'::jsonb, true),

('notice', 'Notice / Announcement', 'সাধারণ নোটিশ ও ঘোষণা', '📢 {{notice_title}}',
$HTML$<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:48px 40px;text-align:center;">
<div style="display:inline-block;width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:20px;line-height:72px;font-size:36px;">📢</div>
<h1 style="color:#ffffff;font-size:26px;margin:20px 0 8px;font-weight:700;">গুরুত্বপূর্ণ নোটিশ</h1>
<p style="color:rgba(255,255,255,0.9);margin:0;font-size:15px;">{{institution_name}}</p>
</td></tr>
<tr><td style="padding:48px 40px;">
<div style="background:#eff6ff;border-radius:12px;padding:20px;margin:0 0 24px;">
<div style="color:#1e40af;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">{{notice_date}}</div>
<h2 style="color:#0f172a;font-size:22px;margin:0;font-weight:700;line-height:1.4;">{{notice_title}}</h2>
</div>
<div style="color:#334155;font-size:16px;line-height:1.8;margin:0 0 28px;">{{notice_body}}</div>
<div style="text-align:center;margin:32px 0 0;">
<a href="{{notice_url}}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#ffffff;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">বিস্তারিত দেখুন →</a>
</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
<p style="color:#94a3b8;font-size:13px;margin:0;">© {{year}} {{institution_name}}</p>
</td></tr></table></td></tr></table></body></html>$HTML$,
'["notice_title","notice_body","notice_date","notice_url","institution_name","year"]'::jsonb, true)
ON CONFLICT (template_key) DO NOTHING;
