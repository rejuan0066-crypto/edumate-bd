import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Inbox, Eye, CheckCircle2, XCircle, Clock, AlertTriangle, Search, Filter, Trash2, Settings2, MessageSquarePlus, Lock, Globe, Printer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { printComplaintTimeline } from '@/lib/complaintTimelinePrint';
import { format } from 'date-fns';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const STATUS_CONFIG: Record<string, { color: string; icon: any; bn: string; en: string }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', icon: Clock, bn: 'অপেক্ষমাণ', en: 'Pending' },
  in_review: { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: Eye, bn: 'পর্যালোচনায়', en: 'In Review' },
  resolved: { color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle2, bn: 'সমাধান', en: 'Resolved' },
  rejected: { color: 'bg-red-500/10 text-red-700 border-red-500/20', icon: XCircle, bn: 'প্রত্যাখ্যাত', en: 'Rejected' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bn: string; en: string }> = {
  low: { color: 'bg-gray-500/10 text-gray-700', bn: 'কম', en: 'Low' },
  medium: { color: 'bg-blue-500/10 text-blue-700', bn: 'মাঝারি', en: 'Medium' },
  high: { color: 'bg-orange-500/10 text-orange-700', bn: 'উচ্চ', en: 'High' },
  urgent: { color: 'bg-red-500/10 text-red-700', bn: 'জরুরি', en: 'Urgent' },
};

const CATEGORY_LABEL: Record<string, { bn: string; en: string }> = {
  academic: { bn: 'শিক্ষা', en: 'Academic' },
  financial: { bn: 'আর্থিক', en: 'Financial' },
  infrastructure: { bn: 'অবকাঠামো', en: 'Infrastructure' },
  staff: { bn: 'কর্মী', en: 'Staff' },
  other: { bn: 'অন্যান্য', en: 'Other' },
};

