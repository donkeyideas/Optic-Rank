import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center",
    "px-2 py-0.5",
    "text-[9px] font-bold uppercase tracking-[0.15em] leading-none",
    "rounded-none border",
    "select-none whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-ink text-surface-cream border-ink",
        ].join(" "),
        success: [
          "bg-editorial-green/10 text-editorial-green border-editorial-green/30",
        ].join(" "),
        warning: [
          "bg-editorial-gold/10 text-editorial-gold border-editorial-gold/30",
        ].join(" "),
        danger: [
          "bg-editorial-red/10 text-editorial-red border-editorial-red/30",
        ].join(" "),
        info: [
          "bg-editorial-blue/10 text-editorial-blue border-editorial-blue/30",
        ].join(" "),
        muted: [
          "bg-surface-raised text-ink-muted border-rule",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
export type { BadgeProps };
