"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-semibold text-xs uppercase tracking-widest",
    "transition-all duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-red focus-visible:ring-offset-2 focus-visible:ring-offset-surface-cream",
    "disabled:pointer-events-none disabled:opacity-50",
    "cursor-pointer select-none",
    "rounded-none", // sharp editorial corners
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-editorial-red text-white",
          "hover:bg-editorial-red/90",
          "active:bg-editorial-red/80",
        ].join(" "),
        secondary: [
          "bg-ink text-surface-cream",
          "hover:bg-ink/90",
          "active:bg-ink/80",
        ].join(" "),
        outline: [
          "border border-rule-dark bg-transparent text-ink",
          "hover:bg-surface-raised",
          "active:bg-surface-inset",
        ].join(" "),
        ghost: [
          "bg-transparent text-ink",
          "hover:bg-surface-raised",
          "active:bg-surface-inset",
        ].join(" "),
        danger: [
          "bg-editorial-red text-white",
          "hover:bg-editorial-red/80",
          "active:bg-editorial-red/70",
        ].join(" "),
      },
      size: {
        sm: "h-10 sm:h-8 px-3 text-[10px]",
        md: "h-11 sm:h-10 px-4 sm:px-5 text-xs",
        lg: "h-12 px-7 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child element (e.g., for link buttons) */
  asChild?: boolean;
  /** Show loading spinner and disable interactions */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
