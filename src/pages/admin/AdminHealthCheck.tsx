import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
};

// Core tables that power the main site features. Read-only count checks
// confirm both DB connectivity and RLS/read access with real data.
const TABLES = [
  "institutions",
  "students",
  "staff",
  "user_roles",
  "classes",
  "academic_sessions",
  "fee_payments",
  "salary_records",
  "attendance_records",
  "notices",
  "results",
  "app_settings",
] as const;

export default function AdminHealthCheck() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const runChecks = async () => {
    setRunning(true);
    setResults([]);
    const out: CheckResult[] = [];

    // 1) Auth session check
    {
      const start = performance.now();
      const { data, error } = await supabase.auth.getSession();
      out.push({
        name: "Auth / Session",
        ok: !error,
        detail: error ? error.message : data.session ? "Session active" : "No session (public mode)",
        ms: Math.round(performance.now() - start),
      });
      setResults([...out]);
    }

    // 2) Per-table connectivity + real data read
    for (const table of TABLES) {
      const start = performance.now();
      try {
        const { count, error } = await supabase
          .from(table as any)
          .select("*", { count: "exact", head: true });
        out.push({
          name: `Table: ${table}`,
          ok: !error,
          detail: error ? error.message : `${count ?? 0} rows readable`,
          ms: Math.round(performance.now() - start),
        });
      } catch (e: any) {
        out.push({
          name: `Table: ${table}`,
          ok: false,
          detail: e?.message ?? "Unknown error",
          ms: Math.round(performance.now() - start),
        });
      }
      setResults([...out]);
    }

    setRunning(false);
  };

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;

  return (
    <div className="mx-auto w-full max-w-[1440px] p-6">
      <Card className="rounded-[45px] border border-border/40 bg-card/60 p-8 backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">System Health Check</h1>
              <p className="text-sm text-muted-foreground">
                End-to-end verification of database connection and core endpoints with real data.
              </p>
            </div>
          </div>
          <Button onClick={runChecks} disabled={running} className="rounded-2xl">
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
            {running ? "Running…" : "Run health check"}
          </Button>
        </div>

        {total > 0 && (
          <div className="mb-4 rounded-[20px] border border-border/40 bg-muted/30 px-4 py-3 text-sm font-medium text-foreground">
            {passed}/{total} checks passed
            {passed === total ? " — all systems operational ✅" : " — issues detected ⚠️"}
          </div>
        )}

        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.name}
              className="flex items-center justify-between rounded-[20px] border border-border/40 bg-background/40 px-4 py-3 transition-transform hover:-translate-y-[3px]"
            >
              <div className="flex items-center gap-3">
                {r.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium text-foreground">{r.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className={r.ok ? "text-muted-foreground" : "text-destructive"}>{r.detail}</span>
                <span className="tabular-nums text-muted-foreground">{r.ms}ms</span>
              </div>
            </div>
          ))}
          {total === 0 && !running && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Press “Run health check” to verify all connections and endpoints.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
