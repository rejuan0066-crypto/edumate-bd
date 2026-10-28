import { supabase } from '@/integrations/supabase/client';

export interface PaymentRecord {
  id: string;
  transaction_id: string;
  fee_type: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | string;
  payment_method?: string | null;
  payer_name?: string | null;
  payer_phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  student_id?: string | null;
  collected_by?: string | null;
  created_by?: string | null;
  rejection_reason?: string | null;
  deleted_at?: string | null;
  students?: {
    name_bn?: string | null;
    name_en?: string | null;
    roll_number?: string | null;
  } | null;
}

/**
 * Strips role tags like (Admin), (Staff), (Teacher), etc. from person names
 */
export function cleanRoleSuffix(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\s*\((?:Admin|Staff|Teacher|Super Admin|admin|staff|teacher|super_admin|অ্যাডমিন|স্টাফ|শিক্ষক)\)\s*/gi, '')
    .trim();
}

/**
 * Extracts collector name from payment record or notes fallback
 */
export function getCollectorFromPayment(p: any): string {
  if (p?.collected_by) return cleanRoleSuffix(p.collected_by);
  if (!p?.notes) return '';
  const match = p.notes.match(/(?:আদায়ক়ারী|আদায়কারী|আদায়|Collector):\s*([^|\n]+)/i);
  if (match && match[1]) {
    const val = match[1].trim();
    if (val.toLowerCase() !== 'cash' && val.toLowerCase() !== 'online' && val.toLowerCase() !== 'office') {
      return cleanRoleSuffix(val);
    }
  }
  return '';
}

/**
 * Extracts rejection reason from payment record or notes fallback
 */
export function getRejectionReasonFromPayment(p: any): string {
  if (p?.rejection_reason) return p.rejection_reason;
  if (!p?.notes) return '';
  const match = p.notes.match(/\[(?:প্রত্যাখ্যানের কারণ|Rejection Reason)\]:\s*([^|\n]+)/i);
  return match && match[1] ? match[1].trim() : '';
}

/**
 * 3-Tier User / Collector Identity Resolution:
 * Tier 1: Staff / Teacher Profile (name_bn / name_en + designation)
 * Tier 2: Standard User Profile (full_name)
 * Tier 3: User ID / Username (strictly used when no profile exists)
 */
export async function resolveUserCollectorIdentity(
  userId: string | null | undefined,
  userAuth?: { email?: string | null; user_metadata?: any } | null,
  options?: { bn?: boolean; withDesignation?: boolean }
): Promise<{
  displayName: string;
  cleanName: string;
  designation?: string;
  tier: 'staff' | 'profile' | 'user_id';
}> {
  const bn = options?.bn ?? true;
  if (!userId) {
    const unknown = bn ? 'অজ্ঞাত ইউজার' : 'Unknown User';
    return {
      displayName: unknown,
      cleanName: unknown,
      tier: 'user_id',
    };
  }

  // Tier 1: Staff / Teacher profile
  try {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name_bn, name_en, designation, staff_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (staffData) {
      const rawName = (staffData.name_bn || staffData.name_en || '').trim();
      if (rawName) {
        const cleanName = cleanRoleSuffix(rawName);
        const des = staffData.designation ? ` (${staffData.designation})` : '';
        return {
          displayName: options?.withDesignation !== false && des ? `${cleanName}${des}` : cleanName,
          cleanName,
          designation: staffData.designation || undefined,
          tier: 'staff',
        };
      }
    }
  } catch (e) {
    // Graceful fallback
  }

  // Tier 2: User profile (profiles table or user_metadata)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const profileFullName = (profile?.full_name || userAuth?.user_metadata?.full_name || '').trim();
    if (profileFullName) {
      const cleanName = cleanRoleSuffix(profileFullName);
      return {
        displayName: cleanName,
        cleanName,
        tier: 'profile',
      };
    }
  } catch (e) {
    // Graceful fallback
  }

  // Tier 3: No profile exists -> Fall back to User ID / Username
  const username =
    userAuth?.user_metadata?.username ||
    userAuth?.user_metadata?.user_name ||
    (userAuth?.email ? userAuth.email.split('@')[0] : null) ||
    `UID-${userId.slice(0, 8)}`;

  const cleanName = `User ID: ${username}`;
  const displayName = `${cleanName} (${bn ? 'প্রোফাইল নেই' : 'No Profile'})`;

  return {
    displayName,
    cleanName,
    tier: 'user_id',
  };
}

