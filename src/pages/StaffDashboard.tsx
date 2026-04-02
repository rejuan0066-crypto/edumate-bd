import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LanguageToggle from '@/components/LanguageToggle';
import {
  User, Wallet, CalendarDays, Bell, LogOut, GraduationCap,
  Phone, MapPin, Briefcase, Calendar, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { format } from 'date-fns';

const StaffDashboard = () => {
  const { language } = useLanguage();
  const { user, signOut, role } = useAuth();
  const bn = language === 'bn';
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Get staff record linked to current user — auto-create if missing
  const { data: staffRecord, isLoading: staffLoading } = useQuery({
    queryKey: ['my-staff-record', user?.id],
    queryFn: async () => {
      // First try to find existing staff record
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      
      if (data) return data;

      // No staff record found — auto-create via edge function
      const { data: result, error: fnError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'ensure_staff' },
      });
      
      if (fnError || !result?.success) {
        console.error('Failed to auto-create staff profile:', fnError || result?.error);
        return null;
      }

      // Re-fetch the newly created staff record
      const { data: newData } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      return newData;
    },
    enabled: !!user?.id,
  });

  // Get profile as fallback
  const { data: profileRecord } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Salary records
  const { data: salaryRecords = [] } = useQuery({
    queryKey: ['my-salary', staffRecord?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_records')
        .select('*')
        .eq('staff_id', staffRecord!.id)
        .order('month_year', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    enabled: !!staffRecord?.id,
  });

  // Attendance records for selected month
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['my-attendance', staffRecord?.id, selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(+year, +month, 0).getDate()}`;
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_id', staffRecord!.id)
        .eq('entity_type', 'staff')
        .eq('shift', 'full_day')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!staffRecord?.id,
  });

  // Notices
  const { data: notices = [] } = useQuery({
    queryKey: ['published-notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Institution info
  const { data: institution } = useQuery({
    queryKey: ['institution-info'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
  const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateDays = attendanceRecords.filter(r => r.status === 'late').length;

  const statusBadge = (status: string) => {
    const labels: Record<string, { bn: string; en: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
      present: { bn: 'উপস্থিত', en: 'Present', variant: 'default' },
      absent: { bn: 'অনুপস্থিত', en: 'Absent', variant: 'destructive' },
      late: { bn: 'বিলম্ব', en: 'Late', variant: 'secondary' },
      leave: { bn: 'ছুটি', en: 'Leave', variant: 'outline' },
    };
    const l = labels[status] || { bn: status, en: status, variant: 'outline' as const };
    return <Badge variant={l.variant}>{bn ? l.bn : l.en}</Badge>;
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {institution?.logo_url ? (
              <img src={institution.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">
                {bn ? (institution?.name || 'প্রতিষ্ঠান') : (institution?.name_en || 'Institution')}
              </h1>
              <p className="text-xs text-muted-foreground">
                {bn ? (role === 'teacher' ? 'শিক্ষক প্যানেল' : 'স্টাফ প্যানেল') : (role === 'teacher' ? 'Teacher Panel' : 'Staff Panel')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              {bn ? 'লগআউট' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="w-full grid h-auto grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 py-2 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{bn ? 'প্রোফাইল' : 'Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex items-center gap-1.5 py-2 text-xs sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{bn ? 'বেতন' : 'Salary'}</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 py-2 text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{bn ? 'হাজিরা' : 'Attendance'}</span>
            </TabsTrigger>
            <TabsTrigger value="notices" className="flex items-center gap-1.5 py-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{bn ? 'নোটিশ' : 'Notices'}</span>
            </TabsTrigger>
          </TabsList>


          {/* Profile Tab */}
          <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {bn ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {staffRecord.photo_url && (
                      <img
                        src={staffRecord.photo_url}
                        alt=""
                        className="w-28 h-28 rounded-lg object-cover border"
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      {[
                        { icon: User, label: bn ? 'নাম (বাংলা)' : 'Name (Bangla)', value: staffRecord.name_bn },
                        { icon: User, label: bn ? 'নাম (ইংরেজি)' : 'Name (English)', value: staffRecord.name_en },
                        { icon: Phone, label: bn ? 'ফোন' : 'Phone', value: staffRecord.phone },
                        { icon: Briefcase, label: bn ? 'পদবি' : 'Designation', value: staffRecord.designation },
                        { icon: Briefcase, label: bn ? 'বিভাগ' : 'Department', value: staffRecord.department },
                        { icon: Calendar, label: bn ? 'যোগদানের তারিখ' : 'Joining Date', value: staffRecord.joining_date },
                        { icon: MapPin, label: bn ? 'ঠিকানা' : 'Address', value: staffRecord.address },
                        { icon: User, label: bn ? 'জাতীয় পরিচয়পত্র' : 'NID', value: staffRecord.nid },
                        { icon: Briefcase, label: bn ? 'কর্মসংস্থান ধরন' : 'Employment Type', value: staffRecord.employment_type },
                        { icon: User, label: bn ? 'ধর্ম' : 'Religion', value: staffRecord.religion },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-sm font-medium text-foreground">{item.value || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          {/* Salary Tab */}
          <TabsContent value="salary">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    {bn ? 'বেতন স্লিপ' : 'Salary Slips'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salaryRecords.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {bn ? 'কোনো বেতন রেকর্ড পাওয়া যায়নি' : 'No salary records found'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {salaryRecords.map(record => (
                        <Card key={record.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-foreground">{record.month_year}</h3>
                              <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                                {record.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : (bn ? 'পেন্ডিং' : 'Pending')}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'মূল বেতন' : 'Base Salary'}</p>
                                <p className="font-medium">৳{record.base_salary}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'বোনাস' : 'Bonus'}</p>
                                <p className="font-medium">৳{record.bonus || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'ওভারটাইম' : 'Overtime'}</p>
                                <p className="font-medium">৳{record.overtime || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'বিলম্ব কর্তন' : 'Late Deduction'}</p>
                                <p className="font-medium text-destructive">-৳{record.late_deduction || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'অনুপস্থিতি কর্তন' : 'Absence Deduction'}</p>
                                <p className="font-medium text-destructive">-৳{record.absence_deduction || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">{bn ? 'অন্যান্য কর্তন' : 'Other Deductions'}</p>
                                <p className="font-medium text-destructive">-৳{(record.advance_deduction || 0) + (record.other_deduction || 0)}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t flex items-center justify-between">
                              <span className="text-sm font-semibold">{bn ? 'নিট বেতন' : 'Net Salary'}</span>
                              <span className="text-lg font-bold text-primary">৳{record.net_salary}</span>
                            </div>
                            {record.remarks && (
                              <p className="text-xs text-muted-foreground mt-2">{bn ? 'মন্তব্য' : 'Remarks'}: {record.remarks}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      {bn ? 'হাজিরা রিপোর্ট' : 'Attendance Report'}
                    </CardTitle>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-sm bg-background"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{presentDays}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'উপস্থিত' : 'Present'}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-700 dark:text-red-400">{absentDays}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'অনুপস্থিত' : 'Absent'}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{lateDays}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'বিলম্ব' : 'Late'}</p>
                    </div>
                  </div>

                  {attendanceRecords.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {bn ? 'এই মাসের কোনো হাজিরা রেকর্ড নেই' : 'No attendance records for this month'}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                          <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                          <TableHead>{bn ? 'চেক-ইন' : 'Check In'}</TableHead>
                          <TableHead>{bn ? 'চেক-আউট' : 'Check Out'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRecords.map(record => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.attendance_date}</TableCell>
                            <TableCell>{statusBadge(record.status)}</TableCell>
                            <TableCell>{record.check_in_time || '—'}</TableCell>
                            <TableCell>{record.check_out_time || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          {/* Notices Tab */}
          <TabsContent value="notices">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {bn ? 'নোটিশ ও ঘোষণা' : 'Notices & Announcements'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {bn ? 'কোনো নোটিশ নেই' : 'No notices found'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notices.map(notice => (
                      <div key={notice.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {bn ? (notice.title_bn || notice.title) : notice.title}
                            </h3>
                            {(bn ? notice.content_bn || notice.content : notice.content) && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {bn ? (notice.content_bn || notice.content) : notice.content}
                              </p>
                            )}
                          </div>
                          {notice.category && (
                            <Badge variant="outline" className="shrink-0 text-xs">{notice.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notice.published_at ? format(new Date(notice.published_at), 'dd/MM/yyyy') : '—'}
                          </span>
                          {notice.attachment_url && (
                            <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {bn ? 'সংযুক্তি' : 'Attachment'}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StaffDashboard;
