import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  BarChart3,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Globe,
  Zap,
  Share2,
  Smartphone,
} from "lucide-react";
import { getSiteContent } from "@/lib/dal/admin";
import {
  JsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "AI-Powered SEO & Social Intelligence Platform",
  description:
    "Track keyword rankings, monitor competitors, audit your site, analyze social media performance, and unlock AI-driven insights. The all-in-one SEO and social intelligence platform for modern marketing teams.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI-Powered SEO & Social Intelligence Platform",
    description:
      "Track keyword rankings, monitor competitors, audit your site, analyze social media, and unlock AI-driven insights.",
  },
};

/* ── Icon Map ──────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Search, BarChart3, Shield, Sparkles, TrendingUp, Users, Globe, Zap, Share2, Smartphone,
};

/* ── Helpers ───────────────────────────────────────────────────── */

function getSection<T>(sections: { section: string; content: unknown }[], key: string): T | null {
  const row = sections.find((s) => s.section === key);
  return row ? (row.content as T) : null;
}

/* ── Defaults ──────────────────────────────────────────────────── */

const DEFAULT_FEATURES = [
  { icon: "Search", title: "Keyword Intelligence", description: "Track thousands of keywords across search engines with daily rank updates, SERP feature monitoring, and historical trend analysis." },
  { icon: "Users", title: "Competitor Surveillance", description: "Monitor your competitors' every move. See their ranking changes, new content, backlink acquisitions, and strategic shifts before they impact you." },
  { icon: "Shield", title: "Technical Site Audit", description: "Comprehensive crawl-based audits that uncover critical issues: broken links, thin content, Core Web Vitals failures, and indexability problems." },
  { icon: "Sparkles", title: "AI-Powered Insights", description: "Our AI analyzes your data continuously, surfacing actionable recommendations and predicting ranking opportunities before your competitors see them." },
  { icon: "Share2", title: "Social Intelligence", description: "AI-powered analytics for Instagram, TikTok, YouTube, Twitter, and LinkedIn. Earnings forecasts, growth strategies, competitor benchmarking, and content optimization." },
  { icon: "Smartphone", title: "App Store Optimization", description: "Track your app's keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the App Store and Google Play." },
];

const DEFAULT_STATS = [
  { value: "2.5M+", label: "Keywords Tracked" },
  { value: "50K+", label: "Sites Monitored" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 2s", label: "Avg. Report Time" },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default async function MarketingHomePage() {
  const sections = await getSiteContent("homepage");

  const hero = getSection<{
    dateline?: string;
    dateline_sub?: string;
    headline: string;
    headline_highlight?: string;
    subheadline: string;
    cta_primary?: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "hero");

  const stats = getSection<{ value: string; label: string }[]>(sections, "stats") ?? DEFAULT_STATS;

  const featuresHeader = getSection<{
    label: string;
    title: string;
    description: string;
  }>(sections, "features_header");

  const features = getSection<{ icon: string; title: string; description: string }[]>(sections, "features") ?? DEFAULT_FEATURES;

  const howItWorksHeader = getSection<{
    label: string;
    title: string;
  }>(sections, "how_it_works_header");

  const howItWorks = getSection<{ icon: string; step: string; title: string; description: string }[]>(sections, "how_it_works");

  const ctaContent = getSection<{
    label: string;
    headline: string;
    description: string;
    cta_primary?: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "cta");

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />

      {/* ==== HERO SECTION ==== */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 md:pb-28 md:pt-32">
          <div className="mb-6 flex items-center gap-3">
            <span className="editorial-label">{hero?.dateline ?? "Breaking"}</span>
            <span className="h-px flex-1 max-w-[120px] bg-editorial-red" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {hero?.dateline_sub ?? "SEO Intelligence Reimagined"}
            </span>
          </div>

          <h1 className="editorial-headline max-w-4xl text-5xl md:text-7xl lg:text-8xl">
            {hero?.headline ?? "Your Rankings,"}{" "}
            <span className="text-editorial-red">
              {hero?.headline_highlight ?? "Decoded by AI"}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary md:text-2xl">
            {hero?.subheadline ??
              "Optic Rank transforms raw SEO data into editorial-grade intelligence briefs. Track keywords, surveil competitors, and receive AI-curated insights -- all presented with newspaper clarity."}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href={hero?.cta_primary?.href ?? "/signup"}
              className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              {hero?.cta_primary?.text ?? "Start Free Trial"}
            </Link>
            <Link
              href={hero?.cta_secondary?.href ?? "/#features"}
              className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
            >
              {hero?.cta_secondary?.text ?? "See How It Works"}
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 bg-surface-card px-6 py-5"
              >
                <span className="font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                  {stat.value}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==== FEATURES SECTION ==== */}
      <section id="features" className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mb-16 max-w-2xl">
            <span className="editorial-label">
              {featuresHeader?.label ?? "The Intelligence Suite"}
            </span>
            <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {featuresHeader?.title ??
                "Every tool an SEO strategist needs, sharpened by artificial intelligence"}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
              {featuresHeader?.description ??
                "Six pillars of search and social intelligence, unified in a single platform that thinks ahead and presents findings with editorial precision."}
            </p>
          </div>

          <div className="grid gap-px border border-rule bg-rule md:grid-cols-2">
            {features.map((feature) => {
              const Icon = ICON_MAP[feature.icon] ?? Search;
              return (
                <div
                  key={feature.title}
                  className="flex flex-col gap-4 bg-surface-card p-8 md:p-10"
                >
                  <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                    <Icon size={22} strokeWidth={1.5} className="text-editorial-red" />
                  </div>
                  <h3 className="font-serif text-xl font-bold tracking-tight text-ink">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==== HOW IT WORKS SECTION ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mb-16 text-center">
            <span className="editorial-label">
              {howItWorksHeader?.label ?? "Trusted Intelligence"}
            </span>
            <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {howItWorksHeader?.title ?? "How Optic Rank works"}
            </h2>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {(howItWorks ?? [
              { icon: "Globe", step: "Step 01", title: "Connect Your Properties", description: "Add your domains, connect Google Search Console, and import your keyword targets. Setup takes under 5 minutes." },
              { icon: "BarChart3", step: "Step 02", title: "AI Analyzes Everything", description: "Our AI continuously monitors rankings, crawls your site, watches competitors, and identifies patterns humans miss." },
              { icon: "TrendingUp", step: "Step 03", title: "Act on Intelligence Briefs", description: "Receive daily editorial-style briefings with prioritized actions. No data overload, just clear, actionable intelligence." },
            ]).map((step) => {
              const StepIcon = ICON_MAP[step.icon] ?? Globe;
              return (
                <div key={step.title} className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-2 border-rule-dark">
                    <StepIcon size={28} strokeWidth={1.5} className="text-ink" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
                    {step.step}
                  </span>
                  <h3 className="mt-2 font-serif text-xl font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==== FINAL CTA SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">
                {ctaContent?.label ?? "Ready to Dominate Search?"}
              </span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {ctaContent?.headline ??
                "Start reading the SEO intelligence brief your competitors wish they had"}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-ink-secondary">
              {ctaContent?.description ??
                "Join thousands of SEO professionals who trust Optic Rank to keep them ahead. Free 14-day trial, no credit card required."}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={ctaContent?.cta_primary?.href ?? "/signup"}
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                {ctaContent?.cta_primary?.text ?? "Start Your Free Trial"}
              </Link>
              <Link
                href={ctaContent?.cta_secondary?.href ?? "/contact"}
                className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
              >
                {ctaContent?.cta_secondary?.text ?? "Talk to Sales"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