/**
 * Synchronously formats collector display using the 3-tier formula
 */
export function formatUserCollectorDisplay(params: {
  staffName?: string | null;
  staffDesignation?: string | null;
  profileName?: string | null;
  email?: string | null;
  username?: string | null;
  userId?: string | null;
  bn?: boolean;
  withDesignation?: boolean;
}): {
  displayName: string;
  cleanName: string;
  tier: 'staff' | 'profile' | 'user_id';
} {
  const bn = params.bn ?? true;

  // Tier 1: Staff Profile
  if (params.staffName && params.staffName.trim()) {
    const clean = cleanRoleSuffix(params.staffName);
    const des = params.staffDesignation ? ` (${params.staffDesignation})` : '';
    return {
      displayName: params.withDesignation !== false && des ? `${clean}${des}` : clean,
      cleanName: clean,
      tier: 'staff',
    };
  }

  // Tier 2: User Profile
  if (params.profileName && params.profileName.trim()) {
    const clean = cleanRoleSuffix(params.profileName);
    return {
      displayName: clean,
      cleanName: clean,
      tier: 'profile',
    };
  }

  // Tier 3: User ID / Username (No Profile)
  const uid =
    params.username ||
    (params.email ? params.email.split('@')[0] : '') ||
    (params.userId ? `UID-${params.userId.slice(0, 8)}` : (bn ? 'ইউজার' : 'User'));

  const cleanName = `User ID: ${uid}`;
  return {
    displayName: `${cleanName} (${bn ? 'প্রোফাইল বিহীন' : 'No Profile'})`,
    cleanName,
    tier: 'user_id',
  };
}

/**
 * Safely updates payment record, falling back to storing fields in `notes`
 * if the remote database does not yet have `collected_by` or `rejection_reason` columns.
 */
export async function updatePaymentSafely({
  id,
  status,
  rejectionReason,
  collectorName,
  notes,
  amount,
  paymentMethod,
}: {
  id: string;
  status: string;
  rejectionReason?: string | null;
  collectorName?: string | null;
  notes?: string | null;
  amount?: number;
  paymentMethod?: string | null;
}) {
  let combinedNotes = notes || '';

  if (collectorName && !combinedNotes.includes('আদায়কারী:')) {
    combinedNotes = `আদায়কারী: ${collectorName} | ${combinedNotes}`.trim();
  }

  if (rejectionReason) {
    // Remove previous rejection tag if any, then append new
    combinedNotes = combinedNotes.replace(/\[প্রত্যাখ্যানের কারণ\]:[^|\n]+/g, '').trim();
    combinedNotes = `${combinedNotes} | [প্রত্যাখ্যানের কারণ]: ${rejectionReason}`.trim();
  } else if (status === 'pending' || status === 'success') {
    // If resubmitted or approved, clean up rejection tag
    combinedNotes = combinedNotes.replace(/\[প্রত্যাখ্যানের কারণ\]:[^|\n]+/g, '').trim();
  }

  const payload: Record<string, any> = {
    status,
    notes: combinedNotes,
    updated_at: new Date().toISOString(),
  };

  if (amount !== undefined) payload.amount = amount;
  if (paymentMethod !== undefined) payload.payment_method = paymentMethod;
  if (rejectionReason !== undefined) payload.rejection_reason = rejectionReason;
  if (collectorName !== undefined) payload.collected_by = collectorName;

  // Try update with dedicated columns
  let { error } = await supabase.from('payments').update(payload).eq('id', id);

  // If column error occurs (schema cache mismatch on remote DB), strip the new columns and update notes
  if (error && error.message?.includes('column')) {
    delete payload.rejection_reason;
    delete payload.collected_by;
    const res = await supabase.from('payments').update(payload).eq('id', id);
    error = res.error;
  }

  if (error) throw error;
  return true;
}
