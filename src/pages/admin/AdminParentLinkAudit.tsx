import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { History, Link2, Unlink, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

type AuditRow = {
  id: string;
  parent_account_id: string;
  student_uuid: string | null;
  action: 'linked' | 'unlinked' | 'refreshed';
  match_reason: string | null;
  before_uuids: string[];
  after_uuids: string[];
  source: string;
  triggered_by_student_uuid: string | null;
  notes: string | null;
  created_at: string;
};

const reasonLabel = (r: string | null, bn: boolean) => {
  if (!r) return bn ? '—' : '—';
  const map: Record<string, [string, string]> = {
    father_nid: ['পিতার NID', "Father's NID"],
    mother_nid: ['মাতার NID', "Mother's NID"],
    guardian_nid: ['অভিভাবকের NID', "Guardian's NID"],
    father_phone: ['পিতার ফোন', "Father's Phone"],
    mother_phone: ['মাতার ফোন', "Mother's Phone"],
    guardian_phone: ['অভিভাবকের ফোন', "Guardian's Phone"],
    unknown: ['অজানা', 'Unknown'],
    manual: ['ম্যানুয়াল', 'Manual'],
  };
  return map[r]?.[bn ? 0 : 1] || r;
};

const sourceLabel = (s: string, bn: boolean) => {
  switch (s) {
    case 'student_change': return bn ? 'ছাত্র আপডেট' : 'Student Update';
    case 'manual_refresh': return bn ? 'ম্যানুয়াল রিফ্রেশ' : 'Manual Refresh';
    case 'signup': return bn ? 'অভিভাবক সাইনআপ' : 'Parent Signup';
    default: return s;
  }
};

const actionBadge = (a: string, bn: boolean) => {
  if (a === 'linked') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><Link2 className="w-3 h-3 mr-1" />{bn ? 'যুক্ত' : 'Linked'}</Badge>;
  if (a === 'unlinked') return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><Unlink className="w-3 h-3 mr-1" />{bn ? 'বিচ্ছিন্ন' : 'Unlinked'}</Badge>;
  return <Badge variant="outline"><RefreshCw className="w-3 h-3 mr-1" />{bn ? 'রিফ্রেশ' : 'Refreshed'}</Badge>;
};

const AdminParentLinkAudit = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [params, setParams] = useSearchParams();
  const parentFilter = params.get('parent') || '';
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['parent-link-audit', parentFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from('parent_student_link_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (parentFilter) q = q.eq('parent_account_id', parentFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  // Collect referenced uuids to resolve names in one query each
  const parentIds = useMemo(() => Array.from(new Set(rows.map(r => r.parent_account_id))), [rows]);
  const studentIds = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach(r => {
      if (r.student_uuid) ids.add(r.student_uuid);
      if (r.triggered_by_student_uuid) ids.add(r.triggered_by_student_uuid);
      r.before_uuids?.forEach(x => ids.add(x));
      r.after_uuids?.forEach(x => ids.add(x));
    });
    return Array.from(ids);
  }, [rows]);

  const { data: parents = [] } = useQuery({
    queryKey: ['audit-parents', parentIds],
    enabled: parentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('parent_accounts').select('id, full_name, email, phone, nid').in('id', parentIds);
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['audit-students', studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, student_id, name_bn, name_en').in('id', studentIds);
      return data || [];
    },
  });

  const parentMap = useMemo(() => Object.fromEntries(parents.map((p: any) => [p.id, p])), [parents]);
  const studentMap = useMemo(() => Object.fromEntries(students.map((s: any) => [s.id, s])), [students]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(r => {
      const p: any = parentMap[r.parent_account_id];
      const s: any = r.student_uuid ? studentMap[r.student_uuid] : null;
      return (
        (p?.full_name || '').toLowerCase().includes(t) ||
        (p?.email || '').toLowerCase().includes(t) ||
        (p?.phone || '').toLowerCase().includes(t) ||
        (p?.nid || '').toLowerCase().includes(t) ||
        (s?.name_bn || '').toLowerCase().includes(t) ||
        (s?.name_en || '').toLowerCase().includes(t) ||
        (s?.student_id || '').toLowerCase().includes(t)
      );
    });
  }, [rows, search, parentMap, studentMap]);

  const renderStudent = (id: string | null) => {
    if (!id) return <span className="text-muted-foreground">—</span>;
    const s: any = studentMap[id];
    if (!s) return <span className="font-mono text-xs">{id.slice(0, 8)}…</span>;
    return (
      <span>
        <span className="font-medium">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</span>
        <span className="text-xs text-muted-foreground ml-1">({s.student_id})</span>
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold">{bn ? 'অভিভাবক-ছাত্র লিঙ্ক অডিট' : 'Parent–Student Link Audit'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {parentFilter && (
              <Badge variant="outline" className="cursor-pointer" onClick={() => { params.delete('parent'); setParams(params); }}>
                {bn ? 'ফিল্টার সরান' : 'Clear filter'} ✕
              </Badge>
            )}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={bn ? 'খুঁজুন…' : 'Search…'} className="pl-9 rounded-xl w-64" />
            </div>
          </div>
        </div>

        <Card className="rounded-[28px] border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">
              {bn ? `মোট ${filtered.length} টি ইভেন্ট` : `${filtered.length} events`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{bn ? 'কোনো অডিট রেকর্ড নেই' : 'No audit records'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'সময়' : 'Time'}</TableHead>
                      <TableHead>{bn ? 'অভিভাবক' : 'Parent'}</TableHead>
                      <TableHead>{bn ? 'ক্রিয়া' : 'Action'}</TableHead>
                      <TableHead>{bn ? 'ছাত্র' : 'Student'}</TableHead>
                      <TableHead>{bn ? 'মিল কারণ' : 'Match Reason'}</TableHead>
                      <TableHead>{bn ? 'উৎস' : 'Source'}</TableHead>
                      <TableHead>{bn ? 'লিঙ্কড: পূর্বে → পরে' : 'Linked: Before → After'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const p: any = parentMap[r.parent_account_id];
                      return (
                        <TableRow key={r.id} className="align-top">
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(r.created_at), 'dd/MM/yyyy')}
                            <br />
                            <span className="text-muted-foreground">{format(new Date(r.created_at), 'hh:mm:ss a')}</span>
                          </TableCell>
                          <TableCell>
                            {p ? (
                              <div className="text-sm">
                                <div className="font-medium">{p.full_name}</div>
                                <div className="text-xs text-muted-foreground">{p.email}</div>
                                {p.phone && <div className="text-xs text-muted-foreground">📱 {p.phone}</div>}
                                {p.nid && <div className="text-xs text-muted-foreground">NID: {p.nid}</div>}
                              </div>
                            ) : (
                              <span className="font-mono text-xs">{r.parent_account_id.slice(0, 8)}…</span>
                            )}
                          </TableCell>
                          <TableCell>{actionBadge(r.action, bn)}</TableCell>
                          <TableCell className="text-sm">{renderStudent(r.student_uuid)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{reasonLabel(r.match_reason, bn)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <Badge variant="outline">{sourceLabel(r.source, bn)}</Badge>
                              {r.triggered_by_student_uuid && r.triggered_by_student_uuid !== r.student_uuid && (
                                <div className="mt-1 text-muted-foreground">
                                  {bn ? 'ট্রিগার:' : 'Trigger:'} {renderStudent(r.triggered_by_student_uuid)}
                                </div>
                              )}
                              {r.notes && <div className="mt-1 italic text-muted-foreground">{r.notes}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-muted">{r.before_uuids?.length || 0}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">{r.after_uuids?.length || 0}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminParentLinkAudit;
