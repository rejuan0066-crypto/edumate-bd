import { useLocation } from 'react-router-dom';

/**
 * Lightweight skeleton shown while a lazy-loaded route chunk is downloading.
 * Renders an admin-shell shimmer for /admin/* and a generic page shimmer otherwise.
 * Pure Tailwind, no JS animations beyond `animate-pulse`.
 */
const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-2xl bg-muted/60 animate-pulse ${className}`} />
);

const PublicShimmer = () => (
  <div className="min-h-[60vh] w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-6">
    <Bar className="h-10 w-1/2 max-w-md" />
    <Bar className="h-4 w-2/3 max-w-lg" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[28px] border border-border/40 bg-card/40 backdrop-blur-sm p-5 space-y-3"
        >
          <Bar className="h-32 w-full" />
          <Bar className="h-4 w-3/4" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

const AdminShimmer = () => (
  <div className="w-full px-3 sm:px-6 py-4 space-y-4">
    {/* Header strip */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="space-y-2">
        <Bar className="h-6 w-48" />
        <Bar className="h-3 w-32" />
      </div>
      <div className="flex gap-2">
        <Bar className="h-9 w-24" />
        <Bar className="h-9 w-9 rounded-full" />
      </div>
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[28px] border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-2"
        >
          <Bar className="h-3 w-20" />
          <Bar className="h-7 w-24" />
          <Bar className="h-2 w-full" />
        </div>
      ))}
    </div>

    {/* Table-like block */}
    <div className="rounded-[32px] border border-border/40 bg-card/40 backdrop-blur-sm p-4 space-y-3">
      <div className="flex gap-3 flex-wrap">
        <Bar className="h-9 w-full sm:w-64" />
        <Bar className="h-9 w-32" />
        <Bar className="h-9 w-32" />
      </div>
      <div className="space-y-2 pt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bar key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  </div>
);

const RouteShimmer = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className="w-full" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {isAdmin ? <AdminShimmer /> : <PublicShimmer />}
    </div>
  );
};

export default RouteShimmer;
