import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { exportStaffCommitteeHistoryCSV, exportStaffCommitteeHistoryPDF } from "@/lib/exportCommitteeHistory";
import { toast } from "sonner";
import OtpVerificationDialog from "@/components/OtpVerificationDialog";
import { useAdminOtpGate } from "@/hooks/useAdminOtpGate";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staffId: string;
  staffName: string;
}

export default function CommitteeHistoryExportDialog({ open, onOpenChange, staffId, staffName }: Props) {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [busy, setBusy] = useState(false);
  const otpGate = useAdminOtpGate();

  const doRun = async (kind: "csv" | "pdf") => {
    setBusy(true);
    try {
      const filters = { startDate: startDate || undefined, endDate: endDate || undefined, status };
      if (kind === "csv") await exportStaffCommitteeHistoryCSV(staffId, staffName, filters);
      else await exportStaffCommitteeHistoryPDF(staffId, staffName, filters);
      toast.success(bn ? "ডাউনলোড হয়েছে" : "Downloaded");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const run = (kind: "csv" | "pdf") => otpGate.requireOtp(() => doRun(kind));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md rounded-[38px]">
          <DialogHeader>
            <DialogTitle>{bn ? "কমিটি ইতিহাস এক্সপোর্ট" : "Export Committee History"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              {bn ? `স্টাফ: ${staffName}` : `Staff: ${staffName}`}
            </div>
            {!otpGate.isTrusted && (
              <div className="flex items-start gap-2 text-xs p-2 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{bn ? "ডাউনলোডের আগে ওটিপি যাচাই দরকার (২FA)।" : "OTP (2FA) required before downloading."}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">{bn ? "শুরু" : "Start Date"}</Label>
                <DatePicker value={startDate} onChange={setStartDate} bengali={bn} clearable />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{bn ? "শেষ" : "End Date"}</Label>
                <DatePicker value={endDate} onChange={setEndDate} bengali={bn} clearable />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">{bn ? "স্ট্যাটাস" : "Status"}</Label>
              <div className="flex gap-2">
                {(["all", "active", "inactive"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={status === s ? "default" : "outline"}
                    onClick={() => setStatus(s)}
                    className="flex-1"
                  >
                    {bn ? { all: "সব", active: "সক্রিয়", inactive: "নিষ্ক্রিয়" }[s] : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{bn ? "বাতিল" : "Cancel"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => run("csv")}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button disabled={busy} onClick={() => run("pdf")}>
              <FileText className="w-4 h-4 mr-1" /> PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OtpVerificationDialog
        open={otpGate.open}
        onOpenChange={otpGate.setOpen}
        email={otpGate.email}
        purpose="email_verification"
        scope="login"
        onVerified={otpGate.onVerified}
        title={bn ? "সংবেদনশীল কাজ যাচাই" : "Verify Sensitive Action"}
        description={bn ? "কমিটি ইতিহাস ডাউনলোডের আগে ওটিপি দিন।" : "Enter OTP to authorize committee history download."}
      />
    </>
  );
}
