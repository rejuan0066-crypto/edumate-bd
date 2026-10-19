import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Calendar, Phone, Mail, MapPin, Briefcase, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import OtpVerificationDialog from "@/components/OtpVerificationDialog";
import { useAdminOtpGate } from "@/hooks/useAdminOtpGate";
import CommitteeAttachments from "@/components/CommitteeAttachments";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { getStaffDisplayNames } from "@/lib/nameFormatter";

type Committee = {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  formation_date: string | null;
  tenure_months: number | null;
  expiry_date: string | null;
  is_active: boolean;
  sort_order: number;
};

type Member = {
  id: string;
  committee_id: string;
  staff_id: string | null;
  name: string;
  name_en: string | null;
  designation: string;
  designation_en: string | null;
  phone: string | null;
  email: string | null;
  nid: string | null;
  address: string | null;
  occupation: string | null;
  occupation_en: string | null;
  photo_url: string | null;
  joining_date: string | null;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

const emptyCommittee: Partial<Committee> = {
  name: "", name_en: "", description: "", description_en: "",
  formation_date: "", tenure_months: null, expiry_date: "",
  is_active: true, sort_order: 0,
};

const emptyMember: Partial<Member> = {
  staff_id: null,
  name: "", name_en: "", designation: "", designation_en: "",
  phone: "", email: "", nid: "", address: "", occupation: "", occupation_en: "",
  photo_url: "", joining_date: "", is_active: true, sort_order: 0, notes: "",
};

export default function AdminCommittees() {
  const { language } = useLanguage();
  const bn = language === "bn";
  const qc = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/committees');

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [committeeDialog, setCommitteeDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<Partial<Committee> | null>(null);
  const [editingMember, setEditingMember] = useState<Partial<Member> | null>(null);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [deleteCommittee, setDeleteCommittee] = useState<Committee | null>(null);
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);
  const [memberFieldErrors, setMemberFieldErrors] = useState<Record<string, string>>({});
  const clearMemberFieldError = (f: string) =>
    setMemberFieldErrors(prev => {
      if (!prev[f]) return prev;
      const { [f]: _, ...rest } = prev;
      return rest;
    });
  const otpGate = useAdminOtpGate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Prefill member dialog when navigated from User Management with ?prefill_email=&prefill_name=
  useEffect(() => {
    const pEmail = searchParams.get("prefill_email");
    const pName = searchParams.get("prefill_name");
    if (pEmail || pName) {
      setEditingMember({ ...emptyMember, name: pName || "", email: pEmail || "" });
      setMemberDialog(true);
      // Clean URL so it doesn't reopen on next render
      const next = new URLSearchParams(searchParams);
      next.delete("prefill_email");
      next.delete("prefill_name");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { data: committees = [], isLoading: loadingC } = useQuery({
    queryKey: ["committees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("committees").select("*")
        .is("deleted_at", null).order("sort_order").order("created_at");
      if (error) throw error;
      return data as Committee[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["committee-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("committee_members").select("*")
        .is("deleted_at", null).order("sort_order").order("created_at");
      if (error) throw error;
      return data as Member[];
    },
  });

  const { data: staffOptions = [] } = useQuery({
    queryKey: ["committee-staff-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name_bn, name_en, designation, photo_url, phone, email, address")
        .order("name_bn");
      if (error) throw error;
      return data as any[];
    },
  });

  const saveCommittee = useMutation({
    mutationFn: async (c: Partial<Committee>) => {
      const payload = {
        ...c,
        formation_date: c.formation_date || null,
        expiry_date: c.expiry_date || null,
        tenure_months: c.tenure_months ? Number(c.tenure_months) : null,
        sort_order: Number(c.sort_order || 0),
      };
      if (c.id) {
        const { error } = await supabase.from("committees").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        delete (payload as any).id;
        const { error } = await supabase.from("committees").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committees"] });
      setCommitteeDialog(false);
      setEditingCommittee(null);
      toast.success(bn ? "সংরক্ষিত হয়েছে" : "Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMember = useMutation({
    mutationFn: async (m: Partial<Member> & { _confirmDuplicate?: boolean }) => {
      let allowOverlap = false;
      // Client-side guard: warn if this staff is already an active member of another committee
      if (m.staff_id && (m.is_active !== false)) {
        const existing = members.filter(
          (x) => x.staff_id === m.staff_id && x.is_active && x.committee_id !== m.committee_id && x.id !== m.id
        );
        if (existing.length > 0) {
          const names = existing
            .map((x) => committees.find((c) => c.id === x.committee_id)?.name)
            .filter(Boolean)
            .join(", ");
          const msg = bn
            ? `এই স্টাফ ইতিমধ্যে এই কমিটিগুলোতে আছেন: ${names}\n\nতবুও যোগ করবেন?`
            : `This staff is already in: ${names}\n\nAdd anyway?`;
          if (!window.confirm(msg)) {
            throw new Error("__cancelled__");
          }
          allowOverlap = true;
        }
      }
      const payload: any = { ...m };
      delete payload._confirmDuplicate;
      payload.joining_date = m.joining_date || null;
      payload.sort_order = Number(m.sort_order || 0);
      payload.allow_overlap = allowOverlap;
      if (m.id) {
        const { error } = await supabase.from("committee_members").update(payload).eq("id", m.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("committee_members").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-members"] });
      qc.invalidateQueries({ queryKey: ["committee-staff-ids"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["salary-staff"] });
      setMemberDialog(false);
      setEditingMember(null);
      toast.success(bn ? "সংরক্ষিত হয়েছে" : "Saved");
    },
    onError: (e: any) => {
      if (e.message === "__cancelled__") return;
      const raw = String(e?.message || e || "");
      const msg = raw.toUpperCase();
      if (msg.includes("OVERLAP_BLOCKED")) {
        toast.error(bn ? "ওভারল্যাপ ব্লক: এই স্টাফ ইতিমধ্যে অন্য কমিটিতে সক্রিয়" : "Overlap blocked: staff is already in another active committee");
        return;
      }
      // Duplicate NID across staff / administrative / committee tables
      if (msg.includes("DUPLICATE_NID") || (msg.includes("CROSS_TABLE_DUPLICATE") && /nid|এনআইডি/i.test(raw))) {
        let nidMsg = bn
          ? "এই NID দিয়ে ইতিমধ্যে একজন রেজিস্টার্ড আছেন।"
          : "This NID is already registered.";
        if (/staff|স্টাফ/i.test(raw)) nidMsg = bn ? "এই NID দিয়ে ইতিমধ্যে একজন স্টাফ রেজিস্টার্ড আছেন।" : "This NID is already registered to a staff member.";
        else if (/admin|প্রশাসনিক/i.test(raw)) nidMsg = bn ? "এই NID দিয়ে ইতিমধ্যে একজন প্রশাসনিক কর্মকর্তা রেজিস্টার্ড আছেন।" : "This NID is already registered to an administrative officer.";
        else if (/committee|কমিটি/i.test(raw)) nidMsg = bn ? "এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।" : "This NID is already registered to a committee member.";
        setMemberFieldErrors(prev => ({ ...prev, nid: nidMsg }));
        toast.error(nidMsg);
        return;
      }
      toast.error(raw);
    },
  });

  const removeCommittee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("committees").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committees"] });
      toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("committee_members").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["committee-members"] }); qc.invalidateQueries({ queryKey: ["committee-staff-ids"] }); qc.invalidateQueries({ queryKey: ["staff"] }); qc.invalidateQueries({ queryKey: ["salary-staff"] });
      toast.success(bn ? "মুছে ফেলা হয়েছে" : "Deleted");
    },
  });

  const handlePhotoUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `committee/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("website-assets").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("website-assets").getPublicUrl(path);
    setEditingMember(m => ({ ...(m || {}), photo_url: data.publicUrl }));
  };

  const toggleExpand = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const membersByCommittee = (cid: string) => members.filter(m => m.committee_id === cid);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 p-6 shadow-[0_20px_60px_-20px_rgba(6,78,59,0.5)]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-emerald-950" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{bn ? "প্রতিষ্ঠানের কমিটি" : "Institution Committees"}</h1>
              <p className="text-sm text-emerald-100/80 mt-1">
                {bn ? "কমিটি ও সদস্যদের পদবিসহ তথ্য ব্যবস্থাপনা" : "Manage committees & members with designations"}
              </p>
            </div>
          </div>
          {canAddItem && (
            <Button onClick={() => { setEditingCommittee({ ...emptyCommittee }); setCommitteeDialog(true); }}
              className="bg-amber-400 hover:bg-amber-500 text-emerald-950 font-semibold rounded-2xl">
              <Plus className="w-4 h-4 mr-1" /> {bn ? "নতুন কমিটি" : "New Committee"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-[28px] p-5 border-l-4 border-l-emerald-500 bg-card/60 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">{bn ? "মোট কমিটি" : "Total Committees"}</div>
          <div className="text-3xl font-bold mt-1 tabular-nums">{committees.length}</div>
        </Card>
        <Card className="rounded-[28px] p-5 border-l-4 border-l-amber-500 bg-card/60 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">{bn ? "সক্রিয় কমিটি" : "Active"}</div>
          <div className="text-3xl font-bold mt-1 tabular-nums">{committees.filter(c => c.is_active).length}</div>
        </Card>
        <Card className="rounded-[28px] p-5 border-l-4 border-l-teal-500 bg-card/60 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">{bn ? "মোট সদস্য" : "Total Members"}</div>
          <div className="text-3xl font-bold mt-1 tabular-nums">{members.length}</div>
        </Card>
      </div>

      {/* Committee list */}
      {loadingC ? (
        <div className="text-center py-12 text-muted-foreground">{bn ? "লোড হচ্ছে..." : "Loading..."}</div>
      ) : committees.length === 0 ? (
        <Card className="rounded-[28px] p-12 text-center text-muted-foreground bg-card/40">
          {bn ? "কোনো কমিটি যোগ করা হয়নি। উপরের 'নতুন কমিটি' বাটনে ক্লিক করুন।" : "No committees yet. Click 'New Committee' above."}
        </Card>
      ) : (
        <div className="space-y-3">
          {committees.map(c => {
            const cms = membersByCommittee(c.id);
            const isOpen = expanded.has(c.id);
            return (
              <Card key={c.id} className="rounded-[28px] bg-card/60 backdrop-blur-xl overflow-hidden border border-border/40">
                <div className="p-5 flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => toggleExpand(c.id)} className="text-lg font-bold text-foreground hover:text-primary flex items-center gap-1">
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        {bn ? c.name : (c.name_en || c.name)}
                      </button>
                      {c.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0">{bn ? "সক্রিয়" : "Active"}</Badge>
                      ) : (
                        <Badge variant="secondary">{bn ? "নিষ্ক্রিয়" : "Inactive"}</Badge>
                      )}
                      <Badge variant="outline" className="rounded-full">
                        <Users className="w-3 h-3 mr-1" /> {cms.length} {bn ? "সদস্য" : "members"}
                      </Badge>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mt-2">{bn ? c.description : (c.description_en || c.description)}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {c.formation_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{bn ? "গঠন:" : "Formed:"} {c.formation_date}</span>}
                      {c.expiry_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{bn ? "মেয়াদ শেষ:" : "Expires:"} {c.expiry_date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditItem && (
                      <Button size="sm" variant="outline" onClick={() => { setActiveCommitteeId(c.id); setEditingMember({ ...emptyMember, committee_id: c.id }); setMemberDialog(true); }}>
                        <Plus className="w-4 h-4 mr-1" /> {bn ? "সদস্য" : "Member"}
                      </Button>
                    )}
                    {canEditItem && (
                      <Button size="icon" variant="ghost" onClick={() => { setEditingCommittee(c); setCommitteeDialog(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteItem && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteCommittee(c)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/40 bg-muted/20 p-4">
                    {cms.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        {bn ? "কোনো সদস্য যোগ করা হয়নি।" : "No members added yet."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cms.map(m => (
                          <Card key={m.id} className="rounded-[20px] p-4 bg-background/80 hover:-translate-y-[3px] transition-transform border border-border/40">
                            <div className="flex items-start gap-3">
                              {m.photo_url ? (
                                <img src={m.photo_url} alt={m.name} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                                  {getStaffDisplayNames(m.name, m.name_en, bn).primary.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{getStaffDisplayNames(m.name, m.name_en, bn).primary}</div>
                                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">{bn ? m.designation : (m.designation_en || m.designation)}</div>
                                {m.occupation && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Briefcase className="w-3 h-3" />{bn ? m.occupation : (m.occupation_en || m.occupation)}</div>}
                                {m.phone && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{m.phone}</div>}
                                {m.email && <div className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{m.email}</div>}
                                {m.address && <div className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{m.address}</div>}
                              </div>
                              <div className="flex flex-col gap-1">
                                {canEditItem && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setActiveCommitteeId(c.id); setEditingMember(m); setMemberDialog(true); }}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                {canDeleteItem && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteMember(m)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <CommitteeAttachments committeeId={c.id} committeeName={c.name} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Committee Dialog */}
      <Dialog open={committeeDialog} onOpenChange={setCommitteeDialog}>
        <DialogContent className="max-w-2xl rounded-[38px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCommittee?.id ? (bn ? "কমিটি সম্পাদনা" : "Edit Committee") : (bn ? "নতুন কমিটি" : "New Committee")}</DialogTitle>
          </DialogHeader>
          {editingCommittee && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? "নাম (বাংলা) *" : "Name (Bangla) *"}</Label>
                  <Input value={editingCommittee.name || ""} onChange={e => setEditingCommittee({ ...editingCommittee, name: e.target.value })} placeholder="যেমন: ম্যানেজিং কমিটি" />
                </div>
                <div>
                  <Label>{bn ? "নাম (ইংরেজি)" : "Name (English)"}</Label>
                  <Input value={editingCommittee.name_en || ""} onChange={e => setEditingCommittee({ ...editingCommittee, name_en: e.target.value })} placeholder="e.g. Managing Committee" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>{bn ? "বিবরণ (বাংলা)" : "Description (Bangla)"}</Label>
                <Textarea rows={2} value={editingCommittee.description || ""} onChange={e => setEditingCommittee({ ...editingCommittee, description: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>{bn ? "বিবরণ (ইংরেজি)" : "Description (English)"}</Label>
                <Textarea rows={2} value={editingCommittee.description_en || ""} onChange={e => setEditingCommittee({ ...editingCommittee, description_en: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">{bn ? "গঠনের তারিখ" : "Formation Date"}</Label>
                <DatePicker value={editingCommittee.formation_date || ""} onChange={v => setEditingCommittee({ ...editingCommittee, formation_date: v })} bengali={bn} clearable fromYear={1980} toYear={2035} />
              </div>
              <div>
                <Label className="mb-1 block">{bn ? "মেয়াদ শেষ" : "Expiry Date"}</Label>
                <DatePicker value={editingCommittee.expiry_date || ""} onChange={v => setEditingCommittee({ ...editingCommittee, expiry_date: v })} bengali={bn} clearable fromYear={1980} toYear={2035} />
              </div>
              <div>
                <Label>{bn ? "মেয়াদ (মাস)" : "Tenure (months)"}</Label>
                <Input type="number" value={editingCommittee.tenure_months ?? ""} onChange={e => setEditingCommittee({ ...editingCommittee, tenure_months: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>{bn ? "সর্ট অর্ডার" : "Sort Order"}</Label>
                <Input type="number" value={editingCommittee.sort_order ?? ''} onChange={e => setEditingCommittee({ ...editingCommittee, sort_order: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-3">
                <Label>{bn ? "সক্রিয়" : "Active"}</Label>
                <Switch checked={!!editingCommittee.is_active} onCheckedChange={v => setEditingCommittee({ ...editingCommittee, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommitteeDialog(false)}>{bn ? "বাতিল" : "Cancel"}</Button>
            <Button onClick={() => editingCommittee && saveCommittee.mutate(editingCommittee)} disabled={!editingCommittee?.name || saveCommittee.isPending}>
              {bn ? "সংরক্ষণ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialog} onOpenChange={(o) => { setMemberDialog(o); if (!o) setMemberFieldErrors({}); }}>
        <DialogContent className="max-w-3xl rounded-[38px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember?.id ? (bn ? "সদস্য সম্পাদনা" : "Edit Member") : (bn ? "নতুন সদস্য" : "New Member")}</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-2">
              {/* Photo */}
              <div className="flex items-center gap-4">
                {editingMember.photo_url ? (
                  <img src={editingMember.photo_url} alt="member" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/40" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Users className="w-8 h-8" /></div>
                )}
                <label className="cursor-pointer px-3 py-2 rounded-md border bg-background text-sm hover:bg-secondary flex items-center gap-1">
                  <Upload className="w-4 h-4" /> {bn ? "ছবি আপলোড" : "Upload Photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                </label>
              </div>

              {/* Link to existing staff */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {bn ? "প্রতিষ্ঠানের স্টাফ থেকে যুক্ত করুন (ঐচ্ছিক)" : "Link to Institution Staff (Optional)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? "স্টাফ সিলেক্ট করলে নাম, পদবি ও ছবি স্বয়ংক্রিয়ভাবে পূরণ হবে। এই স্টাফ বেতন ও হাজিরা তালিকা থেকে বাদ পড়বে।"
                    : "Selecting a staff auto-fills info. The staff will be excluded from salary & attendance lists."}
                </p>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={editingMember.staff_id || ""}
                  onChange={(e) => {
                    const sid = e.target.value || null;
                    if (!sid) { setEditingMember({ ...editingMember, staff_id: null }); return; }
                    const s = staffOptions.find((x: any) => x.id === sid);
                    if (s) {
                      setEditingMember({
                        ...editingMember,
                        staff_id: sid,
                        name: s.name_bn || editingMember.name,
                        name_en: s.name_en || editingMember.name_en,
                        designation: editingMember.designation || s.designation || "",
                        photo_url: s.photo_url || editingMember.photo_url,
                        phone: s.phone || editingMember.phone,
                        email: s.email || editingMember.email,
                        address: s.address || editingMember.address,
                      });
                    } else {
                      setEditingMember({ ...editingMember, staff_id: sid });
                    }
                  }}
                >
                  <option value="">{bn ? "— বহিরাগত সদস্য (স্টাফ নয়) —" : "— External member (not staff) —"}</option>
                  {staffOptions.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name_bn || s.name_en}{s.designation ? ` — ${s.designation}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? "নাম (বাংলা) *" : "Name (Bangla) *"}</Label>
                  <Input value={editingMember.name || ""} onChange={e => setEditingMember({ ...editingMember, name: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? "নাম (ইংরেজি)" : "Name (English)"}</Label>
                  <Input value={editingMember.name_en || ""} onChange={e => setEditingMember({ ...editingMember, name_en: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? "পদবি (বাংলা) *" : "Designation (Bangla) *"}</Label>
                  <Input value={editingMember.designation || ""} onChange={e => setEditingMember({ ...editingMember, designation: e.target.value })} placeholder="যেমন: সভাপতি" />
                </div>
                <div>
                  <Label>{bn ? "পদবি (ইংরেজি)" : "Designation (English)"}</Label>
                  <Input value={editingMember.designation_en || ""} onChange={e => setEditingMember({ ...editingMember, designation_en: e.target.value })} placeholder="e.g. President" />
                </div>
                <div>
                  <Label>{bn ? "পেশা (বাংলা)" : "Occupation (Bangla)"}</Label>
                  <Input value={editingMember.occupation || ""} onChange={e => setEditingMember({ ...editingMember, occupation: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? "পেশা (ইংরেজি)" : "Occupation (English)"}</Label>
                  <Input value={editingMember.occupation_en || ""} onChange={e => setEditingMember({ ...editingMember, occupation_en: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? "ফোন" : "Phone"}</Label>
                  <Input value={editingMember.phone || ""} onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? "ইমেইল" : "Email"}</Label>
                  <Input type="email" value={editingMember.email || ""} onChange={e => setEditingMember({ ...editingMember, email: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label className={memberFieldErrors.nid ? "text-destructive" : ""}>
                    {bn ? "এনআইডি" : "NID"}
                  </Label>
                  <Input
                    value={editingMember.nid || ""}
                    onChange={e => {
                      setEditingMember({ ...editingMember, nid: e.target.value.replace(/[^0-9]/g, "") });
                      clearMemberFieldError("nid");
                    }}
                    inputMode="numeric"
                    aria-invalid={!!memberFieldErrors.nid}
                    className={memberFieldErrors.nid ? "border-destructive ring-1 ring-destructive/30 focus-visible:ring-destructive" : ""}
                    placeholder={bn ? "জাতীয় পরিচয়পত্র নম্বর" : "National ID number"}
                  />
                  {memberFieldErrors.nid && (
                    <p className="text-xs text-destructive mt-1">{memberFieldErrors.nid}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label>{bn ? "ঠিকানা" : "Address"}</Label>
                  <Input value={editingMember.address || ""} onChange={e => setEditingMember({ ...editingMember, address: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">{bn ? "যোগদানের তারিখ" : "Joining Date"}</Label>
                  <DatePicker value={editingMember.joining_date || ""} onChange={v => setEditingMember({ ...editingMember, joining_date: v })} bengali={bn} clearable fromYear={1980} toYear={2035} />
                </div>
                <div>
                  <Label>{bn ? "সর্ট অর্ডার" : "Sort Order"}</Label>
                  <Input type="number" value={editingMember.sort_order ?? ''} onChange={e => setEditingMember({ ...editingMember, sort_order: Number(e.target.value) })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>{bn ? "মন্তব্য" : "Notes"}</Label>
                  <Textarea rows={2} value={editingMember.notes || ""} onChange={e => setEditingMember({ ...editingMember, notes: e.target.value })} />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-xl border p-3">
                  <Label>{bn ? "সক্রিয় সদস্য" : "Active Member"}</Label>
                  <Switch checked={!!editingMember.is_active} onCheckedChange={v => setEditingMember({ ...editingMember, is_active: v })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialog(false)}>{bn ? "বাতিল" : "Cancel"}</Button>
            <Button
              onClick={() => {
                if (!editingMember) return;
                // Inline NID length validation (10, 13, or 17 digits)
                const nidVal = String(editingMember.nid || "").replace(/[^0-9]/g, "");
                if (nidVal) {
                  if (![10, 13, 17].includes(nidVal.length)) {
                    const errMsg = bn
                      ? "এনআইডি ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।"
                      : "NID must be 10, 13, or 17 digits.";
                    setMemberFieldErrors(prev => ({ ...prev, nid: errMsg }));
                    toast.error(errMsg);
                    return;
                  }
                  // Client-side duplicate check within already-loaded committee members
                  const dupLocal = members.some(
                    (x) => String(x.nid || "").replace(/[^0-9]/g, "") === nidVal && x.id !== editingMember.id
                  );
                  if (dupLocal) {
                    const errMsg = bn
                      ? "এই NID দিয়ে ইতিমধ্যে একজন কমিটি সদস্য রেজিস্টার্ড আছেন।"
                      : "This NID is already registered to a committee member.";
                    setMemberFieldErrors(prev => ({ ...prev, nid: errMsg }));
                    toast.error(errMsg);
                    return;
                  }
                }
                setMemberFieldErrors({});
                // Detect overlap to decide whether OTP is required
                const isOverlap =
                  editingMember.staff_id &&
                  editingMember.is_active !== false &&
                  members.some(
                    (x) =>
                      x.staff_id === editingMember.staff_id &&
                      x.is_active &&
                      x.committee_id !== editingMember.committee_id &&
                      x.id !== editingMember.id
                  );
                const run = () => saveMember.mutate(editingMember);
                if (isOverlap) otpGate.requireOtp(run);
                else run();
              }}
              disabled={!editingMember?.name || !editingMember?.designation || saveMember.isPending}
            >
              {bn ? "সংরক্ষণ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteCommittee}
        onOpenChange={(o) => !o && setDeleteCommittee(null)}
        onConfirm={() => { if (deleteCommittee) { removeCommittee.mutate(deleteCommittee.id); setDeleteCommittee(null); } }}
        description={bn ? `"${deleteCommittee?.name}" কমিটি ও এর সকল সদস্য মুছে ফেলা হবে।` : `Committee "${deleteCommittee?.name}" and all its members will be removed.`}
      />
      <DeleteConfirmDialog
        open={!!deleteMember}
        onOpenChange={(o) => !o && setDeleteMember(null)}
        onConfirm={() => { if (deleteMember) { removeMember.mutate(deleteMember.id); setDeleteMember(null); } }}
        description={bn ? `সদস্য "${deleteMember?.name}" মুছে ফেলা হবে।` : `Member "${deleteMember?.name}" will be removed.`}
      />
      <OtpVerificationDialog
        open={otpGate.open}
        onOpenChange={otpGate.setOpen}
        email={otpGate.email}
        purpose="email_verification"
        scope="login"
        onVerified={otpGate.onVerified}
        title={bn ? "ওভারল্যাপ অনুমোদন যাচাই" : "Verify Overlap Approval"}
        description={bn ? "ওভারল্যাপ অনুমোদনের আগে ওটিপি দিন।" : "Enter OTP to authorize multi-committee membership."}
      />
    </div>
  );
}
