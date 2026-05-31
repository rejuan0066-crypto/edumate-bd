import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { fetchResolvedAuthState, isTransientAuthStateError } from '@/contexts/auth/resolveAuthState';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  ready: boolean;
  role: string | null;
  userStatus: string | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [resolveNonce, setResolveNonce] = useState(0);

  const fetchedForSession = useRef<string | null>(null);
  const lastHandledAccessToken = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const userRef = useRef<User | null>(null);
  const lastResolvedAccessState = useRef<{ userId: string; role: string | null; userStatus: string | null } | null>(null);
  const authResolveRetryRef = useRef<{ key: string; count: number }>({ key: '', count: 0 });
  const authResolveRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const resetResolvedState = () => {
      fetchedForSession.current = null;
      lastResolvedAccessState.current = null;
      setProfileLoading(false);
      setRole(null);
      setUserStatus(null);
    };

    const clearSessionState = () => {
      if (cancelled) return;
      lastHandledAccessToken.current = null;
      sessionRef.current = null;
      userRef.current = null;
      setSession(null);
      setUser(null);
      resetResolvedState();
      setAuthReady(true);
    };

    const applySession = (nextSession: Session | null) => {
      if (cancelled) return;

      if (!nextSession?.user) {
        clearSessionState();
        return;
      }

      const nextAccessToken = nextSession.access_token ?? null;
      const nextUser = nextSession.user;

      if (
        lastHandledAccessToken.current === nextAccessToken &&
        sessionRef.current?.user?.id === nextUser.id
      ) {
        setAuthReady(true);
        return;
      }

      lastHandledAccessToken.current = nextAccessToken;
      sessionRef.current = nextSession;
      userRef.current = nextUser;
      setSession(nextSession);
      setUser(nextUser);
      setAuthReady(true);
    };

    const restoreSessionSafely = (attempt = 0) => {
      void supabase.auth.getSession().then(({ data: { session: restoredSession } }) => {
        if (cancelled) return;
        if (restoredSession?.user) {
          applySession(restoredSession);
          return;
        }
        if (!sessionRef.current?.user) {
          clearSessionState();
        } else {
          setAuthReady(true);
        }
      }).catch((error) => {
        if (cancelled) return;
        console.error('Failed to restore auth session (attempt ' + attempt + '):', error);
        if (attempt < 2 && sessionRef.current?.user) {
          setTimeout(() => {
            if (!cancelled) restoreSessionSafely(attempt + 1);
          }, 1500 * (attempt + 1));
          return;
        }
        if (!sessionRef.current?.user) {
          clearSessionState();
        } else {
          setAuthReady(true);
        }
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT') {
        clearSessionState();
        return;
      }

      if (event === 'TOKEN_REFRESHED' && nextSession?.user) {
        applySession(nextSession);
        return;
      }

      if (!nextSession?.user) {
        if (sessionRef.current?.user || userRef.current || lastHandledAccessToken.current) {
          restoreSessionSafely();
          return;
        }

        clearSessionState();
        return;
      }

      applySession(nextSession);
    });

    restoreSessionSafely();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!user?.id) {
      setProfileLoading(false);
      return;
    }

    const fetchKey = `${user.id}:${session?.access_token ?? 'no-token'}`;

    if (fetchedForSession.current === fetchKey) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    fetchedForSession.current = fetchKey;
    setProfileLoading(true);

    void (async () => {
      try {
        if (cancelled) return;

        const resolvedState = await fetchResolvedAuthState(user.id);

        if (cancelled) return;

        setRole(resolvedState.role);
        setUserStatus(resolvedState.userStatus);
        lastResolvedAccessState.current = {
          userId: user.id,
          role: resolvedState.role,
          userStatus: resolvedState.userStatus,
        };
      } catch (error) {
        if (cancelled) return;

        console.error('Failed to resolve auth state:', error);

        const errMsg = error instanceof Error ? error.message : String(error ?? '');
        const isAuthError =
          errMsg.includes('JWT expired') ||
          errMsg.includes('PGRST303') ||
          errMsg.includes('invalid claim');

        if (isAuthError) {
          console.warn('Auth token expired during profile fetch, attempting refresh...');
          fetchedForSession.current = null;
          try {
            const previousAccessToken = sessionRef.current?.access_token ?? null;
            const { data, error: refreshErr } = await supabase.auth.refreshSession();
            const nextAccessToken = data.session?.access_token ?? null;

            if (refreshErr || !nextAccessToken || nextAccessToken === previousAccessToken) {
              console.warn('Session refresh failed, clearing local session');
              await supabase.auth.signOut({ scope: 'local' });
              return;
            }
          } catch {
            await supabase.auth.signOut({ scope: 'local' });
          }
          return;
        }

        const lastResolved = lastResolvedAccessState.current;
        if (lastResolved?.userId === user.id) {
          setRole(lastResolved.role);
          setUserStatus(lastResolved.userStatus);
        } else {
          console.warn('Unable to resolve auth state for active session, clearing local session to avoid stuck loading state.');
          fetchedForSession.current = null;
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, session?.access_token]);

  const loading = !authReady || profileLoading;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      ready: authReady,
      role,
      userStatus,
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signOut: async () => {
        await supabase.auth.signOut({ scope: 'local' });
      },
    }),
    [authReady, user, session, loading, role, userStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};