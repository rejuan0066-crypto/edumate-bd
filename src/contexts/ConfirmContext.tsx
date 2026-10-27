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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, Info, HelpCircle, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCachedDeletionSettings,
  type DeletionProtectionLevel,
  type DeletionSecuritySettings,
} from "@/hooks/useDeletionSecuritySettings";
import { supabase } from "@/integrations/supabase/client";
import OtpVerificationDialog from "@/components/OtpVerificationDialog";
import { toast } from "sonner";

export type ConfirmVariant = "default" | "destructive" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;

  /** Visual identification of what is being deleted/modified */
  itemName?: string;
  itemIdentifier?: string;
  itemDetails?: Array<{ label: string; value: string | ReactNode }>;

  /** Security policy mapping */
  moduleKey?: keyof DeletionSecuritySettings;
  protectionLevel?: DeletionProtectionLevel;
  expectedInput?: string;
}

type ConfirmFn = (opts?: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
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
  const [typedInput, setTypedInput] = useState<string>("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const isOtpPendingRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((opts) => {
    isOtpPendingRef.current = false;
    const normalized: ConfirmOptions =
      typeof opts === "string" ? { description: opts } : opts ?? {};
    setTypedInput("");
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, ...normalized });
    });
  }, []);

  const handle = (result: boolean) => {
    isOtpPendingRef.current = false;
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
    setTypedInput("");
    setOtpOpen(false);
  };

  const variant = state.variant ?? "default";
  const v = variantStyles[variant];

  // Resolve protection level: explicit option or lookup from deletion settings
  const resolvedLevel: DeletionProtectionLevel =
    state.protectionLevel ||
    (state.moduleKey ? getCachedDeletionSettings()[state.moduleKey] : "confirm");

  // Determine what user is expected to type (item name, or DELETE)
  const rawExpected = state.expectedInput || state.itemName || "DELETE";
  const expectedText = rawExpected.trim();
  const requiresType = (resolvedLevel === "type" || resolvedLevel === "otp") && !!expectedText;
  const isTypeMatched = !requiresType || typedInput.trim().toLowerCase() === expectedText.toLowerCase();

  const onConfirmClick = async () => {
    if (!isTypeMatched) return;

    if (resolvedLevel === "otp") {
      try {
        const delSettings = getCachedDeletionSettings();
        let targetEmail = "";

        if (delSettings.otp_target_type === "custom" && delSettings.otp_custom_email?.trim()) {
          targetEmail = delSettings.otp_custom_email.trim();
        } else if (delSettings.otp_target_type === "site_email") {
          try {
            const { data: inst } = await supabase.from('institutions').select('email').limit(1).maybeSingle();
            if (inst?.email?.trim()) targetEmail = inst.email.trim();
          } catch {}
        }

        if (!targetEmail) {
          const { data } = await supabase.auth.getUser();
          targetEmail = data.user?.email || "";
        }

        if (targetEmail) {
          isOtpPendingRef.current = true;
          setAdminEmail(targetEmail);
          setState((s) => ({ ...s, open: false }));
          setOtpOpen(true);
          return;
        } else {
          toast.error("OTP পাঠানোর জন্য কোনো ইমেইল ঠিকানা পাওয়া যায়নি। অনুগ্রহ করে নিরাপত্তা সেটিংসে ইমেইল সেট করুন।");
          handle(false);
          return;
        }
      } catch (e) {
        console.warn("OTP user fetch fallback:", e);
        toast.error("OTP প্রক্রিয়া শুরু করা যায়নি।");
        handle(false);
        return;
      }
    }
    handle(true);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(o) => {
          if (!o) {
            if (isOtpPendingRef.current) return;
            handle(false);
          }
        }}
      >
        <AlertDialogContent className="rounded-[32px] border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl max-w-md p-6">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className={cn("rounded-2xl p-3 shrink-0 shadow-xs", v.iconBg)}>
                {resolvedLevel === "otp" ? <KeyRound className="w-6 h-6 text-rose-600" /> : v.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertDialogTitle className="text-lg font-bold text-foreground">
                    {state.title ?? "নিশ্চিত করুন"}
                  </AlertDialogTitle>
                  {resolvedLevel === "otp" && (
                    <Badge variant="destructive" className="text-[10px] font-bold py-0 h-5">
                      ইমেইল OTP প্রয়োজন
                    </Badge>
                  )}
                  {resolvedLevel === "type" && (
                    <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 font-bold py-0 h-5">
                      টাইপ সুরক্ষা
                    </Badge>
                  )}
                </div>

                {state.description && (
                  <AlertDialogDescription className="mt-2 text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {state.description}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>

          {/* Item Identification Card */}
          {(state.itemName || state.itemIdentifier || (state.itemDetails && state.itemDetails.length > 0)) && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2 mt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700/80 dark:text-rose-400/80 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  ডিলিট হতে যাওয়া রেকর্ড:
                </span>
                {state.itemIdentifier && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-background">
                    {state.itemIdentifier}
                  </Badge>
                )}
              </div>

              {state.itemName && (
                <p className="font-bold text-sm text-foreground">{state.itemName}</p>
              )}

              {state.itemDetails && state.itemDetails.length > 0 && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-rose-500/10 text-xs">
                  {state.itemDetails.map((d, i) => (
                    <div key={i} className="truncate">
                      <span className="text-muted-foreground text-[11px]">{d.label}: </span>
                      <span className="font-semibold text-foreground text-[11px]">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type-to-confirm input box */}
          {requiresType && (
            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  নিশ্চিত করতে নিচে <strong className="text-rose-600 select-all font-mono">"{expectedText}"</strong> টাইপ করুন:
                </span>
                {isTypeMatched && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> সঠিক
                  </span>
                )}
              </label>
              <Input
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={expectedText}
                className={cn(
                  "h-10 rounded-xl font-mono text-sm transition-all",
                  isTypeMatched
                    ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20"
                    : "border-rose-300 dark:border-rose-900/60 focus:border-rose-500"
                )}
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter className="gap-2 mt-3 pt-2 border-t border-border/30">
            <AlertDialogCancel
              onClick={(e) => {
                e.preventDefault();
                handle(false);
              }}
              className="rounded-full px-5 h-9 text-xs"
            >
              {state.cancelText ?? "বাতিল"}
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={!isTypeMatched}
              onClick={onConfirmClick}
              className={cn(
                "rounded-full px-6 h-9 text-xs font-bold transition-all shadow-xs",
                v.btn,
                !isTypeMatched && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {state.confirmText ?? (resolvedLevel === "otp" ? "OTP পাঠিয়ে নিশ্চিত করুন" : "মুছে ফেলুন")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global OTP Dialog for deletion verification */}
      {otpOpen && (
        <OtpVerificationDialog
          open={otpOpen}
          onOpenChange={(open) => {
            setOtpOpen(open);
            if (!open) {
              isOtpPendingRef.current = false;
              handle(false);
            }
          }}
          email={adminEmail}
          purpose="email_verification"
          scope="deletion_auth"
          skipRequirementCheck={true}
          onVerified={() => {
            isOtpPendingRef.current = false;
            setOtpOpen(false);
            handle(true);
          }}
          title="ডিলিট অনুমোদন ওটিপি (Email OTP)"
          description={`সংবেদনশীল রেকর্ড মুছে ফেলার অনুমতি দিতে (${adminEmail}) ইমেইলে প্রেরিত ৬ সংখ্যার কোড দিন।`}
        />
      )}
    </ConfirmContext.Provider>
  );
}