const AdminComplaints = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateIsPublic, setUpdateIsPublic] = useState(true);

  const { data: timeline = [] } = useQuery({
    queryKey: ['admin-complaint-updates', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaint_updates')
        .select('*')
        .eq('complaint_id', selected.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.id || !updateMessage.trim()) throw new Error('Message required');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('complaint_updates').insert({
        complaint_id: selected.id,
        update_type: 'note',
        message: updateMessage.trim(),
        is_public: updateIsPublic,
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-complaint-updates', selected?.id] });
      setUpdateMessage('');
      toast({ title: language === 'bn' ? 'আপডেট যোগ হয়েছে' : 'Update added' });
    },
    onError: (e) => toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }),
  });

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from('complaints').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-complaints'] });
      toast({ title: language === 'bn' ? 'হালনাগাদ সম্পন্ন' : 'Updated successfully' });
      setSelected(null);
      setResolution('');
    },
    onError: (e) => toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('complaints').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-complaints'] });
      toast({ title: language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted' });
      setDeleteId(null);
    },
  });

  const filtered = complaints.filter((c: any) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.subject?.toLowerCase().includes(q) || c.ticket_number?.toLowerCase().includes(q) || c.complainant_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c: any) => c.status === 'pending').length,
    in_review: complaints.filter((c: any) => c.status === 'in_review').length,
    resolved: complaints.filter((c: any) => c.status === 'resolved').length,
    urgent: complaints.filter((c: any) => c.priority === 'urgent' && c.status !== 'resolved').length,
  };

  const handleResolve = (status: 'resolved' | 'rejected' | 'in_review') => {
    if (!selected) return;
    const updates: any = { status };
    if (status === 'resolved' || status === 'rejected') {
      updates.resolution_notes = resolution || null;
      updates.resolved_at = new Date().toISOString();
    }
    updateMutation.mutate({ id: selected.id, updates });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary" />
            {language === 'bn' ? 'অভিযোগ ব্যবস্থাপনা' : 'Complaints Management'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'bn' ? 'সকল অভিযোগ পর্যালোচনা ও সমাধান করুন' : 'Review and resolve all complaints'}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl gap-2">
          <a href="/admin/complaints/fields">
            <Settings2 className="w-4 h-4" />
            {language === 'bn' ? 'ফর্ম ফিল্ড সেটিংস' : 'Form Field Settings'}
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: language === 'bn' ? 'মোট' : 'Total', value: stats.total, color: 'text-primary' },
          { label: language === 'bn' ? 'অপেক্ষমাণ' : 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: language === 'bn' ? 'পর্যালোচনায়' : 'In Review', value: stats.in_review, color: 'text-blue-600' },
          { label: language === 'bn' ? 'সমাধান' : 'Resolved', value: stats.resolved, color: 'text-green-600' },
          { label: language === 'bn' ? 'জরুরি' : 'Urgent', value: stats.urgent, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="rounded-[28px] border-0 bg-card/80 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-[28px] border-0 bg-card/80 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={language === 'bn' ? 'অনুসন্ধান...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{language === 'bn' ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল অগ্রাধিকার' : 'All Priority'}</SelectItem>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{language === 'bn' ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-[28px] border-0 bg-card/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Inbox className="w-16 h-16 mx-auto mb-3 opacity-30" />
            {language === 'bn' ? 'কোনো অভিযোগ পাওয়া যায়নি' : 'No complaints found'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const sCfg = STATUS_CONFIG[c.status];
            const pCfg = PRIORITY_CONFIG[c.priority];
            const SIcon = sCfg.icon;
            return (
              <Card key={c.id} className="rounded-[24px] border-0 bg-card/80 backdrop-blur-xl hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-xs px-2 py-1 rounded-lg bg-muted">{c.ticket_number}</span>
                        <Badge variant="outline" className={`${sCfg.color} border`}><SIcon className="w-3 h-3 mr-1" />{language === 'bn' ? sCfg.bn : sCfg.en}</Badge>
                        <Badge variant="outline" className={pCfg.color}>{language === 'bn' ? pCfg.bn : pCfg.en}</Badge>
                        <Badge variant="outline">{language === 'bn' ? CATEGORY_LABEL[c.category]?.bn : CATEGORY_LABEL[c.category]?.en}</Badge>
                        {c.is_anonymous && <Badge variant="outline" className="bg-purple-500/10 text-purple-700">{language === 'bn' ? 'বেনামি' : 'Anonymous'}</Badge>}
                      </div>
                      <h3 className="font-semibold text-lg">{c.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {!c.is_anonymous && c.complainant_name && <span>{c.complainant_name} • </span>}
                        {format(new Date(c.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setSelected(c); setResolution(c.resolution_notes || ''); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-xl text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {selected?.subject}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="font-mono text-sm px-3 py-1 rounded-lg bg-muted">{selected.ticket_number}</span>
                <Badge className={STATUS_CONFIG[selected.status].color}>{language === 'bn' ? STATUS_CONFIG[selected.status].bn : STATUS_CONFIG[selected.status].en}</Badge>
                <Badge className={PRIORITY_CONFIG[selected.priority].color}>{language === 'bn' ? PRIORITY_CONFIG[selected.priority].bn : PRIORITY_CONFIG[selected.priority].en}</Badge>
              </div>

              <div>
                <Label className="text-muted-foreground">{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
                <p className="mt-1 p-4 rounded-2xl bg-muted/50 whitespace-pre-wrap">{selected.description}</p>
              </div>

              {!selected.is_anonymous && (selected.complainant_name || selected.complainant_phone || selected.complainant_email) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/30">
                  {selected.complainant_name && <div><Label className="text-xs text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</Label><p className="font-medium">{selected.complainant_name}</p></div>}
                  {selected.complainant_phone && <div><Label className="text-xs text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}</Label><p className="font-medium">{selected.complainant_phone}</p></div>}
                  {selected.complainant_email && <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium text-sm">{selected.complainant_email}</p></div>}
                </div>
              )}

              <div>
                <Label>{language === 'bn' ? 'সমাধানের নোট' : 'Resolution Notes'}</Label>
                <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} className="rounded-xl mt-1" placeholder={language === 'bn' ? 'কী পদক্ষেপ নেওয়া হয়েছে...' : 'What actions were taken...'} />
              </div>

              {/* Add Update */}
              <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-primary" />
                  <Label className="font-semibold">{language === 'bn' ? 'টাইমলাইনে আপডেট যোগ করুন' : 'Add Timeline Update'}</Label>
                </div>
                <Textarea
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  rows={2}
                  className="rounded-xl"
                  placeholder={language === 'bn' ? 'যেমন: তদন্ত শুরু হয়েছে, পক্ষের সাথে যোগাযোগ করা হয়েছে...' : 'e.g. Investigation started, contacted the party...'}
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    {updateIsPublic ? <Globe className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                    <Switch checked={updateIsPublic} onCheckedChange={setUpdateIsPublic} />
                    <span className="text-muted-foreground">
                      {updateIsPublic
                        ? (language === 'bn' ? 'অভিযোগকারী দেখতে পাবে' : 'Visible to complainant')
                        : (language === 'bn' ? 'শুধু অভ্যন্তরীণ নোট' : 'Internal note only')}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addUpdateMutation.mutate()}
                    disabled={!updateMessage.trim() || addUpdateMutation.isPending}
                    className="rounded-xl"
                  >
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'যোগ করুন' : 'Add Update'}
                  </Button>
                </div>
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{language === 'bn' ? 'টাইমলাইন' : 'Timeline'}</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {timeline.map((u: any) => (
                      <div key={u.id} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs capitalize">{u.update_type.replace('_', ' ')}</Badge>
                          {u.to_status && <Badge variant="outline" className="text-xs">→ {u.to_status}</Badge>}
                          {!u.is_public && <Badge variant="outline" className="text-xs bg-muted"><Lock className="w-3 h-3 mr-1" />{language === 'bn' ? 'অভ্যন্তরীণ' : 'Internal'}</Badge>}
                          <span className="text-xs text-muted-foreground ml-auto">{format(new Date(u.created_at), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                        {u.message && <p className="text-sm whitespace-pre-wrap">{u.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => handleResolve('in_review')} variant="outline" className="rounded-xl flex-1" disabled={updateMutation.isPending}>
                  <Eye className="w-4 h-4 mr-2" />{language === 'bn' ? 'পর্যালোচনায় নিন' : 'Mark In Review'}
                </Button>
                <Button onClick={() => handleResolve('resolved')} className="rounded-xl flex-1 bg-green-600 hover:bg-green-700" disabled={updateMutation.isPending}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />{language === 'bn' ? 'সমাধান করুন' : 'Resolve'}
                </Button>
                <Button onClick={() => handleResolve('rejected')} variant="destructive" className="rounded-xl flex-1" disabled={updateMutation.isPending}>
                  <XCircle className="w-4 h-4 mr-2" />{language === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={language === 'bn' ? 'অভিযোগ মুছবেন?' : 'Delete Complaint?'}
      />
    </div>
  );
};

export default AdminComplaints;
