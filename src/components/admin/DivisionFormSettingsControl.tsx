import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  Sparkles, Plus, Trash2, Pencil, SlidersHorizontal, BookOpen,
  CheckCircle2, AlertCircle, Copy, Save, Eye, EyeOff, Layers, FileText
} from 'lucide-react';
import { toast } from 'sonner';

export interface DivisionCustomField {
  id: string;
  label_bn: string;
  label_en: string;
  field_type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'date';
  options?: string[];
  is_required: boolean;
  section: 'academic_info' | 'student_details' | 'guardian_info' | 'documents';
  placeholder?: string;
}

export interface DivisionSettingsData {
  field_visibility?: Record<string, boolean>;
  custom_fields?: DivisionCustomField[];
  division_note?: string;
}

export const DEFAULT_ADMISSION_FIELDS = [
  { key: 'photo_url', label_bn: 'শিক্ষার্থীর ছবি', label_en: 'Student Photo', default_visible: true },
  { key: 'birth_reg_no', label_bn: 'জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)', label_en: 'Birth Registration No', default_visible: true },
  { key: 'previous_class', label_bn: 'পূর্ববর্তী শ্রেণী', label_en: 'Previous Class', default_visible: false },
  { key: 'previous_institute', label_bn: 'পূর্ববর্তী প্রতিষ্ঠান', label_en: 'Previous Institute', default_visible: false },
  { key: 'father_nid', label_bn: 'পিতার NID (১০/১৭ ডিজিট)', label_en: 'Father NID', default_visible: false },
  { key: 'father_phone', label_bn: 'পিতার মোবাইল নম্বর', label_en: 'Father Phone', default_visible: true },
  { key: 'father_occupation', label_bn: 'পিতার পেশা', label_en: 'Father Occupation', default_visible: false },
  { key: 'mother_name', label_bn: 'মাতার নাম', label_en: 'Mother Name', default_visible: true },
  { key: 'mother_nid', label_bn: 'মাতার NID (১০/১৭ ডিজিট)', label_en: 'Mother NID', default_visible: false },
  { key: 'mother_phone', label_bn: 'মাতার মোবাইল নম্বর', label_en: 'Mother Phone', default_visible: false },
  { key: 'guardian_info', label_bn: 'অন্যান্য অভিভাবকের তথ্য', label_en: 'Guardian Information', default_visible: false },
  { key: 'is_orphan', label_bn: 'এতিম স্ট্যাটাস', label_en: 'Orphan Status', default_visible: false },
  { key: 'is_poor', label_bn: 'অসচ্ছল স্ট্যাটাস', label_en: 'Insolvent Status', default_visible: false },
  { key: 'student_category', label_bn: 'শিক্ষার্থী ক্যাটাগরি', label_en: 'Student Category', default_visible: false },
];

export const FIELD_SECTIONS = [
  { key: 'academic_info', label_bn: 'বিভাগ ও শিক্ষাগত তথ্য (ধাপ ১)', label_en: 'Academic Info (Step 1)' },
  { key: 'student_details', label_bn: 'মৌলিক ও ব্যক্তিগত তথ্য (ধাপ ২)', label_en: 'Basic & Personal Info (Step 2)' },
  { key: 'guardian_info', label_bn: 'পিতা-মাতা ও অভিভাবক তথ্য (ধাপ ৩)', label_en: 'Parent & Guardian Info (Step 3)' },
  { key: 'documents', label_bn: 'ডকুমেন্টস ও ঘোষণাপত্র (ধাপ ৪)', label_en: 'Documents & Declaration (Step 4)' },
];

