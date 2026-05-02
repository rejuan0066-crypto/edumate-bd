import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldOff, Loader2, Copy, MessageCircle, RefreshCw, Check, AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { useAuditDeviceCheck } from '@/hooks/useAuditDeviceCheck';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';

/**
 * Wrap any audit page in this gate. While checking → spinner. If the device
 * is not on the audit allowlist → friendly, actionable 403 card with:
 *   - clear bilingual heading + message
 *   - read-only device-id box + "Copy Device ID" button
 *   - WhatsApp / phone support button with auto-formatted message
 *   - "Try Again" retry that re-runs the verification query
 */
export const AuditDeviceGate = ({ children }: { children: React.ReactNode }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { data, isLoading, isFetching, refetch } = useAuditDeviceCheck();
  const { data: inst } = useInstitutionInfo();
  const qc = useQueryClient();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Card className="rounded-[45px] m-4 md:m-6">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.ok) {
    const deviceId = getDeviceId();
    const supportPhone = (inst?.phone ?? '').replace(/[^\d+]/g, '');
    const path = location.pathname;
    const supportMsg = bn
      ? `আস-সালামু আলাইকুম,\nআমার ডিভাইস আইডি: ${deviceId}\nআমি ${path} অডিট পেজটি এক্সেস করতে পারছি না। অনুগ্রহ করে আমার ডিভাইসটি অনুমোদন করুন।`
      : `Assalamu Alaikum,\nMy device ID: ${deviceId}\nI cannot access the ${path} audit page. Please approve my device.`;
    const waUrl = supportPhone
      ? `https://wa.me/${supportPhone.replace(/^\+/, '')}?text=${encodeURIComponent(supportMsg)}`
      : null;

    const handleCopy = async () => {
      try {
        await navigator.clipboard?.writeText(deviceId);
        setCopied(true);
        toast.success(bn ? 'কপি হয়েছে!' : 'Copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(bn ? 'কপি করা যায়নি' : 'Copy failed');
      }
    };

    const handleRetry = async () => {
      qc.invalidateQueries({ queryKey: ['audit-device-check'] });
      await refetch();
    };

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 md:p-6">
        <Card
          className="rounded-[38px] md:rounded-[45px] border-2 border-destructive/40 bg-gradient-to-br from-destructive/[0.04] to-amber-500/[0.04] max-w-2xl w-full shadow-xl"
        >
          <CardContent className="p-6 md:p-10 space-y-6">
            {/* Icon + heading */}
            <div className="text-center space-y-3">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-destructive/10 ring-4 ring-destructive/5 flex items-center justify-center">
                <ShieldOff className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-destructive">
                  {bn ? 'অ্যাক্সেস রিজেক্টেড' : 'Access Denied'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {bn ? 'Access Denied' : 'অ্যাক্সেস রিজেক্টেড'}
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                {bn
                  ? 'দুঃখিত, আপনার এই ডিভাইসটি অডিট রিপোর্ট দেখার জন্য অনুমোদিত নয়। দয়া করে আপনার নিবন্ধিত অ্যাডমিন ডিভাইস ব্যবহার করুন অথবা নিচের ডিভাইস আইডিটি কপি করে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।'
                  : 'Sorry, this device is not authorized to view audit reports. Please use your registered admin device, or copy the device ID below and contact a super admin.'}
              </p>
            </div>

            {/* Device ID box */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {bn ? 'আপনার ডিভাইস আইডি' : 'Your Device ID'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={deviceId}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs font-mono break-all focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-2xl shrink-0 min-w-[140px]"
                  variant={copied ? 'default' : 'outline'}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      {bn ? 'কপি হয়েছে!' : 'Copied!'}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {bn ? 'কপি করুন' : 'Copy Device ID'}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground pl-1">
                {bn ? 'কারণ' : 'Reason'}: <code>{data?.reason ?? 'unknown'}</code>
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl h-12"
                onClick={handleRetry}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {bn ? 'আবার চেষ্টা করুন' : 'Try Again'}
              </Button>

              {waUrl ? (
                <Button
                  asChild
                  className="rounded-2xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {bn ? 'হোয়াটসঅ্যাপে যোগাযোগ' : 'Contact Support'}
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-2xl h-12"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard?.writeText(supportMsg);
                    toast.success(bn ? 'বার্তা কপি হয়েছে — সুপার অ্যাডমিনকে পাঠান' : 'Message copied — send to super admin');
                  }}
                >
                  <Copy className="h-4 w-4" />
                  {bn ? 'সাপোর্ট বার্তা কপি' : 'Copy Support Message'}
                </Button>
              )}
            </div>

            {/* Footnote */}
            <p className="text-[11px] text-center text-muted-foreground pt-2">
              {bn
                ? 'অনুমোদনের পরপরই এই পেজে অ্যাক্সেস ফিরে পাবেন।'
                : 'Access will be restored as soon as your device is approved.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuditDeviceGate;
