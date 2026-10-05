// Shared request validation wrapper for edge functions.
// Provides a structured 422 response with per-field errors so the client
// can render inline validation messages instead of generic failures.
//
// Usage:
//   import { z } from "https://esm.sh/zod@3.23.8";
//   import { validateBody, jsonError, corsHeaders } from "../_shared/validate.ts";
//
//   const Schema = z.object({
//     email: z.string().email(),
//     code:  z.string().length(6),
//   });
//
//   Deno.serve(async (req) => {
//     if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
//     const parsed = await validateBody(req, Schema);
//     if (!parsed.ok) return parsed.response;     // 422 with field errors
//     const { email, code } = parsed.data;
//     // ... business logic
//   });

import { z, ZodError, ZodIssue, ZodTypeAny } from "https://esm.sh/zod@3.23.8";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, PATCH, OPTIONS",
};

export type FieldError = {
  field: string;        // dotted path, e.g. "user.email" or "items.0.qty"
  message: string;
  code: string;         // zod issue code, e.g. "invalid_type", "too_small"
  expected?: unknown;
  received?: unknown;
};

export type ValidationFailure = {
  ok: false;
  response: Response;
};

export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/** Standard rate-limit codes used across OTP and other throttled endpoints. */
export type RateLimitCode =
  | "COOLDOWN_ACTIVE"
  | "HOURLY_LIMIT_EXCEEDED"
  | "DAILY_LIMIT_EXCEEDED"
  | "RATE_LIMITED";

/**
 * Build a uniform 429 rate-limit response.
 *
 * Always returns:
 *   {
 *     ok: false,
 *     error: "Rate limited",
 *     code: <RateLimitCode>,
 *     message: <human readable, safe to show user>,
 *     retry_after_seconds: <integer>,
 *     retry_after_iso: <ISO timestamp when client may retry>,
 *     limit?: number,
 *     scope?: string,
 *   }
 * with the `Retry-After` HTTP header set to the same number of seconds.
 */
export function rateLimitResponse(opts: {
  code: RateLimitCode;
  message: string;
  retryAfterSeconds: number;
  limit?: number;
  scope?: string;
  extras?: Record<string, unknown>;
}): Response {
  const retry = Math.max(1, Math.ceil(opts.retryAfterSeconds));
  const body = {
    ok: false,
    error: "Rate limited",
    code: opts.code,
    message: opts.message,
    retry_after_seconds: retry,
    retry_after_iso: new Date(Date.now() + retry * 1000).toISOString(),
    ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
    ...(opts.scope ? { scope: opts.scope } : {}),
    ...(opts.extras ?? {}),
  };
  // Use 200 so the supabase-js client doesn't throw on invoke();
  // callers must inspect `body.ok === false` and `body.code` to detect rate limits.
  // Retry-After header is still included for any HTTP-aware caller.
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": String(retry),
    },
  });
}

/** Build a uniform JSON error response. */
export function jsonError(
  status: number,
  message: string,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: message,
      ...extras,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/** Standard OTP error codes used across OTP-related endpoints. */
export type OtpErrorCode =
  | "OTP_DISABLED"
  | "OTP_NOT_REQUIRED_FOR_SCOPE"
  | "INVALID_REQUEST"
  | "INVALID_PURPOSE"
  | "EMAIL_SERVICE_UNCONFIGURED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "ADMIN_REQUIRED"
  | "OTP_NOT_FOUND"
  | "OTP_EXPIRED"
  | "OTP_INVALID"
  | "OTP_MAX_ATTEMPTS"
  | "OTP_SESSION_EXPIRED"
  | "OTP_NOT_VERIFIED"
  | "INVALID_PASSWORD"
  | "WEAK_PASSWORD"
  | "USER_NOT_FOUND";

/**
 * Build a uniform OTP error response (4xx).
 *
 * Always returns:
 *   {
 *     ok: false,
 *     error: <short error label>,
 *     code: <OtpErrorCode>,
 *     message: <human readable, safe to show user>,
 *     retry_after_seconds: <integer | null>,
 *     ...extras (e.g. attempts_remaining, valid:false)
 *   }
 *
 * For 429 responses prefer `rateLimitResponse` instead — it sets the
 * `Retry-After` header. This helper is for non-rate-limit OTP failures
 * (400/401/403) so that every OTP endpoint speaks the same shape.
 */
export function otpErrorResponse(opts: {
  status: 400 | 401 | 403 | 404;
  code: OtpErrorCode;
  message: string;
  retryAfterSeconds?: number | null;
  extras?: Record<string, unknown>;
}): Response {
  const body = {
    ok: false,
    error: opts.message,
    code: opts.code,
    message: opts.message,
    retry_after_seconds: opts.retryAfterSeconds ?? null,
    ...(opts.extras ?? {}),
  };
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };
  if (opts.retryAfterSeconds && opts.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(Math.ceil(opts.retryAfterSeconds));
  }
  return new Response(JSON.stringify(body), { status: opts.status, headers });
}

/** Build a uniform JSON success response. */
export function jsonOk(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({ ok: true, data }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
    },
  );
}

/** Convert a ZodError into a stable, client-friendly array. */
export function zodErrorsToFields(err: ZodError): FieldError[] {
  return err.issues.map((issue: ZodIssue) => {
    const field = issue.path.length ? issue.path.map(String).join(".") : "(root)";
    const out: FieldError = {
      field,
      message: issue.message,
      code: issue.code,
    };
    // Attach expected/received info when available (best-effort across zod issue variants)
    const anyIssue = issue as unknown as Record<string, unknown>;
    if ("expected" in anyIssue) out.expected = anyIssue.expected;
    if ("received" in anyIssue) out.received = anyIssue.received;
    return out;
  });
}

/** Build the standard 422 validation response. */
export function validationFailureResponse(errors: FieldError[]): Response {
  const firstMsg = errors[0]?.message ?? "Validation failed";
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      message: firstMsg,
      retry_after_seconds: null,
      field_count: errors.length,
      errors,
      // Convenience map: { fieldPath: "first message" } for quick UI lookup
      field_errors: errors.reduce<Record<string, string>>((acc, e) => {
        if (!(e.field in acc)) acc[e.field] = e.message;
        return acc;
      }, {}),
    }),
    {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/** Validate a parsed value against a zod schema. */
export function validate<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, response: validationFailureResponse(zodErrorsToFields(result.error)) };
}

/** Read JSON body and validate it. Returns 422 with field errors on failure,
 *  or 400 if the body itself is not valid JSON. */
export async function validateBody<T extends ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<ValidationResult<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, "Request body must be valid JSON", { code: "INVALID_JSON" }),
    };
  }
  return validate(schema, raw);
}

/** Validate URL query parameters against a zod schema (string-only inputs). */
export function validateQuery<T extends ZodTypeAny>(
  req: Request,
  schema: T,
): ValidationResult<z.infer<T>> {
  const url = new URL(req.url);
  const obj: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) obj[k] = v;
  return validate(schema, obj);
}

export { z };
