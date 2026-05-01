// Parent Portal Authentication: signup + login with bcrypt password hashing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// Use sync bcrypt to avoid Worker (not available in Deno edge runtime)
import { hashSync, compareSync } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { resolveSmtpProfile } from '../_shared/smtp-resolver.ts';
import { sendViaSMTP } from '../_shared/smtp.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface SignupBody {
  action: 'signup';
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  student_id: string;
  student_dob: string;
}

interface LoginBody {
  action: 'login';
  email: string;
  password: string;
}

interface MarkVerifiedBody {
  action: 'mark_verified';
  email: string;
}

interface NotifyApprovedBody {
  action: 'notify_approved';
  account_id: string;
}

interface NotifyRejectedBody {
  action: 'notify_rejected';
  account_id: string;
  reason?: string;
}

type Body = SignupBody | LoginBody | MarkVerifiedBody | NotifyApprovedBody | NotifyRejectedBody;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    if (body.action === 'signup') {
      const { email, password, full_name, phone, student_id, student_dob } = body;
      if (!email || !password || !full_name || !student_id || !student_dob) {
        return json({ error: 'Missing required fields' }, 400);
      }
      if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

      // Verify student exists with matching DOB
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id, date_of_birth, name_bn, name_en')
        .eq('student_id', student_id.trim())
        .maybeSingle();

      if (studentErr) return json({ error: studentErr.message }, 500);
      if (!student) return json({ error: 'Student ID not found' }, 404);

      // Normalize DOB to YYYY-MM-DD. Accepts dd/mm/yyyy, dd-mm-yyyy, or YYYY-MM-DD.
      const normalizeDob = (v: string | null | undefined): string => {
        if (!v) return '';
        const s = String(v).trim();
        const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
        const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmy) {
          const d = dmy[1].padStart(2, '0');
          const m = dmy[2].padStart(2, '0');
          return `${dmy[3]}-${m}-${d}`;
        }
        return s;
      };

      const dbDob = normalizeDob(student.date_of_birth);
      const inputDob = normalizeDob(student_dob);
      if (!inputDob || !/^\d{4}-\d{2}-\d{2}$/.test(inputDob)) {
        return json({ error: 'Invalid date format. Use dd/mm/yyyy' }, 400);
      }
      if (dbDob !== inputDob) {
        return json({
          error: 'Date of birth does not match student record',
          hint: `Expected ${dbDob}, got ${inputDob}`,
        }, 400);
      }

      // Check duplicate email
      const { data: existing } = await supabase
        .from('parent_accounts')
        .select('id, status')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (existing) {
        return json({ error: 'An account with this email already exists', status: existing.status }, 409);
      }

      const password_hash = hashSync(password);

      const { data: created, error: insErr } = await supabase
        .from('parent_accounts')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash,
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          student_id: student_id.trim(),
          student_dob,
          linked_student_uuid: student.id,
          email_verified: false,
          status: 'pending',
        })
        .select('id, email, status')
        .single();

      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, account: created });
    }

    if (body.action === 'mark_verified') {
      const { email } = body;
      const { error: updErr } = await supabase
        .from('parent_accounts')
        .update({ email_verified: true })
        .eq('email', email.toLowerCase().trim());
      if (updErr) return json({ error: updErr.message }, 500);
      return json({ success: true });
    }

    if (body.action === 'login') {
      const { email, password } = body;
      if (!email || !password) return json({ error: 'Email and password required' }, 400);

      const { data: account, error: accErr } = await supabase
        .from('parent_accounts')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (accErr) return json({ error: accErr.message }, 500);
      if (!account) {
        return json({
          error: 'এই ইমেইল দিয়ে কোন একাউন্ট খোলা হয়নি। অনুগ্রহ করে সাইনআপ করুন।',
          code: 'ACCOUNT_NOT_FOUND',
        }, 404);
      }

      const valid = compareSync(password, account.password_hash);
      if (!valid) return json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }, 401);

      if (!account.email_verified) {
        return json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' }, 403);
      }

      if (account.status === 'pending') {
        return json({
          error: 'আপনার একাউন্ট এখনো অনুমোদনের জন্য অপেক্ষমাণ। অ্যাডমিন অনুমোদন করার পর আপনি লগইন করতে পারবেন।',
          code: 'PENDING_APPROVAL',
        }, 403);
      }
      if (account.status === 'rejected') {
        return json({ error: account.rejection_reason || 'Account was rejected', code: 'REJECTED' }, 403);
      }
      if (account.status === 'suspended') {
        return json({ error: 'Account is suspended', code: 'SUSPENDED' }, 403);
      }

      // Update last_login
      await supabase
        .from('parent_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', account.id);

      return json({
        success: true,
        account: {
          id: account.id,
          email: account.email,
          full_name: account.full_name,
          phone: account.phone,
          student_id: account.student_id,
          linked_student_uuid: account.linked_student_uuid,
        },
      });
    }

    if (body.action === 'notify_approved' || body.action === 'notify_rejected') {
      const { account_id } = body as NotifyApprovedBody | NotifyRejectedBody;
      const reason = body.action === 'notify_rejected' ? (body as NotifyRejectedBody).reason : undefined;
      if (!account_id) return json({ error: 'account_id required' }, 400);

      const { data: account, error: accErr } = await supabase
        .from('parent_accounts')
        .select('id, email, full_name, student_id')
        .eq('id', account_id)
        .maybeSingle();
      if (accErr) return json({ error: accErr.message }, 500);
      if (!account) return json({ error: 'একাউন্ট পাওয়া যায়নি' }, 404);

      let brand = 'Institution';
      try {
        const { data: inst } = await supabase.from('institution_info').select('name_en, name_bn').limit(1).maybeSingle();
        brand = inst?.name_bn || inst?.name_en || brand;
      } catch { /* ignore */ }

      const profile = await resolveSmtpProfile(supabase, 'transactional');
      if (!profile) {
        console.warn('No SMTP profile available; skipping notification email');
        return json({ success: true, skipped: 'no_smtp_profile' });
      }

      const isApproved = body.action === 'notify_approved';
      const subject = isApproved
        ? `${brand} — আপনার অভিভাবক একাউন্ট অনুমোদিত হয়েছে`
        : `${brand} — আপনার অভিভাবক একাউন্ট প্রত্যাখ্যাত হয়েছে`;

      const html = isApproved
        ? `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;padding:24px;color:#111">
            <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
              <div style="background:#10b981;color:#fff;padding:18px 22px;font-size:18px;font-weight:700">
                একাউন্ট অনুমোদিত
              </div>
              <div style="padding:22px">
                <p>প্রিয় <b>${escapeHtml(account.full_name)}</b>,</p>
                <p>${escapeHtml(brand)} এ আপনার অভিভাবক পোর্টাল একাউন্ট (Student ID: <b>${escapeHtml(account.student_id)}</b>) সফলভাবে <b>অনুমোদিত</b> হয়েছে।</p>
                <p>আপনি এখন অভিভাবক পোর্টালে লগইন করে আপনার সন্তানের তথ্য দেখতে পারবেন।</p>
                <p style="margin-top:22px;color:#6b7280;font-size:12px">— ${escapeHtml(brand)}</p>
              </div>
            </div>
          </body></html>`
        : `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;padding:24px;color:#111">
            <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
              <div style="background:#ef4444;color:#fff;padding:18px 22px;font-size:18px;font-weight:700">
                একাউন্ট প্রত্যাখ্যাত
              </div>
              <div style="padding:22px">
                <p>প্রিয় <b>${escapeHtml(account.full_name)}</b>,</p>
                <p>দুঃখজনকভাবে ${escapeHtml(brand)} এ আপনার অভিভাবক পোর্টাল একাউন্টের অনুরোধ <b>প্রত্যাখ্যাত</b> হয়েছে।</p>
                ${reason ? `<p><b>কারণ:</b> ${escapeHtml(reason)}</p>` : ''}
                <p>বিস্তারিত জানতে অনুগ্রহ করে অফিসে যোগাযোগ করুন।</p>
                <p style="margin-top:22px;color:#6b7280;font-size:12px">— ${escapeHtml(brand)}</p>
              </div>
            </div>
          </body></html>`;

      try {
        await sendViaSMTP(profile, account.email, subject, html);
      } catch (e) {
        console.error('SMTP send failed:', e);
        return json({ success: false, error: e instanceof Error ? e.message : 'SMTP send failed' }, 500);
      }
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('parent-auth error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
