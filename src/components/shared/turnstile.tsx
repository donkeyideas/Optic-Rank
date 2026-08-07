"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (explicit render).
 *
 * Renders nothing (and never blocks the form) when NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * isn't set, so the app works before the keys are provisioned. Calls `onToken`
 * with the verification token on success, or null on error/expiry so the caller
 * can gate submission.
 */

interface TurnstileWindow {
  turnstile?: {
    render: (
      el: HTMLElement,
      opts: {
        sitekey: string;
        callback: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: "auto" | "light" | "dark";
      }
    ) => string;
    remove: (id: string) => void;
    reset: (id: string) => void;
  };
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep the latest callback without re-running the effect.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const render = () => {
      const w = window as unknown as TurnstileWindow;
      if (cancelled || !containerRef.current || !w.turnstile) return;
      if (widgetIdRef.current) return; // already rendered
      widgetIdRef.current = w.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => onTokenRef.current(token),
        "error-callback": () => onTokenRef.current(null),
        "expired-callback": () => onTokenRef.current(null),
      });
    };

    const w = window as unknown as TurnstileWindow;
    if (w.turnstile) {
      render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile="1"]'
      );
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "1";
        script.addEventListener("load", render);
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      const win = window as unknown as TurnstileWindow;
      if (widgetIdRef.current && win.turnstile) {
        try {
          win.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget already gone — ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
