import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, FileText, Image, Video, File, Upload, X, Loader2, Eye, EyeOff, Paperclip, Search } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'general', label: 'General', labelBn: 'সাধারণ' },
  { value: 'academic', label: 'Academic', labelBn: 'একাডেমিক' },
  { value: 'event', label: 'Event', labelBn: 'ইভেন্ট' },
  { value: 'announcement', label: 'Announcement', labelBn: 'ঘোষণা' },
  { value: 'achievement', label: 'Achievement', labelBn: 'অর্জন' },
  { value: 'sports', label: 'Sports', labelBn: 'খেলাধুলা' },
  { value: 'cultural', label: 'Cultural', labelBn: 'সাংস্কৃতিক' },
  { value: 'news', label: 'News', labelBn: 'সংবাদ' },
];

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface PostForm {
  title: string;
  title_bn: string;
  content: string;
  content_bn: string;
  category: string;
  is_published: boolean;
  attachments: Attachment[];
}

const emptyForm: PostForm = {
  title: '', title_bn: '', content: '', content_bn: '',
  category: 'general', is_published: false, attachments: [],
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-500" />;
  if (type.startsWith('video/')) return <Video className="w-4 h-4 text-blue-500" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const AdminPosts = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/posts', 'posts');
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/posts');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: PostForm & { id?: string }) => {
      const payload = {
        title: f.title,
        title_bn: f.title_bn || null,
        content: f.content || null,
        content_bn: f.content_bn || null,
        category: f.category,
        is_published: f.is_published,
        published_at: f.is_published ? new Date().toISOString() : null,
        attachments: f.attachments as any,
      };
      if (f.id) {
        if (await checkApproval('edit', payload, f.id, `পোস্ট সম্পাদনা: ${f.title}`)) return;
        const { error } = await supabase.from('posts').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        if (await checkApproval('add', payload, undefined, `পোস্ট যোগ: ${f.title}`)) return;
        const { error } = await supabase.from('posts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success(bn ? 'পোস্ট সেভ হয়েছে' : 'Post saved');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const post = posts.find((p: any) => p.id === id);
      if (await checkApproval('delete', { id, title: post?.title }, id, `পোস্ট মুছুন: ${post?.title}`)) return;
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-posts'] });
      toast.success(bn ? 'পোস্ট মুছে ফেলা হয়েছে' : 'Post deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (post: any) => {
    setEditId(post.id);
    setForm({
      title: post.title || '',
      title_bn: post.title_bn || '',
      content: post.content || '',
      content_bn: post.content_bn || '',
      category: post.category || 'general',
      is_published: post.is_published || false,
      attachments: (post.attachments as Attachment[]) || [],
    });
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: ${bn ? 'ফাইল সাইজ ২০MB এর বেশি' : 'File exceeds 20MB'}`);
        continue;
      }
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `posts/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('post-attachments').upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('post-attachments').getPublicUrl(fileName);
        newAttachments.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
      } catch (err: any) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }

    setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  };

  const filtered = posts.filter((p: any) => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.title || '').toLowerCase().includes(s) || (p.title_bn || '').toLowerCase().includes(s);
    }
    return true;
  });

  const getCatLabel = (val: string) => {
    const c = CATEGORIES.find(c => c.value === val);
    return c ? (bn ? c.labelBn : c.label) : val;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">
            {bn ? 'পোস্ট ম্যানেজমেন্ট' : 'Post Management'}
          </h1>
          {canAddItem && (
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন পোস্ট' : 'New Post'}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={bn ? 'সার্চ করুন...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{bn ? c.labelBn : c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{bn ? 'কোনো পোস্ট নেই' : 'No posts found'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post: any) => {
              const attachments = (post.attachments as Attachment[]) || [];
              return (
                <div key={post.id} className="card-elevated p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {bn ? (post.title_bn || post.title) : post.title}
                        </h3>
                        <Badge variant={post.is_published ? 'default' : 'secondary'} className="text-[10px]">
                          {post.is_published ? (bn ? 'প্রকাশিত' : 'Published') : (bn ? 'ড্রাফট' : 'Draft')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{getCatLabel(post.category)}</Badge>
                      </div>
                      {(bn ? post.content_bn : post.content) && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                          {bn ? post.content_bn : post.content}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{post.created_at ? format(new Date(post.created_at), 'dd/MM/yyyy') : ''}</span>
                        {attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> {attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(post.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? (bn ? 'পোস্ট সম্পাদনা' : 'Edit Post') : (bn ? 'নতুন পোস্ট' : 'New Post')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label>{bn ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'}</Label>
                <Input value={form.title_bn} onChange={e => setForm(p => ({ ...p, title_bn: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'বিবরণ (ইংরেজি)' : 'Content (English)'}</Label>
                <Textarea rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
              </div>
              <div>
                <Label>{bn ? 'বিবরণ (বাংলা)' : 'Content (Bangla)'}</Label>
                <Textarea rows={4} value={form.content_bn} onChange={e => setForm(p => ({ ...p, content_bn: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{bn ? c.labelBn : c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_published} onCheckedChange={v => setForm(p => ({ ...p, is_published: v }))} />
                <Label>{bn ? 'প্রকাশ করুন' : 'Publish'}</Label>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <Label className="mb-2 block">{bn ? 'সংযুক্তি (ফটো/ভিডিও/PDF/অন্যান্য)' : 'Attachments (Photo/Video/PDF/Other)'}</Label>
              
              {form.attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border">
                      {att.type.startsWith('image/') ? (
                        <img src={att.url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          {getFileIcon(att.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAttachment(idx)} className="shrink-0 text-destructive">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-secondary/30 transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">
                  {uploading ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (bn ? 'ফাইল নির্বাচন করুন (সর্বোচ্চ 20MB)' : 'Choose files (max 20MB each)')}
                </span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading}
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editId || undefined })} disabled={!form.title || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? (bn ? 'আপডেট' : 'Update') : (bn ? 'সেভ করুন' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? 'পোস্ট মুছে ফেলবেন?' : 'Delete post?'}</AlertDialogTitle>
            <AlertDialogDescription>{bn ? 'এই পোস্ট স্থায়ীভাবে মুছে যাবে।' : 'This post will be permanently deleted.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground">
              {bn ? 'মুছুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPosts;
