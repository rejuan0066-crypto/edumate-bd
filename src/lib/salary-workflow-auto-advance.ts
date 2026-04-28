import { supabase } from '@/integrations/supabase/client';

type Stage = 'draft' | 'pending_verification' | 'verified' | 'pending_approval' | 'approved' | 'paid';

interface DefaultActor {
  staff_id: string;
  display_name: string;
  designation: string | null;
}

export interface AutoAdvanceContext {
  monthYear: string;
  records: any[];
  userId: string | null;
  preparerName: string;
  preparerRole: string; // BN/EN label
  verifier: DefaultActor | null;
  approver: DefaultActor | null;
  treasurer: DefaultActor | null;
}

export interface AutoAdvanceResult {
  monthYear: string;
  ok: boolean;
  finalStage: Stage;
  steps: Stage[];
  error?: string;
}

const STAGE_ORDER: Stage[] = ['draft', 'pending_verification', 'verified', 'pending_approval', 'approved', 'paid'];

function lowestStage(records: any[]): Stage {
  if (!records.length) return 'draft';
  const stages = records.map((r: any) => (r.workflow_stage as Stage) || 'draft');
  for (const s of STAGE_ORDER) {
    if (stages.includes(s)) return s;
  }
  return 'draft';
}

/**
 * Auto-advance an entire month's salary sheet through Prepare→Verify→Approve→Paid
 * starting from whichever stage it currently sits at. Uses the provided default
 * verifier/approver/treasurer actors. Skips records already paid for status update.
 */
export async function autoAdvanceMonth(ctx: AutoAdvanceContext): Promise<AutoAdvanceResult> {
  const { monthYear, records, userId, preparerName, preparerRole, verifier, approver, treasurer } = ctx;
  const result: AutoAdvanceResult = { monthYear, ok: true, finalStage: 'draft', steps: [] };

  if (!records.length) {
    return { ...result, ok: false, error: 'No salary records' };
  }

  if (!verifier) return { ...result, ok: false, error: 'No default verifier configured' };
  if (!approver) return { ...result, ok: false, error: 'No default approver configured' };
  if (!treasurer) return { ...result, ok: false, error: 'No default treasurer configured' };

  const ids = records.map((r: any) => r.id);
  let stage = lowestStage(records);

  const writeHistory = async (toStage: Stage, action: string, target?: DefaultActor | null, notes?: string) => {
    const rows = records.map((r: any) => ({
      salary_record_id: r.id,
      month_year: monthYear,
      staff_id: r.staff_id,
      from_stage: (r.workflow_stage as Stage) || stage,
      to_stage: toStage,
      action,
      actor_user_id: userId,
      actor_name: preparerName,
      actor_role: preparerRole,
      target_staff_id: target?.staff_id || null,
      target_name: target?.display_name || null,
      notes: notes || null,
    }));
    if (rows.length) {
      await supabase.from('salary_workflow_history').insert(rows);
    }
  };

  try {
    const now = () => new Date().toISOString();

    // Step 1: draft → pending_verification (stamp preparer + verifier)
    if (stage === 'draft') {
      const { error } = await supabase.from('salary_records').update({
        prepared_by: userId,
        prepared_by_name: preparerName,
        prepared_by_role: preparerRole,
        prepared_at: now(),
        verifier_staff_id: verifier.staff_id,
        workflow_stage: 'pending_verification',
        workflow_notes: 'Auto-advanced via bulk action',
      }).in('id', ids);
      if (error) throw error;
      await writeHistory('pending_verification', 'sent_to_verifier', verifier, 'Auto-advanced');
      result.steps.push('pending_verification');
      stage = 'pending_verification';
    }

    // Step 2: pending_verification → verified
    if (stage === 'pending_verification') {
      const { error } = await supabase.from('salary_records').update({
        verified_by: userId,
        verified_by_name: verifier.display_name,
        verified_by_role: verifier.designation || 'যাচাইকারী',
        verified_at: now(),
        workflow_stage: 'verified',
      }).in('id', ids);
      if (error) throw error;
      await writeHistory('verified', 'verified', verifier, 'Auto-advanced');
      result.steps.push('verified');
      stage = 'verified';
    }

    // Step 3: verified → pending_approval (assign approver)
    if (stage === 'verified') {
      const { error } = await supabase.from('salary_records').update({
        approver_staff_id: approver.staff_id,
        workflow_stage: 'pending_approval',
      }).in('id', ids);
      if (error) throw error;
      await writeHistory('pending_approval', 'sent_to_approver', approver, 'Auto-advanced');
      result.steps.push('pending_approval');
      stage = 'pending_approval';
    }

    // Step 4: pending_approval → approved
    if (stage === 'pending_approval') {
      const { error } = await supabase.from('salary_records').update({
        approved_by: userId,
        approved_by_name: approver.display_name,
        approved_by_role: approver.designation || 'অনুমোদনকারী',
        approved_at: now(),
        workflow_stage: 'approved',
      }).in('id', ids);
      if (error) throw error;
      await writeHistory('approved', 'approved', approver, 'Auto-advanced');
      result.steps.push('approved');
      stage = 'approved';
    }

    // Step 5: approved → paid (mark only unpaid records as paid)
    if (stage === 'approved') {
      const unpaidIds = records.filter((r: any) => r.status !== 'paid').map((r: any) => r.id);
      if (unpaidIds.length) {
        const { error: e1 } = await supabase.from('salary_records').update({
          status: 'paid',
          paid_at: now(),
          paid_by: userId,
          paid_by_name: treasurer.display_name,
          paid_by_role: treasurer.designation || 'কোষাধ্যক্ষ',
          workflow_stage: 'paid',
        }).in('id', unpaidIds);
        if (e1) throw e1;
      }
      // Also stamp workflow_stage on already-paid records for consistency
      const paidIds = records.filter((r: any) => r.status === 'paid').map((r: any) => r.id);
      if (paidIds.length) {
        await supabase.from('salary_records').update({
          workflow_stage: 'paid',
          paid_by_name: treasurer.display_name,
          paid_by_role: treasurer.designation || 'কোষাধ্যক্ষ',
        }).in('id', paidIds);
      }
      await writeHistory('paid', 'marked_paid', treasurer, 'Auto-advanced');
      result.steps.push('paid');
      stage = 'paid';
    }

    result.finalStage = stage;
    return result;
  } catch (e: any) {
    return { ...result, ok: false, error: e?.message || 'Auto-advance failed', finalStage: stage };
  }
}

/** Pick the first default-marked active actor for a role; falls back to first active. */
export function pickDefaultActor(settings: any[], role: 'verifier' | 'approver' | 'treasurer'): DefaultActor | null {
  const inRole = settings.filter((s: any) => s.role === role && s.is_active);
  if (!inRole.length) return null;
  const def = inRole.find((s: any) => s.is_default) || inRole[0];
  return { staff_id: def.staff_id, display_name: def.display_name, designation: def.designation };
}
