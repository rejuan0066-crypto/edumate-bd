import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a short correlation ID for tracing administrative-name requests
 * across UI -> SQL paths. Use one ID per logical user action.
 */
export function newCorrelationId(prefix = 'anr'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`;
}

export type AdminNameLogInput = {
  correlationId: string;
  sourcePath: string;          // e.g. 'useStaffDirectory'
  sqlPath?: string | null;     // e.g. 'view:staff_directory'
  filters?: Record<string, unknown>;
  resultCount?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
};

/**
 * Best-effort write to the admin_name_request_log table.
 * Never throws — diagnostic logging must never break a real query.
 */
export async function logAdminNameRequest(input: AdminNameLogInput): Promise<void> {
  try {
    await (supabase as any).rpc('log_admin_name_request', {
      _correlation_id: input.correlationId,
      _source_path: input.sourcePath,
      _sql_path: input.sqlPath ?? null,
      _filters: input.filters ?? {},
      _result_count: input.resultCount ?? null,
      _error_code: input.errorCode ?? null,
      _error_message: input.errorMessage ?? null,
      _duration_ms: input.durationMs ?? null,
    });
  } catch {
    /* swallow — diagnostics only */
  }
  // Console breadcrumb so devs can grep in browser logs too
  // eslint-disable-next-line no-console
  console.debug(
    `[admin-name-log] cid=${input.correlationId} src=${input.sourcePath} sql=${input.sqlPath ?? '-'} count=${input.resultCount ?? '-'}${input.errorCode ? ` err=${input.errorCode}` : ''} ${input.durationMs ?? '-'}ms`
  );
}

/** Wrap a Supabase query promise to auto-log result + duration with one correlation ID. */
export async function tracedAdminNameQuery<T>(
  meta: Omit<AdminNameLogInput, 'resultCount' | 'errorCode' | 'errorMessage' | 'durationMs'>,
  runner: () => Promise<{ data: T[] | T | null; error: any }>,
): Promise<{ data: T[] | T | null; error: any; correlationId: string }> {
  const start = performance.now();
  let data: any = null;
  let error: any = null;
  try {
    const res = await runner();
    data = res.data;
    error = res.error;
  } catch (e: any) {
    error = e;
  }
  const duration = Math.round(performance.now() - start);
  const count = Array.isArray(data) ? data.length : data ? 1 : 0;
  await logAdminNameRequest({
    ...meta,
    resultCount: count,
    errorCode: error?.code ?? (error ? 'unknown' : null),
    errorMessage: error?.message ?? null,
    durationMs: duration,
  });
  return { data, error, correlationId: meta.correlationId };
}
