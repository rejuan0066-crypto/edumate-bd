import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Plus, Check, X, Edit, RotateCcw, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const AdminNotices = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/notices', 'notices');
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/notices');
  const [filter, setFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: newTitle.trim(),
        title_bn: newTitle.trim(),
        content: newContent.trim() || null,
        content_bn: newContent.trim() || null,
        category: 'general',
        is_published: false,
      };
      if (await checkApproval('add', payload, undefined, `নোটিশ যোগ: ${newTitle.trim()}`)) return;
      const { error } = await supabase.from('notices').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      setNewTitle(''); setNewContent(''); setShowAdd(false);
      toast.success(language === 'bn' ? 'নোটিশ যোগ হয়েছে' : 'Notice added');
    },
    onError: () => toast.error('Error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      if (await checkApproval('edit', { id, is_published }, id, `নোটিশ ${is_published ? 'প্রকাশ' : 'অপ্রকাশিত'}`)) return;
      const { error } = await supabase.from('notices').update({
        is_published,
        published_at: is_published ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success(language === 'bn' ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: () => toast.error('Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const notice = notices.find((n: any) => n.id === id);
      if (await checkApproval('delete', { id, title: notice?.title }, id, `নোটিশ মুছুন: ${notice?.title}`)) return;
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success(language === 'bn' ? 'নোটিশ মুছে ফেলা হয়েছে' : 'Notice deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = filter === 'all' ? notices : filter === 'published' ? notices.filter((n: any) => n.is_published) : notices.filter((n: any) => !n.is_published);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'নোটিশ ব্যবস্থাপনা' : 'Notice Management'}</h1>
          {canAddItem && <Button onClick={() => setShowAdd(!showAdd)} className="btn-primary-gradient"><Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন নোটিশ' : 'New Notice'}</Button>}
        </div>

        {showAdd && (
          <div className="card-elevated p-5 space-y-4">
            <Input placeholder={language === 'bn' ? 'নোটিশের শিরোনাম' : 'Notice Title'} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-background" />
            <Textarea placeholder={language === 'bn' ? 'নোটিশের বিবরণ' : 'Notice Content'} value={newContent} onChange={(e) => setNewContent(e.target.value)} className="bg-background" rows={4} />
            <div className="flex gap-2">
              <Button onClick={() => { if (!newTitle.trim()) { toast.error(language === 'bn' ? 'শিরোনাম লিখুন' : 'Enter title'); return; } addMutation.mutate(); }} className="btn-primary-gradient" disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {language === 'bn' ? 'যোগ করুন' : 'Add'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {(['all', 'published', 'unpublished'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {f === 'all' ? (language === 'bn' ? 'সকল' : 'All') : f === 'published' ? (language === 'bn' ? 'প্রকাশিত' : 'Published') : (language === 'bn' ? 'অপ্রকাশিত' : 'Unpublished')}
              <span className="ml-1.5 text-xs">({f === 'all' ? notices.length : f === 'published' ? notices.filter((n: any) => n.is_published).length : notices.filter((n: any) => !n.is_published).length})</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n: any) => (
              <div key={n.id} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{n.title_bn || n.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${n.is_published ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {n.is_published ? (language === 'bn' ? 'প্রকাশিত' : 'Published') : (language === 'bn' ? 'অপ্রকাশিত' : 'Unpublished')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{n.content_bn || n.content}</p>
                    <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {canEditItem && !n.is_published && (
                      <button onClick={() => updateStatusMutation.mutate({ id: n.id, is_published: true })} className="p-2 rounded-lg hover:bg-success/10 text-success" title="Publish"><Check className="w-4 h-4" /></button>
                    )}
                    {canEditItem && n.is_published && (
                      <button onClick={() => updateStatusMutation.mutate({ id: n.id, is_published: false })} className="p-2 rounded-lg hover:bg-warning/10 text-warning" title="Unpublish"><RotateCcw className="w-4 h-4" /></button>
                    )}
                    {canDeleteItem && (
                      <button onClick={() => deleteMutation.mutate(n.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'কোনো নোটিশ নেই' : 'No notices'}</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminNotices;
