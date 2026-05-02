import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronOrAdmin } from "../_shared/cron-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // AUTHZ: cron secret OR super_admin/admin JWT
  const guard = await requireCronOrAdmin(req, { secretKey: "cron_secret" });
  if (!guard.ok) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get today's date or from request body
    let targetDate: string;
    try {
      const body = await req.json();
      targetDate = body.date || new Date().toISOString().split("T")[0];
    } catch {
      targetDate = new Date().toISOString().split("T")[0];
    }

    // Fetch all student attendance for the date
    const { data: attendanceRecords, error: attError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("attendance_date", targetDate)
      .eq("entity_type", "student")
      .eq("shift", "full_day");

    if (attError) throw attError;

    // Fetch all active students
    const { data: students, error: studError } = await supabase
      .from("students")
      .select("id, name_bn, name_en, student_id, guardian_phone, phone, division_id")
      .eq("status", "active");

    if (studError) throw studError;

    // Fetch classes for grouping
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name, name_bn, division_id")
      .eq("is_active", true);

    // Build summary per class
    const classSummaries: Record<string, { name: string; name_bn: string; total: number; present: number; absent: number; late: number; excused: number; medical: number }> = {};
    const absentStudents: Array<{ student: any; className: string }> = [];

    for (const cls of (classes || [])) {
      const classStudents = (students || []).filter((s: any) => s.division_id === cls.division_id);
      const classAttendance = (attendanceRecords || []).filter((a: any) =>
        classStudents.some((s: any) => s.id === a.entity_id)
      );

      const present = classAttendance.filter((a: any) => a.status === "present").length;
      const absent = classAttendance.filter((a: any) => a.status === "absent").length;
      const late = classAttendance.filter((a: any) => a.status === "late").length;
      const excused = classAttendance.filter((a: any) => a.status === "excused").length;
      const medical = classAttendance.filter((a: any) => a.status === "medical").length;

      classSummaries[cls.id] = {
        name: cls.name,
        name_bn: cls.name_bn,
        total: classStudents.length,
        present,
        absent,
        late,
        excused,
        medical,
      };

      // Find absent students with guardian phone
      const absentIds = classAttendance
        .filter((a: any) => a.status === "absent")
        .map((a: any) => a.entity_id);

      for (const sid of absentIds) {
        const student = classStudents.find((s: any) => s.id === sid);
        if (student && (student.guardian_phone || student.phone)) {
          absentStudents.push({ student, className: cls.name_bn });
        }
      }
    }

    // Create guardian notifications for absent students
    const notifications = absentStudents.map((item) => ({
      notification_type: "daily_summary",
      channel: "sms",
      subject: `অনুপস্থিতি বিজ্ঞপ্তি - ${item.student.name_bn}`,
      message: `সম্মানিত অভিভাবক, আপনার সন্তান ${item.student.name_bn} (আইডি: ${item.student.student_id}) তারিখ ${targetDate} তে ${item.className} শ্রেণীতে অনুপস্থিত ছিল।`,
      status: "pending",
      recipients_count: 1,
      recipient_filter: {
        student_id: item.student.id,
        guardian_phone: item.student.guardian_phone || item.student.phone,
        date: targetDate,
        type: "daily_summary",
      },
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from("guardian_notifications")
        .insert(notifications);
      if (notifError) {
        console.error("Failed to insert notifications:", notifError);
      }
    }

    // Create internal admin notification with summary
    const totalPresent = Object.values(classSummaries).reduce((s, c) => s + c.present, 0);
    const totalAbsent = Object.values(classSummaries).reduce((s, c) => s + c.absent, 0);
    const totalStudents = Object.values(classSummaries).reduce((s, c) => s + c.total, 0);

    await supabase.from("notifications").insert({
      title: `Daily Attendance Summary - ${targetDate}`,
      title_bn: `দৈনিক উপস্থিতি সারসংক্ষেপ - ${targetDate}`,
      message: `Present: ${totalPresent}/${totalStudents} | Absent: ${totalAbsent} | Notifications: ${notifications.length}`,
      message_bn: `উপস্থিত: ${totalPresent}/${totalStudents} | অনুপস্থিত: ${totalAbsent} | বিজ্ঞপ্তি: ${notifications.length}`,
      type: "info",
      category: "attendance",
      link: "/admin/attendance?tab=student",
    });

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        summary: classSummaries,
        notifications_created: notifications.length,
        totals: { total: totalStudents, present: totalPresent, absent: totalAbsent },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("Daily attendance summary error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
