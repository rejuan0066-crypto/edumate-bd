import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Loader2 } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LanguageToggle from '@/components/LanguageToggle';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import { toast } from 'sonner';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { getAuthenticatedHomePath, hasResolvedAuthRedirectState } from '@/lib/authRedirect';
import PageLoader from '@/components/PageLoader';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { fetchOtpRequirements, isOtpRequiredFor, type OtpRoleScope } from '@/hooks/useOtpRequirements';
import { supabase } from '@/integrations/supabase/client';

const LOGIN_OTP_FLAG = 'pending_login_otp_v1';

function mapRoleToOtpScope(role: string | null | undefined): OtpRoleScope | undefined {
  if (!role) return undefined;
  const r = role.toLowerCase();
  if (r === 'super_admin' || r === 'admin') return 'admin';
  if (r === 'parent' || r === 'guardian') return 'parent';
  if (r === 'student') return 'student';
  // teacher / staff / accountant / employee / librarian / etc.
  return 'staff';
}

const Login = () => {
  const { t, language } = useLanguage();
  const { signIn, signOut, user, loading: authLoading, role, userStatus } = useAuth();
  const { settings } = useWebsiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // OTP 2FA gate
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpRole, setOtpRole] = useState<OtpRoleScope | undefined>(undefined);
  const [otpVerified, setOtpVerified] = useState(false);
  // Synchronous flag — set the instant verification succeeds so the dialog's
  // immediate onOpenChange(false) callback does NOT mistake it for a cancel.
  const otpVerifiedRef = useRef(false);
  // Track that the current authenticated session is awaiting OTP. Persist in
  // sessionStorage so a refresh during the gate keeps blocking until verified.
  const [pendingOtp, setPendingOtp] = useState<boolean>(() => {
    try { return sessionStorage.getItem(LOGIN_OTP_FLAG) === '1'; } catch { return false; }
  });

  // When pendingOtp is set and a user/role becomes available, decide whether
  // OTP is actually required for this role. If not, clear the flag so redirect
  // can proceed. If required, open the dialog.
  useEffect(() => {
    if (!pendingOtp || !user) return;
    let cancelled = false;
    void (async () => {
      const mapped = mapRoleToOtpScope(role);
      try {
        const reqs = await fetchOtpRequirements(true);
        if (!isOtpRequiredFor(reqs, 'login', mapped)) {
          if (cancelled) return;
          setPendingOtp(false);
          setOtpVerified(true);
          try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
          return;
        }
      } catch {
        // Fall through and require OTP (safer default)
      }
      if (cancelled) return;
      setOtpEmail(user.email || '');
      setOtpRole(mapped);
      setOtpOpen(true);
    })();
    return () => { cancelled = true; };
  }, [pendingOtp, user, role]);

  // While an OTP gate is active we render the form + dialog (no redirect).
  // Otherwise behave as before: wait for role to resolve, then redirect.
  const otpGateActive = pendingOtp && !otpVerified;

  if (authLoading || (user && !otpGateActive && !hasResolvedAuthRedirectState({ role, userStatus }))) {
    return <PageLoader />;
  }

  if (user && !otpGateActive) {
    return <Navigate to={getAuthenticatedHomePath({ role, userStatus })} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(language === 'bn' ? 'সব তথ্য পূরণ করুন' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    // Mark the upcoming session as OTP-pending BEFORE signIn so the redirect
    // guard above blocks navigation as soon as the user state hydrates.
    try { sessionStorage.setItem(LOGIN_OTP_FLAG, '1'); } catch { /* ignore */ }
    setPendingOtp(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
      setPendingOtp(false);
      toast.error(language === 'bn' ? 'ইউজারনেম বা পাসওয়ার্ড ভুল' : 'Invalid credentials');
    }
    // On success: useEffect above will resolve role and open OTP dialog if needed.
  };

  const handleOtpVerified = () => {
    try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
    setPendingOtp(false);
    setOtpOpen(false);
    setOtpVerified(true);
  };

  const handleOtpDialogChange = async (open: boolean) => {
    if (!open && pendingOtp && !otpVerified) {
      // User cancelled the OTP gate — sign them out for safety.
      try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
      setOtpOpen(false);
      setPendingOtp(false);
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
      try { await signOut(); } catch { /* ignore */ }
      toast.error(language === 'bn'
        ? 'OTP যাচাই বাতিল করা হয়েছে — পুনরায় লগইন করুন'
        : 'OTP verification cancelled — please sign in again');
      return;
    }
    setOtpOpen(open);
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
              onChange={(e) => setPassword(sanitizePasswordInput(e.target.value))}
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

      {otpEmail && (
        <OtpVerificationDialog
          open={otpOpen}
          onOpenChange={handleOtpDialogChange}
          email={otpEmail}
          purpose="email_verification"
          scope="login"
          role={otpRole}
          recipientName={user?.user_metadata?.full_name || otpEmail}
          onVerified={handleOtpVerified}
          title={language === 'bn' ? 'লগইন যাচাইকরণ (2FA)' : 'Login Verification (2FA)'}
          description={
            language === 'bn'
              ? `নিরাপত্তার জন্য ${otpEmail} এ পাঠানো ৬-ডিজিটের কোডটি দিন।`
              : `For your security, enter the 6-digit code sent to ${otpEmail}.`
          }
        />
      )}
    </div>
  );
};

export default Login;
