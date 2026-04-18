// Auto-grades MCQ & True/False, leaves short_answer pending; finalizes attempt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AnswerInput {
  question_id: string;
  answer: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const { attempt_id, answers, auto_submitted } = body as {
      attempt_id: string;
      answers: AnswerInput[];
      auto_submitted?: boolean;
    };

    if (!attempt_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: 'Missing attempt_id or answers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Load attempt + verify state
    const { data: attempt, error: aErr } = await admin
      .from('online_exam_attempts')
      .select('id, exam_id, status, started_at, expires_at')
      .eq('id', attempt_id)
      .maybeSingle();

    if (aErr || !attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'in_progress') {
      return new Response(JSON.stringify({ error: 'Already submitted', status: attempt.status }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Load questions for grading
    const { data: questions, error: qErr } = await admin
      .from('online_exam_questions')
      .select('id, question_type, correct_answer, marks, negative_marks')
      .eq('exam_id', attempt.exam_id);
    if (qErr) throw qErr;

    const qMap = new Map<string, any>();
    (questions || []).forEach((q) => qMap.set(q.id, q));

    // 3. Grade each answer
    let autoScore = 0;
    let hasManual = false;
    const rows = [] as any[];

    const norm = (v: any) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

    for (const a of answers) {
      const q = qMap.get(a.question_id);
      if (!q) continue;

      let isCorrect: boolean | null = null;
      let awarded = 0;
      let manual = false;

      if (q.question_type === 'mcq') {
        const correct = q.correct_answer;
        // correct_answer expected: string key OR array of keys
        const userAns = a.answer;
        if (Array.isArray(correct)) {
          const cs = correct.map(norm).sort();
          const us = (Array.isArray(userAns) ? userAns : [userAns]).map(norm).sort();
          isCorrect = JSON.stringify(cs) === JSON.stringify(us);
        } else {
          isCorrect = norm(correct) === norm(userAns);
        }
        awarded = isCorrect ? Number(q.marks) : -Number(q.negative_marks || 0);
      } else if (q.question_type === 'true_false') {
        isCorrect = norm(q.correct_answer) === norm(a.answer);
        awarded = isCorrect ? Number(q.marks) : -Number(q.negative_marks || 0);
      } else {
        // short_answer: needs manual review
        manual = false;
        isCorrect = null;
        awarded = 0;
        hasManual = true;
      }

      autoScore += awarded;

      rows.push({
        attempt_id,
        question_id: a.question_id,
        answer: a.answer ?? null,
        is_correct: isCorrect,
        awarded_marks: awarded,
        manually_graded: manual,
      });
    }

    // Don't allow negative total from negative marking
    if (autoScore < 0) autoScore = 0;

    // 4. Upsert answers (delete prior + insert fresh for idempotency)
    await admin.from('online_exam_answers').delete().eq('attempt_id', attempt_id);
    if (rows.length) {
      const { error: insErr } = await admin.from('online_exam_answers').insert(rows);
      if (insErr) throw insErr;
    }

    // 5. Update attempt
    const startedAt = new Date(attempt.started_at).getTime();
    const submittedAt = Date.now();
    const timeTaken = Math.round((submittedAt - startedAt) / 1000);

    const newStatus = auto_submitted ? 'auto_submitted' : 'submitted';

    const { error: upErr } = await admin
      .from('online_exam_attempts')
      .update({
        status: newStatus,
        submitted_at: new Date(submittedAt).toISOString(),
        time_taken_seconds: timeTaken,
        auto_graded_score: autoScore,
        total_score: autoScore, // manual added later
      })
      .eq('id', attempt_id);

    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({
        success: true,
        auto_graded_score: autoScore,
        has_manual_review: hasManual,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('submit-online-exam error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
