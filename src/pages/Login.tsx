import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User, Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft, Mail } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LanguageToggle from '@/components/LanguageToggle';
import ForgotPasswordDialog from '@/components/ForgotPasswordDialog';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import EmailVerificationDialog from '@/components/EmailVerificationDialog';
import { toast } from 'sonner';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { getAuthenticatedHomePath, hasResolvedAuthRedirectState } from '@/lib/authRedirect';
import PageLoader from '@/components/PageLoader';

import { fetchOtpRequirements, isOtpRequiredFor, useOtpRequirements, type OtpRoleScope } from '@/hooks/useOtpRequirements';
import { supabase } from '@/integrations/supabase/client';
import { sanitizePasswordInput } from '@/lib/passwordInput';

const LOGIN_OTP_FLAG = 'pending_login_otp_v1';

// Synchronously detect whether the browser has a persisted Supabase session.
// If there is NO stored token, the visitor is definitely logged out, so we can
// render the login form immediately instead of flashing a full-page loader
// while auth initializes (that loader -> form swap looks like a page reload).
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key)) {
        const val = localStorage.getItem(key);
        if (val && val !== 'null' && val.length > 2) return true;
      }
    }
  } catch {
    // localStorage blocked → assume a session might exist (safer: keep loader)
    return true;
  }
  return false;
}

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
  const { reqs: otpReqs } = useOtpRequirements();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
  const [emailVerifyEmail, setEmailVerifyEmail] = useState('');
  // Computed once on mount: is there a persisted session in this browser?
  const [storedSession] = useState<boolean>(() => hasStoredSession());


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
        const reqs = await fetchOtpRequirements(false);
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

  // While OTP gate is pending (or active), keep the form + dialog mounted —
  // do NOT show a full-page loader. Otherwise the user sees a blank loader
  // between clicking "Sign in" and the OTP dialog appearing.
  if (!pendingOtp && !otpGateActive) {
    // Only show the full-page loader if this browser actually has a stored
    // session that might resolve to an authenticated user. Logged-out visitors
    // (no stored token) get the login form immediately — no loader -> form
    // flash that looks like a second page reload.
    if (storedSession && (authLoading || (user && !hasResolvedAuthRedirectState({ role, userStatus })))) {
      return <PageLoader />;
    }
    if (user && hasResolvedAuthRedirectState({ role, userStatus })) {
      return <Navigate to={getAuthenticatedHomePath({ role, userStatus })} replace />;
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      toast.error(language === 'bn' ? 'সব তথ্য পূরণ করুন' : 'Please fill all fields');
      return;
    }
    setLoading(true);
    // Only mark session as OTP-pending if login OTP is actually enabled.
    // If login OTP is disabled, we avoid blocking navigation, allowing immediate redirect!
    const loginNeedsOtp = otpReqs ? isOtpRequiredFor(otpReqs, 'login') : false;
    if (loginNeedsOtp) {
      try { sessionStorage.setItem(LOGIN_OTP_FLAG, '1'); } catch { /* ignore */ }
      setPendingOtp(true);
    } else {
      try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
      setPendingOtp(false);
    }

    const { error } = await signIn(cleanEmail, password);
    setLoading(false);
    if (error) {
      try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
      setPendingOtp(false);
      const errObj = error as { message?: string; status?: number; code?: string } | null;
      const rawMsg = (error instanceof Error ? error.message : String(errObj?.message ?? error ?? '')).trim();
      const lower = rawMsg.toLowerCase();
      console.error('Supabase login error details:', { error, rawMsg, cleanEmail });

      const isNetworkError =
        lower.includes('load failed') ||
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error') ||
        lower.includes('fetch failed') ||
        lower.includes('timeout') ||
        lower.includes('timed out');

      if (isNetworkError) {
        toast.error(
          language === 'bn'
            ? 'ইন্টারনেট সংযোগে সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন।'
            : 'Network problem. Please check your connection and try again.'
        );
      } else if (lower.includes('email not confirmed')) {
        setEmailVerifyEmail(cleanEmail);
        setEmailVerifyOpen(true);
        toast.error(
          language === 'bn'
            ? 'ইমেইল ভেরিফাই করা হয়নি। OTP কোড অথবা ভেরিফিকেশন লিংকের মাধ্যমে এখনই নিশ্চিত করুন।'
            : 'Email not confirmed. Please verify using OTP code or confirmation link.'
        );
      } else if (lower.includes('rate limit') || lower.includes('too many requests')) {
        toast.error(
          language === 'bn'
            ? 'অনেক বেশিবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
            : 'Too many requests. Please wait a moment and try again.'
        );
      } else if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        toast.error(
          language === 'bn'
            ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।'
            : 'Invalid email or password.'
        );
      } else {
        toast.error(rawMsg || (language === 'bn' ? 'লগইন ব্যর্থ হয়েছে' : 'Login failed'));
      }
    }
    // On success: useEffect above will resolve role and open OTP dialog if needed.
  };

  const handleOtpVerified = () => {
    otpVerifiedRef.current = true;
    try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
    setPendingOtp(false);
    setOtpOpen(false);
    setOtpVerified(true);
  };

  const handleOtpDialogChange = async (open: boolean) => {
    // Read the synchronous ref instead of state — avoids the race where
    // onVerified() schedules state updates but onOpenChange(false) fires
    // immediately after with stale otpVerified=false.
    if (!open && pendingOtp && !otpVerifiedRef.current) {
      // Dialog closed without verification. This can happen because:
      //   (a) the user explicitly cancelled, OR
      //   (b) the dialog auto-passed when the global OTP scope is disabled
      //       and immediately fired onOpenChange(false) before onVerified.
      // In either case, signing the user out causes the published-site
      // "login → instant logout" loop. Instead, just clear the gate so the
      // redirect can proceed; the user is already authenticated.
      try { sessionStorage.removeItem(LOGIN_OTP_FLAG); } catch { /* ignore */ }
      setOtpOpen(false);
      setPendingOtp(false);
      setOtpVerified(true);
      return;
    }
    setOtpOpen(open);
  };

  const loginLogo = settings.favicon_url || settings.logo_url;
  const showLogo = settings.login_show_logo !== false;
  const showName = settings.login_show_institution_name !== false;
  const instName = language === 'bn'
    ? (settings.login_institution_name_bn || settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা')
    : (settings.login_institution_name_en || settings.institution_name_en || 'Al-Arabia Subhania Madrasah & Eyateem Khana');

  const bgStyle: React.CSSProperties = settings.login_bg_image_url
    ? { backgroundImage: `url(${settings.login_bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : settings.login_bg_color
      ? { background: settings.login_bg_color }
      : { background: 'radial-gradient(ellipse at 50% 20%, #064e3b 0%, #022c22 65%, #011610 100%)' };

  const formStyle: React.CSSProperties = {
    ...(settings.login_form_bg_color ? { backgroundColor: settings.login_form_bg_color } : {}),
    ...(settings.login_form_border_radius !== undefined ? { borderRadius: `${settings.login_form_border_radius}px` } : {}),
    ...(settings.login_form_shadow === false ? { boxShadow: 'none' } : {}),
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={bgStyle}>
      {!settings.login_bg_image_url && (
        <div className="islamic-pattern absolute inset-0 opacity-15 pointer-events-none" />
      )}
      {settings.login_bg_image_url && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      )}

      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <div
        className="w-full max-w-sm sm:max-w-md bg-white/98 dark:bg-slate-900/98 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 relative z-10"
        style={formStyle}
      >
        <div className="text-center mb-6">
          {showLogo && (
            <div className="w-16 h-16 rounded-full mx-auto mb-3 p-1 bg-white border border-emerald-600/20 shadow-sm flex items-center justify-center">
              {loginLogo ? (
                <img
                  src={loginLogo}
                  alt="Logo"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = 'true';
                      img.src = '/loader-logo.png';
                    }
                  }}
                  className="w-full h-full rounded-full object-contain"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-emerald-800 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          )}

          {showName && (
            <h1
              className="text-base sm:text-lg font-bold font-display text-slate-800 dark:text-white leading-snug px-2"
              title={instName}
              style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              {instName}
            </h1>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'bn' ? 'মাদরাসা ম্যানেজমেন্ট পোর্টাল' : 'Madrasa Management Portal'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <Label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('username')}
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'bn' ? 'ইমেইল এড্রেস' : 'Email address'}
              className="h-11 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm"
              type="email"
              name="email"
              autoComplete="off"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('password')}
              </Label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline transition"
              >
                {t('forgotPassword')}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(sanitizePasswordInput(e.target.value))}
                placeholder="••••••••"
                className="h-11 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pr-10 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm"
                name="password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.99] bg-emerald-700 hover:bg-emerald-800 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{t('signIn')}</span>
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'হোম পেইজে ফিরে যান' : 'Back to Home'}</span>
          </Link>
        </div>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />

      <EmailVerificationDialog
        open={emailVerifyOpen}
        onOpenChange={setEmailVerifyOpen}
        initialEmail={emailVerifyEmail || email.trim().toLowerCase()}
        onSuccess={async () => {
          const cleanEmail = email.trim().toLowerCase();
          if (cleanEmail && password) {
            toast.info(language === 'bn' ? 'স্বয়ংক্রিয়ভাবে লগইন করা হচ্ছে...' : 'Signing in automatically...');
            const { error } = await signIn(cleanEmail, password);
            if (!error) {
              toast.success(language === 'bn' ? 'লগইন সফল হয়েছে!' : 'Login successful!');
            }
          }
        }}
      />

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
