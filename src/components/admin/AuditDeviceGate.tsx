import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { useAuditDeviceCheck } from '@/hooks/useAuditDeviceCheck';
import { toast } from 'sonner';

/**
 * Wrap any audit page in this gate. While checking → spinner. If the device
 * is not on the audit allowlist → professional 403 card + "copy device id"
 * action so the super admin can allowlist it.
 */
export const AuditDeviceGate = ({ children }: { children: React.ReactNode }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { data, isLoading } = useAuditDeviceCheck();

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
    return (
      <Card className="rounded-[45px] border-2 border-destructive/40 m-4 md:m-6 max-w-2xl mx-auto">
        <CardContent className="p-8 md:p-10 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-destructive">
            {bn ? 'অননুমোদিত ডিভাইস' : 'Unauthorized Device'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {bn
              ? 'আপনার এই ডিভাইসটি অডিট রিপোর্ট দেখার জন্য অনুমোদিত নয়। দয়া করে আপনার নিবন্ধিত অ্যাডমিন ডিভাইস ব্যবহার করুন অথবা সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।'
              : 'This device is not authorized to view audit reports. Please use your registered admin device or contact a super admin.'}
          </p>
          <div className="rounded-2xl bg-muted/40 p-3 text-left">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {bn ? 'আপনার ডিভাইস আইডি' : 'Your device ID'}
            </p>
            <code className="text-xs font-mono break-all">{deviceId}</code>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {bn ? 'কারণ' : 'Reason'}: <code>{data?.reason ?? 'unknown'}</code>
          </p>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(deviceId);
              toast.success(bn ? 'ডিভাইস আইডি কপি হয়েছে' : 'Device ID copied');
            }}
          >
            {bn ? 'ডিভাইস আইডি কপি করুন' : 'Copy Device ID'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default AuditDeviceGate;
