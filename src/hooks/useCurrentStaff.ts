import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns the staff record for the currently logged-in user.
 * Matching strategy:
 *   1. staff.user_id = auth user id  (preferred)
 *   2. fallback to staff.email = auth user email
 *
 * Used by every place that needs to display "the logged-in user's"
 * name, designation, phone, email, photo dynamically (Dashboard,
 * AdminProfile, Sidebar/Header, Home admin card, etc.).
 */
export const useCurrentStaff = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-staff', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return null;

      // 1) Try by user_id
      const byUserId = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (byUserId.data) return byUserId.data;

      // 2) Fallback by email
      if (user.email) {
        const byEmail = await supabase
          .from('staff')
          .select('*')
          .eq('email', user.email)
          .is('deleted_at', null)
          .maybeSingle();

        // Auto-link: if a staff row exists by email but has no user_id yet,
        // attach the auth user id so subsequent lookups are O(1) on user_id.
        if (byEmail.data && !byEmail.data.user_id) {
          await supabase
            .from('staff')
            .update({ user_id: user.id })
            .eq('id', byEmail.data.id);
          return { ...byEmail.data, user_id: user.id };
        }
        return byEmail.data;
      }

      return null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};
