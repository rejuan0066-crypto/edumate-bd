import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';

interface ClickEvent {
  id: string;
  event_type: string;
  phone_number: string | null;
  success: boolean;
  error_reason: string | null;
  page_url: string | null;
  user_agent: string | null;
  is_pwa: boolean | null;
  meta: any;
  created_at: string;
}

const AdminWhatsAppLogs = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [filter, setFilter] = useState<'all' | 'failed' | 'success'>('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['whatsapp-click-events', filter],
    queryFn: async (): Promise<ClickEvent[]> => {
      let q = supabase
        .from('whatsapp_click_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (filter === 'failed') q = q.eq('success', false);
      if (filter === 'success') q = q.eq('success', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClickEvent[];
    },
  });

  const total = data?.length ?? 0;
  const failed = data?.filter(e => !e.success).length ?? 0;

  return (
    <div className="max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4">
      <Card className="rounded-[45px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            {bn ? 'WhatsApp ক্লিক লগ' : 'WhatsApp Click Logs'}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
              {bn ? 'সব' : 'All'} ({total})
            </Button>
            <Button size="sm" variant={filter === 'failed' ? 'default' : 'outline'} onClick={() => setFilter('failed')}>
              {bn ? 'ব্যর্থ' : 'Failed'} ({failed})
            </Button>
            <Button size="sm" variant={filter === 'success' ? 'default' : 'outline'} onClick={() => setFilter('success')}>
              {bn ? 'সফল' : 'Success'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো লগ পাওয়া যায়নি' : 'No logs found'}
            </p>
          ) : (
            <div className="space-y-2">
              {data.map(ev => (
                <div key={ev.id} className="rounded-[20px] border border-border bg-card/50 p-3 hover:-translate-y-[3px] transition-transform">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {ev.success ? (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />{bn ? 'সফল' : 'Success'}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />{bn ? 'ব্যর্থ' : 'Failed'}
                      </Badge>
                    )}
                    <Badge variant="outline">{ev.event_type}</Badge>
                    {ev.is_pwa && <Badge variant="secondary">PWA</Badge>}
                    {ev.phone_number && <span className="text-xs text-muted-foreground">📞 {ev.phone_number}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {format(new Date(ev.created_at), 'dd/MM/yyyy hh:mm:ss a')}
                    </span>
                  </div>
                  {ev.error_reason && (
                    <p className="text-xs text-destructive break-all mt-1">⚠ {ev.error_reason}</p>
                  )}
                  {ev.page_url && (
                    <p className="text-[11px] text-muted-foreground truncate mt-1" title={ev.page_url}>
                      🔗 {ev.page_url}
                    </p>
                  )}
                  {ev.user_agent && (
                    <p className="text-[11px] text-muted-foreground truncate" title={ev.user_agent}>
                      🖥 {ev.user_agent}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWhatsAppLogs;
