import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import emailjs from '@emailjs/browser';
import { toast } from 'sonner';

interface SendOtpResult {
  success: boolean;
  expiryMinutes?: number;
}

export const useOtpService = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async (
    email: string,
    purpose: 'email_verification' | 'password_reset',
    recipientName?: string
  ): Promise<SendOtpResult> => {
    setSending(true);
    try {
      // Call edge function to generate OTP and get EmailJS config
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, purpose },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Failed to generate OTP');
        return { success: false };
      }

      const { otp_code, emailjs: config, expiry_minutes } = data;

      // Send email via EmailJS from client side
      await emailjs.send(
        config.service_id,
        config.template_id,
        {
          to_email: email,
          to_name: recipientName || email,
          otp_code: otp_code,
          expiry_minutes: expiry_minutes,
          purpose: purpose === 'password_reset' ? 'Password Reset' : 'Email Verification',
        },
        config.public_key
      );

      return { success: true, expiryMinutes: expiry_minutes };
    } catch (err: any) {
      console.error('OTP send error:', err);
      toast.error('Failed to send verification email');
      return { success: false };
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (
    email: string,
    code: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<{ valid: boolean; error?: string }> => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, code, purpose },
      });

      if (error) {
        return { valid: false, error: 'Verification failed' };
      }

      return { valid: data.valid, error: data.error };
    } catch (err) {
      return { valid: false, error: 'Verification failed' };
    } finally {
      setVerifying(false);
    }
  };

  return { sendOtp, verifyOtp, sending, verifying };
};
