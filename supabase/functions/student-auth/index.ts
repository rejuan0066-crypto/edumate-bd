// Student Account Authentication: signup + login with bcrypt + email/phone OTP
// One account per student_id (DB-enforced UNIQUE)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

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
  contact: string;          // email or phone (free choice)
  contact_type: 'email' | 'phone';
  password: string;
  full_name: string;
  student_id: string;
  student_dob: string;      // dd/mm/yyyy or YYYY-MM-DD
}
interface LoginBody {
  action: 'login';
  contact: string;
  password: string;
}
interface MarkVerifiedBody {
  action: 'mark_verified';
  contact: string;
}
interface CheckAccountBody {
  action: 'check_account';
  contact: string;
}
interface ResetPasswordBody {
  action: 'reset_password';
  contact: string;       // email
  code: string;          // OTP previously sent with purpose=password_reset
  new_password: string;
}
type Body = SignupBody | LoginBody | MarkVerifiedBody | CheckAccountBody | ResetPasswordBody;

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
const normContact = (c: string, type: 'email' | 'phone') =>
  type === 'email' ? c.toLowerCase().trim() : c.replace(/\s+/g, '').trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;

    if (body.action === 'signup') {
      const { contact, contact_type, password, full_name, student_id, student_dob } = body;
      if (!contact || !contact_type || !password || !full_name || !student_id || !student_dob) {
        return json({ error: 'Missing required fields' }, 400);
      }
      if (!['email', 'phone'].includes(contact_type)) return json({ error: 'Invalid contact type' }, 400);
      if (password.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);

      const c = normContact(contact, contact_type);

      // Verify student exists with matching DOB
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id, date_of_birth, name_bn, name_en, status')
        .eq('student_id', student_id.trim())
        .maybeSingle();
      if (studentErr) return json({ error: studentErr.message }, 500);
      if (!student) return json({ error: 'Student ID not found' }, 404);

      const inputDob = normalizeDob(student_dob);
      const dbDob = normalizeDob(student.date_of_birth);
      if (!inputDob || !/^\d{4}-\d{2}-\d{2}$/.test(inputDob)) {
        return json({ error: 'Invalid date format. Use dd/mm/yyyy' }, 400);
      }
      if (dbDob !== inputDob) {
        return json({ error: 'Date of birth does not match student record' }, 400);
      }

      // One account per student_id (check both text id and linked uuid)
      const { data: existingForStudent } = await supabase
        .from('student_accounts')
        .select('id, contact, status, contact_verified')
        .or(`student_id.ilike.${student_id.trim()},linked_student_uuid.eq.${student.id}`)
        .maybeSingle();
      if (existingForStudent) {
        return json({
          error: 'এই শিক্ষার্থী আইডির জন্য ইতিমধ্যেই একটি একাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন অথবা পাসওয়ার্ড রিসেট করুন।',
          code: 'STUDENT_ALREADY_REGISTERED',
          existing_contact_masked: maskContact(existingForStudent.contact),
        }, 409);
      }

      // Duplicate contact?
      const { data: existingContact } = await supabase
        .from('student_accounts')
        .select('id')
        .ilike('contact', c)
        .maybeSingle();
      if (existingContact) {
        return json({ error: 'এই ইমেইল/ফোন দিয়ে ইতিমধ্যে একটি একাউন্ট আছে।', code: 'CONTACT_EXISTS' }, 409);
      }

      const password_hash = await bcrypt.hash(password);

      const { data: created, error: insErr } = await supabase
        .from('student_accounts')
        .insert({
          contact: c,
          contact_type,
          password_hash,
          full_name: full_name.trim(),
          student_id: student_id.trim(),
          student_dob: inputDob,
          linked_student_uuid: student.id,
          contact_verified: false,
          status: 'active',
        })
        .select('id, contact, contact_type')
        .single();
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, account: created });
    }

    if (body.action === 'mark_verified') {
      const c = body.contact.trim().toLowerCase();
      const { error } = await supabase
        .from('student_accounts')
        .update({ contact_verified: true })
        .ilike('contact', c);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (body.action === 'login') {
      const { contact, password } = body;
      if (!contact || !password) return json({ error: 'Contact and password required' }, 400);
      const c = contact.toLowerCase().trim();

      const { data: account, error: accErr } = await supabase
        .from('student_accounts')
        .select('*')
        .ilike('contact', c)
        .maybeSingle();
      if (accErr) return json({ error: accErr.message }, 500);
      if (!account) return json({ error: 'ভুল তথ্য বা পাসওয়ার্ড' }, 401);

      const valid = await bcrypt.compare(password, account.password_hash);
      if (!valid) return json({ error: 'ভুল তথ্য বা পাসওয়ার্ড' }, 401);

      if (!account.contact_verified) {
        return json({ error: 'যোগাযোগ ভেরিফাই করা হয়নি', code: 'NOT_VERIFIED' }, 403);
      }
      if (account.status === 'suspended') return json({ error: 'একাউন্ট স্থগিত', code: 'SUSPENDED' }, 403);
      if (account.status === 'rejected') return json({ error: 'একাউন্ট প্রত্যাখ্যাত', code: 'REJECTED' }, 403);

      await supabase
        .from('student_accounts')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', account.id);

      return json({
        success: true,
        account: {
          id: account.id,
          contact: account.contact,
          contact_type: account.contact_type,
          full_name: account.full_name,
          student_id: account.student_id,
          linked_student_uuid: account.linked_student_uuid,
        },
      });
    }

    if (body.action === 'check_account') {
      // Used by "Forgot password" — confirm the contact exists before sending OTP.
      // Always return generic shape to avoid email enumeration.
      const c = body.contact.trim().toLowerCase();
      const { data: account } = await supabase
        .from('student_accounts')
        .select('id, contact_verified, status')
        .ilike('contact', c)
        .maybeSingle();
      const eligible = !!account && account.status !== 'rejected' && account.status !== 'suspended';
      return json({ exists: eligible });
    }

    if (body.action === 'reset_password') {
      const { contact, code, new_password } = body;
      if (!contact || !code || !new_password) {
        return json({ error: 'Contact, code and new password required' }, 400);
      }
      if (new_password.length < 6) {
        return json({ error: 'Password must be at least 6 characters' }, 400);
      }
      const c = contact.trim().toLowerCase();

      // Re-verify the OTP server-side via the central verify-otp function.
      const verifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/verify-otp`;
      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: Deno.env.get('SUPABASE_ANON_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ email: c, code, purpose: 'password_reset' }),
      });
      let verifyJson: any = null;
      try { verifyJson = await verifyRes.json(); } catch { /* ignore */ }
      if (!verifyRes.ok || !verifyJson?.valid) {
        return json({
          error: verifyJson?.message || verifyJson?.error || 'OTP যাচাই ব্যর্থ',
          code: verifyJson?.code || 'OTP_INVALID',
        }, 400);
      }

      const { data: account, error: accErr } = await supabase
        .from('student_accounts')
        .select('id, status')
        .ilike('contact', c)
        .maybeSingle();
      if (accErr) return json({ error: accErr.message }, 500);
      if (!account) return json({ error: 'একাউন্ট পাওয়া যায়নি' }, 404);
      if (account.status === 'suspended' || account.status === 'rejected') {
        return json({ error: 'একাউন্ট সক্রিয় নয়' }, 403);
      }

      const password_hash = await bcrypt.hash(new_password);
      const { error: updErr } = await supabase
        .from('student_accounts')
        .update({ password_hash, contact_verified: true, updated_at: new Date().toISOString() })
        .eq('id', account.id);
      if (updErr) return json({ error: updErr.message }, 500);

      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('student-auth error:', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function maskContact(c: string): string {
  if (!c) return '';
  if (c.includes('@')) {
    const [u, d] = c.split('@');
    return `${u.slice(0, 2)}***@${d}`;
  }
  return c.length > 4 ? `${c.slice(0, 3)}****${c.slice(-2)}` : '****';
}
