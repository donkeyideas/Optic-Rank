"use client";

import { useState, useEffect } from "react";
import { useTimezone } from "@/lib/context/timezone-context";

interface TrialHeaderIndicatorProps {
  trialEndsAt: string;
  isExpired: boolean;
}

function getDaysRemaining(trialEndsAt: string): number {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatEndDate(trialEndsAt: string, timezone: string): string {
  return new Date(trialEndsAt).toLocaleString("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });
}

export function TrialHeaderIndicator({
  trialEndsAt,
  isExpired: initialExpired,
}: TrialHeaderIndicatorProps) {
  const timezone = useTimezone();
  const [daysLeft, setDaysLeft] = useState(() => getDaysRemaining(trialEndsAt));
  const [mounted, setMounted] = useState(false);
  const [expired, setExpired] = useState(initialExpired);

  useEffect(() => {
    setMounted(true);
    if (initialExpired) return;

    const interval = setInterval(() => {
      const remaining = getDaysRemaining(trialEndsAt);
      setDaysLeft(remaining);
      if (remaining <= 0) {
        setExpired(true);
        clearInterval(interval);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [trialEndsAt, initialExpired]);

  if (!mounted) return null;

  const isUrgent = expired || daysLeft <= 3;

  return (
    <a
      href="/dashboard/settings?tab=billing"
      className={`relative flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
        expired
          ? "border border-red-500/60 bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : isUrgent
            ? "border border-editorial-red/40 bg-editorial-red/10 text-editorial-red hover:bg-editorial-red/20"
            : "border border-surface-cream/20 text-surface-cream/70 hover:bg-surface-cream/10 hover:text-surface-cream"
      }`}
    >
      {/* Annotation dot */}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          expired
            ? "bg-red-500 animate-pulse"
            : isUrgent
              ? "bg-editorial-red animate-pulse"
              : "bg-editorial-green"
        }`}
      />
      <span className="hidden sm:inline">
        {expired
          ? "Trial Expired"
          : `Trial: ${daysLeft}d left`}
      </span>
      <span className="sm:hidden">
        {expired ? "Expired" : `${daysLeft}d`}
      </span>
    </a>
  );
}
