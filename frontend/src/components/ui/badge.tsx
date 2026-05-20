import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "text-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        sky: "border-sky-200 bg-sky-50 text-sky-800",
        amber: "border-amber-200 bg-amber-50 text-amber-800",
        teal: "border-teal-200 bg-teal-50 text-teal-800",
        indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
        violet: "border-violet-200 bg-violet-50 text-violet-800",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
        rose: "border-rose-200 bg-rose-50 text-rose-800"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
