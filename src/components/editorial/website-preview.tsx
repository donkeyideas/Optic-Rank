"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { ColumnHeader } from "./column-header";

interface WebsitePreviewProps {
  domain: string;
  /** Pre-checked on the server: false if X-Frame-Options / CSP blocks framing */
  canFrame?: boolean;
}

export function WebsitePreview({ domain, canFrame = true }: WebsitePreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(!canFrame);
  const siteUrl = `https://${domain}`;

  useEffect(() => setMounted(true), []);

  // SSR: static placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="border-b-2 border-rule-dark pb-3">
        <ColumnHeader
          title="Website Preview"
          subtitle={domain.toUpperCase()}
          className="mb-3"
        />
        <div className="relative overflow-hidden border border-rule" style={{ height: 320 }}>
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-surface-raised">
            <Globe className="h-3 w-3 text-ink-muted" />
            <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-ink-muted">
              {domain}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b-2 border-rule-dark pb-3">
      <ColumnHeader
        title="Website Preview"
        subtitle={domain.toUpperCase()}
        className="mb-3"
      />
      <div className="relative overflow-hidden border border-rule" style={{ height: 320 }}>
        {!blocked ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-surface-raised">
                <Loader2 className="h-3 w-3 animate-spin text-ink-muted" />
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-ink-muted">
                  {domain}
                </span>
              </div>
            )}

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: "scale(0.25)",
                transformOrigin: "top left",
                width: "400%",
                height: "400%",
              }}
            >
              <iframe
                src={siteUrl}
                title={`${domain} homepage`}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                onLoad={() => setLoaded(true)}
                onError={() => setBlocked(true)}
                className="border-0"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10 flex items-end justify-end p-1.5 opacity-0 transition-opacity hover:opacity-100"
              style={{ background: "linear-gradient(transparent 60%, rgba(0,0,0,0.4))" }}
            >
              <span className="flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-white">
                {domain}
                <ExternalLink className="h-2 w-2" />
              </span>
            </a>
          </>
        ) : (
          <BlockedFallback domain={domain} siteUrl={siteUrl} />
        )}
      </div>
    </div>
  );
}

/** Styled fallback when the site blocks iframe embedding */
function BlockedFallback({ domain, siteUrl }: { domain: string; siteUrl: string }) {
  return (
    <a
      href={siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col items-center justify-center gap-3 bg-surface-raised transition-colors hover:bg-surface-inset"
    >
      <Globe className="h-8 w-8 text-ink-muted" />
      <span className="font-serif text-lg font-bold text-ink">{domain}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
        Preview blocked by site — Click to visit
      </span>
      <span className="mt-1 flex items-center gap-1.5 border border-rule px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-editorial-red transition-colors hover:bg-editorial-red hover:text-white">
        Open Website
        <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}
