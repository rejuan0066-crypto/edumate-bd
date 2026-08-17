import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  block_leaked_passwords: boolean;
}

export const DEFAULT_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  block_leaked_passwords: true,
};

let cached: PasswordPolicy | null = null;
let inflight: Promise<PasswordPolicy> | null = null;

export const fetchPasswordPolicy = async (): Promise<PasswordPolicy> => {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from('password_policy')
        .select('min_length, require_uppercase, require_lowercase, require_number, require_special, block_leaked_passwords')
        .eq('id', 1)
        .maybeSingle();
      const policy: PasswordPolicy = data
        ? {
            min_length: data.min_length ?? DEFAULT_POLICY.min_length,
            require_uppercase: data.require_uppercase ?? DEFAULT_POLICY.require_uppercase,
            require_lowercase: data.require_lowercase ?? DEFAULT_POLICY.require_lowercase,
            require_number: data.require_number ?? DEFAULT_POLICY.require_number,
            require_special: data.require_special ?? DEFAULT_POLICY.require_special,
            block_leaked_passwords: data.block_leaked_passwords ?? DEFAULT_POLICY.block_leaked_passwords,
          }
        : DEFAULT_POLICY;
      cached = policy;
      return policy;
    } catch {
      return DEFAULT_POLICY;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

export const invalidatePasswordPolicyCache = () => {
  cached = null;
};

export const usePasswordPolicy = (): PasswordPolicy => {
  const [policy, setPolicy] = useState<PasswordPolicy>(cached || DEFAULT_POLICY);
  useEffect(() => {
    let active = true;
    fetchPasswordPolicy().then(p => {
      if (active) setPolicy(p);
    });
    return () => { active = false; };
  }, []);
  return policy;
};

export interface RuleResult {
  key: 'min_length' | 'uppercase' | 'lowercase' | 'number' | 'special' | 'english_only';
  required: boolean;
  passed: boolean;
  label_bn: string;
  label_en: string;
}

export const evaluatePassword = (password: string, policy: PasswordPolicy): RuleResult[] => {
  return [
    {
      key: 'min_length',
      required: true,
      passed: password.length >= policy.min_length,
      label_bn: `কমপক্ষে ${policy.min_length} অক্ষর`,
      label_en: `At least ${policy.min_length} characters`,
    },
    {
      key: 'uppercase',
      required: policy.require_uppercase,
      passed: /[A-Z]/.test(password),
      label_bn: 'একটি বড় হাতের অক্ষর (A-Z)',
      label_en: 'One uppercase letter (A-Z)',
    },
    {
      key: 'lowercase',
      required: policy.require_lowercase,
      passed: /[a-z]/.test(password),
      label_bn: 'একটি ছোট হাতের অক্ষর (a-z)',
      label_en: 'One lowercase letter (a-z)',
    },
    {
      key: 'number',
      required: policy.require_number,
      passed: /[0-9]/.test(password),
      label_bn: 'একটি সংখ্যা (0-9)',
      label_en: 'One number (0-9)',
    },
    {
      key: 'special',
      required: policy.require_special,
      passed: /[^A-Za-z0-9]/.test(password),
      label_bn: 'একটি বিশেষ চিহ্ন (!@#$...)',
      label_en: 'One special character (!@#$...)',
    },
    {
      key: 'english_only',
      required: true,
      passed: /^[\x21-\x7E]*$/.test(password),
      label_bn: 'শুধুমাত্র ইংরেজি অক্ষর',
      label_en: 'English characters only',
    },
  ];
};

export const isPasswordStrongAgainst = (password: string, policy: PasswordPolicy): boolean => {
  return evaluatePassword(password, policy).filter(r => r.required).every(r => r.passed);
};

export const firstFailedRuleMessage = (
  password: string,
  policy: PasswordPolicy,
  bn = true,
): string | null => {
  const failed = evaluatePassword(password, policy).find(r => r.required && !r.passed);
  if (!failed) return null;
  return bn ? `পাসওয়ার্ডে ${failed.label_bn} থাকতে হবে` : `Password must include: ${failed.label_en}`;
};
