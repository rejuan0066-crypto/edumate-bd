import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitPayload {
  attemptId: string;
  answers: Record<string, string>;
  durationSeconds: number;
  applicantPhone: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { attemptId, answers, durationSeconds, applicantPhone }: SubmitPayload = await req.json();

    if (!attemptId || typeof attemptId !== 'string' || !applicantPhone || typeof answers !== 'object' || answers === null) {
      return new Response(JSON.stringify({ error: 'attemptId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load the attempt to get test_id
    const { data: attempt, error: aErr } = await supabase
      .from('admission_test_attempts')
      .select('id, test_id, status, applicant_phone')
      .eq('id', attemptId)
      .maybeSingle();

    if (aErr || !attempt || String(attempt.applicant_phone ?? '').trim() !== String(applicantPhone).trim()) {
      return new Response(JSON.stringify({ error: 'Attempt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (attempt.status === 'submitted') {
      return new Response(JSON.stringify({ error: 'Already submitted' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load test (for total_marks, pass_mark)
    const { data: test } = await supabase
      .from('admission_tests')
      .select('total_marks, pass_mark')
      .eq('id', attempt.test_id)
      .maybeSingle();

    // Load all questions and correct answers
    const { data: questions } = await supabase
      .from('admission_test_questions')
      .select('id, correct_answer, marks')
      .eq('test_id', attempt.test_id);

    const totalQuestions = questions?.length ?? 0;
    let score = 0;
    let correctCount = 0;

    questions?.forEach((q: any) => {
      const userAns = (answers[q.id] ?? '').toString().trim();
      if (userAns && userAns === q.correct_answer.toString().trim()) {
        score += q.marks ?? 1;
        correctCount += 1;
      }
    });

    const totalMarks = test?.total_marks ?? totalQuestions;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passMark = test?.pass_mark ?? 40;
    const passed = score >= passMark;

    // Update the attempt with the final, server-calculated score
    const { error: uErr } = await supabase
      .from('admission_test_attempts')
      .update({
        answers,
        score,
        total_questions: totalQuestions,
        correct_count: correctCount,
        percentage: Number(percentage.toFixed(2)),
        passed,
        duration_seconds: durationSeconds,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      })
      .eq('id', attemptId)
      .neq('status', 'submitted');

    if (uErr) {
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recompute ranks for all submitted attempts of this test
    const { data: allAttempts } = await supabase
      .from('admission_test_attempts')
      .select('id, score')
      .eq('test_id', attempt.test_id)
      .eq('status', 'submitted')
      .order('score', { ascending: false });

    if (allAttempts) {
      let lastScore = -1;
      let currentRank = 0;
      const updates: Array<{ id: string; rank: number }> = [];
      allAttempts.forEach((a: any, idx: number) => {
        if (a.score !== lastScore) {
          currentRank = idx + 1;
          lastScore = a.score;
        }
        updates.push({ id: a.id, rank: currentRank });
      });

      // Bulk update ranks (one query per row, but small dataset typically)
      await Promise.all(
        updates.map((u) =>
          supabase.from('admission_test_attempts').update({ rank: u.rank }).eq('id', u.id)
        )
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        score,
        totalMarks,
        percentage: Number(percentage.toFixed(2)),
        passed,
        correctCount,
        totalQuestions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
