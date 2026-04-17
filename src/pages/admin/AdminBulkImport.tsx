import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle, FileCheck, Database } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';
import {
  IMPORT_SCHEMAS,
  ImportSchema,
  validateRow,
  resolveLookups,
  ValidationResult,
} from '@/lib/bulkImportSchemas';

type Step = 'select' | 'upload' | 'preview' | 'done';

const AdminBulkImport = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [activeKey, setActiveKey] = useState<ImportSchema['key']>('students');
  const [step, setStep] = useState<Step>('upload');
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState(0);

  const schema = IMPORT_SCHEMAS.find(s => s.key === activeKey)!;

  const stats = useMemo(() => {
    const total = validations.length;
    const errored = validations.filter(v => v.errors.length > 0).length;
    const warned = validations.filter(v => v.warnings.length > 0 && v.errors.length === 0).length;
    const valid = total - errored;
    return { total, errored, warned, valid };
  }, [validations]);

  // ─── Template downloads ───
  const downloadCsvTemplate = () => {
    const headers = schema.fields.map(f => f.key);
    const sample = [schema.sample];
    const csv = Papa.unparse({ fields: headers, data: sample.map(r => headers.map(h => r[h] ?? '')) });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.key}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'CSV টেমপ্লেট ডাউনলোড হয়েছে' : 'CSV template downloaded');
  };

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = schema.fields.map(f => f.key);
    const labelRow = schema.fields.map(f => `${f.label_bn} (${f.label_en})${f.required ? ' *' : ''}`);
    const sampleRow = headers.map(h => schema.sample[h] ?? '');
    const aoa: any[][] = [headers, labelRow, sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef0 = XLSX.utils.encode_cell({ r: 0, c });
      const cellRef1 = XLSX.utils.encode_cell({ r: 1, c });
      const cellRef2 = XLSX.utils.encode_cell({ r: 2, c });
      if (ws[cellRef0]) {
        ws[cellRef0].s = {
          fill: { fgColor: { rgb: 'FF059669' } },
          font: { name: 'SutonnyOMJ', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
      if (ws[cellRef1]) {
        ws[cellRef1].s = {
          fill: { fgColor: { rgb: 'FFF1F5F9' } },
          font: { name: 'SutonnyOMJ', sz: 10, italic: true, color: { rgb: 'FF475569' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        };
      }
      if (ws[cellRef2]) {
        ws[cellRef2].s = {
          font: { name: 'SutonnyOMJ', sz: 10, color: { rgb: 'FF94A3B8' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }
    }
    ws['!rows'] = [{ hpt: 25 }, { hpt: 35 }, { hpt: 22 }];

    XLSX.utils.book_append_sheet(wb, ws, schema.label_en.slice(0, 31));
    XLSX.writeFile(wb, `${schema.key}_template.xlsx`, { bookType: 'xlsx', cellStyles: true });
    toast.success(bn ? 'Excel টেমপ্লেট ডাউনলোড হয়েছে' : 'Excel template downloaded');
  };

  // ─── File parsing ───
  const handleFileUpload = async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop();
    let rows: Record<string, any>[] = [];

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const parsed = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: true });
        rows = parsed.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Skip the label row (row 2) if present — detect by checking if row 2 contains parens
        const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        if (aoa.length < 2) throw new Error('Empty file');
        const headers = aoa[0].map(h => String(h).trim());
        const dataRows = aoa.slice(1).filter(r => {
          // Skip label rows (containing parens like "Name (নাম)")
          const firstCell = String(r[0] ?? '');
          return !firstCell.includes('(') && r.some(c => c !== '' && c !== null);
        });
        rows = dataRows.map(r => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
          return obj;
        });
      } else {
        toast.error(bn ? 'শুধু CSV বা Excel ফাইল সাপোর্টেড' : 'Only CSV or Excel supported');
        return;
      }

      if (rows.length === 0) {
        toast.error(bn ? 'কোন ডাটা পাওয়া যায়নি' : 'No data found');
        return;
      }

      // Validate locally
      let results = rows.map((r, i) => validateRow(r, schema, i));
      // Resolve uuid lookups
      results = await resolveLookups(results, schema);

      setValidations(results);
      setStep('preview');
      toast.success(bn ? `${rows.length} টি রো পাওয়া গেছে` : `${rows.length} rows parsed`);
    } catch (e: any) {
      toast.error((bn ? 'ফাইল পার্স ব্যর্থ: ' : 'Parse failed: ') + e.message);
    }
  };

  // ─── Import to DB ───
  const performImport = async () => {
    setImporting(true);
    setImported(0);
    setFailed(0);

    const validRows = validations.filter(v => v.errors.length === 0);
    if (validRows.length === 0) {
      toast.error(bn ? 'কোন বৈধ রো নেই' : 'No valid rows');
      setImporting(false);
      return;
    }

    const payload = validRows
      .map(v => v.resolvedData)
      .filter(Boolean)
      .map(d => {
        // Strip out lookup-only fields if not resolved
        const clean: Record<string, any> = {};
        Object.entries(d!).forEach(([k, v]) => {
          if (!k.endsWith('_name') && k !== 'student_id_text' && v !== null && v !== undefined && v !== '') {
            clean[k] = v;
          }
        });
        return clean;
      });

    // Insert in batches of 50
    let okCount = 0;
    let failCount = 0;
    const batchSize = 50;
    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const { error, data } = await (supabase as any).from(schema.table).insert(batch).select('id');
      if (error) {
        console.error('Bulk import batch error', error);
        failCount += batch.length;
      } else {
        okCount += (data?.length ?? batch.length);
      }
      setImported(okCount);
      setFailed(failCount);
    }

    setImporting(false);
    setStep('done');
    if (okCount > 0) toast.success(bn ? `${okCount} টি সফলভাবে ইমপোর্ট হয়েছে` : `${okCount} imported`);
    if (failCount > 0) toast.error(bn ? `${failCount} টি ব্যর্থ` : `${failCount} failed`);
  };

  const reset = () => {
    setValidations([]);
    setStep('upload');
    setImported(0);
    setFailed(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="rounded-[38px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 backdrop-blur-xl border border-primary/10">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {bn ? 'বাল্ক ডাটা ইমপোর্ট' : 'Bulk Data Import'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {bn ? 'CSV বা Excel ফাইল থেকে শত শত রেকর্ড একসাথে যোগ করুন' : 'Upload hundreds of records at once via CSV or Excel'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeKey} onValueChange={(v) => { setActiveKey(v as any); reset(); }}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1.5 bg-muted/50 rounded-2xl">
          {IMPORT_SCHEMAS.map(s => (
            <TabsTrigger key={s.key} value={s.key} className="rounded-xl py-3">
              {bn ? s.label_bn : s.label_en}
            </TabsTrigger>
          ))}
        </TabsList>

        {IMPORT_SCHEMAS.map(s => (
          <TabsContent key={s.key} value={s.key} className="mt-6 space-y-6">
            {/* Step 1: Templates + Upload */}
            {step !== 'done' && (
              <Card className="rounded-[38px] border-0 bg-card/50 backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    {bn ? '১. টেমপ্লেট ডাউনলোড করুন' : '1. Download Template'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{bn ? s.description_bn : s.label_en}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={downloadCsvTemplate} variant="outline" className="rounded-full">
                      <Download className="h-4 w-4 mr-2" /> CSV {bn ? 'টেমপ্লেট' : 'Template'}
                    </Button>
                    <Button onClick={downloadExcelTemplate} className="rounded-full">
                      <Download className="h-4 w-4 mr-2" /> Excel {bn ? 'টেমপ্লেট' : 'Template'}
                    </Button>
                  </div>

                  {/* Field reference */}
                  <details className="rounded-2xl bg-muted/30 p-4">
                    <summary className="cursor-pointer font-medium text-sm">{bn ? 'কলাম তথ্য দেখুন' : 'View column info'} ({s.fields.length})</summary>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {s.fields.map(f => (
                        <div key={f.key} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                          <code className="text-primary font-mono">{f.key}</code>
                          <span className="text-muted-foreground">— {bn ? f.label_bn : f.label_en}</span>
                          {f.required && <Badge variant="destructive" className="rounded-full text-[9px] h-4">{bn ? 'আবশ্যক' : 'Req'}</Badge>}
                          {f.enumValues && <span className="text-muted-foreground/60">({f.enumValues.join('|')})</span>}
                        </div>
                      ))}
                    </div>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Upload */}
            {step === 'upload' && (
              <Card className="rounded-[38px] border-0 bg-card/50 backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    {bn ? '২. ফাইল আপলোড করুন' : '2. Upload File'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="block border-2 border-dashed border-primary/30 rounded-3xl p-12 text-center cursor-pointer hover:bg-primary/5 transition-all">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-primary" />
                    <p className="text-lg font-medium mb-1">{bn ? 'ফাইল নির্বাচন করুন' : 'Choose file'}</p>
                    <p className="text-sm text-muted-foreground">CSV, XLSX, XLS</p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Preview & Import */}
            {step === 'preview' && (
              <Card className="rounded-[38px] border-0 bg-card/50 backdrop-blur-xl shadow-lg">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" />
                      {bn ? '৩. প্রিভিউ ও ভ্যালিডেশন' : '3. Preview & Validate'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="rounded-full">{bn ? 'মোট' : 'Total'}: {stats.total}</Badge>
                      <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {stats.valid}
                      </Badge>
                      {stats.warned > 0 && (
                        <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {stats.warned}
                        </Badge>
                      )}
                      {stats.errored > 0 && (
                        <Badge className="rounded-full bg-destructive/15 text-destructive border-0">
                          <AlertCircle className="h-3 w-3 mr-1" /> {stats.errored}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.errored > 0 && (
                    <Alert variant="destructive" className="rounded-2xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {bn ? `${stats.errored} টি রো ত্রুটি সহ। ত্রুটিপূর্ণ রো ইমপোর্ট হবে না।` : `${stats.errored} rows have errors. Errored rows will be skipped.`}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="overflow-auto max-h-[480px] rounded-2xl border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                          {schema.fields.slice(0, 5).map(f => (
                            <TableHead key={f.key}>{bn ? f.label_bn : f.label_en}</TableHead>
                          ))}
                          <TableHead>{bn ? 'মেসেজ' : 'Issues'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validations.slice(0, 200).map((v) => (
                          <TableRow key={v.rowIndex} className={v.errors.length > 0 ? 'bg-destructive/5' : v.warnings.length > 0 ? 'bg-amber-500/5' : ''}>
                            <TableCell className="font-mono text-xs">{v.rowIndex + 1}</TableCell>
                            <TableCell>
                              {v.errors.length > 0 ? (
                                <Badge variant="destructive" className="rounded-full text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />{bn ? 'ত্রুটি' : 'Error'}</Badge>
                              ) : v.warnings.length > 0 ? (
                                <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] border-0"><AlertTriangle className="h-3 w-3 mr-1" />{bn ? 'সতর্কতা' : 'Warn'}</Badge>
                              ) : (
                                <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] border-0"><CheckCircle2 className="h-3 w-3 mr-1" />{bn ? 'বৈধ' : 'OK'}</Badge>
                              )}
                            </TableCell>
                            {schema.fields.slice(0, 5).map(f => (
                              <TableCell key={f.key} className="text-xs max-w-[160px] truncate">
                                {String(v.data[f.key] ?? '-')}
                              </TableCell>
                            ))}
                            <TableCell className="text-xs">
                              {v.errors.map((e, i) => (
                                <div key={`e${i}`} className="text-destructive">{e.message}</div>
                              ))}
                              {v.warnings.map((w, i) => (
                                <div key={`w${i}`} className="text-amber-600 dark:text-amber-400">{w.message}</div>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {validations.length > 200 && (
                      <p className="text-center text-xs text-muted-foreground p-3">
                        {bn ? `প্রথম ২০০ টি রো দেখানো হচ্ছে। মোট ${validations.length}` : `Showing first 200 of ${validations.length}`}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={reset} className="rounded-full">
                      {bn ? 'বাতিল' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={performImport}
                      disabled={importing || stats.valid === 0}
                      className="rounded-full"
                    >
                      {importing
                        ? (bn ? `ইমপোর্ট হচ্ছে... (${imported}/${stats.valid})` : `Importing... (${imported}/${stats.valid})`)
                        : (bn ? `${stats.valid} টি ইমপোর্ট করুন` : `Import ${stats.valid} rows`)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
              <Card className="rounded-[38px] border-0 bg-card/50 backdrop-blur-xl shadow-lg">
                <CardContent className="text-center py-12 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold">{bn ? 'ইমপোর্ট সম্পন্ন!' : 'Import Complete!'}</h2>
                  <div className="flex justify-center gap-4">
                    <div className="px-6 py-3 rounded-2xl bg-emerald-500/10">
                      <p className="text-2xl font-bold text-emerald-600">{imported}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'সফল' : 'Success'}</p>
                    </div>
                    {failed > 0 && (
                      <div className="px-6 py-3 rounded-2xl bg-destructive/10">
                        <p className="text-2xl font-bold text-destructive">{failed}</p>
                        <p className="text-xs text-muted-foreground">{bn ? 'ব্যর্থ' : 'Failed'}</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={reset} className="rounded-full mt-6">
                    {bn ? 'নতুন ইমপোর্ট শুরু করুন' : 'Start New Import'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminBulkImport;
