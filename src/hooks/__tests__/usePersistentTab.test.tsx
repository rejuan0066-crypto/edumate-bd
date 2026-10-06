import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { usePersistentTab } from '../usePersistentTab';

describe('usePersistentTab', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('initializes to default tab when URL and storage are empty', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin/salary']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(() => usePersistentTab('salary'), { wrapper });
    expect(result.current[0]).toBe('salary');
  });

  it('initializes from URL search parameter when present', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin/salary?tab=savings']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => usePersistentTab('salary', { validTabs: ['salary', 'bonus', 'savings'] as const }),
      { wrapper }
    );
    expect(result.current[0]).toBe('savings');
  });

  it('updates tab state and persists to sessionStorage when tab changes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin/salary']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        usePersistentTab('salary', {
          validTabs: ['salary', 'bonus', 'savings'] as const,
          storageKey: 'test_salary_tab',
        }),
      { wrapper }
    );

    expect(result.current[0]).toBe('salary');

    act(() => {
      result.current[1]('savings');
    });

    expect(result.current[0]).toBe('savings');
    expect(sessionStorage.getItem('test_salary_tab')).toBe('savings');
  });

  it('ignores invalid tab from URL and falls back to default tab', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin/salary?tab=invalid_tab']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () => usePersistentTab('salary', { validTabs: ['salary', 'bonus', 'savings'] as const }),
      { wrapper }
    );
    expect(result.current[0]).toBe('salary');
  });

  it('falls back to sessionStorage if URL parameter is missing', () => {
    sessionStorage.setItem('test_stored_tab', 'bonus');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={['/admin/salary']}>{children}</MemoryRouter>
    );

    const { result } = renderHook(
      () =>
        usePersistentTab('salary', {
          validTabs: ['salary', 'bonus', 'savings'] as const,
          storageKey: 'test_stored_tab',
        }),
      { wrapper }
    );

    expect(result.current[0]).toBe('bonus');
  });
});
