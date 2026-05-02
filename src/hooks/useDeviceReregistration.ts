// Smart device re-registration: cooldown-aware status + request RPC wrappers.
// Used by AuditDeviceGate so users locked out of audit pages can request a new
// device approval without admin intervention.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { useAuth } from '@/hooks/useAuth';

export type ReregisterStatus = {
  ok: boolean;
  cooldown_hours: number;
  last_request_at: string | null;
  next_allowed_at: string | null;
  can_request: boolean;
  has_pending: boolean;
  pending_status: string | null;
  pending_device_id: string | null;
};

export function useDeviceReregisterStatus() {
  const { user } = useAuth();
  return useQuery<ReregisterStatus>({
    queryKey: ['device-reregister-status', user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_device_reregister_status');
      if (error) throw error;
      return (data ?? {}) as ReregisterStatus;
    },
  });
}

export type ReregisterPayload = {
  ip?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  upazila?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

async function fetchGeo(): Promise<ReregisterPayload> {
  try {
    const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!r.ok) return {};
    const j = await r.json();
    return {
      ip: j.ip ?? null,
      country: j.country_name ?? null,
      region: j.region ?? null,
      city: j.city ?? null,
      latitude: j.latitude ?? null,
      longitude: j.longitude ?? null,
    };
  } catch {
    return {};
  }
}

export function useRequestDeviceReregistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const deviceId = getDeviceId();
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      const model = typeof navigator !== 'undefined'
        ? `${navigator.platform || 'web'}`.slice(0, 60) : 'web';
      const geo = await fetchGeo();
      const { data, error } = await supabase.rpc('request_device_reregistration', {
        _device_id: deviceId,
        _user_agent: ua,
        _device_model: model,
        _ip: geo.ip ?? null,
        _country: geo.country ?? null,
        _region: geo.region ?? null,
        _city: geo.city ?? null,
        _upazila: geo.upazila ?? null,
        _village: geo.village ?? null,
        _latitude: geo.latitude ?? null,
        _longitude: geo.longitude ?? null,
      });
      if (error) throw error;
      return (data ?? {}) as {
        ok: boolean;
        reason?: string;
        request_id?: string;
        cooldown_hours?: number;
        next_allowed_at?: string;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-reregister-status'] });
      qc.invalidateQueries({ queryKey: ['device-approval-requests'] });
    },
  });
}

export function formatRemaining(nextAllowedAt: string | null, bn: boolean): string {
  if (!nextAllowedAt) return '';
  const ms = new Date(nextAllowedAt).getTime() - Date.now();
  if (ms <= 0) return '';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) {
    return bn ? `আরও ${hours} ঘণ্টা ${minutes} মিনিট পর আবার রিকোয়েস্ট করতে পারবেন`
              : `You can request again in ${hours}h ${minutes}m`;
  }
  return bn ? `আরও ${minutes} মিনিট পর আবার রিকোয়েস্ট করতে পারবেন`
            : `You can request again in ${minutes}m`;
}
