import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

/**
 * AuthCallbackListener
 * 
 * Listens for Supabase Auth redirect hashes / query params, specifically:
 * 1. Email verification success (#access_token=...&type=signup or type=email_change)
 * 2. Email verification errors (#error=...&error_description=...)
 * 
 * When verification succeeds:
 * - Strips sensitive tokens and hash from browser URL
 * - Displays a Bengali / English success notification
 * - Safely resets temporary auth session and navigates to /login
 */
export const AuthCallbackListener = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    // Parse both hash (Supabase default) and search params
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    const type = (hashParams.get('type') || searchParams.get('type') || '').toLowerCase();
    const error = hashParams.get('error') || searchParams.get('error');
    const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');

    const bn = language === 'bn';

    // 1. Detect Email Verification Success
    if (type === 'signup' || type === 'email_change') {
      handledRef.current = true;

      // Clean the address bar immediately
      try {
        const cleanPath = window.location.pathname === '/' ? '/login' : window.location.pathname;
        window.history.replaceState(null, '', cleanPath);
      } catch (_) {}

      // Inform user with high-visibility toast
      toast.success(
        bn
          ? 'অভিনন্দন! আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে। অনুগ্রহ করে আপনার তথ্য দিয়ে লগইন করুন।'
          : 'Congratulations! Your email has been verified successfully. Please log in with your credentials.',
        {
          duration: 8000,
          id: 'email-verify-success',
        }
      );

      // Sign out temporary session so the user lands on a clean login form
      void (async () => {
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      })();
      return;
    }

    // 2. Detect Verification Errors (e.g. expired or invalid link)
    if (error || errorCode || errorDescription) {
      handledRef.current = true;

      // Clean the address bar
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch (_) {}

      const rawDesc = (errorDescription || error || '').replace(/\+/g, ' ').toLowerCase();
      let userMsg = bn
        ? 'ভেরিফিকেশন লিংকটি মেয়াদোত্তীর্ণ বা অকার্যকর।'
        : 'The verification link is invalid or has expired.';

      if (rawDesc.includes('expired') || rawDesc.includes('invalid') || rawDesc.includes('token')) {
        userMsg = bn
          ? 'ভেরিফিকেশন লিংকটি মেয়াদোত্তীর্ণ বা অকার্যকর হয়ে গেছে। অনুগ্রহ করে লগইন পেজ থেকে নতুন OTP কোড বা লিংক নিন।'
          : 'The verification link has expired or is invalid. Please request a new OTP code or link from the login page.';
      } else if (rawDesc.includes('denied') || rawDesc.includes('unauthorized')) {
        userMsg = bn
          ? 'অনুরোধটি অনুমোদিত নয়। অনুগ্রহ করে নতুন কোড নিন।'
          : 'Access denied. Please request a new verification code.';
      }

      toast.error(userMsg, {
        duration: 8000,
        id: 'email-verify-error',
      });

      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [location, navigate, language]);

  return null;
};

export default AuthCallbackListener;
