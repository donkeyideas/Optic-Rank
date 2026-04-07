"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { BellRing, X } from "lucide-react";

const DISMISS_KEY = "opticrank_push_banner_dismissed";

export function PushBanner() {
  const { isSupported, permission, state, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(!!localStorage.getItem(DISMISS_KEY));
  }, []);

  if (
    !isSupported ||
    state === "subscribed" ||
    permission === "denied" ||
    dismissed ||
    state === "loading"
  )
    return null;

  return (
    <div className="relative mx-4 mt-3 mb-1 flex items-center gap-3 border border-rule bg-surface-card px-4 py-3">
      <BellRing size={16} className="shrink-0 text-editorial-gold" />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13px] font-semibold text-ink">
          Never miss an SEO alert
        </p>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          Enable push notifications for rank changes, audit results, and
          backlink alerts.
        </p>
      </div>
      <button
        onClick={async () => {
          const ok = await subscribe();
          if (ok) setDismissed(true);
        }}
        className="shrink-0 border border-editorial-green bg-editorial-green/10 px-3 py-1.5 text-xs font-medium text-editorial-green transition-colors hover:bg-editorial-green/20"
      >
        Enable
      </button>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "true");
          setDismissed(true);
        }}
        className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
