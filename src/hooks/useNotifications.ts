import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  title: string;
  title_bn: string | null;
  message: string | null;
  message_bn: string | null;
  type: string;
  category: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

let globalNotifChannel: ReturnType<typeof supabase.channel> | null = null;
let activeNotifSubscribers = 0;
let notifTeardownTimer: any = null;
const notifInvalidators = new Set<() => void>();

const ensureNotifChannel = () => {
  if (notifTeardownTimer) {
    clearTimeout(notifTeardownTimer);
    notifTeardownTimer = null;
  }
  if (globalNotifChannel) return;

  const channelName = `notifications-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    globalNotifChannel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        notifInvalidators.forEach((cb) => {
          try { cb(); } catch {}
        });
      })
      .subscribe();
  } catch (err) {
    console.warn('[useNotifications] Realtime subscribe error:', err);
  }
};

const releaseNotifChannel = () => {
  if (activeNotifSubscribers <= 0) {
    activeNotifSubscribers = 0;
    if (notifTeardownTimer) clearTimeout(notifTeardownTimer);
    notifTeardownTimer = setTimeout(() => {
      if (activeNotifSubscribers === 0 && globalNotifChannel) {
        try {
          supabase.removeChannel(globalNotifChannel);
        } catch {}
        globalNotifChannel = null;
      }
    }, 5000);
  }
};

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !authLoading && !!user,
  });

  // Realtime subscription (managed via singleton)
  useEffect(() => {
    if (authLoading || !user) return;

    const invalidator = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    notifInvalidators.add(invalidator);
    activeNotifSubscribers++;
    ensureNotifChannel();

    return () => {
      notifInvalidators.delete(invalidator);
      activeNotifSubscribers = Math.max(0, activeNotifSubscribers - 1);
      releaseNotifChannel();
    };
  }, [authLoading, queryClient, user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const addNotification = useMutation({
    mutationFn: async (n: { title: string; title_bn?: string; message?: string; message_bn?: string; type?: string; category?: string; link?: string }) => {
      const { error } = await supabase.from('notifications').insert({
        title: n.title,
        title_bn: n.title_bn || null,
        message: n.message || null,
        message_bn: n.message_bn || null,
        type: n.type || 'info',
        category: n.category || 'general',
        link: n.link || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, addNotification };
};
