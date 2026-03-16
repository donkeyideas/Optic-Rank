import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
   Card
   ------------------------------------------------------------------ */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface-card border border-rule rounded-none",
        "text-ink",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

/* ------------------------------------------------------------------
   CardHeader
   ------------------------------------------------------------------ */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1.5 p-5 pb-3",
        "border-b border-rule",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

/* ------------------------------------------------------------------
   CardTitle
   ------------------------------------------------------------------ */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-serif font-bold text-lg leading-tight tracking-tight text-ink",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

/* ------------------------------------------------------------------
   CardDescription
   ------------------------------------------------------------------ */
interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-ink-secondary leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/* ------------------------------------------------------------------
   CardContent
   ------------------------------------------------------------------ */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

/* ------------------------------------------------------------------
   CardFooter
   ------------------------------------------------------------------ */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center p-5 pt-3",
        "border-t border-rule",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
};
