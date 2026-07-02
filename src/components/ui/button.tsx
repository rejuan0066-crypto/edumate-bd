import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-primary-foreground backdrop-blur-md hover:bg-primary shadow-[0_8px_24px_-8px_hsl(var(--aqua)/0.5)] hover:shadow-[0_10px_32px_-8px_hsl(var(--aqua)/0.6)] border border-[hsl(var(--glass-border)/0.35)]",
        destructive: "bg-destructive/90 text-destructive-foreground backdrop-blur-md hover:bg-destructive shadow-md shadow-destructive/25 border border-destructive/30",
        outline: "border border-[hsl(var(--glass-border)/0.4)] bg-background/40 backdrop-blur-md hover:bg-accent/60 hover:text-accent-foreground",
        secondary: "bg-secondary/60 text-secondary-foreground backdrop-blur-md hover:bg-secondary/80 border border-[hsl(var(--glass-border)/0.25)]",
        ghost: "hover:bg-accent/50 hover:backdrop-blur-md hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:scale-100",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
