import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

type Row = {
  id: string;
  setting_key: string;
  action: string;
  old_value: any;
  new_value: any;
  changed_by: string | null;
  changed_by_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
};

export default function AdminNamePermissionAudit() {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data = [], isLoading } = useQuery({
    queryKey: ['name-permission-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('name_permission_audit' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            {bn ? 'নাম অনুমতি অডিট লগ' : 'Name Permission Audit Log'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn
              ? 'সুপার অ্যাডমিন কর্তৃক ডায়নামিক নাম ও কাস্টম স্বাক্ষরকারী অনুমতি সংক্রান্ত প্রতিটি পরিবর্তন এখানে রেকর্ড থাকে।'
              : 'Every super-admin change to dynamic name and custom signatory permissions is recorded here.'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : data.length === 0 ? (
          <Card className="rounded-[32px] backdrop-blur-xl bg-card/60">
            <CardContent className="p-12 text-center text-muted-foreground">
              {bn ? 'এখনো কোনো লগ নেই' : 'No audit entries yet'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((r) => (
              <Card key={r.id} className="rounded-[32px] backdrop-blur-xl bg-card/60 hover:-translate-y-[2px] transition-transform">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{r.setting_key}</Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]" variant="outline">{r.action}</Badge>
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(r.created_at), 'dd/MM/yyyy hh:mm:ss a')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3 h-3" />
                    {r.changed_by_email || r.changed_by || (bn ? 'অজ্ঞাত' : 'Unknown')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-muted-foreground mb-1">{bn ? 'পুরোনো মান' : 'Old value'}</div>
                      <pre className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 overflow-x-auto text-[10px]">
{r.old_value ? JSON.stringify(r.old_value, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">{bn ? 'নতুন মান' : 'New value'}</div>
                      <pre className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2 overflow-x-auto text-[10px]">
{r.new_value ? JSON.stringify(r.new_value, null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
