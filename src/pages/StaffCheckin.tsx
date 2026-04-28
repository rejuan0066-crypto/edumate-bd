import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertCircle, UserCheck, LogIn, LogOut, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

const StaffCheckin = () => {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [staffIdInput, setStaffIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; action: string; time: string } | null>(null);
  const [error, setError] = useState('');

  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const handleCheckin = async () => {
    if (!staffIdInput.trim()) { setError('স্টাফ আইডি দিন'); return; }
    setLoading(true);
    setError('');

    try {
      const { data: staff, error: sErr } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, staff_id')
        .eq('staff_id', staffIdInput.trim())
        .eq('status', 'active')
        .maybeSingle();

      if (sErr || !staff) { setError('স্টাফ পাওয়া যায়নি / Staff not found'); setLoading(false); return; }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const { data: existing } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', dateParam)
        .eq('entity_type', 'staff')
        .eq('entity_id', staff.id)
        .eq('shift', 'full_day')
        .maybeSingle();

      if (existing) {
        if (!existing.check_out_time) {
          await supabase.from('attendance_records').update({ check_out_time: timeStr }).eq('id', existing.id);
          setResult({ name: staff.name_bn || staff.name_en || '-', action: 'checkout', time: timeStr });
        } else {
          setError('ইতিমধ্যে চেক-ইন ও চেক-আউট হয়েছে');
          setResult({ name: staff.name_bn || staff.name_en || '-', action: 'already', time: existing.check_in_time || '' });
        }
      } else {
        await supabase.from('attendance_records').insert({
          attendance_date: dateParam,
          entity_type: 'staff',
          entity_id: staff.id,
          shift: 'full_day',
          status: 'present',
          check_in_time: timeStr,
        });
        setResult({ name: staff.name_bn || staff.name_en || '-', action: 'checkin', time: timeStr });
      }
    } catch (err) {
      console.error(err);
      setError('সমস্যা হয়েছে / Error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => { setResult(null); setStaffIdInput(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-sm w-full shadow-xl">
        <CardHeader className="text-center pb-2">
          {institution?.logo_url && <img src={institution.logo_url} alt="logo" className="h-12 mx-auto mb-2" />}
          <CardTitle className="text-lg">{institution?.name || ''}</CardTitle>
          <Badge className="mt-2 bg-emerald-100 text-emerald-700">
            <UserCheck className="h-3 w-3 mr-1" />স্টাফ উপস্থিতি
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">তারিখ: {dateParam}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {result ? (
            <div className={`text-center py-6 space-y-3 rounded-xl ${
              result.action === 'checkin' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
              result.action === 'checkout' ? 'bg-blue-50 dark:bg-blue-900/20' :
              'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <CheckCircle2 className={`h-16 w-16 mx-auto animate-bounce ${
                result.action === 'checkin' ? 'text-emerald-500' :
                result.action === 'checkout' ? 'text-blue-500' : 'text-yellow-500'
              }`} />
              <h3 className="text-xl font-bold">{result.name}</h3>
              <div className="flex items-center justify-center gap-2">
                {result.action === 'checkin' ? (
                  <Badge className="bg-emerald-100 text-emerald-700"><LogIn className="h-3 w-3 mr-1" />চেক-ইন</Badge>
                ) : result.action === 'checkout' ? (
                  <Badge className="bg-blue-100 text-blue-700"><LogOut className="h-3 w-3 mr-1" />চেক-আউট</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700">ইতিমধ্যে সম্পন্ন</Badge>
                )}
                <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{result.time}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">৫ সেকেন্ডে রিসেট হবে...</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <UserCheck className="h-10 w-10 mx-auto text-emerald-600 mb-2" />
                <h2 className="text-lg font-bold">উপস্থিতি দিন</h2>
                <p className="text-xs text-muted-foreground">আপনার স্টাফ আইডি নম্বর লিখুন</p>
              </div>

              <Input
                value={staffIdInput}
                onChange={e => { setStaffIdInput(e.target.value); setError(''); }}
                placeholder="স্টাফ আইডি / Staff ID"
                className="text-center text-lg h-12"
                onKeyDown={e => e.key === 'Enter' && handleCheckin()}
                autoFocus
              />

              {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

              <Button className="w-full h-12 text-lg" onClick={handleCheckin} disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                উপস্থিতি নিশ্চিত করুন
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffCheckin;
