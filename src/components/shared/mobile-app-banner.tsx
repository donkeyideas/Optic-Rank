import { Smartphone, Download } from "lucide-react";

interface MobileAppBannerProps {
  headline?: string;
  description?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  variant?: "marketing" | "dashboard";
}

/* ── Main Component ──────────────────────────────────────────── */

export function MobileAppBanner({
  headline = "Take Optic Rank On The Go",
  description = "Track your SEO intelligence from anywhere with our mobile app.",
  appStoreUrl,
  googlePlayUrl,
  variant = "marketing",
}: MobileAppBannerProps) {
  const hasLinks = appStoreUrl || googlePlayUrl;
  if (!hasLinks) return null;

  if (variant === "dashboard") {
    return (
      <div className="border border-rule bg-surface-card">
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rule bg-surface-raised">
            <Smartphone size={16} strokeWidth={1.5} className="text-editorial-red" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{headline}</p>
            <p className="text-xs text-ink-muted truncate">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {appStoreUrl && (
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 border border-rule bg-ink px-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-ink/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
                </svg>
                App Store
              </a>
            )}
            {googlePlayUrl && (
              <a
                href={googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 border border-rule bg-ink px-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-ink/80"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M3.61 1.81L13.53 12l-9.92 10.19c-.34-.3-.55-.73-.55-1.21V3.02c0-.48.21-.91.55-1.21ZM14.53 13l2.86 2.93-10.87 6.17L14.53 13ZM21.19 10.63c.5.29.81.84.81 1.37 0 .53-.31 1.08-.81 1.37l-2.6 1.48L15.7 12l2.89-2.85 2.6 1.48ZM6.52 2.9l10.87 6.17L14.53 12 6.52 2.9Z" />
                </svg>
                Google Play
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Marketing variant — bold, attention-grabbing section
  return (
    <section className="relative border-b-4 border-double border-rule-dark overflow-hidden">
      {/* Red accent top border */}
      <div className="h-1 bg-editorial-red" />

      {/* Subtle grid background like hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          {/* Label */}
          <div className="mb-6 flex items-center gap-3">
            <span className="editorial-label">Now Available</span>
            <span className="h-px w-16 bg-editorial-red" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              iOS App
            </span>
          </div>

          {/* Phone icon in a prominent frame */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center border-2 border-editorial-red bg-editorial-red/10">
            <Smartphone size={36} strokeWidth={1.5} className="text-editorial-red" />
          </div>

          {/* Headline */}
          <h2 className="font-serif text-3xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
            {headline}
          </h2>

          {/* Description */}
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-secondary">
            {description}
          </p>

          {/* Download buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            {appStoreUrl && (
              <a
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-14 items-center gap-3 bg-editorial-red px-8 text-white transition-colors hover:bg-editorial-red/90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z" />
                </svg>
                <div className="text-left">
                  <span className="block text-[9px] font-medium uppercase tracking-wider opacity-80">Download on the</span>
                  <span className="block text-sm font-bold uppercase tracking-widest">App Store</span>
                </div>
                <Download size={16} strokeWidth={2} className="ml-1 opacity-60 transition-transform group-hover:translate-y-0.5" />
              </a>
            )}
            {googlePlayUrl && (
              <a
                href={googlePlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-14 items-center gap-3 border border-rule-dark bg-transparent px-8 text-ink transition-colors hover:bg-surface-raised"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6">
                  <path fill="#EA4335" d="M3.61 1.81L13.53 12l-9.92 10.19c-.34-.3-.55-.73-.55-1.21V3.02c0-.48.21-.91.55-1.21Z" />
                  <path fill="#FBBC04" d="M14.53 13l2.86 2.93-10.87 6.17L14.53 13Z" />
                  <path fill="#4285F4" d="M21.19 10.63c.5.29.81.84.81 1.37 0 .53-.31 1.08-.81 1.37l-2.6 1.48L15.7 12l2.89-2.85 2.6 1.48Z" />
                  <path fill="#34A853" d="M6.52 2.9l10.87 6.17L14.53 12 6.52 2.9Z" />
                </svg>
                <div className="text-left">
                  <span className="block text-[9px] font-medium uppercase tracking-wider text-ink-muted">Get it on</span>
                  <span className="block text-sm font-bold uppercase tracking-widest">Google Play</span>
                </div>
                <Download size={16} strokeWidth={2} className="ml-1 opacity-40 transition-transform group-hover:translate-y-0.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
