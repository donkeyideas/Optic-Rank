"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-2 border-editorial-red/30 bg-editorial-red/5">
          <AlertTriangle size={28} className="text-editorial-red" />
        </div>
        <h2 className="font-serif text-xl font-bold text-ink">Something Went Wrong</h2>
        <p className="mt-2 font-sans text-sm text-ink-secondary">
          An unexpected error occurred while loading this page. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-ink-muted">
            Error ID: {error.digest}
          </p>
        )}
        <Button variant="primary" size="md" className="mt-6" onClick={reset}>
          <RotateCcw size={14} />
          Try Again
        </Button>
      </div>
    </div>
  );
}
