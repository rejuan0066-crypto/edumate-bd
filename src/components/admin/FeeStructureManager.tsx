import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useFeeStructure,
  type FeeStructureData,
  type FeeDivisionGroup,
  type FeeStructureItem,
  type AdditionalExpenseItem,
  type FeeStructureAttachment,
  DEFAULT_FEE_STRUCTURE
} from '@/hooks/useFeeStructure';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Plus, Trash2, Save, Loader2, Upload, FileText,
  Paperclip, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
  Eye, RefreshCw, Layers, Phone
} from 'lucide-react';
import { toast } from 'sonner';

export const FeeStructureManager: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { feeStructure, isLoading, saveFeeStructure, isSaving } = useFeeStructure();
  const [form, setForm] = useState<FeeStructureData>(DEFAULT_FEE_STRUCTURE);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (feeStructure) {
      setForm(feeStructure);
    }
  }, [feeStructure]);

  const handleSave = async () => {
    try {
      await saveFeeStructure(form);
    } catch {
      // handled in hook
    }
  };

  const handleUpdateItem = (divIdx: number, itemIdx: number, field: keyof FeeStructureItem, val: string) => {
    setForm(prev => {
      const next = { ...prev };
      const divs = [...next.divisions];
      const targetDiv = { ...divs[divIdx] };
      const items = [...targetDiv.items];
      items[itemIdx] = { ...items[itemIdx], [field]: val };
      targetDiv.items = items;
      divs[divIdx] = targetDiv;
      next.divisions = divs;
      return next;
    });
  };

  const handleAddItem = (divIdx: number) => {
    setForm(prev => {
      const next = { ...prev };
      const divs = [...next.divisions];
      const targetDiv = { ...divs[divIdx] };
      const newItem: FeeStructureItem = {
        id: `item-${Date.now()}`,
        class_name_bn: 'নতুন শ্রেণি',
        admission_fee: '৳ ১,৫০০',
        monthly_tuition: '৳ ৮০০',
        residential_fee: '৳ ২,৫০০',
        exam_fee: '৳ ২৫০',
        notes: ''
      };
      targetDiv.items = [...targetDiv.items, newItem];
      divs[divIdx] = targetDiv;
      next.divisions = divs;
      return next;
    });
  };

  const handleDeleteItem = (divIdx: number, itemIdx: number) => {
    setForm(prev => {
      const next = { ...prev };
      const divs = [...next.divisions];
      const targetDiv = { ...divs[divIdx] };
      targetDiv.items = targetDiv.items.filter((_, i) => i !== itemIdx);
      divs[divIdx] = targetDiv;
      next.divisions = divs;
      return next;
    });
  };

  const handleAddRule = () => {
    setForm(prev => ({
      ...prev,
      rules: [...prev.rules, 'নতুন নিয়ম বা শর্তাবলী এখানে লিখুন...']
    }));
  };

  const handleUpdateRule = (idx: number, val: string) => {
    setForm(prev => {
      const nextRules = [...prev.rules];
      nextRules[idx] = val;
      return { ...prev, rules: nextRules };
    });
  };

  const handleDeleteRule = (idx: number) => {
    setForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newFileTitle.trim()) {
      toast.error(bn ? 'দয়া করে ফাইলের একটি শিরোনাম লিখুন' : 'Please enter a title for this file');
      return;
    }

    try {
      setUploadingFile(true);
      const uploadRes = await uploadToCloudinary(file);
      const fileUrl = uploadRes?.secure_url || uploadRes?.url;
      if (!fileUrl) {
        throw new Error('Upload failed');
      }

      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

      const newAtt: FeeStructureAttachment = {
        id: `att-${Date.now()}`,
        title: newFileTitle.trim(),
        url: fileUrl,
        file_type: ext,
        file_size: sizeStr
      };

      setForm(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAtt]
      }));

      setNewFileTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(bn ? 'ফাইল আপলোড হয়েছে!' : 'File attached successfully!');
    } catch (err: any) {
      toast.error('Upload error: ' + (err?.message || 'Failed'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = (id: string) => {
    setForm(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(a => a.id !== id)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            {bn ? 'ফি ও খরচ বিবরণী ব্যবস্থাপনা' : 'Fee Structure & Expense Manager'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {bn
              ? 'ওয়েবসাইটের "ফি ও খরচ বিবরণী" পেজের সকল বিভাগ ও শ্রেণির ফি চার্ট, নিয়মাবলী ও ফাইল সহজে আপডেট করুন।'
              : 'Manage public fee charts, tuition schedules, residential charges, and downloadable attachments.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/fee-structure"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-foreground transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
          </a>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs gap-1.5 shadow-sm"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{bn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-foreground border-b border-border pb-2">
          {bn ? '১. পেজ শিরোনাম ও সেশন ট্যাগ' : '1. Header & Session Settings'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'পেজ শিরোনাম (বাংলা)' : 'Page Title (Bangla)'}</Label>
            <Input
              value={form.page_title_bn}
              onChange={e => setForm(prev => ({ ...prev, page_title_bn: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'সেশন ট্যাগ / ব্যাজ' : 'Session Badge'}</Label>
            <Input
              value={form.session_badge}
              onChange={e => setForm(prev => ({ ...prev, session_badge: e.target.value }))}
              placeholder="শিক্ষাবর্ষ ২০২৬-২০২৭"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">{bn ? 'সাব-টাইটেল / বিবরণ' : 'Subtitle'}</Label>
            <Textarea
              rows={2}
              value={form.subtitle_bn}
              onChange={e => setForm(prev => ({ ...prev, subtitle_bn: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{bn ? 'হিসাব শাখা হেল্পলাইন ফোন' : 'Accounts Helpline'}</Label>
            <Input
              value={form.helpline_phone}
              onChange={e => setForm(prev => ({ ...prev, helpline_phone: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Divisions & Classes Fee Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          {bn ? '২. বিভাগ ও শ্রেণিভিত্তিক ফি চার্ট' : '2. Division & Class Fee Table'}
        </h3>

        {(form.divisions || []).map((divGroup, divIdx) => (
          <div key={divGroup.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>{divGroup.division_name_bn}</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{divGroup.description_bn}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddItem(divIdx)}
                className="text-xs h-8 gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{bn ? 'নতুন শ্রেণি যোগ' : 'Add Class'}</span>
              </Button>
            </div>

            <div className="space-y-3">
              {(divGroup.items || []).map((item, itemIdx) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{bn ? 'শ্রেণির নাম' : 'Class Name'}</Label>
                      <Input
                        value={item.class_name_bn}
                        onChange={e => handleUpdateItem(divIdx, itemIdx, 'class_name_bn', e.target.value)}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{bn ? 'ভর্তি ফি' : 'Admission Fee'}</Label>
                      <Input
                        value={item.admission_fee}
                        onChange={e => handleUpdateItem(divIdx, itemIdx, 'admission_fee', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{bn ? 'মাসিক বেতন' : 'Monthly Fee'}</Label>
                      <Input
                        value={item.monthly_tuition}
                        onChange={e => handleUpdateItem(divIdx, itemIdx, 'monthly_tuition', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{bn ? 'আবাসিক/খাবার' : 'Residential'}</Label>
                      <Input
                        value={item.residential_fee || ''}
                        onChange={e => handleUpdateItem(divIdx, itemIdx, 'residential_fee', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground">{bn ? 'পরীক্ষা ফি' : 'Exam Fee'}</Label>
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={item.exam_fee || ''}
                          onChange={e => handleUpdateItem(divIdx, itemIdx, 'exam_fee', e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteItem(divIdx, itemIdx)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rules & Guidelines */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            {bn ? '৩. ফি পরিশোধের নিয়মাবলী ও শর্তসমূহ' : '3. Payment Policies & Rules'}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddRule}
            className="text-xs h-8 gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{bn ? 'নিয়ম যোগ করুন' : 'Add Rule'}</span>
          </Button>
        </div>

        <div className="space-y-2.5">
          {(form.rules || []).map((rule, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <Input
                value={rule}
                onChange={e => handleUpdateRule(idx, e.target.value)}
                className="text-xs h-9"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDeleteRule(idx)}
                className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* File Attachments */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-foreground border-b border-border pb-3">
          {bn ? '৪. ডাউনলোডযোগ্য ফি চার্ট / নোটিশ ফাইল সংযুক্তি' : '4. Downloadable Fee Charts & Attachments'}
        </h3>

        <div className="p-4 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              placeholder={bn ? 'ফাইলের নাম লিখুন (যেমন: ফি বিবরণী ২০২৬-২৭.pdf)' : 'File title...'}
              value={newFileTitle}
              onChange={e => setNewFileTitle(e.target.value)}
              className="text-xs h-9 bg-background"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shrink-0 gap-1.5"
            >
              {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{bn ? 'ফাইল সিলেক্ট ও আপলোড' : 'Upload File'}</span>
            </Button>
          </div>
        </div>

        {form.attachments && form.attachments.length > 0 && (
          <div className="space-y-2 pt-2">
            {form.attachments.map(att => (
              <div key={att.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-xs text-foreground">{att.title}</span>
                  <Badge variant="outline" className="text-[10px]">{att.file_type}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="h-7 w-7 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm gap-2 shadow-md"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{bn ? 'সকল পরিবর্তন সংরক্ষণ করুন' : 'Save All Changes'}</span>
        </Button>
      </div>
    </div>
  );
};

export default FeeStructureManager;
