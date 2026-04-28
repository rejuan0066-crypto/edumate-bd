import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, QrCode, Loader2, AlertCircle, School } from 'lucide-react';
import { toast } from 'sonner';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

const AttendanceCheckin = () => {
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('class') || '';
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');

  const { data: classInfo } = useQuery({
    queryKey: ['class-checkin', classId],
    queryFn: async () => {
      if (!classId) return null;
      const { data } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('id', classId).maybeSingle();
      return data;
    },
    enabled: !!classId,
  });

  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const handleCheckin = async () => {
    if (!studentId.trim()) {
      setError('ছাত্র আইডি দিন / Enter Student ID');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Find student by student_id
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id, name_bn, name_en, student_id, division_id')
        .eq('student_id', studentId.trim())
        .eq('status', 'active')
        .maybeSingle();

      if (sErr || !student) {
        setError('ছাত্র পাওয়া যায়নি / Student not found');
        setLoading(false);
        return;
      }

      // Verify student belongs to the class's division
      if (classInfo && student.division_id !== (classInfo as any).division_id) {
        setError('এই শ্রেণীতে এই ছাত্র নেই / Student not in this class');
        setLoading(false);
        return;
      }

      // Check if already checked in
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('attendance_date', dateParam)
        .eq('entity_type', 'student')
        .eq('entity_id', student.id)
        .eq('shift', 'full_day')
        .maybeSingle();

      if (existing) {
        setStudentName(student.name_bn || student.name_en || '');
        setCheckedIn(true);
        setError('ইতিমধ্যে উপস্থিতি দেওয়া হয়েছে / Already checked in');
        setLoading(false);
        return;
      }

      // Record attendance
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const { error: insertErr } = await supabase.from('attendance_records').insert({
        attendance_date: dateParam,
        entity_type: 'student',
        entity_id: student.id,
        shift: 'full_day',
        status: 'present',
        check_in_time: timeStr,
      });

      if (insertErr) throw insertErr;

      setStudentName(student.name_bn || student.name_en || '');
      setCheckedIn(true);
      toast.success('উপস্থিতি সফল! / Check-in successful!');
    } catch (err: any) {
      console.error(err);
      setError('সমস্যা হয়েছে / Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Auto-reset after 5 seconds for next student
  useEffect(() => {
    if (checkedIn) {
      const timer = setTimeout(() => {
        setCheckedIn(false);
        setStudentId('');
        setStudentName('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [checkedIn]);

  if (!classId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-bold">Invalid QR Code</h2>
            <p className="text-sm text-muted-foreground mt-2">অনুগ্রহ করে সঠিক QR কোড স্ক্যান করুন</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-sm w-full shadow-xl">
        <CardHeader className="text-center pb-2">
          {institution?.logo_url && (
            <img src={institution.logo_url} alt="logo" className="h-12 mx-auto mb-2" />
          )}
          <CardTitle className="text-lg">{institution?.name || ''}</CardTitle>
          {classInfo && (
            <div className="mt-2">
              <Badge className="text-sm px-3 py-1 bg-primary/10 text-primary">
                <School className="h-3 w-3 mr-1" />
                {(classInfo as any).name_bn || (classInfo as any).name}
              </Badge>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">তারিখ: {dateParam}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {checkedIn ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500 animate-bounce" />
              <h3 className="text-xl font-bold text-emerald-600">{studentName}</h3>
              <p className="text-sm text-emerald-600 font-medium">
                ✅ উপস্থিতি সফলভাবে রেকর্ড হয়েছে!
              </p>
              <p className="text-xs text-muted-foreground">
                ৫ সেকেন্ডে স্বয়ংক্রিয়ভাবে রিসেট হবে...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <QrCode className="h-10 w-10 mx-auto text-primary mb-2" />
                <h2 className="text-lg font-bold">উপস্থিতি দিন</h2>
                <p className="text-xs text-muted-foreground">আপনার ছাত্র আইডি নম্বর লিখুন</p>
              </div>

              <Input
                value={studentId}
                onChange={e => { setStudentId(e.target.value); setError(''); }}
                placeholder="ছাত্র আইডি / Student ID"
                className="text-center text-lg h-12"
                onKeyDown={e => e.key === 'Enter' && handleCheckin()}
                autoFocus
              />

              {error && (
                <p className="text-sm text-destructive text-center font-medium">{error}</p>
              )}

              <Button
                className="w-full h-12 text-lg"
                onClick={handleCheckin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                উপস্থিতি নিশ্চিত করুন
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCheckin;
