// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RefreshCw,
  Sparkles,
  Phone,
  XCircle,
  Plus,
  Trash2,
  FileCheck2,
  SlidersHorizontal,
  FileText,
  User,
  GraduationCap,
  DollarSign,
  Globe,
} from 'lucide-react';
import {
  useSignatoryAuthorities,
  DOCUMENT_SCOPES,
  DEFAULT_ROLE_SCOPES,
  type SignatoryRoleDef,
  type SignatoryRoleItem,
  type DocumentScopeItem,
} from '@/hooks/useSignatoryAuthorities';
import { useStaffDirectory, type DirectoryPerson } from '@/hooks/useStaffDirectory';
import { toast } from 'sonner';

interface SignatoryAuthoritiesTabProps {
  canEdit?: boolean;
}

const EMOJI_OPTIONS = ['🏛️', '🎓', '💼', '🔍', '📝', '👤', '🛡️', '⭐', '🕌', '📋', '👨‍🏫', '📑', '✍️'];

export default function SignatoryAuthoritiesTab({ canEdit = true }: SignatoryAuthoritiesTabProps) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const {
    authorities,
    allRoles,
    customRoles,
    documentScopes,
    isLoading: authLoading,
    updateAuthority,
    updateRoleScopes,
    addCustomRole,
    deleteCustomRole,
    refetch,
  } = useSignatoryAuthorities();

  const { data: personnel = [], isLoading: dirLoading } = useStaffDirectory({ status: 'active' });

  // ─── Local draft states per role_key ───
  const [draftSelections, setDraftSelections] = useState<Record<string, {
    mode: 'directory' | 'manual';
    personId: string;
    manualNameBn: string;
    manualNameEn: string;
    manualDesignationBn: string;
    manualPhone: string;
  }>>({});

  // ─── Dialog State: Add Custom Role ───
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleLabelBn, setNewRoleLabelBn] = useState('');
  const [newRoleLabelEn, setNewRoleLabelEn] = useState('');
  const [newRoleIcon, setNewRoleIcon] = useState('✍️');
  const [newRoleDescBn, setNewRoleDescBn] = useState('');
  const [newRoleScopes, setNewRoleScopes] = useState<string[]>(['certificate', 'result_card']);

  // ─── Dialog State: Configure Document Scopes ───
  const [activeScopeRole, setActiveScopeRole] = useState<SignatoryRoleDef | null>(null);
  const [editingScopes, setEditingScopes] = useState<string[]>([]);

  // Helper to get or initialize draft state for a role
  const getDraft = (roleKey: string, currentItem?: SignatoryRoleItem) => {
    if (draftSelections[roleKey]) {
      return draftSelections[roleKey];
    }
    return {
      mode: currentItem?.person_source === 'manual' || (!currentItem?.person_id && !!currentItem?.person_name_bn) ? 'manual' : 'directory',
      personId: currentItem?.person_id || '',
      manualNameBn: currentItem?.person_name_bn || '',
      manualNameEn: currentItem?.person_name_en || '',
      manualDesignationBn: currentItem?.person_designation_bn || '',
      manualPhone: currentItem?.person_phone || '',
    };
  };

  const setRoleDraft = (roleKey: string, updates: Partial<ReturnType<typeof getDraft>>) => {
    setDraftSelections((prev) => {
      const current = prev[roleKey] || getDraft(roleKey, authorities.find((a) => a.role_key === roleKey));
      return {
        ...prev,
        [roleKey]: {
          ...current,
          ...updates,
        },
      };
    });
  };

  const handleSelectPerson = (roleKey: string, personId: string) => {
    if (personId === '__manual__') {
      setRoleDraft(roleKey, { mode: 'manual', personId: '' });
      return;
    }
    const found = personnel.find((p) => p.id === personId);
    if (found) {
      setRoleDraft(roleKey, {
        mode: 'directory',
        personId: found.id,
        manualNameBn: found.name_bn || '',
        manualNameEn: found.name_en || '',
        manualDesignationBn: found.designation || '',
        manualPhone: found.phone || '',
      });
    } else {
      setRoleDraft(roleKey, { personId });
    }
  };

  const handleSaveRole = async (roleKey: string) => {
    const roleItem = authorities.find((a) => a.role_key === roleKey);
    const draft = getDraft(roleKey, roleItem);

    if (draft.mode === 'manual') {
      if (!draft.manualNameBn.trim()) {
        toast.error(bn ? 'ব্যক্তির নাম (বাংলা) আবশ্যক' : 'Person name in Bangla is required');
        return;
      }
      await updateAuthority.mutateAsync({
        role_key: roleKey,
        person_id: null,
        person_source: 'manual',
        person_name_bn: draft.manualNameBn.trim(),
        person_name_en: draft.manualNameEn.trim() || null,
        person_designation_bn: draft.manualDesignationBn.trim() || null,
        person_designation_en: draft.manualDesignationBn.trim() || null,
        person_phone: draft.manualPhone.trim() || null,
      });
    } else {
      const selectedPerson = personnel.find((p) => p.id === draft.personId);
      if (!selectedPerson) {
        toast.error(bn ? 'অনুগ্রহ করে একজন কর্মকর্তা/স্টাফ নির্বাচন করুন' : 'Please select an officer/staff member');
        return;
      }

      await updateAuthority.mutateAsync({
        role_key: roleKey,
        person_id: selectedPerson.id,
        person_source: selectedPerson.source,
        person_name_bn: selectedPerson.name_bn,
        person_name_en: selectedPerson.name_en || null,
        person_designation_bn: selectedPerson.designation || null,
        person_designation_en: selectedPerson.designation || null,
        person_phone: selectedPerson.phone || null,
        person_email: selectedPerson.email || null,
        person_photo_url: selectedPerson.photo_url || null,
      });
    }
  };

  const handleClearRole = async (roleKey: string) => {
    if (!confirm(bn ? 'এই দায়িত্বের স্বাক্ষরকারী খালি করতে চান?' : 'Clear signatory for this role?')) return;
    await updateAuthority.mutateAsync({
      role_key: roleKey,
      person_id: null,
      person_source: null,
      person_name_bn: null,
      person_name_en: null,
      person_designation_bn: null,
      person_phone: null,
      person_email: null,
      person_photo_url: null,
    });
    setRoleDraft(roleKey, {
      mode: 'directory',
      personId: '',
      manualNameBn: '',
      manualNameEn: '',
      manualDesignationBn: '',
      manualPhone: '',
    });
  };

  // ─── Scope modal open ───
  const handleOpenScopeModal = (roleDef: SignatoryRoleDef) => {
    setActiveScopeRole(roleDef);
    const existing = documentScopes[roleDef.key] || DEFAULT_ROLE_SCOPES[roleDef.key] || [];
    setEditingScopes([...existing]);
  };

  const handleSaveScopes = async () => {
    if (!activeScopeRole) return;
    await updateRoleScopes.mutateAsync({
      roleKey: activeScopeRole.key,
      scopes: editingScopes,
    });
    setActiveScopeRole(null);
  };

  const toggleScope = (scopeId: string) => {
    setEditingScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const toggleNewRoleScope = (scopeId: string) => {
    setNewRoleScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  // ─── Create Custom Role ───
  const handleCreateCustomRole = async () => {
    if (!newRoleLabelBn.trim()) {
      toast.error(bn ? 'পদবির বাংলা নাম আবশ্যক' : 'Bangla designation title is required');
      return;
    }
    await addCustomRole.mutateAsync({
      label_bn: newRoleLabelBn.trim(),
      label_en: newRoleLabelEn.trim() || newRoleLabelBn.trim(),
      icon: newRoleIcon,
      desc_bn: newRoleDescBn.trim() || 'কাস্টম নির্ধারিত স্বাক্ষরকারী ও দায়িত্বপ্রাপ্ত কর্তৃপক্ষ।',
      scopes: newRoleScopes,
    });
    setIsAddRoleOpen(false);
    setNewRoleLabelBn('');
    setNewRoleLabelEn('');
    setNewRoleIcon('✍️');
    setNewRoleDescBn('');
    setNewRoleScopes(['certificate', 'result_card']);
  };

  // ─── Delete Custom Role ───
  const handleDeleteCustomRole = async (roleKey: string, roleName: string) => {
    if (!confirm(bn ? `'${roleName}' স্বাক্ষরকারী পদবি মুছে ফেলতে চান?` : `Delete signatory role '${roleName}'?`)) return;
    await deleteCustomRole.mutateAsync(roleKey);
  };

  const groupedPersonnel = useMemo(() => {
    const administrative = personnel.filter((p) => p.source === 'administrative');
    const teachersAndStaff = personnel.filter((p) => p.source === 'staff');
    return { administrative, teachersAndStaff };
  }, [personnel]);

  if (authLoading || dirLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">{bn ? 'স্বাক্ষরকারী তথ্য লোড হচ্ছে...' : 'Loading signatory authorities...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-base">
                  {bn ? 'স্বাক্ষরকারী ও দায়িত্বপ্রাপ্ত কর্তৃপক্ষ কনফিগারেশন' : 'Signatory & Responsible Authority Setup'}
                </h3>
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-400/40 text-xs">
                  {bn ? 'লাইভ সিঙ্ক সক্রিয়' : 'Live Sync Active'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {bn ? `মোট ${allRoles.length}টি পদবি` : `Total ${allRoles.length} Roles`}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bn
                  ? 'এখানে যাকে যে দায়িত্বে অর্পণ করবেন এবং যেসব ডকুমেন্টে তার স্থান নির্ধারণ করবেন—স্বয়ংক্রিয়ভাবে সেই রসিদ, ভাউচার, রেজাল্ট ও সার্টিফিকেটে তার নাম, পদবি ও স্বাক্ষর প্রদর্শিত হবে।'
                  : 'Configure who holds each authority role and specify which documents their signature, name, and designation appear on.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {canEdit && (
              <Button
                onClick={() => setIsAddRoleOpen(true)}
                className="btn-primary-gradient text-xs gap-1.5 shadow-sm"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                {bn ? 'নতুন স্বাক্ষরকারী পদ' : 'Add Custom Signatory'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {allRoles.map((roleDef) => {
          const currentItem = authorities.find((a) => a.role_key === roleDef.key);
          const draft = getDraft(roleDef.key, currentItem);
          const isAssigned = !!(currentItem?.person_name_bn || currentItem?.person_id);
          const assignedScopes = documentScopes[roleDef.key] || DEFAULT_ROLE_SCOPES[roleDef.key] || [];

          // Find suggested match if current is not assigned
          const suggestedMatch = !isAssigned
            ? personnel.find((p) => {
                const des = (p.designation || '').toLowerCase();
                return (roleDef.keywords || []).some((k) => des.includes(k.toLowerCase()));
              })
            : null;

          return (
            <Card
              key={roleDef.key}
              className="border shadow-sm rounded-2xl overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0" role="img" aria-label="Role Icon">
                      {roleDef.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base font-bold text-foreground">
                          {bn ? roleDef.label_bn : roleDef.label_en}
                        </CardTitle>
                        {roleDef.is_custom && (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-400/40 text-[10px]">
                            {bn ? 'কাস্টম পদবি' : 'Custom'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                        {roleDef.label_en}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={
                        isAssigned
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-400/40 gap-1 text-xs'
                          : 'bg-amber-500/10 text-amber-700 border-amber-400/40 gap-1 text-xs'
                      }
                    >
                      {isAssigned ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {bn ? 'দায়িত্বপ্রাপ্ত' : 'Assigned'}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          {bn ? 'অনির্ধারিত' : 'Unassigned'}
                        </>
                      )}
                    </Badge>

                    {roleDef.is_custom && canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCustomRole(roleDef.key, roleDef.label_bn)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        title={bn ? 'কাস্টম পদবি মুছে ফেলুন' : 'Delete custom role'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground mt-2 bg-background/80 p-2 rounded-lg border">
                  <span className="font-semibold text-foreground/80">
                    {bn ? 'বিবরণ:' : 'Description:'}{' '}
                  </span>
                  {roleDef.desc_bn}
                </div>

                {/* ─── Document Scope Section ─── */}
                <div className="mt-3 pt-2.5 border-t border-border/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-primary" />
                      {bn ? 'স্বাক্ষরের স্থান ও আওতা:' : 'Document Placement & Scopes:'}
                    </span>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenScopeModal(roleDef)}
                        className="h-6 text-[11px] px-2 gap-1 rounded-md border-primary/30 hover:bg-primary/5 text-primary"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        {bn ? 'স্থান নির্ধারণ' : 'Set Scopes'}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                    {assignedScopes.length > 0 ? (
                      assignedScopes.map((scopeId) => {
                        const item = DOCUMENT_SCOPES.find((d) => d.id === scopeId);
                        if (!item) return null;
                        return (
                          <Badge
                            key={scopeId}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-secondary/80 border text-foreground/90 font-medium gap-1"
                          >
                            <span>{item.icon}</span>
                            <span>{bn ? item.label_bn : item.label_en}</span>
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-amber-600/90 italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        {bn ? '⚠️ কোনো ডকুমেন্টে স্থান নির্ধারিত নেই (স্থান নির্ধারণ করুন)' : 'No documents assigned'}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                {/* Current Active Signatory Display */}
                <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>{bn ? 'বর্তমান দায়িত্বপ্রাপ্ত ব্যক্তি' : 'Current Active Signatory'}</span>
                    {isAssigned && (
                      <span className="text-[11px] text-emerald-600 font-medium">
                        {currentItem?.person_source === 'administrative'
                          ? bn ? '🏛️ প্রশাসনিক' : 'Administrative'
                          : currentItem?.person_source === 'staff'
                          ? bn ? '👨‍🏫 স্টাফ/শিক্ষক' : 'Staff'
                          : bn ? '✍️ ম্যানুয়াল' : 'Manual'}
                      </span>
                    )}
                  </div>

                  {isAssigned ? (
                    <div className="flex items-center gap-3 pt-1">
                      <Avatar className="w-12 h-12 border-2 border-emerald-500/20 shadow-sm">
                        <AvatarImage src={currentItem?.person_photo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {currentItem?.person_name_bn?.slice(0, 2) || 'স্ব'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {currentItem?.person_name_bn}
                        </div>
                        {currentItem?.person_name_en && (
                          <div className="text-xs text-muted-foreground truncate">
                            {currentItem?.person_name_en}
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {currentItem?.person_designation_bn && (
                            <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0">
                              {currentItem?.person_designation_bn}
                            </Badge>
                          )}
                          {currentItem?.person_phone && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-muted-foreground/80" />
                              {currentItem?.person_phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-muted-foreground italic bg-muted/20 rounded-lg">
                      {bn
                        ? '⚠️ বর্তমানে নির্দিষ্ট কোনো ব্যক্তি সংযুক্ত নেই (ডিফল্ট প্রতিষ্ঠানের নাম প্রযোজ্য)'
                        : 'No specific person assigned yet.'}
                    </div>
                  )}

                  {/* Smart suggestion button if unassigned */}
                  {!isAssigned && suggestedMatch && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        onClick={() => handleSelectPerson(roleDef.key, suggestedMatch.id)}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {bn ? 'প্রস্তাবিত:' : 'Suggested:'} {suggestedMatch.name_bn} ({suggestedMatch.designation})
                        </span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Assignment Controls */}
                {canEdit && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        {bn ? 'নতুন দায়িত্ব অর্পণ করুন' : 'Assign / Change Signatory'}
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setRoleDraft(roleDef.key, {
                            mode: draft.mode === 'directory' ? 'manual' : 'directory',
                          })
                        }
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        {draft.mode === 'directory'
                          ? bn ? '✍️ কাস্টম নাম লিখুন' : '✍️ Custom Entry'
                          : bn ? '👥 তালিকা থেকে নির্বাচন' : '👥 From Directory'}
                      </button>
                    </div>

                    {draft.mode === 'directory' ? (
                      <div>
                        <Select
                          value={draft.personId || ''}
                          onValueChange={(val) => handleSelectPerson(roleDef.key, val)}
                        >
                          <SelectTrigger className="bg-background text-xs">
                            <SelectValue
                              placeholder={bn ? 'কর্মকর্তা বা স্টাফ নির্বাচন করুন...' : 'Select officer/staff...'}
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {groupedPersonnel.administrative.length > 0 && (
                              <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase bg-muted/50 rounded-sm my-1">
                                🏛️ {bn ? 'প্রশাসনিক কর্মকর্তা' : 'Administrative Officers'}
                              </div>
                            )}
                            {groupedPersonnel.administrative.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className="font-medium">{p.name_bn}</span>
                                  <span className="text-muted-foreground text-[11px]">
                                    ({p.designation || 'প্রশাসনিক'})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}

                            {groupedPersonnel.teachersAndStaff.length > 0 && (
                              <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase bg-muted/50 rounded-sm my-1">
                                👨‍🏫 {bn ? 'শিক্ষক ও স্টাফ' : 'Teachers & Staff'}
                              </div>
                            )}
                            {groupedPersonnel.teachersAndStaff.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                <div className="flex items-center justify-between gap-2 w-full">
                                  <span className="font-medium">{p.name_bn}</span>
                                  <span className="text-muted-foreground text-[11px]">
                                    ({p.designation || 'স্টাফ'})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}

                            <div className="border-t my-1" />
                            <SelectItem value="__manual__" className="text-xs text-primary font-medium">
                              ✍️ {bn ? 'তালিকার বাইরে নতুন নাম লিখুন' : 'Enter custom name...'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-muted/20 p-2.5 rounded-lg border">
                        <div>
                          <Label className="text-[11px]">{bn ? 'নাম (বাংলা) *' : 'Name (Bangla) *'}</Label>
                          <Input
                            value={draft.manualNameBn}
                            onChange={(e) => setRoleDraft(roleDef.key, { manualNameBn: e.target.value })}
                            placeholder={bn ? 'যেমন: মাওলানা আব্দুল করিম' : 'e.g. Maulana Abdul Karim'}
                            className="bg-background text-xs h-8 mt-0.5"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px]">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                            <Input
                              value={draft.manualNameEn}
                              onChange={(e) => setRoleDraft(roleDef.key, { manualNameEn: e.target.value })}
                              placeholder="e.g. Abdul Karim"
                              className="bg-background text-xs h-8 mt-0.5"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">{bn ? 'পদবি (বাংলা)' : 'Designation'}</Label>
                            <Input
                              value={draft.manualDesignationBn}
                              onChange={(e) => setRoleDraft(roleDef.key, { manualDesignationBn: e.target.value })}
                              placeholder={bn ? 'যেমন: মুহতামিম' : 'e.g. Principal'}
                              className="bg-background text-xs h-8 mt-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {isAssigned && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearRole(roleDef.key)}
                          disabled={updateAuthority.isPending}
                          className="text-xs text-destructive hover:bg-destructive/10 h-8"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          {bn ? 'খালি করুন' : 'Clear'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveRole(roleDef.key)}
                        disabled={updateAuthority.isPending}
                        className="btn-primary-gradient text-xs h-8 gap-1.5"
                      >
                        {updateAuthority.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {bn ? 'দায়িত্ব সংরক্ষণ করুন' : 'Save Assignment'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ═══════════ MODAL 1: Configure Document Placements / Scopes ═══════════ */}
      <Dialog open={!!activeScopeRole} onOpenChange={(open) => { if (!open) setActiveScopeRole(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeScopeRole?.icon}</span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {bn ? `স্বাক্ষরের স্থান ও আওতা: ${activeScopeRole?.label_bn}` : `Set Placement Scopes: ${activeScopeRole?.label_en}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {bn
                    ? 'নির্ধারণ করুন এই কর্মকর্তার স্বাক্ষর, নাম ও পদবি কোন কোন ডকুমেন্টে স্বয়ংক্রিয়ভাবে যাবে।'
                    : 'Select which documents will automatically display this official’s name, designation, and signature.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">
                {bn ? `নির্বাচিত: ${editingScopes.length}টি ডকুমেন্ট` : `Selected: ${editingScopes.length} documents`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingScopes(DOCUMENT_SCOPES.map(d => d.id))}
                  className="h-6 text-[11px] text-primary"
                >
                  {bn ? 'সবগুলো নির্বাচন' : 'Select All'}
                </Button>
                <span className="text-muted-foreground">•</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingScopes([])}
                  className="h-6 text-[11px] text-muted-foreground"
                >
                  {bn ? 'সব আনচেক' : 'Deselect All'}
                </Button>
              </div>
            </div>

            {/* Scope categories */}
            {(['academic', 'financial', 'general'] as const).map((cat) => {
              const catItems = DOCUMENT_SCOPES.filter((d) => d.category === cat);
              const catTitle =
                cat === 'academic'
                  ? bn ? '🎓 একাডেমিক ও পরীক্ষা সংক্রান্ত' : 'Academic & Exams'
                  : cat === 'financial'
                  ? bn ? '💰 অর্থ ও হিসাব সংক্রান্ত' : 'Finance & Accounts'
                  : bn ? '🏛️ সাধারণ ও প্রাতিষ্ঠানিক' : 'General & Institutional';

              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    {catTitle}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {catItems.map((item) => {
                      const isChecked = editingScopes.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleScope(item.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs'
                              : 'bg-card/70 border-border hover:bg-muted/40'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleScope(item.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span>{item.icon}</span>
                              <span>{bn ? item.label_bn : item.label_en}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {bn ? item.desc_bn : item.label_en}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveScopeRole(null)}
            >
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveScopes}
              disabled={updateRoleScopes.isPending}
              className="btn-primary-gradient gap-1.5"
            >
              {updateRoleScopes.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {bn ? 'আওতা সংরক্ষণ করুন' : 'Save Placement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ MODAL 2: Add Custom Signatory Role ═══════════ */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {bn ? 'নতুন স্বাক্ষরকারী পদবি যোগ করুন' : 'Add Custom Signatory Role'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {bn
                ? 'একটি নতুন দায়িত্বপ্রাপ্ত পদবি তৈরি করুন এবং নির্ধারণ করুন কোন কোন ফাইলে তার স্বাক্ষর যাবে।'
                : 'Create a new signatory authority role and specify which documents their signature applies to.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {bn ? 'পদবির নাম (বাংলা) *' : 'Role Title (Bangla) *'}
                </Label>
                <Input
                  value={newRoleLabelBn}
                  onChange={(e) => setNewRoleLabelBn(e.target.value)}
                  placeholder={bn ? 'যেমন: সহ-মুহতামিম / উপাধ্যক্ষ' : 'e.g. Vice-Principal'}
                  className="bg-background text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">
                  {bn ? 'পদবির নাম (ইংরেজি)' : 'Role Title (English)'}
                </Label>
                <Input
                  value={newRoleLabelEn}
                  onChange={(e) => setNewRoleLabelEn(e.target.value)}
                  placeholder="e.g. Vice-Principal"
                  className="bg-background text-xs"
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{bn ? 'আইকন নির্বাচন' : 'Select Icon'}</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewRoleIcon(emoji)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all ${
                      newRoleIcon === emoji
                        ? 'border-primary bg-primary/10 shadow-xs scale-105'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {bn ? 'দায়িত্বের বিবরণ / উদ্দেশ্য' : 'Description / Purpose'}
              </Label>
              <Input
                value={newRoleDescBn}
                onChange={(e) => setNewRoleDescBn(e.target.value)}
                placeholder={bn ? 'যেমন: প্রাতিষ্ঠানিক প্রত্যয়ন ও মার্কশিটে যৌথ স্বাক্ষরকারী' : 'e.g. Co-signatory for academic certificates'}
                className="bg-background text-xs"
              />
            </div>

            {/* Initial Scopes selection */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  {bn ? 'কোন কোন ডকুমেন্টে স্বাক্ষর যাবে?' : 'Which documents will display this signature?'}
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {bn ? `${newRoleScopes.length}টি নির্বাচিত` : `${newRoleScopes.length} selected`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                {DOCUMENT_SCOPES.map((item) => {
                  const isChecked = newRoleScopes.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleNewRoleScope(item.id)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-card border-border hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleNewRoleScope(item.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <span>{item.icon}</span>
                          <span>{bn ? item.label_bn : item.label_en}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddRoleOpen(false)}
            >
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCustomRole}
              disabled={addCustomRole.isPending}
              className="btn-primary-gradient gap-1.5"
            >
              {addCustomRole.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {bn ? 'পদবি যোগ করুন' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
