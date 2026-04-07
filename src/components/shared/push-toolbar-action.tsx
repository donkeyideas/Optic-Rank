"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { BellRing, BellOff, Check } from "lucide-react";

const DISMISS_KEY = "opticrank_push_banner_dismissed";

export function PushToolbarAction() {
  const { isSupported, permission, state, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISS_KEY));
  }, []);

  // Don't show anything if not supported or already subscribed or denied or dismissed
  if (
    !isSupported ||
    state === "subscribed" ||
    permission === "denied" ||
    dismissed ||
    state === "loading"
  )
    return null;

  return (
    <div className="relative">
      <button
        onClick={async () => {
          const ok = await subscribe();
          if (ok) {
            setDismissed(true);
            localStorage.setItem(DISMISS_KEY, "true");
          }
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative flex items-center gap-1.5 rounded-none border border-surface-cream/20 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-surface-cream/70 transition-colors hover:bg-surface-cream/10 hover:text-surface-cream"
      >
        <BellRing size={12} strokeWidth={2} className="text-editorial-gold" />
        <span className="hidden sm:inline">Enable Alerts</span>
        <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-editorial-gold" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 border border-rule bg-surface-card p-3 shadow-lg">
          <p className="font-sans text-[12px] font-semibold text-ink">
            Never miss an SEO alert
          </p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            Get push notifications for rank changes, audit results, and backlink alerts.
          </p>
        </div>
      )}
    </div>
  );
}
