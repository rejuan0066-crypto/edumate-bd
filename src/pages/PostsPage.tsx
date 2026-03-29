import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { FileText, Image, Video, File, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PostInteractions from '@/components/posts/PostInteractions';

const CATEGORIES = [
  { value: 'all', label: 'All', labelBn: 'সব' },
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

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-500" />;
  if (type.startsWith('video/')) return <Video className="w-4 h-4 text-blue-500" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
};

const PostsPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filtered = posts.filter((p: any) => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.title || '').toLowerCase().includes(s) ||
             (p.title_bn || '').toLowerCase().includes(s) ||
             (p.content || '').toLowerCase().includes(s) ||
             (p.content_bn || '').toLowerCase().includes(s);
    }
    return true;
  });

  const getCatLabel = (val: string) => {
    const c = CATEGORIES.find(c => c.value === val);
    return c ? (bn ? c.labelBn : c.label) : val;
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8 flex items-center gap-3">
          <FileText className="w-8 h-8 text-accent" />
          {bn ? 'পোস্ট ও সংবাদ' : 'Posts & News'}
        </h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={bn ? 'সার্চ করুন...' : 'Search posts...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterCat === c.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {bn ? c.labelBn : c.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>{bn ? 'কোনো পোস্ট নেই' : 'No posts available'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((post: any) => {
              const attachments = (post.attachments as Attachment[]) || [];
              const images = attachments.filter(a => a.type.startsWith('image/'));
              const others = attachments.filter(a => !a.type.startsWith('image/'));

              return (
                <article key={post.id} className="card-elevated p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {bn ? (post.title_bn || post.title) : post.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{getCatLabel(post.category)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy') : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(bn ? post.content_bn : post.content) && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {bn ? post.content_bn : post.content}
                    </p>
                  )}

                  {/* Image gallery */}
                  {images.length > 0 && (
                    <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url}
                          alt={img.name}
                          className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: images.length === 1 ? '400px' : '200px' }}
                          onClick={() => setPreviewImage(img.url)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Video attachments */}
                  {attachments.filter(a => a.type.startsWith('video/')).map((vid, idx) => (
                    <video key={idx} controls className="w-full rounded-lg max-h-[400px]" preload="metadata">
                      <source src={vid.url} type={vid.type} />
                    </video>
                  ))}

                  {/* Other files */}
                  {others.filter(a => !a.type.startsWith('video/')).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {others.filter(a => !a.type.startsWith('video/')).map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors text-sm"
                        >
                          {getFileIcon(att.type)}
                          <span className="truncate max-w-[200px]">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <PostInteractions postId={post.id} />
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Image preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none">
          {previewImage && (
            <img src={previewImage} alt="" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
};

export default PostsPage;
