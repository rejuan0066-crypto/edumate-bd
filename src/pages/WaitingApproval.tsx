import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { Navigate } from 'react-router-dom';
import { isAdminRole } from '@/lib/roles';
import AdminLayout from '@/components/AdminLayout';

const WaitingApproval = () => {
  const { language } = useLanguage();
  const { user, signOut, loading, userStatus, role } = useAuth();
  const bn = language === 'bn';
  const isAdmin = isAdminRole(role);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && userStatus === 'approved') return <Navigate to="/staff-dashboard" replace />;

  const content = (
    <div className={isAdmin ? '' : 'min-h-screen flex items-center justify-center p-4 bg-background'}>
      {!isAdmin && (
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
      )}
      <div className={isAdmin ? 'max-w-md mx-auto py-12' : ''}>
        <div className="card-elevated w-full max-w-md p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/40 mx-auto flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'অনুমোদন অপেক্ষমাণ' : 'Approval Pending'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin
                ? (bn ? 'এটি পেন্ডিং ইউজারদের জন্য প্রদর্শিত পেজ। ইউজার অনুমোদন করতে ইউজার ম্যানেজমেন্টে যান।' : 'This is the page shown to pending users. Go to User Management to approve users.')
                : (bn ? 'আপনার অ্যাকাউন্ট এখনো অনুমোদিত হয়নি। অ্যাডমিন আপনার অ্যাকাউন্ট অনুমোদন করার পর আপনি সিস্টেমে প্রবেশ করতে পারবেন।' : 'Your account has not been approved yet. You will be able to access the system once an administrator approves your account.')}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {isAdmin ? (
              <Button variant="outline" onClick={() => window.location.href = '/admin/user-management'}>
                {bn ? 'ইউজার ম্যানেজমেন্ট' : 'User Management'}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {bn ? 'আবার চেক করুন' : 'Check Again'}
                </Button>
                <Button variant="ghost" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {bn ? 'লগআউট' : 'Logout'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isAdmin) {
    return <AdminLayout>{content}</AdminLayout>;
  }

  return content;
};

export default WaitingApproval;