export const DivisionFormSettingsControl = ({ language }: { language: string }) => {
  const queryClient = useQueryClient();
  const bn = language === 'bn';

  // 1. Load active divisions
  const { data: divisions = [], isLoading: divLoading } = useQuery({
    queryKey: ['divisions-for-form-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Load division-specific form settings
  const { data: remoteSettings = {}, isLoading: settingsLoading } = useQuery<Record<string, DivisionSettingsData>>({
    queryKey: ['division-form-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'division_form_settings')
        .maybeSingle();
      if (!error && data?.value && typeof data.value === 'object') {
        return data.value as Record<string, DivisionSettingsData>;
      }
      return {};
    },
  });

  const [selectedDivId, setSelectedDivId] = useState<string>('');
  const [localSettings, setLocalSettings] = useState<Record<string, DivisionSettingsData>>({});
  const [activeSubTab, setActiveSubTab] = useState<'custom_fields' | 'field_visibility' | 'note'>('custom_fields');
  const [isSaving, setIsSaving] = useState(false);

  // Field modal state
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldLabelBn, setFieldLabelBn] = useState('');
  const [fieldLabelEn, setFieldLabelEn] = useState('');
  const [fieldType, setFieldType] = useState<DivisionCustomField['field_type']>('text');
  const [fieldOptionsStr, setFieldOptionsStr] = useState('');
  const [fieldIsRequired, setFieldIsRequired] = useState(false);
  const [fieldSection, setFieldSection] = useState<DivisionCustomField['section']>('academic_info');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');

  // Initial sync
  useEffect(() => {
    if (divisions.length > 0 && !selectedDivId) {
      setSelectedDivId(divisions[0].id);
    }
  }, [divisions, selectedDivId]);

  useEffect(() => {
    if (remoteSettings) {
      setLocalSettings(remoteSettings);
    }
  }, [remoteSettings]);

  const activeDiv = divisions.find((d: any) => d.id === selectedDivId);
  const currentDivSettings: DivisionSettingsData = (selectedDivId && localSettings[selectedDivId]) || {
    field_visibility: {},
    custom_fields: [],
    division_note: '',
  };

  const currentCustomFields = currentDivSettings.custom_fields || [];
  const currentFieldVisibility = currentDivSettings.field_visibility || {};
  const currentNote = currentDivSettings.division_note || '';

  // Save everything to website_settings
  const saveAllSettings = async (updatedSettings: Record<string, DivisionSettingsData>) => {
    setIsSaving(true);
    try {
      await supabase.from('website_settings').upsert({
        key: 'division_form_settings',
        value: updatedSettings as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      queryClient.invalidateQueries({ queryKey: ['division-form-settings'] });
      toast.success(bn ? 'বিভাগভিত্তিক ফর্ম সেটিংস সংরক্ষিত হয়েছে' : 'Division form settings saved');
    } catch (err: any) {
      toast.error(err.message || (bn ? 'সংরক্ষণে ত্রুটি' : 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle field visibility
  const toggleVisibility = (fieldKey: string, currentVal: boolean) => {
    const updated = {
      ...localSettings,
      [selectedDivId]: {
        ...currentDivSettings,
        field_visibility: {
          ...currentFieldVisibility,
          [fieldKey]: !currentVal,
        },
      },
    };
    setLocalSettings(updated);
    saveAllSettings(updated);
  };

  // Update division note
  const updateNote = (note: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [selectedDivId]: {
        ...currentDivSettings,
        division_note: note,
      },
    }));
  };

  const handleSaveNote = () => {
    saveAllSettings(localSettings);
  };

  // Open modal for new field
  const handleOpenAddField = () => {
    setEditingFieldId(null);
    setFieldLabelBn('');
    setFieldLabelEn('');
    setFieldType('text');
    setFieldOptionsStr('');
    setFieldIsRequired(false);
    setFieldSection('academic_info');
    setFieldPlaceholder('');
    setFieldModalOpen(true);
  };

  // Open modal for edit field
  const handleOpenEditField = (field: DivisionCustomField) => {
    setEditingFieldId(field.id);
    setFieldLabelBn(field.label_bn);
    setFieldLabelEn(field.label_en || '');
    setFieldType(field.field_type);
    setFieldOptionsStr((field.options || []).join(', '));
    setFieldIsRequired(!!field.is_required);
    setFieldSection(field.section || 'academic_info');
    setFieldPlaceholder(field.placeholder || '');
    setFieldModalOpen(true);
  };

  // Commit field save
  const handleSaveCustomField = () => {
    if (!fieldLabelBn.trim()) {
      toast.error(bn ? 'ফিল্ডের বাংলা নাম প্রদান করুন' : 'Field Bangla label is required');
      return;
    }

    const options = (fieldType === 'select' || fieldType === 'radio')
      ? fieldOptionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const newFieldObj: DivisionCustomField = {
      id: editingFieldId || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label_bn: fieldLabelBn.trim(),
      label_en: fieldLabelEn.trim() || fieldLabelBn.trim(),
      field_type: fieldType,
      options,
      is_required: fieldIsRequired,
      section: fieldSection,
      placeholder: fieldPlaceholder.trim() || undefined,
    };

    let nextFields: DivisionCustomField[];
    if (editingFieldId) {
      nextFields = currentCustomFields.map(f => f.id === editingFieldId ? newFieldObj : f);
    } else {
      nextFields = [...currentCustomFields, newFieldObj];
    }

    const updated = {
      ...localSettings,
      [selectedDivId]: {
        ...currentDivSettings,
        custom_fields: nextFields,
      },
    };

    setLocalSettings(updated);
    saveAllSettings(updated);
    setFieldModalOpen(false);
    toast.success(editingFieldId ? (bn ? 'ফিল্ড আপডেট করা হয়েছে' : 'Field updated') : (bn ? 'নতুন ফিল্ড যোগ করা হয়েছে' : 'New field added'));
  };

  // Delete custom field
  const handleDeleteCustomField = (fieldId: string) => {
    const nextFields = currentCustomFields.filter(f => f.id !== fieldId);
    const updated = {
      ...localSettings,
      [selectedDivId]: {
        ...currentDivSettings,
        custom_fields: nextFields,
      },
    };
    setLocalSettings(updated);
    saveAllSettings(updated);
    toast.success(bn ? 'ফিল্ড মুছে ফেলা হয়েছে' : 'Field deleted');
  };

  // Copy from another division
  const handleCopyFromDivision = (sourceDivId: string) => {
    const source = localSettings[sourceDivId];
    if (!source) {
      toast.error(bn ? 'নির্বাচিত বিভাগে কোনো কনফিগারেশন নেই' : 'No config found in source division');
      return;
    }
    const updated = {
      ...localSettings,
      [selectedDivId]: {
        field_visibility: { ...(source.field_visibility || {}) },
        custom_fields: (source.custom_fields || []).map(f => ({
          ...f,
          id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
        division_note: source.division_note || '',
      },
    };
    setLocalSettings(updated);
    saveAllSettings(updated);
    toast.success(bn ? 'কনফিগারেশন সফলভাবে কপি করা হয়েছে' : 'Config copied successfully');
  };

  if (divLoading || settingsLoading) {
    return <div className="card-elevated p-6 animate-pulse bg-muted/40 h-48 rounded-2xl" />;
  }

  return (
    <div className="card-elevated p-5 space-y-5 border-2 border-primary/20 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              {bn ? 'বিভাগভিত্তিক ভর্তি ফর্ম ও কাস্টম ফিল্ড নিয়ন্ত্রণ' : 'Division-Specific Form & Fields Control'}
              <Badge variant="outline" className="text-[11px] font-normal border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                {bn ? 'প্রতি বিভাগের আলাদা ফর্ম' : 'Per-Division Forms'}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn
                ? 'হিফজ, কিতাব, নূরানীসহ প্রতিটি বিভাগের জন্য আলাদা ফিল্ড দৃশ্যমানতা এবং স্বতন্ত্র কাস্টম ফিল্ড (যেমন: কত পারা মুখস্থ, বেফাক তথ্য) তৈরি করুন।'
                : 'Configure distinct field visibility and custom fields specifically for each academic division.'}
            </p>
          </div>
        </div>

        {/* Copy config quick tool */}
        {divisions.length > 1 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Select onValueChange={handleCopyFromDivision}>
              <SelectTrigger className="h-8 text-xs bg-background w-44 gap-1.5 border-dashed">
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder={bn ? 'অন্য বিভাগ থেকে কপি...' : 'Copy from division...'} />
              </SelectTrigger>
              <SelectContent>
                {divisions.filter((d: any) => d.id !== selectedDivId).map((d: any) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name_bn || d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Division Selector Tabs */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          {bn ? 'যে বিভাগের ফর্ম কনফিগার করতে চান নির্বাচন করুন:' : 'Select Division to Configure:'}
        </Label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {divisions.map((div: any) => {
            const isSelected = selectedDivId === div.id;
            const divCfg = localSettings[div.id];
            const customCount = (divCfg?.custom_fields || []).length;
            const hasCustomVisibility = Object.keys(divCfg?.field_visibility || {}).length > 0;
            const hasNote = !!divCfg?.division_note;

            return (
              <button
                key={div.id}
                type="button"
                onClick={() => setSelectedDivId(div.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-card hover:bg-muted/60 text-foreground border-border/80'
                }`}
              >
                <span>{div.name_bn || div.name}</span>
                {customCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    +{customCount} {bn ? 'ফিল্ড' : 'fields'}
                  </span>
                )}
                {(hasCustomVisibility || hasNote) && customCount === 0 && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Division Action Panel */}
      {activeDiv ? (
        <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                <span>{activeDiv.name_bn || activeDiv.name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({bn ? 'এই বিভাগের ফর্ম সেটিংস' : 'Settings for this division'})
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn
                  ? 'এই বিভাগে ছাত্ররা যখন অনলাইনে আবেদন করবে, তখন শুধুমাত্র এই সেটিংস ও কাস্টম ফিল্ডগুলো কার্যকর হবে।'
                  : 'These settings and custom fields will apply exclusively when an applicant selects this division.'}
              </p>
            </div>

            {/* Sub-tabs: Custom Fields | Field Visibility | Notes */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveSubTab('custom_fields')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'custom_fields'
                    ? 'bg-white dark:bg-card text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {bn ? `কাস্টম ফিল্ড (${currentCustomFields.length})` : `Custom Fields (${currentCustomFields.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('field_visibility')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'field_visibility'
                    ? 'bg-white dark:bg-card text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {bn ? 'ফিল্ড দৃশ্যমানতা' : 'Field Visibility'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('note')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'note'
                    ? 'bg-white dark:bg-card text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                {bn ? 'বিভাগীয় নির্দেশিকা' : 'Guidelines'}
              </button>
            </div>
          </div>

          {/* ─── 1. CUSTOM FIELDS SUBTAB ─── */}
          {activeSubTab === 'custom_fields' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-foreground">
                    {bn ? `${activeDiv.name_bn || activeDiv.name}-এর জন্য কাস্টম ফিল্ডসমূহ:` : `Custom Fields for ${activeDiv.name}:`}
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    {bn
                      ? 'ভর্তি আবেদনের সময় এই বিভাগের শিক্ষার্থীদের কাছ থেকে অতিরিক্ত যেকোনো তথ্য নেওয়ার জন্য নতুন ফিল্ড যোগ করুন।'
                      : 'Add custom fields to collect division-specific data from applicants.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenAddField}
                  className="btn-primary-gradient text-xs h-8 gap-1.5 font-bold shadow-md shadow-emerald-600/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {bn ? 'নতুন ফিল্ড যোগ করুন' : 'Add Custom Field'}
                </Button>
              </div>

              {currentCustomFields.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-card/60 space-y-2">
                  <Sparkles className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {bn
                      ? `এখনও "${activeDiv.name_bn || activeDiv.name}"-এর জন্য কোনো কাস্টম ফিল্ড যোগ করা হয়নি।`
                      : 'No custom fields added yet for this division.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddField}
                    className="text-xs h-8 gap-1.5 border-emerald-400/40 text-emerald-700 dark:text-emerald-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {bn ? 'প্রথম কাস্টম ফিল্ড তৈরি করুন' : 'Create First Field'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentCustomFields.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors flex items-start justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate">{f.label_bn}</span>
                          {f.is_required ? (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-normal">
                              {bn ? 'আবশ্যক' : 'Required'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground font-normal">
                              {bn ? 'ঐচ্ছিক' : 'Optional'}
                            </Badge>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                            {f.field_type}
                          </span>
                        </div>
                        {f.label_en && f.label_en !== f.label_bn && (
                          <p className="text-[11px] text-muted-foreground truncate">{f.label_en}</p>
                        )}
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {FIELD_SECTIONS.find(s => s.key === f.section)?.label_bn || f.section}
                        </p>
                        {f.options && f.options.length > 0 && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {bn ? 'অপশনসমূহ: ' : 'Options: '}{f.options.join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditField(f)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          title={bn ? 'সম্পাদনা করুন' : 'Edit'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(f.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title={bn ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── 2. FIELD VISIBILITY SUBTAB ─── */}
          {activeSubTab === 'field_visibility' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-foreground">
                    {bn ? `"${activeDiv.name_bn || activeDiv.name}"-এর জন্য ডিফল্ট ফিল্ড দৃশ্যমানতা:` : `Field Visibility for ${activeDiv.name}:`}
                  </h5>
                  <p className="text-[11px] text-muted-foreground">
                    {bn
                      ? 'এই নির্দিষ্ট বিভাগে কোন কোন সাধারণ ফিল্ড ছাত্রের জন্য প্রয়োজন নেই তা বন্ধ রাখুন (যেমন নূরানী বিভাগের জন্য পূর্ববর্তী প্রতিষ্ঠান বন্ধ রাখতে পারেন)।'
                      : 'Customize which standard fields are visible or hidden specifically for this division.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {DEFAULT_ADMISSION_FIELDS.map((field) => {
                  const isVisible = currentFieldVisibility[field.key] !== undefined
                    ? currentFieldVisibility[field.key]
                    : field.default_visible;

                  return (
                    <div
                      key={field.key}
                      onClick={() => toggleVisibility(field.key, isVisible)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isVisible
                          ? 'bg-card border-emerald-300 dark:border-emerald-700/60 shadow-sm'
                          : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isVisible ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className={`font-medium ${isVisible ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {bn ? field.label_bn : field.label_en}
                        </span>
                      </div>
                      <Switch
                        checked={isVisible}
                        onCheckedChange={() => toggleVisibility(field.key, isVisible)}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-90"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── 3. GUIDELINES & NOTE SUBTAB ─── */}
          {activeSubTab === 'note' && (
            <div className="space-y-3">
              <div>
                <h5 className="text-xs font-bold text-foreground">
                  {bn ? `"${activeDiv.name_bn || activeDiv.name}"-এর ভর্তি নির্দেশিকা বা বিশেষ শর্তাবলী:` : `Admission Guidelines for ${activeDiv.name}:`}
                </h5>
                <p className="text-[11px] text-muted-foreground">
                  {bn
                    ? 'এই বিভাগে আবেদন করার সময় প্রার্থীদের জন্য যদি কোনো বিশেষ নিয়ম বা নির্দেশনা থাকে (যেমন: বয়সসীমা, পূর্বশর্ত, কাগজপত্র), তা এখানে লিখে রাখুন।'
                    : 'Write any specific rules or instructions that applicants will see when choosing this division.'}
                </p>
              </div>

              <Textarea
                value={currentNote}
                onChange={(e) => updateNote(e.target.value)}
                placeholder={bn ? 'যেমন: হিফজ বিভাগে ভর্তির জন্য বয়স সর্বনিম্ন ৭ বছর হতে হবে এবং নাজেরা পড়া জানা আবশ্যক...' : 'Enter division specific notes or rules...'}
                className="bg-background min-h-[100px] text-xs leading-relaxed"
              />

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isSaving}
                  className="btn-primary-gradient text-xs h-8 gap-1.5 font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  {bn ? 'নির্দেশিকা সংরক্ষণ করুন' : 'Save Guidelines'}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ─── MODAL: ADD / EDIT CUSTOM FIELD ─── */}
      <Dialog open={fieldModalOpen} onOpenChange={setFieldModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {editingFieldId
                ? (bn ? 'কাস্টম ফিল্ড সম্পাদনা' : 'Edit Custom Field')
                : (bn ? `"${activeDiv?.name_bn || activeDiv?.name}"-এ নতুন ফিল্ড যোগ করুন` : `Add Field to ${activeDiv?.name}`)}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bn ? 'এই ফিল্ডটি শুধুমাত্র এই বিভাগের ভর্তি আবেদনে প্রদর্শিত হবে।' : 'This field will appear only on admission forms for this division.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold text-foreground">{bn ? 'ফিল্ডের নাম (বাংলা) *' : 'Field Label (Bangla) *'}</Label>
              <Input
                value={fieldLabelBn}
                onChange={(e) => setFieldLabelBn(e.target.value)}
                placeholder={bn ? 'যেমন: কত পারা মুখস্থ হয়েছে?, বেফাক রোল, ইত্যাদি' : 'e.g. Memorized Paras, etc.'}
                className="bg-background text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">{bn ? 'ফিল্ডের নাম (ইংরেজি)' : 'Field Label (English)'}</Label>
              <Input
                value={fieldLabelEn}
                onChange={(e) => setFieldLabelEn(e.target.value)}
                placeholder="e.g. Memorized Paras"
                className="bg-background text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-foreground">{bn ? 'ফিল্ডের ধরন' : 'Field Type'}</Label>
                <Select value={fieldType} onValueChange={(val: any) => setFieldType(val)}>
                  <SelectTrigger className="bg-background text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="text-xs">{bn ? 'ছোট লেখা (Text)' : 'Text'}</SelectItem>
                    <SelectItem value="number" className="text-xs">{bn ? 'সংখ্যা (Number)' : 'Number'}</SelectItem>
                    <SelectItem value="select" className="text-xs">{bn ? 'ড্রপডাউন তালিকা (Select)' : 'Dropdown (Select)'}</SelectItem>
                    <SelectItem value="radio" className="text-xs">{bn ? 'অপশন বাটন (Radio)' : 'Radio'}</SelectItem>
                    <SelectItem value="textarea" className="text-xs">{bn ? 'বড় বিবরণ (Textarea)' : 'Textarea'}</SelectItem>
                    <SelectItem value="date" className="text-xs">{bn ? 'তারিখ (Date)' : 'Date'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">{bn ? 'ফর্মের অবস্থান (Section)' : 'Section'}</Label>
                <Select value={fieldSection} onValueChange={(val: any) => setFieldSection(val)}>
                  <SelectTrigger className="bg-background text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_SECTIONS.map((sec) => (
                      <SelectItem key={sec.key} value={sec.key} className="text-xs">
                        {bn ? sec.label_bn : sec.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(fieldType === 'select' || fieldType === 'radio') && (
              <div>
                <Label className="text-xs font-bold text-foreground">
                  {bn ? 'অপশনসমূহ (কমা দিয়ে আলাদা করুন) *' : 'Options (separated by comma) *'}
                </Label>
                <Input
                  value={fieldOptionsStr}
                  onChange={(e) => setFieldOptionsStr(e.target.value)}
                  placeholder={bn ? 'যেমন: ১-৫ পারা, ৬-১০ পারা, ১১-২০ পারা, পূর্ণ ৩০ পারা' : 'Option 1, Option 2, Option 3'}
                  className="bg-background text-xs mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-foreground">{bn ? 'প্লেসহোল্ডার / ইঙ্গিত (ঐচ্ছিক)' : 'Placeholder (Optional)'}</Label>
              <Input
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder={bn ? 'যেমন: এখানে লিখুন...' : 'e.g. Enter here...'}
                className="bg-background text-xs mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
              <div>
                <p className="text-xs font-bold text-foreground">{bn ? 'বাধ্যতামূলক ফিল্ড (Required)' : 'Mandatory Field'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'অন থাকলে প্রার্থীকে অবশ্যই এই ফিল্ডটি পূরণ করতে হবে।' : 'Applicant must fill this field to proceed.'}
                </p>
              </div>
              <Switch checked={fieldIsRequired} onCheckedChange={setFieldIsRequired} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setFieldModalOpen(false)} className="text-xs">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSaveCustomField} disabled={isSaving} className="btn-primary-gradient text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {editingFieldId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'ফিল্ড সংরক্ষণ করুন' : 'Save Field')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DivisionFormSettingsControl;
