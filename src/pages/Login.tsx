import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Loader2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LanguageToggle from '@/components/LanguageToggle';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import { toast } from 'sonner';

const Login = () => {
  const { t, language } = useLanguage();
  const { signIn, user, loading: authLoading, role, userStatus } = useAuth();
  const { hasUserPermission, isLoading: permLoading } = usePermissions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Admin always goes to admin panel
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    // Pending users go to waiting page
    if (userStatus === 'pending') {
      return <Navigate to="/waiting-approval" replace />;
    }
    // If user has individual permission for /admin, redirect there
    if (hasUserPermission('/admin', 'view')) {
      return <Navigate to="/admin" replace />;
    }
    // Approved staff/teacher go to staff dashboard
    return <Navigate to="/staff-dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(language === 'bn' ? 'সব তথ্য পূরণ করুন' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(language === 'bn' ? 'ইউজারনেম বা পাসওয়ার্ড ভুল' : 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="islamic-pattern absolute inset-0" />
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <div className="card-elevated w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {language === 'bn' ? 'মাদরাসা ম্যানেজমেন্ট' : 'Madrasa Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('signIn')}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <Label className="flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4" /> {t('username')}
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'bn' ? 'ইমেইল এড্রেস' : 'Email address'}
              className="bg-background"
              type="email"
            />
          </div>
          <div>
            <Label className="flex items-center gap-2 mb-1.5">
              <Lock className="w-4 h-4" /> {t('password')}
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background"
            />
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-primary hover:underline"
            >
              {t('forgotPassword')}
            </button>
          </div>
          <Button type="submit" className="btn-primary-gradient w-full py-5 text-base" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('signIn')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {language === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}
          </Link>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
};

export default Login;
