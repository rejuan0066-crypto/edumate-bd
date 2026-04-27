import { Users, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";

interface Props {
  count: number;
  className?: string;
}

/**
 * Shows an informational badge when one or more staff members are hidden
 * from the current list because they're assigned to a committee.
 */
export default function CommitteeExclusionNotice({ count, className = "" }: Props) {
  const { language } = useLanguage();
  const bn = language === "bn";

  if (!count || count <= 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/admin/committees"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition ${className}`}
          >
            <Users className="w-3.5 h-3.5" />
            {bn
              ? `${count} জন স্টাফ কমিটিতে নিযুক্ত (লুকানো)`
              : `${count} staff in committee (hidden)`}
            <Info className="w-3 h-3 opacity-70" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {bn
            ? "এই স্টাফরা কমিটির সদস্য হিসেবে যুক্ত থাকায় বেতন ও হাজিরা তালিকা থেকে বাদ আছেন। কমিটি থেকে সরালে স্বয়ংক্রিয়ভাবে আবার তালিকায় চলে আসবেন।"
            : "These staff are linked to a committee and excluded from salary & attendance lists. Removing them from the committee will restore them automatically."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
