import { useState, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Database, Download, FileJson, FileSpreadsheet, HardDrive,
  Loader2, AlertCircle, Clock, Upload, RotateCcw, CheckCircle2, XCircle, ShieldAlert
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

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<any>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState<Record<string, { success: boolean; inserted: number; error?: string }> | null>(null);

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
        { headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
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
      a.download = table ? `${table}_backup_${date}.${format}` : `full_backup_${date}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString(bn ? 'bn-BD' : 'en-US'));
      toast({ title: bn ? 'ব্যাকআপ সফল' : 'Backup Successful', description: bn ? `${table || 'সম্পূর্ণ ডাটাবেস'} ব্যাকআপ ডাউনলোড হয়েছে` : `${table || 'Full database'} backup downloaded` });
    } catch (error: any) {
      toast({ title: bn ? 'ব্যাকআপ ব্যর্থ' : 'Backup Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ title: bn ? 'অবৈধ ফাইল' : 'Invalid File', description: bn ? 'শুধুমাত্র JSON ফাইল গ্রহণযোগ্য' : 'Only JSON files are accepted', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.metadata || !parsed.metadata.tables) {
          throw new Error('Invalid backup format');
        }
        setRestoreFile(parsed);
        setRestoreFileName(file.name);
        setShowRestoreDialog(true);
      } catch {
        toast({ title: bn ? 'ফাইল ত্রুটি' : 'File Error', description: bn ? 'এটি একটি বৈধ ব্যাকআপ ফাইল নয়' : 'Not a valid backup file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getBackupSummary = () => {
    if (!restoreFile) return [];
    return Object.entries(restoreFile)
      .filter(([key]) => key !== 'metadata')
      .map(([key, val]: [string, any]) => ({
        table: key,
        count: val?.count || val?.data?.length || 0,
        label: TABLES.find(t => t.key === key)?.[bn ? 'labelBn' : 'labelEn'] || key,
      }))
      .filter(t => t.count > 0);
  };

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/database-restore`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ backup: restoreFile, mode: restoreMode }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Restore failed');

      setRestoreResults(result.results);
      const successCount = Object.values(result.results).filter((r: any) => r.success).length;
      toast({
        title: bn ? 'রিস্টোর সম্পন্ন' : 'Restore Complete',
        description: bn ? `${successCount}টি টেবিল সফলভাবে রিস্টোর হয়েছে` : `${successCount} tables restored successfully`,
      });
    } catch (error: any) {
      toast({ title: bn ? 'রিস্টোর ব্যর্থ' : 'Restore Failed', description: error.message, variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const backupSummary = getBackupSummary();
  const totalRecords = backupSummary.reduce((sum, t) => sum + t.count, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              {bn ? 'ব্যাকআপ ও ডেটা ম্যানেজমেন্ট' : 'Backup & Data Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ডেটা ব্যাকআপ, এক্সপোর্ট ও রিস্টোর করুন' : 'Backup, export & restore your data'}
            </p>
          </div>
          {lastBackup && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {bn ? 'সর্বশেষ:' : 'Last:'} {lastBackup}
            </Badge>
          )}
        </div>

        {/* Full Backup + Restore */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HardDrive className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold">{bn ? 'সম্পূর্ণ ব্যাকআপ' : 'Full Backup'}</h2>
                    <p className="text-xs text-muted-foreground">{bn ? `সকল ${TABLES.length}টি টেবিল ডাউনলোড` : `Download all ${TABLES.length} tables`}</p>
                  </div>
                </div>
                <Button onClick={() => downloadBackup(undefined, 'json')} disabled={!!loading}>
                  {loading === 'full-json' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {bn ? 'ব্যাকআপ ডাউনলোড (JSON)' : 'Download Backup (JSON)'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <RotateCcw className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold">{bn ? 'ডেটা রিস্টোর' : 'Data Restore'}</h2>
                    <p className="text-xs text-muted-foreground">{bn ? 'JSON ব্যাকআপ থেকে ডেটা পুনরুদ্ধার' : 'Restore data from JSON backup'}</p>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  {bn ? 'ব্যাকআপ ফাইল আপলোড করুন' : 'Upload Backup File'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => downloadBackup(t.key, 'json')} disabled={!!loading} title="JSON">
                        {loading === `${t.key}-json` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => downloadBackup(t.key, 'csv')} disabled={!!loading} title="CSV">
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
                  <li>{bn ? 'রিস্টোর করার আগে অবশ্যই ব্যাকআপ নিন' : 'Always take a backup before restoring'}</li>
                  <li>{bn ? '"মার্জ" মোডে বিদ্যমান ডেটা আপডেট হয় ও নতুন ডেটা যোগ হয়' : '"Merge" mode updates existing and adds new data'}</li>
                  <li>{bn ? '"রিপ্লেস" মোডে পুরাতন ডেটা মুছে নতুন ডেটা ঢোকানো হয়' : '"Replace" mode deletes old data and inserts new'}</li>
                  <li>{bn ? 'ব্যাকআপ ফাইল নিরাপদ স্থানে সংরক্ষণ করুন' : 'Store backup files in a secure location'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={(open) => { if (!restoring) { setShowRestoreDialog(open); if (!open) setRestoreResults(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
              {bn ? 'ডেটা রিস্টোর' : 'Restore Data'}
            </DialogTitle>
            <DialogDescription>
              {bn ? 'নিচের তথ্য যাচাই করে রিস্টোর নিশ্চিত করুন' : 'Review the details below and confirm restore'}
            </DialogDescription>
          </DialogHeader>

          {!restoreResults ? (
            <div className="space-y-4">
              {/* File Info */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="font-medium">{bn ? 'ফাইল:' : 'File:'}</span> {restoreFileName}</p>
                {restoreFile?.metadata && (
                  <>
                    <p><span className="font-medium">{bn ? 'ব্যাকআপের তারিখ:' : 'Backup date:'}</span> {new Date(restoreFile.metadata.exported_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}</p>
                    <p><span className="font-medium">{bn ? 'টেবিল:' : 'Tables:'}</span> {backupSummary.length}টি</p>
                    <p><span className="font-medium">{bn ? 'মোট রেকর্ড:' : 'Total records:'}</span> {totalRecords.toLocaleString(bn ? 'bn-BD' : 'en-US')}</p>
                  </>
                )}
              </div>

              {/* Table Summary */}
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {backupSummary.map(t => (
                  <div key={t.table} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span>{t.label}</span>
                    <Badge variant="secondary" className="text-xs">{t.count}</Badge>
                  </div>
                ))}
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <Label className="font-medium">{bn ? 'রিস্টোর মোড' : 'Restore Mode'}</Label>
                <RadioGroup value={restoreMode} onValueChange={(v) => setRestoreMode(v as 'merge' | 'replace')}>
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="merge" id="merge" className="mt-1" />
                    <Label htmlFor="merge" className="cursor-pointer">
                      <span className="font-medium">{bn ? 'মার্জ (নিরাপদ)' : 'Merge (Safe)'}</span>
                      <p className="text-xs text-muted-foreground">{bn ? 'বিদ্যমান ডেটা রাখে, নতুন/আপডেট ডেটা যোগ করে' : 'Keeps existing data, adds/updates from backup'}</p>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value="replace" id="replace" className="mt-1" />
                    <Label htmlFor="replace" className="cursor-pointer">
                      <span className="font-medium text-destructive">{bn ? 'রিপ্লেস (সতর্কতা)' : 'Replace (Caution)'}</span>
                      <p className="text-xs text-muted-foreground">{bn ? 'বিদ্যমান ডেটা মুছে ব্যাকআপের ডেটা দিয়ে প্রতিস্থাপন করে' : 'Deletes existing data and replaces with backup'}</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {restoreMode === 'replace' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    {bn ? 'সতর্কতা: "রিপ্লেস" মোড বিদ্যমান সকল ডেটা স্থায়ীভাবে মুছে ফেলবে। এই অপারেশন পূর্বাবস্থায় ফেরানো যাবে না!' : 'Warning: "Replace" mode will permanently delete all existing data. This operation cannot be undone!'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Results View */
            <div className="space-y-3">
              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                {Object.entries(restoreResults).map(([table, res]) => (
                  <div key={table} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {res.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      <span>{TABLES.find(t => t.key === table)?.[bn ? 'labelBn' : 'labelEn'] || table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {res.success ? (
                        <Badge variant="secondary" className="text-xs">{res.inserted} {bn ? 'রেকর্ড' : 'records'}</Badge>
                      ) : (
                        <span className="text-xs text-destructive truncate max-w-[150px]" title={res.error}>{res.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {!restoreResults ? (
              <>
                <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={restoring}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button onClick={handleRestore} disabled={restoring} className="bg-emerald-600 hover:bg-emerald-700">
                  {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {restoring ? (bn ? 'রিস্টোর হচ্ছে...' : 'Restoring...') : (bn ? 'রিস্টোর শুরু করুন' : 'Start Restore')}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setShowRestoreDialog(false); setRestoreResults(null); setRestoreFile(null); }}>
                {bn ? 'বন্ধ করুন' : 'Close'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBackup;
