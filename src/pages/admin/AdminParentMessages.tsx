import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Send, MessageSquare, Search, Loader2, Inbox, User, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ParentMessage {
  id: string;
  student_id: string;
  parent_account_id: string | null;
  sender_type: string;
  sender_name: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface StudentInfo {
  id: string;
  name_bn: string;
  name_en: string | null;
  student_id: string;
  roll_number: string | null;
}

const AdminParentMessages = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['parent-messages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parent_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ParentMessage[];
    },
  });

  // Realtime
  useEffect(() => {
    const chName = `admin-parent-messages-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let ch: any = null;
    try {
      ch = supabase
        .channel(chName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parent_messages' }, () => {
          qc.invalidateQueries({ queryKey: ['parent-messages-admin'] });
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in AdminParentMessages:', e);
    }
    return () => {
      if (ch) {
        try {
          supabase.removeChannel(ch);
        } catch {}
      }
    };
  }, [qc]);

  // Group by student
  const studentIds = useMemo(() => Array.from(new Set(messages.map(m => m.student_id))), [messages]);

  const { data: students = [] } = useQuery({
    queryKey: ['parent-msg-students', studentIds.join(',')],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, student_id, roll_number')
        .in('id', studentIds);
      if (error) throw error;
      return (data || []) as StudentInfo[];
    },
    enabled: studentIds.length > 0,
  });

  const studentMap = useMemo(() => {
    const m = new Map<string, StudentInfo>();
    students.forEach(s => m.set(s.id, s));
    return m;
  }, [students]);

  // Build conversation list (one per student, latest first)
  const conversations = useMemo(() => {
    const map = new Map<string, { student: StudentInfo | undefined; messages: ParentMessage[]; lastAt: string; unread: number }>();
    messages.forEach(m => {
      const existing = map.get(m.student_id);
      if (existing) {
        existing.messages.push(m);
        if (m.created_at > existing.lastAt) existing.lastAt = m.created_at;
        if (!m.is_read && m.sender_type === 'parent') existing.unread += 1;
      } else {
        map.set(m.student_id, {
          student: studentMap.get(m.student_id),
          messages: [m],
          lastAt: m.created_at,
          unread: !m.is_read && m.sender_type === 'parent' ? 1 : 0,
        });
      }
    });
    let list = Array.from(map.entries()).map(([sid, v]) => ({ studentId: sid, ...v }));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.student?.name_bn?.toLowerCase().includes(q) ||
        c.student?.name_en?.toLowerCase().includes(q) ||
        c.student?.student_id?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [messages, studentMap, search]);

  const activeConv = useMemo(() => conversations.find(c => c.studentId === selectedStudentId), [conversations, selectedStudentId]);

  // Auto-select first
  useEffect(() => {
    if (!selectedStudentId && conversations.length > 0) {
      setSelectedStudentId(conversations[0].studentId);
    }
  }, [conversations, selectedStudentId]);

  // Mark parent messages as read when conv opened
  useEffect(() => {
    if (!activeConv) return;
    const unreadIds = activeConv.messages.filter(m => !m.is_read && m.sender_type === 'parent').map(m => m.id);
    if (unreadIds.length > 0) {
      supabase.from('parent_messages').update({ is_read: true }).in('id', unreadIds).then(() => {
        qc.invalidateQueries({ queryKey: ['parent-messages-admin'] });
      });
    }
    // scroll to bottom
    setTimeout(() => scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [activeConv, qc]);

  const sendReply = async () => {
    if (!activeConv || !reply.trim()) return;
    setSending(true);
    try {
      const lastSubject = activeConv.messages[activeConv.messages.length - 1]?.subject || 'Reply';
      const { error } = await supabase.from('parent_messages').insert({
        student_id: activeConv.studentId,
        parent_account_id: activeConv.messages.find(m => m.parent_account_id)?.parent_account_id || null,
        sender_type: 'admin',
        sender_name: user?.email || 'Admin',
        subject: subject.trim() || `Re: ${lastSubject}`,
        message: reply.trim(),
        is_read: true,
      });
      if (error) throw error;
      setReply('');
      setSubject('');
      qc.invalidateQueries({ queryKey: ['parent-messages-admin'] });
      toast({ title: bn ? 'বার্তা পাঠানো হয়েছে' : 'Message sent' });
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              {bn ? 'অভিভাবক বার্তা' : 'Parent Messages'}
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2">{totalUnread} {bn ? 'নতুন' : 'new'}</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'অভিভাবকদের পাঠানো বার্তা দেখুন এবং উত্তর দিন' : 'View and reply to parent messages'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="rounded-[24px] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Inbox className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="text-2xl font-bold">{conversations.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট কথোপকথন' : 'Total Conversations'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10"><MessageSquare className="w-5 h-5 text-destructive" /></div>
              <div>
                <div className="text-2xl font-bold">{totalUnread}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'অপঠিত বার্তা' : 'Unread Messages'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10"><CheckCheck className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <div className="text-2xl font-bold">{messages.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট বার্তা' : 'Total Messages'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main chat layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-340px)] min-h-[500px]">
          {/* Conversations list */}
          <Card className="rounded-[24px] border-border/50 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={bn ? 'ছাত্র খুঁজুন...' : 'Search student...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-xl"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {bn ? 'কোনো বার্তা নেই' : 'No messages yet'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map(c => {
                    const isActive = c.studentId === selectedStudentId;
                    const last = c.messages[c.messages.length - 1];
                    return (
                      <button
                        key={c.studentId}
                        onClick={() => setSelectedStudentId(c.studentId)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            {c.student?.name_bn || c.student?.name_en || (bn ? 'অজানা' : 'Unknown')}
                          </div>
                          {c.unread > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">{c.unread}</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mb-1">
                          ID: {c.student?.student_id || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          <span className="font-medium">{last.sender_type === 'parent' ? (bn ? 'অভিভাবক:' : 'Parent:') : (bn ? 'আপনি:' : 'You:')}</span>{' '}
                          {last.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(c.lastAt), 'dd/MM/yyyy hh:mm a')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat panel */}
          <Card className="rounded-[24px] border-border/50 flex flex-col overflow-hidden">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>{bn ? 'একটি কথোপকথন নির্বাচন করুন' : 'Select a conversation'}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <div className="font-semibold">
                    {activeConv.student?.name_bn || activeConv.student?.name_en || (bn ? 'অজানা' : 'Unknown')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {activeConv.student?.student_id} {activeConv.student?.roll_number && `• Roll: ${activeConv.student.roll_number}`}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {activeConv.messages.map(m => {
                      const isAdmin = m.sender_type === 'admin';
                      return (
                        <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl p-3 ${
                            isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <div className="text-[11px] font-medium opacity-80 mb-1">
                              {m.sender_name || (isAdmin ? 'Admin' : (bn ? 'অভিভাবক' : 'Parent'))}
                            </div>
                            {m.subject && (
                              <div className="text-xs font-semibold mb-1 opacity-90">{m.subject}</div>
                            )}
                            <div className="text-sm whitespace-pre-wrap break-words">{m.message}</div>
                            <div className="text-[10px] opacity-70 mt-1.5 text-right">
                              {format(new Date(m.created_at), 'dd/MM hh:mm a')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollEndRef} />
                  </div>
                </ScrollArea>

                {/* Reply box */}
                <div className="p-3 border-t border-border/50 space-y-2">
                  <Input
                    placeholder={bn ? 'বিষয় (ঐচ্ছিক)' : 'Subject (optional)'}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-9 rounded-xl text-sm"
                  />
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={bn ? 'উত্তর লিখুন...' : 'Write a reply...'}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
                      }}
                      rows={2}
                      className="flex-1 rounded-xl resize-none"
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      className="self-end h-10 rounded-xl btn-primary-gradient"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{bn ? 'Ctrl/⌘ + Enter চাপলে দ্রুত পাঠাতে পারেন' : 'Press Ctrl/⌘ + Enter to send'}</p>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminParentMessages;
