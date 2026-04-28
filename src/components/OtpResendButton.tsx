import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { SendOtpResult } from '@/hooks/useOtpService';

export interface OtpResendButtonProps {
  /** Called when the user clicks resend. Must return a SendOtpResult. */
  onResend: () => Promise<SendOtpResult>;
  /** Initial cooldown in seconds applied right after the dialog opens / first send. */
  initialCooldown?: number;
  /** Default fallback cooldown when API doesn't provide retry_after_seconds. */
  defaultCooldown?: number;
  /** External "sending" flag (e.g. from useOtpService) — disables the button while true. */
  sending?: boolean;
  /** Optional ref-style API to start a cooldown externally (e.g. after the very first send). */
  onReady?: (api: { startCooldown: (seconds: number) => void }) => void;
  className?: string;
}

/**
 * Resend button that:
 *  - shows a live "Resend in {n}s" countdown
 *  - disables itself while a cooldown is active or while sending
 *  - on click, calls `onResend` and reads `retry_after_seconds` from the
 *    response (works for both 429 rate-limit responses and successful sends
 *    with an app-level cooldown), then restarts the countdown accordingly
 */
const OtpResendButton = ({
  onResend,
  initialCooldown = 30,
  defaultCooldown = 30,
  sending = false,
  onReady,
  className,
}: OtpResendButtonProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [remaining, setRemaining] = useState<number>(initialCooldown);
  const [total, setTotal] = useState<number>(initialCooldown || defaultCooldown);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds: number) => {
    const s = Math.max(0, Math.ceil(seconds));
    setRemaining(s);
    setTotal(s || defaultCooldown);
  }, [defaultCooldown]);

  // Expose imperative API once
  useEffect(() => {
    onReady?.({ startCooldown });
  }, [onReady, startCooldown]);

  // Countdown ticker
  useEffect(() => {
    if (remaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [remaining]);

  const handleClick = async () => {
    if (busy || sending || remaining > 0) return;
    setBusy(true);
    try {
      const result = await onResend();
      if (result.success) {
        startCooldown(result.retryAfterSeconds ?? defaultCooldown);
      } else if (result.retryAfterSeconds && result.retryAfterSeconds > 0) {
        startCooldown(result.retryAfterSeconds);
        if (result.message) {
          toast.error(result.message);
        } else {
          toast.error(
            bn
              ? `অনুগ্রহ করে ${result.retryAfterSeconds} সেকেন্ড অপেক্ষা করুন`
              : `Please wait ${result.retryAfterSeconds}s before retrying`,
          );
        }
      } else if (result.message) {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const isDisabled = remaining > 0 || busy || sending;
  const showSpinner = busy || sending;
  const onCooldown = remaining > 0;
  const progress = onCooldown && total > 0 ? ((total - remaining) / total) * 100 : 100;
  const size = 18;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - progress / 100);

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ''}`}>
      <Button
        type="button"
        variant={onCooldown ? 'outline' : 'ghost'}
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        className={`gap-2 transition-all ${
          onCooldown
            ? 'text-primary border-primary/30 bg-primary/5 cursor-not-allowed font-medium tabular-nums'
            : 'text-primary hover:bg-primary/10'
        }`}
        aria-live="polite"
      >
        {showSpinner ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : onCooldown ? (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              opacity={0.2}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {onCooldown
          ? bn
            ? `${remaining} সেকেন্ড পর আবার পাঠান`
            : `Resend in ${remaining}s`
          : bn
            ? 'আবার কোড পাঠান'
            : 'Resend Code'}
      </Button>
      {onCooldown && (
        <div
          className="w-40 h-1 rounded-full bg-primary/10 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={total - remaining}
          aria-label={bn ? 'রিসেন্ড কুলডাউন' : 'Resend cooldown'}
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%`, transition: 'width 1s linear' }}
          />
        </div>
      )}
    </div>
  );
};

export default OtpResendButton;
