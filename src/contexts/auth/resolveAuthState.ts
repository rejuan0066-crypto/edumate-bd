import { supabase } from '@/integrations/supabase/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const AUTH_STATE_REQUEST_TIMEOUT_MS = 12000;

const withTimeout = async <T>(promise: PromiseLike<T>, label: string): Promise<T> => {
  return await Promise.race<T>([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${AUTH_STATE_REQUEST_TIMEOUT_MS}ms`)), AUTH_STATE_REQUEST_TIMEOUT_MS);
    }),
  ]);
};

export const isTransientAuthStateError = (error: unknown) => {
  const message = [
    error instanceof Error ? error.message : '',
    typeof error === 'object' && error !== null && 'details' in error ? String((error as { details?: unknown }).details ?? '') : '',
    typeof error === 'object' && error !== null && 'hint' in error ? String((error as { hint?: unknown }).hint ?? '') : '',
  ]
    .join(' ')
    .toLowerCase();

  return (
    message.includes('aborterror') ||
    message.includes('lock broken') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('request was aborted') ||
    message.includes('load failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('jwt expired') ||
    message.includes('pgrst303')
  );
};

export const resolvePrimaryRole = (roles: Array<string | null | undefined>): string | null => {
  const normalizedRoles = roles.filter((value): value is string => Boolean(value));
  if (normalizedRoles.includes('super_admin')) return 'super_admin';
  if (normalizedRoles.includes('admin')) return 'admin';
  return normalizedRoles[0] ?? null;
};

export const fetchResolvedAuthState = async (userId: string) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [rolesResult, profileResult] = await Promise.all([
        withTimeout(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId),
          'user_roles lookup'
        ),
        withTimeout(
          supabase
            .from('profiles')
            .select('status')
            .eq('id', userId)
            .maybeSingle(),
          'profiles lookup'
        ),
      ]);

      if (rolesResult.error) {
        throw rolesResult.error;
      }

      if (profileResult.error) {
        throw profileResult.error;
      }

      return {
        role: resolvePrimaryRole((rolesResult.data ?? []).map(({ role }) => role)),
        userStatus: profileResult.data?.status ?? 'pending',
      };
    } catch (error) {
      lastError = error;

      if (attempt === 2 || !isTransientAuthStateError(error)) {
        throw error;
      }

      await sleep(250 * (attempt + 1));
    }
  }

  throw lastError;
};