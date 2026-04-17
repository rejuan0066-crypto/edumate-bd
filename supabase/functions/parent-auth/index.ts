// Parent Portal Authentication: signup + login with bcrypt password hashing
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

type Body = SignupBody | LoginBody | MarkVerifiedBody;

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
      if (student.date_of_birth !== student_dob) {
        return json({ error: 'Date of birth does not match student record' }, 400);
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

      const password_hash = await bcrypt.hash(password);

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
      if (!account) return json({ error: 'Invalid email or password' }, 401);

      const valid = await bcrypt.compare(password, account.password_hash);
      if (!valid) return json({ error: 'Invalid email or password' }, 401);

      if (!account.email_verified) {
        return json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' }, 403);
      }

      if (account.status === 'pending') {
        return json({ error: 'Account pending admin approval', code: 'PENDING_APPROVAL' }, 403);
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
