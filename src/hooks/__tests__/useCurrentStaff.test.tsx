import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * QA checklist covered here:
 *  ✅ logged-out user → returns null
 *  ✅ regular staff hit by user_id → no admin fallback hit
 *  ✅ staff missing → falls back to administrative_officers (by user_id)
 *  ✅ administrative_officers missing user_id → uses link RPC
 *  ✅ admin record gets `__source: 'administrative'` + officer_id mapped to staff_id
 *  ✅ no record anywhere → returns null (UI fallback banner shows)
 */

// ---- Mock chain helpers --------------------------------------------------
const buildQuery = (response: { data: any; error?: any }) => {
  const chain: any = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: response.data ?? null, error: response.error ?? null }));
  chain.update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
  return chain;
};

let mockUser: any = null;
const queries: Array<{ table: string; response: { data: any; error?: any } }> = [];
const rpcResponses: Record<string, any> = {};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const idx = queries.findIndex((q) => q.table === table);
      const found = idx >= 0 ? queries.splice(idx, 1)[0] : { table, response: { data: null } };
      return buildQuery(found.response);
    }),
    rpc: vi.fn((name: string) => Promise.resolve({ data: rpcResponses[name] ?? null, error: null })),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const loadHook = async () => {
  const mod = await import('../useCurrentStaff');
  return mod.useCurrentStaff;
};

beforeEach(() => {
  mockUser = null;
  queries.length = 0;
  Object.keys(rpcResponses).forEach((k) => delete rpcResponses[k]);
  vi.resetModules();
});

describe('useCurrentStaff', () => {
  it('returns null when no user is logged in', async () => {
    const useCurrentStaff = await loadHook();
    const { result } = renderHook(() => useCurrentStaff(), { wrapper });
    await waitFor(() => expect(result.current.isFetched || !result.current.isLoading).toBeTruthy());
    expect(result.current.data ?? null).toBeNull();
  });

  it('returns staff record when matched by user_id', async () => {
    mockUser = { id: 'u-1', email: 'staff@example.com' };
    queries.push({ table: 'staff', response: { data: { id: 's-1', user_id: 'u-1', name_bn: 'রহিম', staff_id: 'TCH-2025-1' } } });
    const useCurrentStaff = await loadHook();
    const { result } = renderHook(() => useCurrentStaff(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.id).toBe('s-1');
    expect((result.current.data as any).__source).toBeUndefined();
  });

  it('falls back to administrative_officers by user_id', async () => {
    mockUser = { id: 'u-2', email: 'officer@example.com' };
    // staff queries (by uid + by email) miss
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({
      table: 'administrative_officers',
      response: {
        data: { id: 'a-1', user_id: 'u-2', name_bn: 'করিম', officer_id: 'ADO-2026-0001', department: 'admin' },
      },
    });
    const useCurrentStaff = await loadHook();
    const { result } = renderHook(() => useCurrentStaff(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect((result.current.data as any).__source).toBe('administrative');
    expect(result.current.data?.staff_id).toBe('ADO-2026-0001');
    expect(result.current.data?.staff_category).toBe('admin');
  });

  it('uses link RPC when officer record needs auto-link by email', async () => {
    mockUser = { id: 'u-3', email: 'newofficer@example.com' };
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({ table: 'administrative_officers', response: { data: null } }); // by user_id miss
    rpcResponses['link_administrative_officer_by_email'] = {
      id: 'a-2', user_id: 'u-3', name_bn: 'সালমা', officer_id: 'ADO-2026-0002', department: 'finance',
    };
    const useCurrentStaff = await loadHook();
    const { result } = renderHook(() => useCurrentStaff(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect((result.current.data as any).__source).toBe('administrative');
    expect(result.current.data?.id).toBe('a-2');
  });

  it('returns null when no staff or officer record exists', async () => {
    mockUser = { id: 'u-4', email: 'ghost@example.com' };
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({ table: 'staff', response: { data: null } });
    queries.push({ table: 'administrative_officers', response: { data: null } });
    // RPC returns null too
    const useCurrentStaff = await loadHook();
    const { result } = renderHook(() => useCurrentStaff(), { wrapper });
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
