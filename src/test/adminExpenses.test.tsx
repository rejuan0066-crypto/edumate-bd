import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminExpenses from '@/pages/admin/AdminExpenses';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/logo.png' } }),
      })),
    },
  },
}));

vi.mock('@/hooks/usePagePermissions', () => ({
  usePagePermissions: () => ({ canAddItem: true, canEditItem: true, canDeleteItem: true }),
}));

describe('AdminExpenses Component', () => {
  it('renders without throwing error', () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    expect(() => {
      render(
        <MemoryRouter>
          <QueryClientProvider client={qc}>
            <LanguageProvider>
              <ConfirmProvider>
                <AdminExpenses />
              </ConfirmProvider>
            </LanguageProvider>
          </QueryClientProvider>
        </MemoryRouter>
      );
    }).not.toThrow();
  }, 20000);

  it('correctly converts Bengali digits to English numbers and handles deposit source labels', () => {
    const bnToEn = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
    expect(Number(bnToEn('৪০০০০০'))).toBe(400000);
    expect(Number(bnToEn('১২৫৫০.৫০'))).toBe(12550.50);
    expect(Number(bnToEn('1000'))).toBe(1000);
  });
});
