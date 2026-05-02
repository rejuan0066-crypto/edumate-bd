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
  nid?: string;
  student_id?: string;
  student_dob?: string;
  confirmed_student_uuids?: string[];
}

interface PreviewMatchBody {
  action: 'preview_match';
  nid?: string;
  phone?: string;
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

type Body = SignupBody | LoginBody | MarkVerifiedBody | NotifyApprovedBody | NotifyRejectedBody | PreviewMatchBody;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    if (body.action === 'preview_match') {
      const { nid, phone } = body;
      if ((!nid || !nid.trim()) && (!phone || !phone.trim())) {
        return json({ matches: [] });
      }
      const { data, error } = await supabase.rpc('match_students_for_parent', {
        p_nid: nid?.trim() || null,
        p_phone: phone?.trim() || null,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ matches: data || [] });
    }

    if (body.action === 'signup') {
      const { email, password, full_name, phone, nid, student_id, student_dob, confirmed_student_uuids } = body;
      if (!email || !password || !full_name) {
        return json({ error: 'Missing required fields' }, 400);
      }
      if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

      const trimmedNid = nid?.trim() || '';
      const trimmedPhone = phone?.trim() || '';

      // NID + phone are the new primary linking method
      if (!trimmedNid && !trimmedPhone && !student_id) {
        return json({ error: 'NID অথবা ফোন নম্বর প্রদান করুন', code: 'NID_OR_PHONE_REQUIRED' }, 400);
      }

      // Find matching students using new RPC
      let matchedStudents: Array<{ student_uuid: string; student_id: string }> = [];
      if (trimmedNid || trimmedPhone) {
        const { data: matches, error: matchErr } = await supabase.rpc('match_students_for_parent', {
          p_nid: trimmedNid || null,
          p_phone: trimmedPhone || null,
        });
        if (matchErr) return json({ error: matchErr.message }, 500);
        matchedStudents = matches || [];
      }

      // Honor user-confirmed selection from signup preview (if provided)
      if (confirmed_student_uuids && Array.isArray(confirmed_student_uuids) && confirmed_student_uuids.length > 0) {
        const confirmSet = new Set(confirmed_student_uuids);
        matchedStudents = matchedStudents.filter((m) => confirmSet.has(m.student_uuid));
        if (matchedStudents.length === 0) {
          return json({
            error: 'কোনো ছাত্র নিশ্চিত করা হয়নি। অনুগ্রহ করে কমপক্ষে একজন ছাত্র নির্বাচন করুন।',
            code: 'NO_CONFIRMED_STUDENT',
          }, 400);
        }
      }

      // Legacy fallback: if student_id + student_dob provided, also verify
      let firstStudentId: string | null = null;
      if (matchedStudents.length === 0 && student_id && student_dob) {
        const { data: student } = await supabase
          .from('students')
          .select('id, date_of_birth')
          .eq('student_id', student_id.trim())
          .maybeSingle();
        if (student) {
          const normalize = (v: string) => {
            const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
            const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
            return v;
          };
          if (normalize(student.date_of_birth || '') === normalize(student_dob)) {
            firstStudentId = student.id;
            matchedStudents = [{ student_uuid: student.id, student_id: student_id.trim() }];
          }
        }
      }

      if (matchedStudents.length === 0) {
        return json({
          error: 'এই NID/ফোন নম্বর দিয়ে কোন ছাত্র পাওয়া যায়নি। দয়া করে যাচাই করুন।',
          code: 'NO_STUDENT_MATCH',
        }, 404);
      }

      // Check duplicate email
      const { data: existing } = await supabase
        .from('parent_accounts')
        .select('id, status')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (existing) {
        return json({ error: 'এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট আছে', status: existing.status }, 409);
      }

      const password_hash = hashSync(password);
      const studentUuids = matchedStudents.map(m => m.student_uuid);
      firstStudentId = firstStudentId || studentUuids[0];

      const { data: created, error: insErr } = await supabase
        .from('parent_accounts')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash,
          full_name: full_name.trim(),
          phone: trimmedPhone || null,
          nid: trimmedNid || null,
          student_id: matchedStudents[0]?.student_id || student_id?.trim() || '',
          student_dob: student_dob || null,
          linked_student_uuid: firstStudentId,
          linked_student_uuids: studentUuids,
          email_verified: false,
          status: 'pending',
        })
        .select('id, email, status')
        .single();

      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, account: created, matched_count: matchedStudents.length });
    }

    if (body.action === 'mark_verified') {
      // SECURITY: this action is disabled. Email verification must go through
      // the verify-otp edge function, which validates the OTP server-side and
      // sets email_verified atomically. Allowing an unauthenticated caller to
      // mark any email as verified bypasses OTP entirely.
      return json({ error: 'This action is no longer supported. Use verify-otp instead.' }, 410);
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

      // Refresh student links (in case new students were added under this NID/phone)
      try {
        await supabase.rpc('refresh_parent_student_links', { p_account_id: account.id });
      } catch (e) {
        console.warn('refresh_parent_student_links failed:', e);
      }

      // Re-fetch latest linked uuids
      const { data: fresh } = await supabase
        .from('parent_accounts')
        .select('linked_student_uuid, linked_student_uuids')
        .eq('id', account.id)
        .maybeSingle();

      // Update last_login
      await supabase
        .from('parent_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', account.id);

      // Issue a fresh session token (30-day TTL)
      let session_token: string | null = null;
      try {
        const { data: tok } = await supabase.rpc('rotate_parent_session', { p_account_id: account.id });
        session_token = (tok as string) || null;
      } catch (e) {
        console.warn('rotate_parent_session failed:', e);
      }

      return json({
        success: true,
        session_token,
        account: {
          id: account.id,
          email: account.email,
          full_name: account.full_name,
          phone: account.phone,
          nid: account.nid,
          student_id: account.student_id,
          linked_student_uuid: fresh?.linked_student_uuid ?? account.linked_student_uuid,
          linked_student_uuids: fresh?.linked_student_uuids ?? account.linked_student_uuids ?? [],
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

      // On approval, refresh student links from current NID/phone
      if (body.action === 'notify_approved') {
        try {
          await supabase.rpc('refresh_parent_student_links', { p_account_id: account_id });
        } catch (e) {
          console.warn('refresh on approval failed:', e);
        }
      }

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
