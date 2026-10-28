import AdminLayout from '@/components/AdminLayout';
import WhatsAppChatInbox from '@/components/admin/WhatsAppChatInbox';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminWhatsAppChat() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const { canViewPage, canAddItem } = usePagePermissions('/admin/whatsapp-chat');

  const isAdmin = isAdminRole(role);
  const canView = isAdmin || canViewPage;
  const canReply = isAdmin || canAddItem;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {!canView ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-card rounded-2xl border p-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="font-bold text-lg text-foreground">
                {bn ? 'অনুমতি নেই' : 'Access Denied'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {bn
                  ? 'আপনার রোলে WhatsApp চ্যাট ইনবক্স দেখার অনুমতি দেওয়া হয়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'
                  : 'Your role does not have permission to view the WhatsApp Inbox.'}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
              <Link to="/admin">{bn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</Link>
            </Button>
          </div>
        ) : (
          <WhatsAppChatInbox canReply={canReply} />
        )}
      </div>
    </AdminLayout>
  );
}
