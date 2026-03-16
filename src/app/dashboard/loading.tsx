export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Headline bar skeleton */}
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 border border-rule bg-surface-card p-4">
            <div className="h-2.5 w-16 bg-rule" />
            <div className="mt-3 h-6 w-20 bg-rule" />
            <div className="mt-2 h-2 w-24 bg-rule" />
          </div>
        ))}
      </div>

      {/* Header skeleton */}
      <div className="border-b border-rule pb-4">
        <div className="h-7 w-48 bg-rule" />
        <div className="mt-2 h-3.5 w-80 bg-rule" />
      </div>

      {/* Table skeleton */}
      <div className="border border-rule">
        <div className="flex border-b-2 border-ink p-3 gap-8">
          <div className="h-3 w-24 bg-rule" />
          <div className="h-3 w-16 bg-rule" />
          <div className="h-3 w-16 bg-rule" />
          <div className="h-3 w-20 bg-rule" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex border-b border-rule p-3 gap-8">
            <div className="h-3.5 w-40 bg-rule" />
            <div className="h-3.5 w-12 bg-rule" />
            <div className="h-3.5 w-12 bg-rule" />
            <div className="h-3.5 w-16 bg-rule" />
          </div>
        ))}
      </div>
    </div>
  );
}
