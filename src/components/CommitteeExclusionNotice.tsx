import { Users, Info, Eye, EyeOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { StaffCommitteeInfo } from "@/hooks/useCommitteeStaffIds";

interface Props {
  count: number;
  /** Map of staff_id -> committees, used for the per-staff hover tooltip below */
  info?: StaffCommitteeInfo;
  /** All staff (raw, before filtering) so we can list hidden names */
  hiddenStaff?: { id: string; name_bn?: string | null; name_en?: string | null }[];
  showAll?: boolean;
  onToggleShowAll?: (next: boolean) => void;
  className?: string;
}

/**
 * Informational badge — shows hidden staff count + admin "Show all" toggle.
 * Hovering reveals which staff member is in which committee.
 */
export default function CommitteeExclusionNotice({
  count,
  info,
  hiddenStaff = [],
  showAll = false,
  onToggleShowAll,
  className = "",
}: Props) {
  const { language } = useLanguage();
  const { role } = useAuth();
  const bn = language === "bn";
  const canToggle = role === "admin" || role === "super_admin";

  if (!count || count <= 0) return null;

  return (
    <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/admin/committees"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-300/60 dark:border-amber-700/40 text-amber-800 dark:text-amber-200 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
            >
              <Users className="w-3.5 h-3.5" />
              {bn
                ? `${count} জন স্টাফ কমিটিতে নিযুক্ত${showAll ? "" : " (লুকানো)"}`
                : `${count} staff in committee${showAll ? "" : " (hidden)"}`}
              <Info className="w-3 h-3 opacity-70" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm text-xs p-3 space-y-1.5">
            <p className="font-semibold">
              {bn ? "কমিটিতে নিযুক্ত স্টাফ:" : "Staff currently in committees:"}
            </p>
            {hiddenStaff.length > 0 && info ? (
              <ul className="space-y-1 max-h-60 overflow-y-auto">
                {hiddenStaff.slice(0, 20).map((s) => {
                  const committees = info.byStaff.get(s.id) || [];
                  return (
                    <li key={s.id} className="border-l-2 border-amber-400 pl-2">
                      <div className="font-medium">{s.name_bn || s.name_en}</div>
                      <div className="text-[11px] opacity-80">
                        {committees.map((c) => c.committee_name).join(", ") || "—"}
                      </div>
                    </li>
                  );
                })}
                {hiddenStaff.length > 20 && (
                  <li className="text-[11px] italic opacity-70">
                    {bn ? `... আরও ${hiddenStaff.length - 20} জন` : `... and ${hiddenStaff.length - 20} more`}
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[11px] opacity-80">
                {bn
                  ? "কমিটি থেকে সরালে স্বয়ংক্রিয়ভাবে আবার তালিকায় চলে আসবে।"
                  : "Removing from committee restores them automatically."}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {canToggle && onToggleShowAll && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={() => onToggleShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              {bn ? "কমিটি লুকান" : "Hide committee"}
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 mr-1" />
              {bn ? "সব দেখান" : "Show all"}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
