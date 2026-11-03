import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useAdmissionGuidelines,
  type AdmissionGuidelinesData,
  type AdmissionGuidelineSection,
  type AdmissionGuidelineAttachment,
  DEFAULT_ADMISSION_GUIDELINES
} from '@/hooks/useAdmissionGuidelines';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, Plus, Trash2, Save, Loader2, Upload, FileText,
  Paperclip, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
  Eye, RefreshCw, Phone, Info
} from 'lucide-react';
import { toast } from 'sonner';

export const AdmissionGuidelinesManager: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { guidelines, isLoading, saveGuidelines, isSaving } = useAdmissionGuidelines();
  const [form, setForm] = useState<AdmissionGuidelinesData>(DEFAULT_ADMISSION_GUIDELINES);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (guidelines) {
      setForm(guidelines);
    }
  }, [guidelines]);

  const handleSave = async () => {
    try {
      await saveGuidelines(form);
    } catch {
      // toast is already handled in hook
    }
  };

  const handleAddSection = () => {
    const newSec: AdmissionGuidelineSection = {
      id: `sec-${Date.now()}`,
      title_bn: 'নতুন নীতিমালা / অনুচ্ছেদ',
      title_en: 'New Section',
      content_bn: '• এখানে পয়েন্ট বা নির্দেশনা লিখুন...',
      content_en: '• Write details or points here...',
      icon: 'BookOpen',
      is_active: true,
    };
    setForm(prev => ({
      ...prev,
      sections: [...(prev.sections || []), newSec],
    }));
  };

  const handleUpdateSection = (index: number, updates: Partial<AdmissionGuidelineSection>) => {
    setForm(prev => {
      const next = [...(prev.sections || [])];
      next[index] = { ...next[index], ...updates };
      return { ...prev, sections: next };
    });
  };

  const handleDeleteSection = (index: number) => {
    setForm(prev => ({
      ...prev,
      sections: (prev.sections || []).filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const title = newFileTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
      const res = await uploadToCloudinary(file, { folder: 'admission-docs' });
      
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = `${sizeMb} MB`;

      const newAtt: AdmissionGuidelineAttachment = {
        id: `att-${Date.now()}`,
        title,
        file_url: res.secure_url || res.url,
        file_type: ext,
        file_size: sizeStr,
        upload_date: new Date().toISOString().split('T')[0],
      };

      setForm(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAtt],
      }));

      setNewFileTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ফাইল সফলভাবে আপলোড হয়েছে!' : 'File uploaded successfully!');
    } catch (err: any) {
      toast.error(bn ? 'ফাইল আপলোডে ত্রুটি হয়েছে: ' + (err.message || '') : 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = (id: string) => {
    setForm(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{bn ? 'লোড হচ্ছে...' : 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="card-elevated p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-border/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {bn ? 'ভর্তি নির্দেশিকা, নীতিমালা ও ফাইল সংযুক্তি' : 'Admission Guidelines & File Attachments'}
              </h2>
              <Badge className={form.is_published ? 'bg-emerald-600' : 'bg-slate-500'}>
                {form.is_published ? (bn ? 'সক্রিয়' : 'Published') : (bn ? 'লুকানো' : 'Hidden')}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'পাবলিক ভর্তি পেজের "ভর্তি নির্দেশনা ও নিয়মাবলী" ট্যাবের লেখা, নীতিমালা ও ডাউনলোডযোগ্য ফাইল এখান থেকে নিয়ন্ত্রণ করুন।'
                : 'Manage the admission guidelines tab content, sections, and downloadable PDF/doc files.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto btn-primary-gradient px-6 py-2.5 rounded-xl text-xs font-bold gap-2 shadow-md shadow-emerald-600/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl h-10 px-3 text-xs gap-1.5"
          >
            <a href="/admission?mode=guidelines" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{bn ? 'লাইভ পেজ দেখুন' : 'View Page'}</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="card-elevated p-6 rounded-2xl space-y-6 border border-border/80">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-foreground">
              {bn ? 'মৌলিক তথ্য ও শিরোনাম' : 'Basic Info & Title'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {bn ? 'ভর্তি নির্দেশিকা পেজের মূল শিরোনাম ও সেশন' : 'Guidelines page header details'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="publishToggle" className="text-xs font-semibold cursor-pointer">
              {bn ? 'পাবলিক সাইটে প্রদর্শন' : 'Publish on Site'}
            </Label>
            <Switch
              id="publishToggle"
              checked={form.is_published}
              onCheckedChange={(val) => setForm(p => ({ ...p, is_published: val }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'পৃষ্ঠার শিরোনাম (বাংলা) *' : 'Page Title (Bangla) *'}</Label>
            <Input
              value={form.page_title_bn || ''}
              onChange={(e) => setForm(p => ({ ...p, page_title_bn: e.target.value }))}
              placeholder="ভর্তি নির্দেশিকা, নীতিমালা ও তথ্যাবলী"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'পৃষ্ঠার শিরোনাম (ইংরেজি)' : 'Page Title (English)'}</Label>
            <Input
              value={form.page_title_en || ''}
              onChange={(e) => setForm(p => ({ ...p, page_title_en: e.target.value }))}
              placeholder="Admission Guidelines, Policies & Information"
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">{bn ? 'উপ-শিরোনাম / বিবরণ (বাংলা)' : 'Subtitle / Description (Bangla)'}</Label>
            <Input
              value={form.subtitle_bn || ''}
              onChange={(e) => setForm(p => ({ ...p, subtitle_bn: e.target.value }))}
              placeholder="আল আরাবিয়া ছোবহানিয়া মাদ্রাসায় নতুন শিক্ষাবর্ষে ভর্তির নিয়মাবলী ও দিকনির্দেশনা"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'শিক্ষাবর্ষ ব্যাজ' : 'Session Badge'}</Label>
            <Input
              value={form.session_badge || ''}
              onChange={(e) => setForm(p => ({ ...p, session_badge: e.target.value }))}
              placeholder="যেমন: ২০২৬ শিক্ষাবর্ষ"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'ভর্তি হেল্পলাইন মোবাইল নম্বর' : 'Helpline Phone'}</Label>
            <Input
              value={form.helpline_phone || ''}
              onChange={(e) => setForm(p => ({ ...p, helpline_phone: e.target.value }))}
              placeholder="017XXXXXXXX"
              className="text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Guidelines Content Sections */}
      <div className="card-elevated p-6 rounded-2xl space-y-5 border border-border/80">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {bn ? 'নির্দেশিকা ও নিয়মাবলীর অনুচ্ছেদসমূহ' : 'Guideline Sections'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {bn ? 'ভর্তির বিভিন্ন নিয়ম ও শর্তাবলী আলাদা কার্ড আকারে প্রদর্শন করুন।' : 'Add or edit rule categories and policies.'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSection}
            className="rounded-xl text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{bn ? 'নতুন অনুচ্ছেদ যোগ করুন' : 'Add Section'}</span>
          </Button>
        </div>

        <div className="space-y-4">
          {(form.sections || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {bn ? 'কোনো অনুচ্ছেদ যুক্ত করা হয়নি। উপরের বাটন চেপে যোগ করুন।' : 'No sections added yet.'}
            </p>
          ) : (
            form.sections.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-slate-50/50 dark:bg-muted/20 space-y-3 relative group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <Input
                      value={sec.title_bn}
                      onChange={(e) => handleUpdateSection(idx, { title_bn: e.target.value })}
                      placeholder="অনুচ্ছেদের শিরোনাম (যেমন: প্রয়োজনীয় কাগজপত্র)"
                      className="font-bold text-xs sm:text-sm bg-white dark:bg-card h-9 max-w-md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-2">
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'সক্রিয়' : 'Active'}</Label>
                      <Switch
                        checked={sec.is_active !== false}
                        onCheckedChange={(val) => handleUpdateSection(idx, { is_active: val })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSection(idx)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                      title={bn ? 'মুছুন' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    {bn ? 'অনুচ্ছেদের বিবরণ ও পয়েন্টসমূহ (প্রতি লাইনে নতুন পয়েন্ট লিখুন):' : 'Section points:'}
                  </Label>
                  <Textarea
                    value={sec.content_bn}
                    onChange={(e) => handleUpdateSection(idx, { content_bn: e.target.value })}
                    rows={4}
                    placeholder="• শর্ত ১&#10;• শর্ত ২"
                    className="text-xs bg-white dark:bg-card leading-relaxed"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Downloadable Attached Files (Prospectus, Syllabus, Form PDF) */}
      <div className="card-elevated p-6 rounded-2xl space-y-5 border border-border/80">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-foreground">
                {bn ? 'সংযুক্ত ফাইল ও ডাউনলোডসমূহ (Prospectus / PDF)' : 'Downloadable File Attachments'}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn
                ? 'ভর্তি প্রসপেক্টাস, সিলেবাস, বা নমুনা ফর্মের ফাইল এখানে আপলোড করুন। শিক্ষার্থীরা তা এক ক্লিকে ডাউনলোড করতে পারবে।'
                : 'Upload prospectus, admission syllabi or printable PDF forms for students to download.'}
            </p>
          </div>
        </div>

        {/* Upload Box */}
        <div className="p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">
                {bn ? 'ফাইলের নাম বা শিরোনাম (যেমন: ভর্তি প্রসপেক্টাস ও সিলেবাস ২০২৬)' : 'File Title'}
              </Label>
              <Input
                value={newFileTitle}
                onChange={(e) => setNewFileTitle(e.target.value)}
                placeholder="যেমন: ভর্তি প্রসপেক্টাস ও সিলেবাস ২০২৬"
                className="text-xs bg-white dark:bg-card"
              />
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                id="guidelineFileInput"
              />
              <Button
                type="button"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full btn-primary-gradient rounded-xl text-xs font-bold gap-1.5 h-10 shadow-sm"
              >
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploadingFile ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (bn ? 'ফাইল সিলেক্ট ও আপলোড' : 'Select File')}</span>
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{bn ? 'সমর্থিত ফরম্যাট: PDF, Word Doc, বা JPG/PNG ছবি (সর্বোচ্চ ১০ এমবি)' : 'Supported: PDF, Docx, JPG, PNG'}</span>
          </p>
        </div>

        {/* Uploaded File List */}
        <div className="space-y-2.5">
          {(form.attachments || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {bn ? 'কোনো ফাইল এখনো সংযুক্ত করা হয়নি।' : 'No files attached yet.'}
            </p>
          ) : (
            form.attachments.map((att) => (
              <div
                key={att.id}
                className="p-3.5 rounded-xl border border-border bg-white dark:bg-card flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {att.title}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="uppercase font-semibold text-primary">{att.file_type || 'PDF'}</span>
                      {att.file_size && <span>• {att.file_size}</span>}
                      {att.upload_date && <span>• {att.upload_date}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {att.file_url && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs rounded-lg gap-1 border-border"
                    >
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{bn ? 'দেখুন' : 'View'}</span>
                      </a>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-lg"
                    title={bn ? 'মুছুন' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary-gradient px-8 py-3 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-lg shadow-emerald-600/25"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{bn ? 'সংরক্ষণ করুন' : 'Save Guidelines'}</span>
        </Button>
      </div>
    </div>
  );
};

export default AdmissionGuidelinesManager;
