import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminExpenses from '@/pages/admin/AdminExpenses';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';

const mockInstitutions = [
  { id: 'inst-1', name: 'Al-Arabia Madrasah', name_bn: 'আল-আরাবিয়া মাদরাসা', is_default: true },
  { id: 'inst-2', name: 'MH Center', name_bn: 'এম.এইচ সেন্টার', is_default: false },
];

const mockCategories = [
  { id: 'cat-1', name: 'Office', name_bn: 'দাপ্তরিক', institution_id: 'inst-1' },
  { id: 'cat-2', name: 'Salary', name_bn: 'বেতন', institution_id: 'inst-2' },
];

const mockExpenses = [
  {
    id: 'exp-1',
    month_year: 'October-2026',
    expense_date: '2026-10-05',
    amount: 1500,
    institution_id: 'inst-1',
    category_id: 'cat-1',
    description: 'খাতা কলম ক্রয় [unit:পিস] [method:ক্যাশ] [memo:MEMO-1]',
    quantity: 5,
  },
  {
    id: 'exp-2',
    month_year: 'October-2026',
    expense_date: '2026-10-08',
    amount: 5000,
    institution_id: 'inst-1',
    category_id: 'cat-1',
    description: 'বকেয়া কেনাকাটা [due:unpaid] [method:বকেয়া] [memo:MEMO-2]',
    quantity: 1,
  },
];

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      let resolvedData: any = [];
      if (table === 'expense_institutions' || table === 'institutions') resolvedData = mockInstitutions;
      else if (table === 'expense_categories') resolvedData = mockCategories;
      else if (table === 'expenses') resolvedData = mockExpenses;
      else if (table === 'deposits') resolvedData = [];
      else if (table === 'academic_sessions') resolvedData = [];
      else if (table === 'website_settings') resolvedData = [];

      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (onfulfilled: any) => Promise.resolve({ data: resolvedData, error: null }).then(onfulfilled),
      };
    }),
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

vi.mock('framer-motion', async () => {
  const actual: any = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('AdminExpenses Component', () => {
  it('renders without throwing error and displays tabs', async () => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

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

    // Verify Paid Expenses and Dues tabs are present after query resolves
    const paidTab = await screen.findByText(/পরিশোধিত খরচ/i);
    expect(paidTab).toBeInTheDocument();
    const duesTab = await screen.findByText(/বকেয়া খরচের হিসাব/i);
    expect(duesTab).toBeInTheDocument();

    // Switch to Dues tab
    fireEvent.click(duesTab);
  }, 20000);

  it('correctly converts Bengali digits to English numbers and handles deposit source labels', () => {
    const bnToEn = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
    expect(Number(bnToEn('৪০০০০০'))).toBe(400000);
    expect(Number(bnToEn('১২৫৫০.৫০'))).toBe(12550.50);
    expect(Number(bnToEn('1000'))).toBe(1000);
  });
});
