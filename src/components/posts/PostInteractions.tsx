import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const getVisitorId = () => {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('visitor_id', id);
  }
  return id;
};

interface Props {
  postId: string;
}

const PostInteractions = ({ postId }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const visitorId = getVisitorId();

  const [showComments, setShowComments] = useState(false);
  const [name, setName] = useState('');
  const [commentText, setCommentText] = useState('');

  // Likes
  const { data: likes = [] } = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_likes')
        .select('visitor_id')
        .eq('post_id', postId);
      return data || [];
    },
  });

  const liked = likes.some((l: any) => l.visitor_id === visitorId);
  const likeCount = likes.length;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('visitor_id', visitorId);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, visitor_id: visitorId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-likes', postId] }),
  });

  // Comments
  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true });
      return data || [];
    },
    enabled: showComments,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, commenter_name: name.trim(), comment_text: commentText.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast({ title: bn ? 'মন্তব্য সফল' : 'Comment posted' });
    },
    onError: () => toast({ title: bn ? 'ত্রুটি হয়েছে' : 'Error', variant: 'destructive' }),
  });

  // Comment count (always fetch)
  const { data: commentCount = 0 } = useQuery({
    queryKey: ['post-comment-count', postId],
    queryFn: async () => {
      const { count } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('is_approved', true);
      return count || 0;
    },
  });

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => toggleLike.mutate()}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-destructive"
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
          <span className={liked ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {likeCount > 0 ? likeCount : ''} {bn ? 'পছন্দ' : 'Like'}
          </span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount > 0 ? commentCount : ''} {bn ? 'মন্তব্য' : 'Comment'}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="space-y-3">
          {/* Comment list */}
          {comments.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-2 p-2 rounded-lg bg-secondary/30">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {c.commenter_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground">{c.commenter_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_at), 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{c.comment_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment form */}
          <div className="space-y-2">
            <Input
              placeholder={bn ? 'আপনার নাম' : 'Your name'}
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="flex gap-2">
              <Textarea
                placeholder={bn ? 'মন্তব্য লিখুন...' : 'Write a comment...'}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="min-h-[60px] text-xs resize-none"
              />
              <Button
                size="icon"
                className="shrink-0 h-[60px] w-10"
                disabled={!name.trim() || !commentText.trim() || addComment.isPending}
                onClick={() => addComment.mutate()}
              >
                {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostInteractions;
