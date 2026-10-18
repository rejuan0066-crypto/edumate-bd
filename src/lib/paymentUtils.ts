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
