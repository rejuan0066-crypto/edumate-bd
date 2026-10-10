import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "default" | "destructive" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (opts?: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm if provider not mounted (shouldn't happen)
    return async (opts) => {
      const msg = typeof opts === "string" ? opts : (opts?.description as string) ?? opts?.title ?? "Are you sure?";
      // eslint-disable-next-line no-alert
      return window.confirm(msg);
    };
  }
  return ctx;
}

interface State extends ConfirmOptions {
  open: boolean;
}

const variantStyles: Record<ConfirmVariant, { icon: ReactNode; iconBg: string; btn: string }> = {
  default: {
    icon: <HelpCircle className="w-6 h-6 text-emerald-600" />,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  destructive: {
    icon: <Trash2 className="w-6 h-6 text-red-600" />,
    iconBg: "bg-red-100 dark:bg-red-900/40",
    btn: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: <Info className="w-6 h-6 text-sky-600" />,
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    btn: "bg-sky-600 hover:bg-sky-700 text-white",
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false });
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    const normalized: ConfirmOptions =
      typeof opts === "string" ? { description: opts } : opts ?? {};
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, ...normalized });
    });
  }, []);

  const handle = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
  };

  const variant = state.variant ?? "default";
  const v = variantStyles[variant];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(o) => { if (!o) handle(false); }}>
        <AlertDialogContent className="rounded-[38px] border-emerald-100/60 dark:border-emerald-900/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className={cn("rounded-2xl p-3 shrink-0", v.iconBg)}>{v.icon}</div>
              <div className="flex-1 min-w-0">
                <AlertDialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {state.title ?? "নিশ্চিত করুন"}
                </AlertDialogTitle>
                {state.description && (
                  <AlertDialogDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                    {state.description}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              onClick={(e) => {
                e.preventDefault();
                handle(false);
              }}
              className="rounded-full px-6"
            >
              {state.cancelText ?? "বাতিল"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handle(true);
              }}
              className={cn("rounded-full px-6", v.btn)}
            >
              {state.confirmText ?? "নিশ্চিত"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
