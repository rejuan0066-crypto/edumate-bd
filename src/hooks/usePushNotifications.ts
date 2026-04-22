import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key — must match the private key on the server
// Default placeholder; admins can override via website_settings.push_vapid_public_key
const DEFAULT_VAPID_PUBLIC_KEY = '';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export const usePushNotifications = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState<string>(DEFAULT_VAPID_PUBLIC_KEY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);

    // Load VAPID public key from website_settings
    supabase
      .from('website_settings')
      .select('value')
      .eq('key', 'push_vapid_public_key')
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as any)?.key;
        if (typeof v === 'string' && v.length > 20) setVapidKey(v);
      });

    // Check existing subscription
    if (ok) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
      );
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !vapidKey) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      const json = sub.toJSON() as any;
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: userData.user?.id || null,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );
      setSubscribed(true);
      return true;
    } catch (e) {
      console.error('Push subscribe failed', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, vapidKey]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, loading, vapidKey, subscribe, unsubscribe };
};
