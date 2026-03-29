import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  posts: any[];
  language: string;
}

const HomePostsSection = ({ posts, language }: Props) => {
  const bn = language === 'bn';
  const featured = posts[0];
  const secondary = posts.slice(1, 3);
  const rest = posts.slice(3);

  const getFirstImage = (post: any) => {
    const attachments = (post.attachments as any[]) || [];
    return attachments.find((a: any) => a.type?.startsWith('image/'));
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="section-header-bar flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-display font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />
          {bn ? 'সর্বশেষ সংবাদ' : 'Latest News'}
        </h2>
        <Link to="/posts" className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          {bn ? 'সব দেখুন' : 'View All'} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Scrollable posts area */}
      <ScrollArea className="h-[560px]">
        <div className="space-y-4">
          {/* Featured Post */}
          {featured && (
            <Link to="/posts" className="card-elevated overflow-hidden group block">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                <div className="aspect-video sm:aspect-auto sm:min-h-[200px] bg-secondary overflow-hidden">
                  {getFirstImage(featured) ? (
                    <img src={getFirstImage(featured).url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full min-h-[180px] flex items-center justify-center bg-primary/5">
                      <FileText className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col justify-center">
                  <Badge variant="outline" className="text-[9px] capitalize w-fit mb-2">{featured.category}</Badge>
                  <h3 className="text-base sm:text-lg font-bold text-foreground line-clamp-3 group-hover:text-primary transition-colors leading-snug mb-2">
                    {bn ? (featured.title_bn || featured.title) : featured.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                    {bn ? (featured.content_bn || featured.content) : featured.content}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    {featured.published_at ? format(new Date(featured.published_at), 'dd/MM/yyyy') : ''}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Secondary Posts */}
          {secondary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {secondary.map((post: any) => {
                const img = getFirstImage(post);
                return (
                  <Link key={post.id} to="/posts" className="card-elevated overflow-hidden group">
                    <div className="aspect-video bg-secondary overflow-hidden">
                      {img ? (
                        <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <FileText className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">
                        {bn ? (post.title_bn || post.title) : post.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                        <Calendar className="w-3 h-3" />
                        {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy') : ''}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* List of remaining posts */}
          {rest.length > 0 && (
            <div className="card-elevated divide-y divide-border">
              {rest.map((post: any) => {
                const img = getFirstImage(post);
                return (
                  <Link key={post.id} to="/posts" className="flex gap-3 p-3 hover:bg-secondary/50 transition-colors group">
                    {img ? (
                      <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-16 rounded-lg shrink-0 bg-secondary/80 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {bn ? (post.title_bn || post.title) : post.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy') : ''}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {posts.length === 0 && (
        <div className="card-elevated text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{bn ? 'কোনো পোস্ট নেই' : 'No posts yet'}</p>
        </div>
      )}
    </div>
  );
};

export default HomePostsSection;
