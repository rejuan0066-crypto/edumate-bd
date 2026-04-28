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
  /** When provided, the cooldown deadline is persisted under this key in
   *  localStorage so the countdown survives page reloads / tab re-opens.
   *  Use a stable per-flow key, e.g. `otp:user@example.com:login`. */
  persistKey?: string;
}

const STORAGE_PREFIX = 'otp_cooldown:';

interface PersistedCooldown {
  deadline: number; // epoch ms
  total: number;    // original cooldown in seconds (for progress bar)
}

const readPersisted = (key: string): PersistedCooldown | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCooldown;
    if (typeof parsed?.deadline !== 'number' || typeof parsed?.total !== 'number') return null;
    if (parsed.deadline <= Date.now()) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writePersisted = (key: string, value: PersistedCooldown | null) => {
  try {
    if (!value) localStorage.removeItem(STORAGE_PREFIX + key);
    else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch { /* storage unavailable */ }
};

const OtpResendButton = ({
  onResend,
  initialCooldown = 30,
  defaultCooldown = 30,
  sending = false,
  onReady,
  className,
  persistKey,
}: OtpResendButtonProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Hydrate from localStorage on first render so a refresh during cooldown
  // immediately shows the remaining seconds.
  const initial = (() => {
    if (persistKey) {
      const persisted = readPersisted(persistKey);
      if (persisted) {
        const remainingSec = Math.max(0, Math.ceil((persisted.deadline - Date.now()) / 1000));
        return { remaining: remainingSec, total: persisted.total };
      }
    }
    return { remaining: initialCooldown, total: initialCooldown || defaultCooldown };
  })();

  const [remaining, setRemaining] = useState<number>(initial.remaining);
  const [total, setTotal] = useState<number>(initial.total);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistKeyRef = useRef<string | undefined>(persistKey);
  persistKeyRef.current = persistKey;

  const startCooldown = useCallback((seconds: number) => {
    const s = Math.max(0, Math.ceil(seconds));
    const t = s || defaultCooldown;
    setRemaining(s);
    setTotal(t);
    if (persistKeyRef.current) {
      if (s > 0) {
        writePersisted(persistKeyRef.current, {
          deadline: Date.now() + s * 1000,
          total: t,
        });
      } else {
        writePersisted(persistKeyRef.current, null);
      }
    }
  }, [defaultCooldown]);

  // Expose imperative API once
  useEffect(() => {
    onReady?.({ startCooldown });
  }, [onReady, startCooldown]);

  // Re-sync to wall clock whenever the tab becomes visible (handles long
  // background time where setInterval was throttled or paused).
  useEffect(() => {
    const resync = () => {
      if (!persistKeyRef.current) return;
      const persisted = readPersisted(persistKeyRef.current);
      if (!persisted) {
        setRemaining(0);
        return;
      }
      const remainingSec = Math.max(0, Math.ceil((persisted.deadline - Date.now()) / 1000));
      setRemaining(remainingSec);
      setTotal(persisted.total);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resync();
    };
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Cross-tab sync: if another tab starts/clears a cooldown for the same key.
  useEffect(() => {
    if (!persistKey) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_PREFIX + persistKey) return;
      const persisted = readPersisted(persistKey);
      if (!persisted) {
        setRemaining(0);
        return;
      }
      setRemaining(Math.max(0, Math.ceil((persisted.deadline - Date.now()) / 1000)));
      setTotal(persisted.total);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [persistKey]);

  // Countdown ticker — derives remaining from the persisted deadline when
  // available so it's never out of sync with wall clock.
  useEffect(() => {
    if (remaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (persistKeyRef.current) writePersisted(persistKeyRef.current, null);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining(() => {
        if (persistKeyRef.current) {
          const persisted = readPersisted(persistKeyRef.current);
          if (!persisted) return 0;
          return Math.max(0, Math.ceil((persisted.deadline - Date.now()) / 1000));
        }
        // No persistence — fall back to plain decrement
        return (prev => (prev <= 1 ? 0 : prev - 1))(remaining);
      });
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
