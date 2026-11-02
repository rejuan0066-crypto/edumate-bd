import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shadow-2xs",
  {
    variants: {
      variant: {
        default: "border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100",
        secondary: "border-slate-200 dark:border-slate-800 bg-slate-100/90 text-slate-800 dark:bg-slate-800/90 dark:text-slate-200 hover:bg-slate-200/80",
        destructive: "border-rose-300 dark:border-rose-900 bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 hover:bg-rose-100",
        outline: "text-foreground border-slate-200/90 dark:border-slate-800 hover:bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
