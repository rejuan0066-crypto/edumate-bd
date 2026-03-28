import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Database, Download, FileJson, FileSpreadsheet, HardDrive,
  Loader2, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

const TABLES = [
  { key: 'students', labelBn: 'শিক্ষার্থী', labelEn: 'Students', icon: '🎓' },
  { key: 'staff', labelBn: 'স্টাফ', labelEn: 'Staff', icon: '👨‍🏫' },
  { key: 'divisions', labelBn: 'বিভাগ', labelEn: 'Divisions', icon: '📂' },
  { key: 'classes', labelBn: 'শ্রেণী', labelEn: 'Classes', icon: '🏫' },
  { key: 'subjects', labelBn: 'বিষয়', labelEn: 'Subjects', icon: '📖' },
  { key: 'fee_types', labelBn: 'ফি ধরন', labelEn: 'Fee Types', icon: '💰' },
  { key: 'fee_payments', labelBn: 'ফি পেমেন্ট', labelEn: 'Fee Payments', icon: '💳' },
  { key: 'expenses', labelBn: 'খরচ', labelEn: 'Expenses', icon: '📊' },
  { key: 'expense_projects', labelBn: 'খরচ প্রজেক্ট', labelEn: 'Expense Projects', icon: '📁' },
  { key: 'expense_categories', labelBn: 'খরচ ক্যাটাগরি', labelEn: 'Expense Categories', icon: '🏷️' },
  { key: 'deposits', labelBn: 'জমা', labelEn: 'Deposits', icon: '🏦' },
  { key: 'donors', labelBn: 'দাতা', labelEn: 'Donors', icon: '❤️' },
  { key: 'exams', labelBn: 'পরীক্ষা', labelEn: 'Exams', icon: '📝' },
  { key: 'results', labelBn: 'ফলাফল', labelEn: 'Results', icon: '🏆' },
  { key: 'notices', labelBn: 'নোটিশ', labelEn: 'Notices', icon: '📢' },
  { key: 'attendance_records', labelBn: 'হাজিরা', labelEn: 'Attendance', icon: '📋' },
  { key: 'institutions', labelBn: 'প্রতিষ্ঠান', labelEn: 'Institutions', icon: '🏛️' },
  { key: 'website_settings', labelBn: 'ওয়েবসাইট সেটিংস', labelEn: 'Website Settings', icon: '⚙️' },
  { key: 'notifications', labelBn: 'নোটিফিকেশন', labelEn: 'Notifications', icon: '🔔' },
];

const AdminBackup = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [loading, setLoading] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const downloadBackup = async (table?: string, format: 'json' | 'csv' = 'json') => {
    const loadKey = table ? `${table}-${format}` : `full-${format}`;
    setLoading(loadKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const params = new URLSearchParams({ format });
      if (table) params.set('table', table);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/database-backup?${params}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Backup failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = table
        ? `${table}_backup_${date}.${format}`
        : `full_backup_${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString(bn ? 'bn-BD' : 'en-US'));
      toast({
        title: bn ? 'ব্যাকআপ সফল' : 'Backup Successful',
        description: bn
          ? `${table || 'সম্পূর্ণ ডাটাবেস'} ব্যাকআপ ডাউনলোড হয়েছে`
          : `${table || 'Full database'} backup downloaded`,
      });
    } catch (error: any) {
      toast({
        title: bn ? 'ব্যাকআপ ব্যর্থ' : 'Backup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              {bn ? 'ব্যাকআপ ও ডেটা এক্সপোর্ট' : 'Backup & Data Export'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'পুরো ডাটাবেস বা পৃথক টেবিলের ব্যাকআপ ডাউনলোড করুন' : 'Download full database or individual table backups'}
            </p>
          </div>
          {lastBackup && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {bn ? 'সর্বশেষ:' : 'Last:'} {lastBackup}
            </Badge>
          )}
        </div>

        {/* Full Backup Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <HardDrive className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{bn ? 'সম্পূর্ণ ডাটাবেস ব্যাকআপ' : 'Full Database Backup'}</h2>
                <p className="text-sm text-muted-foreground">
                  {bn ? `সকল ${TABLES.length}টি টেবিলের ডেটা একসাথে ডাউনলোড করুন` : `Download all ${TABLES.length} tables data at once`}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => downloadBackup(undefined, 'json')}
                disabled={!!loading}
              >
                {loading === 'full-json' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {bn ? 'সম্পূর্ণ ব্যাকআপ (JSON)' : 'Full Backup (JSON)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Individual Tables */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
            {bn ? 'পৃথক টেবিল এক্সপোর্ট' : 'Individual Table Export'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TABLES.map(t => (
              <Card key={t.key} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{bn ? t.labelBn : t.labelEn}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{t.key}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => downloadBackup(t.key, 'json')}
                        disabled={!!loading}
                        title="JSON"
                      >
                        {loading === `${t.key}-json` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => downloadBackup(t.key, 'csv')}
                        disabled={!!loading}
                        title="CSV"
                      >
                        {loading === `${t.key}-csv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{bn ? 'গুরুত্বপূর্ণ তথ্য' : 'Important Notes'}</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>{bn ? 'JSON ফরম্যাটে সম্পূর্ণ ডেটা স্ট্রাকচার সংরক্ষিত থাকে' : 'JSON format preserves complete data structure'}</li>
                  <li>{bn ? 'CSV ফরম্যাট এক্সেলে খুলতে সুবিধাজনক' : 'CSV format is convenient for Excel'}</li>
                  <li>{bn ? 'নিয়মিত ব্যাকআপ নেওয়া উচিত' : 'Regular backups are recommended'}</li>
                  <li>{bn ? 'ব্যাকআপ ফাইল নিরাপদ স্থানে সংরক্ষণ করুন' : 'Store backup files in a secure location'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBackup;
