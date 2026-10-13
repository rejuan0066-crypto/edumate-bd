import { useState, useMemo } from 'react';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, ArrowDown, ArrowRight, Users, History, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';

const AdminStudentPromotion = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bn = language === 'bn';

  // Source filters
  const [fromSessionId, setFromSessionId] = useState('');
  const [fromDivisionId, setFromDivisionId] = useState('');
  const [fromClassId, setFromClassId] = useState('');

  // Destination filters
  const [toSessionId, setToSessionId] = useState('');
  const [toDivisionId, setToDivisionId] = useState('');
  const [toClassId, setToClassId] = useState('');

  const [promotionType, setPromotionType] = useState<'promoted' | 'demoted' | 'transferred'>('promoted');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = usePersistentTab<'promote' | 'history'>('promote', {
    paramName: 'tab',
    validTabs: ['promote', 'history'] as const,
    storageKey: 'edumate_student_promo_tab',
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['academic-sessions-promo'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').order('name', { ascending: false });
      return data || [];
    },
  });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-promo'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  // Fetch classes
  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes-promo'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const fromClasses = useMemo(() => allClasses.filter(c => c.division_id === fromDivisionId), [allClasses, fromDivisionId]);
  const toClasses = useMemo(() => allClasses.filter(c => c.division_id === toDivisionId), [allClasses, toDivisionId]);

  // Fetch students from source
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['promo-students', fromSessionId, fromClassId, fromDivisionId],
    queryFn: async () => {
      if (!fromSessionId || !fromClassId) return [];
      const { data } = await supabase
        .from('students')
        .select('id, student_id, name_bn, name_en, roll_number, photo_url, status, gender')
        .eq('session_id', fromSessionId)
        .eq('class_id', fromClassId)
        .eq('division_id', fromDivisionId)
        .eq('status', 'active')
        .order('roll_number');
      return data || [];
    },
    enabled: !!fromSessionId && !!fromClassId && !!fromDivisionId,
  });

  // Fetch promotion history
  const { data: history = [] } = useQuery({
    queryKey: ['promotion-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotion_history')
        .select('*, students:student_id(name_bn, name_en, student_id, photo_url)')
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
  });

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const bnToEn = (str: string) =>
      str.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const stripZero = (str: string) => str.replace(/^0+/, '') || '0';
    const raw = searchTerm.trim();
    const s = bnToEn(raw).toLowerCase();
    const isNumeric = /^\d+$/.test(s);
    const sNorm = isNumeric ? stripZero(s) : s;
    return students.filter((st: any) => {
      const roll = String(st.roll_number || '');
      const sid = String(st.student_id || '').toLowerCase();
      if (isNumeric) {
        return stripZero(roll) === sNorm || stripZero(sid) === sNorm || sid === s;
      }
      return (
        (st.name_bn || '').toLowerCase().includes(s) ||
        (st.name_en || '').toLowerCase().includes(s) ||
        sid.includes(s) ||
        roll.toLowerCase().includes(s)
      );
    });
  }, [students, searchTerm]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s: any) => s.id)));
    }
  };

  const handlePromotion = async () => {
    if (!toSessionId || !toClassId || !toDivisionId) {
      toast.error(bn ? 'গন্তব্য সেশন, বিভাগ ও শ্রেণী নির্বাচন করুন' : 'Select destination session, division & class');
      return;
    }
    if (selectedStudents.size === 0) {
      toast.error(bn ? 'ছাত্র নির্বাচন করুন' : 'Select students');
      return;
    }
    if (fromClassId === toClassId && fromSessionId === toSessionId && fromDivisionId === toDivisionId) {
      toast.error(bn ? 'উৎস ও গন্তব্য একই হতে পারে না' : 'Source and destination cannot be the same');
      return;
    }

    setIsProcessing(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const selectedStudentData = students.filter((s: any) => studentIds.includes(s.id));

      // Get max roll in destination class
      const { data: maxRoll } = await supabase
        .from('students')
        .select('roll_number')
        .eq('session_id', toSessionId)
        .eq('class_id', toClassId)
        .eq('division_id', toDivisionId)
        .order('roll_number', { ascending: false })
        .limit(1);

      let nextRollBase = 1;
      if (maxRoll && maxRoll.length > 0 && maxRoll[0].roll_number) {
        const num = parseInt(maxRoll[0].roll_number, 10);
        if (!isNaN(num)) nextRollBase = num + 1;
      }

      // Insert promotion history
      const historyRecords = selectedStudentData.map((s: any, i: number) => ({
        student_id: s.id,
        from_session_id: fromSessionId,
        to_session_id: toSessionId,
        from_class_id: fromClassId,
        to_class_id: toClassId,
        from_division_id: fromDivisionId,
        to_division_id: toDivisionId,
        from_roll_number: s.roll_number,
        to_roll_number: String(nextRollBase + i),
        promotion_type: promotionType,
        promoted_by: user?.id,
        remarks: remarks || null,
      }));

      const { error: histError } = await supabase.from('promotion_history').insert(historyRecords);
      if (histError) throw histError;

      // Update each student
      for (let i = 0; i < selectedStudentData.length; i++) {
        const s = selectedStudentData[i];
        const { error } = await supabase
          .from('students')
          .update({
            session_id: toSessionId,
            class_id: toClassId,
            division_id: toDivisionId,
            roll_number: String(nextRollBase + i),
          })
          .eq('id', s.id);
        if (error) throw error;
      }

      toast.success(
        bn
          ? `${selectedStudents.size} জন ছাত্র ${promotionType === 'promoted' ? 'প্রমোট' : promotionType === 'demoted' ? 'ডিমোট' : 'ট্রান্সফার'} করা হয়েছে`
          : `${selectedStudents.size} students ${promotionType} successfully`
      );

      setSelectedStudents(new Set());
      setRemarks('');
      await invalidateAllStudentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['promo-students'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-history'] });
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? 'প্রমোশন ব্যর্থ হয়েছে' : 'Promotion failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSessionName = (id: string) => {
    const s = sessions.find((x: any) => x.id === id);
    return s ? (bn ? s.name_bn || s.name : s.name) : '';
  };
  const getDivisionName = (id: string) => {
    const d = divisions.find((x: any) => x.id === id);
    return d ? (bn ? d.name_bn : d.name) : '';
  };
  const getClassName = (id: string) => {
    const c = allClasses.find((x: any) => x.id === id);
    return c ? (bn ? c.name_bn : c.name) : '';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-display font-bold text-foreground">
        {bn ? 'ছাত্র প্রমোশন/ডিমোশন' : 'Student Promotion/Demotion'}
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="promote">
            <ArrowUp className="h-4 w-4 mr-1" />
            {bn ? 'প্রমোশন/ডিমোশন' : 'Promote/Demote'}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            {bn ? 'হিস্ট্রি' : 'History'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promote" className="space-y-4">
          {/* Promotion Type */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {(['promoted', 'demoted', 'transferred'] as const).map(t => (
                  <Button
                    key={t}
                    variant={promotionType === t ? 'default' : 'outline'}
                    onClick={() => setPromotionType(t)}
                    size="sm"
                  >
                    {t === 'promoted' && <ArrowUp className="h-4 w-4 mr-1" />}
                    {t === 'demoted' && <ArrowDown className="h-4 w-4 mr-1" />}
                    {t === 'transferred' && <ArrowRight className="h-4 w-4 mr-1" />}
                    {bn
                      ? t === 'promoted' ? 'প্রমোশন' : t === 'demoted' ? 'ডিমোশন' : 'ট্রান্সফার'
                      : t === 'promoted' ? 'Promotion' : t === 'demoted' ? 'Demotion' : 'Transfer'
                    }
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Source & Destination */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Source */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? '📤 উৎস (বর্তমান)' : '📤 Source (Current)'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>{bn ? 'সেশন' : 'Session'}</Label>
                  <Select value={fromSessionId} onValueChange={v => { setFromSessionId(v); setSelectedStudents(new Set()); }}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
                  <Select value={fromDivisionId} onValueChange={v => { setFromDivisionId(v); setFromClassId(''); setSelectedStudents(new Set()); }}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select division'} /></SelectTrigger>
                    <SelectContent>
                      {divisions.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
                  <Select value={fromClassId} onValueChange={v => { setFromClassId(v); setSelectedStudents(new Set()); }} disabled={!fromDivisionId}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select class'} /></SelectTrigger>
                    <SelectContent>
                      {fromClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Destination */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? '📥 গন্তব্য (নতুন)' : '📥 Destination (New)'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>{bn ? 'সেশন' : 'Session'}</Label>
                  <Select value={toSessionId} onValueChange={setToSessionId}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
                  <Select value={toDivisionId} onValueChange={v => { setToDivisionId(v); setToClassId(''); }}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select division'} /></SelectTrigger>
                    <SelectContent>
                      {divisions.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
                  <Select value={toClassId} onValueChange={setToClassId} disabled={!toDivisionId}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন' : 'Select class'} /></SelectTrigger>
                    <SelectContent>
                      {toClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student List */}
          {fromSessionId && fromClassId && fromDivisionId && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {bn ? 'ছাত্র তালিকা' : 'Student List'}
                    <Badge variant="secondary">{students.length} {bn ? 'জন' : 'students'}</Badge>
                    {selectedStudents.size > 0 && (
                      <Badge>{selectedStudents.size} {bn ? 'জন নির্বাচিত' : 'selected'}</Badge>
                    )}
                  </CardTitle>
                  <div className="relative w-60">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={bn ? 'নাম/আইডি/রোল দিয়ে খুঁজুন...' : 'Search by name/ID/roll...'}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <p className="text-muted-foreground text-center py-8">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</p>
                ) : (
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                              onCheckedChange={toggleAll}
                            />
                          </TableHead>
                          <TableHead>#</TableHead>
                          <TableHead>{bn ? 'ছবি' : 'Photo'}</TableHead>
                          <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                          <TableHead>{bn ? 'আইডি' : 'ID'}</TableHead>
                          <TableHead>{bn ? 'রোল' : 'Roll'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((s: any, i: number) => (
                          <TableRow key={s.id} className={selectedStudents.has(s.id) ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedStudents.has(s.id)}
                                onCheckedChange={() => toggleStudent(s.id)}
                              />
                            </TableCell>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={s.photo_url || ''} />
                                <AvatarFallback className="text-xs">{(s.name_bn || s.name_en || '?')[0]}</AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{bn ? s.name_bn : s.name_en || s.name_bn}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">{s.student_id}</TableCell>
                            <TableCell>{s.roll_number}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Remarks & Action */}
                {selectedStudents.size > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div>
                      <Label>{bn ? 'মন্তব্য (ঐচ্ছিক)' : 'Remarks (optional)'}</Label>
                      <Textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder={bn ? 'পরীক্ষায় উত্তীর্ণ / বিবেচনায় প্রমোশন...' : 'Passed exam / Promoted on consideration...'}
                        rows={2}
                      />
                    </div>
                    <Button onClick={handlePromotion} disabled={isProcessing} className="w-full sm:w-auto">
                      {isProcessing
                        ? (bn ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Processing...')
                        : (bn
                          ? `${selectedStudents.size} জন ছাত্র ${promotionType === 'promoted' ? 'প্রমোট' : promotionType === 'demoted' ? 'ডিমোট' : 'ট্রান্সফার'} করুন`
                          : `${promotionType.charAt(0).toUpperCase() + promotionType.slice(1)} ${selectedStudents.size} students`
                        )
                      }
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{bn ? 'প্রমোশন/ডিমোশন হিস্ট্রি' : 'Promotion/Demotion History'}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{bn ? 'কোনো হিস্ট্রি নেই' : 'No history yet'}</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'ছাত্র' : 'Student'}</TableHead>
                        <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                        <TableHead>{bn ? 'উৎস' : 'From'}</TableHead>
                        <TableHead>{bn ? 'গন্তব্য' : 'To'}</TableHead>
                        <TableHead>{bn ? 'রোল' : 'Roll'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead>{bn ? 'মন্তব্য' : 'Remarks'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={h.students?.photo_url || ''} />
                                <AvatarFallback className="text-xs">{(h.students?.name_bn || '?')[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{bn ? h.students?.name_bn : h.students?.name_en || h.students?.name_bn}</div>
                                <div className="text-xs text-muted-foreground">{h.students?.student_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={h.promotion_type === 'promoted' ? 'default' : h.promotion_type === 'demoted' ? 'destructive' : 'secondary'}>
                              {bn
                                ? h.promotion_type === 'promoted' ? 'প্রমোশন' : h.promotion_type === 'demoted' ? 'ডিমোশন' : 'ট্রান্সফার'
                                : h.promotion_type
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {getSessionName(h.from_session_id)} / {getDivisionName(h.from_division_id)} / {getClassName(h.from_class_id)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {getSessionName(h.to_session_id)} / {getDivisionName(h.to_division_id)} / {getClassName(h.to_class_id)}
                          </TableCell>
                          <TableCell className="text-xs">{h.from_roll_number} → {h.to_roll_number}</TableCell>
                          <TableCell className="text-xs">{new Date(h.created_at).toLocaleDateString('bn-BD')}</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{h.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminStudentPromotion;
