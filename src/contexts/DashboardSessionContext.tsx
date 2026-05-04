import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AcademicSessionLite {
  id: string;
  name: string;
  name_bn: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface Ctx {
  sessions: AcademicSessionLite[];
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  selectedSession: AcademicSessionLite | null;
  isLoading: boolean;
}

const DashboardSessionContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'dashboard.selectedSessionId';

export const DashboardSessionProvider = ({ children }: { children: ReactNode }) => {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['dashboard-academic-sessions-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn, is_active, start_date, end_date')
        .order('start_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as AcademicSessionLite[];
    },
    staleTime: 60_000,
  });

  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  // Default to active session once loaded
  useEffect(() => {
    if (selectedSessionId) return;
    if (sessions.length === 0) return;
    const active = sessions.find(s => s.is_active) || sessions[0];
    if (active) setSelectedSessionIdState(active.id);
  }, [sessions, selectedSessionId]);

  const setSelectedSessionId = (id: string | null) => {
    setSelectedSessionIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  return (
    <DashboardSessionContext.Provider value={{ sessions, selectedSessionId, setSelectedSessionId, selectedSession, isLoading }}>
      {children}
    </DashboardSessionContext.Provider>
  );
};

export const useDashboardSession = () => {
  const ctx = useContext(DashboardSessionContext);
  if (!ctx) throw new Error('useDashboardSession must be used within DashboardSessionProvider');
  return ctx;
};
