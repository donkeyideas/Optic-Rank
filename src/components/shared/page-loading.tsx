import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

/**
 * Shared loading skeleton for dashboard pages.
 * Shows stat cards + table skeleton matching the editorial design.
 */
export function DashboardPageLoading({ cards = 4, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-rule pb-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="border border-rule bg-surface-card p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-24" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="border border-rule bg-surface-card">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="divide-y divide-rule">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shared loading skeleton for admin pages.
 * Shows a heading + content area matching the admin layout.
 */
export function AdminPageLoading({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Content area */}
      <div className="border border-rule bg-surface-card">
        <div className="divide-y divide-rule">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
