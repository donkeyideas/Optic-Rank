"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TrialBannerProps {
  trialEndsAt: string;
  isExpired: boolean;
}

/**
 * Computes the time remaining until trial expiration in Eastern time.
 * Returns days, hours, minutes, seconds remaining.
 */
function getTimeRemaining(trialEndsAt: string) {
  // Convert trial end to Eastern timezone for display
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

/**
 * Format the trial end date in Eastern timezone for display.
 */
function formatEndDateET(trialEndsAt: string): string {
  const end = new Date(trialEndsAt);
  return end.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " ET";
}

export function TrialBanner({ trialEndsAt, isExpired }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(trialEndsAt));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(trialEndsAt);
      setTimeLeft(remaining);

      // Force reload when trial expires to trigger lockout
      if (remaining.total <= 0) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [trialEndsAt]);

  if (!mounted) {
    return null;
  }

  if (isExpired) {
    return (
      <div className="border-b-2 border-editorial-red bg-editorial-red/10 px-4 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-bold text-editorial-red">
              Trial Expired
            </span>
            <span className="font-sans text-sm text-ink-secondary">
              — Your 14-day free trial ended on {formatEndDateET(trialEndsAt)}.
              Upgrade to continue using Optic Rank.
            </span>
          </div>
          <Link
            href="/dashboard/settings?tab=billing"
            className="shrink-0 bg-editorial-red px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  // Determine urgency level
  const isUrgent = timeLeft.days <= 3;
  const isWarning = timeLeft.days <= 7;

  return (
    <div
      className={`border-b px-4 py-2 ${
        isUrgent
          ? "border-editorial-red/30 bg-editorial-red/5"
          : isWarning
            ? "border-editorial-gold/30 bg-editorial-gold/5"
            : "border-editorial-green/30 bg-editorial-green/5"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-ink-secondary">
            <strong className={isUrgent ? "text-editorial-red" : isWarning ? "text-editorial-gold" : "text-editorial-green"}>
              Free Trial
            </strong>
            {" "}— Ends {formatEndDateET(trialEndsAt)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown display */}
          <div className="flex items-center gap-1 font-mono text-xs">
            <CountdownUnit value={timeLeft.days} label="d" urgent={isUrgent} />
            <span className="text-ink-muted">:</span>
            <CountdownUnit value={timeLeft.hours} label="h" urgent={isUrgent} />
            <span className="text-ink-muted">:</span>
            <CountdownUnit value={timeLeft.minutes} label="m" urgent={isUrgent} />
            <span className="text-ink-muted">:</span>
            <CountdownUnit value={timeLeft.seconds} label="s" urgent={isUrgent} />
          </div>

          <Link
            href="/dashboard/settings?tab=billing"
            className="shrink-0 border border-ink bg-ink px-4 py-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-surface-cream transition-colors hover:bg-transparent hover:text-ink"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

function CountdownUnit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <span className={urgent ? "text-editorial-red" : "text-ink"}>
      {String(value).padStart(2, "0")}
      <span className="text-ink-muted">{label}</span>
    </span>
  );
}
