// Client-side pre-check for audit-route access. Calls verify_audit_device
// RPC so the friendly 403 message can be shown before any further network
// activity. Server still re-checks on every privileged call.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { useAuth } from '@/hooks/useAuth';

export type AuditDeviceCheck = {
  ok: boolean;
  reason: string;
  deviceId: string;
};

export function useAuditDeviceCheck() {
  const { user } = useAuth();
  const deviceId = getDeviceId();

  return useQuery<AuditDeviceCheck>({
    queryKey: ['audit-device-check', deviceId, user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      const { data, error } = await supabase.rpc('verify_audit_device', {
        _device_id: deviceId,
        _ip: null,
        _user_agent: ua,
        _endpoint: typeof window !== 'undefined' ? window.location.pathname : null,
      });
      if (error) {
        return { ok: false, reason: error.message, deviceId };
      }
      const res = (data ?? {}) as { ok?: boolean; reason?: string };
      return {
        ok: !!res.ok,
        reason: res.reason ?? 'unknown',
        deviceId,
      };
    },
  });
}
