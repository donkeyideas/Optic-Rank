export default function AIVisibilityLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Stats skeleton */}
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 border border-rule bg-surface-card p-4">
            <div className="h-2.5 w-24 bg-rule" />
            <div className="mt-3 h-6 w-14 bg-rule" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="border border-rule bg-surface-card p-6">
        <div className="h-3 w-40 bg-rule" />
        <div className="mt-4 h-48 w-full bg-rule/50" />
      </div>

      {/* Table skeleton */}
      <div>
        <div className="flex border-b-2 border-ink py-2 gap-6">
          <div className="h-3 w-32 bg-rule" />
          <div className="h-3 w-20 bg-rule" />
          <div className="h-3 w-16 bg-rule" />
          <div className="h-3 w-16 bg-rule" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex border-b border-rule py-3 gap-6">
            <div className="h-4 w-40 bg-rule" />
            <div className="h-4 w-16 bg-rule" />
            <div className="h-4 w-12 bg-rule" />
            <div className="h-4 w-14 bg-rule" />
          </div>
        ))}
      </div>
    </div>
  );
}
