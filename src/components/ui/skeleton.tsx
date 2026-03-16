import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "animate-pulse rounded-none",
        "bg-surface-inset",
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

/* ------------------------------------------------------------------
   Convenience skeleton shapes
   ------------------------------------------------------------------ */
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of text lines to render */
  lines?: number;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 3, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            // Make the last line shorter for a natural look
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  )
);
SkeletonText.displayName = "SkeletonText";

interface SkeletonCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Diameter in pixels */
  size?: number;
}

const SkeletonCircle = React.forwardRef<HTMLDivElement, SkeletonCircleProps>(
  ({ className, size = 40, style, ...props }, ref) => (
    <Skeleton
      ref={ref}
      className={cn("!rounded-full shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  )
);
SkeletonCircle.displayName = "SkeletonCircle";

export { Skeleton, SkeletonText, SkeletonCircle };
export type { SkeletonProps, SkeletonTextProps, SkeletonCircleProps };
