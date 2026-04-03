import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { isAdminRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Loader2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LanguageToggle from '@/components/LanguageToggle';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import { toast } from 'sonner';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const Login = () => {
  const { t, language } = useLanguage();
  const { signIn, user, loading: authLoading, role, userStatus } = useAuth();
  const { hasUserPermission, isLoading: permLoading } = usePermissions();
  const { settings } = useWebsiteSettings();
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
    if (isAdminRole(role)) {
      return <Navigate to="/admin" replace />;
    }
    if (userStatus === 'pending') {
      return <Navigate to="/waiting-approval" replace />;
    }
    if (hasUserPermission('/admin', 'view')) {
      return <Navigate to="/admin" replace />;
    }
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

  const loginLogo = settings.favicon_url || settings.logo_url;
  const showLogo = settings.login_show_logo !== false;
  const faviconShapeClass = settings.favicon_shape === 'circle' ? 'rounded-full' : settings.favicon_shape === 'rounded' ? 'rounded-xl' : 'rounded-none';
  const showName = settings.login_show_institution_name !== false;
  const welcomeMsg = language === 'bn'
    ? (settings.login_welcome_bn || 'মাদরাসা ম্যানেজমেন্ট')
    : (settings.login_welcome_en || 'Madrasa Management');

  const bgStyle: React.CSSProperties = settings.login_bg_image_url
    ? { backgroundImage: `url(${settings.login_bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : settings.login_bg_color
      ? { background: settings.login_bg_color }
      : { background: 'var(--gradient-hero)' };

  const formStyle: React.CSSProperties = {
    ...(settings.login_form_bg_color ? { backgroundColor: settings.login_form_bg_color } : {}),
    borderRadius: `${settings.login_form_border_radius ?? 12}px`,
    ...(settings.login_form_shadow === false ? { boxShadow: 'none' } : {}),
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={bgStyle}>
      {!settings.login_bg_image_url && <div className="islamic-pattern absolute inset-0" />}
      {settings.login_bg_image_url && (
        <div className="absolute inset-0 bg-black/40" style={{ backdropFilter: settings.login_bg_blur ? `blur(${settings.login_bg_blur}px)` : undefined }} />
      )}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <div className="card-elevated w-full max-w-md p-8 relative z-10" style={formStyle}>
        <div className="text-center mb-8">
          {showLogo && (
            loginLogo ? (
              <img src={loginLogo} alt="Logo" className={`w-16 h-16 ${faviconShapeClass} object-cover mx-auto mb-4 border-2 border-primary/20`} />
            ) : (
              <div className={`w-16 h-16 ${faviconShapeClass} bg-primary mx-auto mb-4 flex items-center justify-center`}>
                <GraduationCap className="w-9 h-9 text-primary-foreground" />
              </div>
            )
          )}
          {showName && (
            <h1 className="text-xl font-display font-bold text-foreground">
              {language === 'bn'
                ? (settings.login_institution_name_bn || settings.institution_name)
                : (settings.login_institution_name_en || settings.institution_name_en)}
            </h1>
          )}
          <p className="text-lg font-semibold text-foreground mt-1">{welcomeMsg}</p>
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
              name="email"
              autoComplete="email"
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
              name="password"
              autoComplete="current-password"
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
