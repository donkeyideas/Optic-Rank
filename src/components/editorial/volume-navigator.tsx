"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface VolumeNavigatorProps {
  /** null = current/live edition */
  currentVolume: number | null;
  minVolume: number;
  maxVolume: number;
  weekStart?: string;
  weekEnd?: string;
}

function formatWeekRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();

  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}–${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
}

export function VolumeNavigator({
  currentVolume,
  minVolume,
  maxVolume,
  weekStart,
  weekEnd,
}: VolumeNavigatorProps) {
  const router = useRouter();
  const isLive = currentVolume === null;
  const hasVolumes = maxVolume > 0;
  const canGoPrev = isLive ? hasVolumes : currentVolume > minVolume;
  const canGoNext = !isLive;

  function goTo(vol: number | null) {
    if (vol === null) {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?vol=${vol}`);
    }
  }

  return (
    <div className={`flex items-center justify-center gap-4 px-4 py-2 ${isLive ? "border-b border-rule bg-surface-card" : "border border-rule bg-surface-inset"}`}>
      <button
        onClick={() => {
          if (isLive) goTo(maxVolume);
          else if (canGoPrev) goTo(currentVolume - 1);
        }}
        disabled={!canGoPrev}
        className="p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Previous volume"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="text-center">
        {isLive ? (
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-editorial-red">
            Current Edition
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink">
              Archived Edition — Vol. {currentVolume}
            </span>
            {weekStart && weekEnd && (
              <span className="font-mono text-[10px] text-ink-muted">
                — {formatWeekRange(weekStart, weekEnd)}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (!isLive && currentVolume < maxVolume) goTo(currentVolume + 1);
          else if (!isLive) goTo(null);
        }}
        disabled={!canGoNext}
        className="p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Next volume"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isLive && (
        <button
          onClick={() => goTo(null)}
          className="ml-2 border border-rule px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-editorial-red transition-colors hover:bg-editorial-red hover:text-white"
        >
          Current Edition
        </button>
      )}
    </div>
  );
}
