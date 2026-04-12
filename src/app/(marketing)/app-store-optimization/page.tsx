import Link from "next/link";
import type { Metadata } from "next";
import {
  Smartphone,
  Apple,
  Store,
  Search,
  BarChart3,
  Target,
  MessageSquare,
  Eye,
  Check,
  Zap,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSiteContent } from "@/lib/dal/admin";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd, faqJsonLd, speakableJsonLd } from "@/components/seo/json-ld";

/* ── SEO Meta ──────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "App Store Optimization (ASO) — AI-Powered Mobile Visibility",
  description:
    "Track app keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the Apple App Store and Google Play.",
  alternates: { canonical: "/app-store-optimization" },
  openGraph: {
    title: "App Store Optimization (ASO) — AI-Powered Mobile Visibility",
    description:
      "Track app keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the Apple App Store and Google Play.",
    images: OG_IMAGES,
  },
};

/* ── Icon Map ──────────────────────────────────────────────────── */

const STORE_ICONS = {
  apple: Apple,
  google_play: Store,
} as const;

const STORE_COLORS = {
  apple: "text-ink",
  google_play: "text-editorial-green",
} as const;

const FEATURE_ICONS = {
  keyword_tracking: Search,
  visibility_score: Eye,
  competitor_analysis: Target,
  review_intelligence: MessageSquare,
  performance_analytics: BarChart3,
  ai_recommendations: Sparkles,
} as const;

const FEATURE_COLORS = {
  keyword_tracking: "text-editorial-red",
  visibility_score: "text-editorial-gold",
  competitor_analysis: "text-ink",
  review_intelligence: "text-editorial-green",
  performance_analytics: "text-editorial-red",
  ai_recommendations: "text-editorial-gold",
} as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getSection<T>(sections: { section: string; content: unknown }[], key: string): T | null {
  const row = sections.find((s) => s.section === key);
  return row ? (row.content as T) : null;
}

/* ── Defaults ──────────────────────────────────────────────────── */

const DEFAULT_STORES = [
  { key: "apple", label: "Apple App Store", description: "iOS keyword rankings, ratings, category positions, and App Store Connect insights" },
  { key: "google_play", label: "Google Play Store", description: "Android app visibility, keyword tracking, install trends, and Play Console analytics" },
];

const DEFAULT_FEATURES = [
  {
    key: "keyword_tracking",
    title: "App Keyword Tracking",
    subtitle: "Know Exactly Where You Rank",
    description: "Track your app's keyword rankings across both the Apple App Store and Google Play. Monitor daily position changes, discover high-volume opportunities, and understand which keywords drive the most installs.",
    features: ["Daily keyword rank monitoring across both stores", "Search volume and difficulty scoring", "Keyword suggestion engine with AI recommendations", "Position history with trend visualization", "Competitor keyword overlap analysis", "Localized tracking across 60+ countries"],
    stat_value: "60+",
    stat_label: "Countries tracked with localized keyword intelligence",
  },
  {
    key: "visibility_score",
    title: "Organic Visibility Score",
    subtitle: "Your App's Discoverability, Quantified",
    description: "A single aggregate score (0–100) measuring your app's total discoverability across all tracked keywords, weighted by search volume and position. Track how optimization efforts translate into real visibility improvements.",
    features: ["Aggregate visibility score weighted by search volume", "Position-based weighting with exponential decay", "Per-keyword visibility breakdown", "Tier distribution analysis (Top 3, Top 10, Top 50)", "Historical trend tracking with daily snapshots", "Organization-level visibility overview"],
    stat_value: "0–100",
    stat_label: "Single score quantifying your app's total discoverability",
  },
  {
    key: "competitor_analysis",
    title: "Competitor App Intelligence",
    subtitle: "See How You Stack Up",
    description: "Identify and monitor your top competitors in both app stores. Compare keyword rankings, ratings, download trends, and visibility scores side by side. Discover gaps in their strategies that you can exploit.",
    features: ["Automated competitor discovery in your category", "Side-by-side keyword ranking comparisons", "Rating and review volume benchmarking", "Visibility score comparisons", "New keyword and update detection alerts", "Category ranking overlap analysis"],
    stat_value: "vs",
    stat_label: "Head-to-head competitor benchmarking across both stores",
  },
  {
    key: "review_intelligence",
    title: "Review & Sentiment Analysis",
    subtitle: "Turn Feedback Into Features",
    description: "AI analyzes thousands of app reviews to surface sentiment trends, feature requests, and pain points. Understand what users love, what frustrates them, and what your competitors' users are asking for.",
    features: ["AI-powered sentiment classification (positive, negative, neutral)", "Feature request extraction and clustering", "Bug report detection and severity scoring", "Competitor review analysis and comparison", "Rating trend monitoring with anomaly alerts", "Review response recommendations"],
    stat_value: "AI",
    stat_label: "Powered sentiment analysis across thousands of reviews",
  },
  {
    key: "performance_analytics",
    title: "Performance Analytics",
    subtitle: "Downloads, Revenue, Retention",
    description: "Connect your App Store Connect and Google Play Console data for unified performance analytics. Track downloads, revenue, conversion rates, and retention metrics alongside your ASO efforts to measure real impact.",
    features: ["Download and install trend tracking", "Revenue analytics with source attribution", "Conversion rate monitoring (impressions → installs)", "Retention and uninstall rate analysis", "Update impact measurement on key metrics", "Custom date range comparisons"],
    stat_value: "360°",
    stat_label: "Full-funnel analytics from impression to retention",
  },
  {
    key: "ai_recommendations",
    title: "AI-Powered ASO Recommendations",
    subtitle: "Optimization on Autopilot",
    description: "Our AI continuously analyzes your app's metadata, keywords, ratings, and competitor landscape to generate prioritized optimization recommendations. Each suggestion includes estimated impact and step-by-step implementation guidance.",
    features: ["Title and subtitle optimization suggestions", "Keyword field recommendations with volume data", "Screenshot and preview video best practices", "Localization priority recommendations", "A/B test hypotheses for listing elements", "Weekly ASO intelligence briefs"],
    stat_value: "24/7",
    stat_label: "AI continuously monitors and generates optimization recommendations",
  },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default async function AppStoreOptimizationPage() {
  const sections = await getSiteContent("app-store-optimization");

  const hero = getSection<{
    label?: string;
    headline: string;
    headline_highlight?: string;
    description: string;
  }>(sections, "hero");

  const stores = getSection<
    { key: string; label: string; description: string }[]
  >(sections, "stores") ?? DEFAULT_STORES;

  const featureSections = getSection<typeof DEFAULT_FEATURES>(sections, "features") ?? DEFAULT_FEATURES;

  const howItWorks = getSection<
    { icon: string; step: string; title: string; description: string }[]
  >(sections, "how_it_works");

  const cta = getSection<{
    headline: string;
    description: string;
    cta_primary: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "cta");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "App Store Optimization", path: "/app-store-optimization" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "p"], "/app-store-optimization")} />
      <JsonLd
        data={faqJsonLd([
          { question: "What is App Store Optimization (ASO)?", answer: "ASO is the process of improving an app's visibility and conversion rate in the Apple App Store and Google Play Store. It involves optimizing keywords, titles, descriptions, screenshots, and ratings to increase organic downloads." },
          { question: "How does Optic Rank track app keyword rankings?", answer: "Optic Rank monitors your app's keyword positions daily across both the Apple App Store and Google Play Store in 60+ countries. It tracks position changes, search volume estimates, and keyword difficulty to help you prioritize optimization efforts." },
          { question: "What is the Organic Visibility Score?", answer: "The Organic Visibility Score is an aggregate metric (0-100) that measures your app's total discoverability across all tracked keywords, weighted by search volume and position. Higher rankings on high-volume keywords contribute more to your score." },
          { question: "Can I track competitor apps?", answer: "Yes, Optic Rank automatically discovers competitors in your app category and lets you compare keyword rankings, ratings, review volumes, and visibility scores side by side. You'll also receive alerts when competitors update their listings or gain new keywords." },
          { question: "Does Optic Rank support both iOS and Android?", answer: "Yes, Optic Rank tracks both the Apple App Store (iOS) and Google Play Store (Android) with unified analytics. You can compare performance across both platforms from a single dashboard." },
        ])}
      />

      {/* ==== HERO SECTION ==== */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="editorial-label">
              {hero?.label ?? "App Store Optimization"}
            </span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl lg:text-7xl">
              {hero?.headline ?? "Your App's Visibility,"}{" "}
              <span className="text-editorial-red">
                {hero?.headline_highlight ?? "Decoded by AI"}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {hero?.description ??
                "Track keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the Apple App Store and Google Play — all from one intelligence platform."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                Start Free Trial
              </Link>
              <Link
                href="/features"
                className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
              >
                View All Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==== STORE STRIP ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-px border-x border-rule bg-rule sm:grid-cols-2">
            {stores.map((store) => {
              const Icon = STORE_ICONS[store.key as keyof typeof STORE_ICONS] ?? Smartphone;
              const color = STORE_COLORS[store.key as keyof typeof STORE_COLORS] ?? "text-ink";
              return (
                <div key={store.key} className="flex flex-col items-center gap-3 bg-surface-card px-6 py-8">
                  <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                    <Icon size={22} strokeWidth={1.5} className={color} />
                  </div>
                  <span className="font-serif text-lg font-bold tracking-tight text-ink">
                    {store.label}
                  </span>
                  <p className="text-center text-[10px] leading-relaxed text-ink-muted">
                    {store.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==== FEATURE SECTIONS (alternating layout) ==== */}
      {featureSections.map((feature, index) => {
        const Icon = FEATURE_ICONS[feature.key as keyof typeof FEATURE_ICONS] ?? Sparkles;
        const color = FEATURE_COLORS[feature.key as keyof typeof FEATURE_COLORS] ?? "text-editorial-red";
        const isEven = index % 2 === 1;

        return (
          <section
            key={feature.key}
            className={`border-b border-rule ${isEven ? "bg-surface-card" : ""}`}
          >
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
              <div
                className={`flex flex-col gap-12 md:items-center lg:gap-16 ${
                  isEven ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                {/* Text content */}
                <div className="flex-1">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                      <Icon size={22} strokeWidth={1.5} className={color} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                      Feature {String(index + 1).padStart(2, "0")}
                    </span>
                    {index === 1 && <Badge variant="danger">New</Badge>}
                  </div>

                  <h2 className="font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                    {feature.title}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-ink-muted">
                    {feature.subtitle}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                    {feature.description}
                  </p>

                  {/* Feature list */}
                  <ul className="mt-6 space-y-2">
                    {feature.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="mt-0.5 shrink-0 text-editorial-green"
                        />
                        <span className="text-sm text-ink-secondary">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stat card */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex h-64 w-full flex-col items-center justify-center border-2 border-rule bg-surface-raised p-8">
                    <span className={`font-serif text-6xl font-bold tracking-tight ${color} md:text-7xl`}>
                      {feature.stat_value}
                    </span>
                    <p className="mt-4 max-w-xs text-center text-sm text-ink-secondary">
                      {feature.stat_label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ==== HOW IT WORKS ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mb-16 text-center">
            <span className="editorial-label">Getting Started</span>
            <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              Three steps to ASO intelligence
            </h2>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {(howItWorks ?? [
              { icon: "Smartphone", step: "Step 01", title: "Add Your Apps", description: "Enter your app name or bundle ID for iOS and Android. We'll pull in your listings, keywords, ratings, and competitor data automatically." },
              { icon: "Sparkles", step: "Step 02", title: "AI Analyzes Everything", description: "Our AI tracks keyword rankings daily, monitors competitors, analyzes review sentiment, and calculates your organic visibility score across both stores." },
              { icon: "TrendingUp", step: "Step 03", title: "Optimize & Grow", description: "Receive prioritized ASO recommendations, track visibility improvements over time, and benchmark against competitors with actionable intelligence briefs." },
            ]).map((step) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border-2 border-rule-dark">
                  <BarChart3 size={28} strokeWidth={1.5} className="text-ink" />
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
            ))}
          </div>
        </div>
      </section>

      {/* ==== FAQ SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Common Questions</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Frequently asked questions about ASO
            </h2>
          </div>
          <div className="divide-y divide-rule">
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is App Store Optimization (ASO)?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">ASO is the process of improving an app&apos;s visibility and conversion rate in the Apple App Store and Google Play Store. It involves optimizing keywords, titles, descriptions, screenshots, and ratings to increase organic downloads.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">How does Optic Rank track app keyword rankings?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Optic Rank monitors your app&apos;s keyword positions daily across both the Apple App Store and Google Play Store in 60+ countries. It tracks position changes, search volume estimates, and keyword difficulty to help you prioritize optimization efforts.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is the Organic Visibility Score?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">The Organic Visibility Score is an aggregate metric (0–100) that measures your app&apos;s total discoverability across all tracked keywords, weighted by search volume and position. Higher rankings on high-volume keywords contribute more to your score.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">Can I track competitor apps?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Yes, Optic Rank automatically discovers competitors in your app category and lets you compare keyword rankings, ratings, review volumes, and visibility scores side by side. You&apos;ll also receive alerts when competitors update their listings or gain new keywords.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">Does Optic Rank support both iOS and Android?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Yes, Optic Rank tracks both the Apple App Store (iOS) and Google Play Store (Android) with unified analytics. You can compare performance across both platforms from a single dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==== BOTTOM CTA ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">Get Started</span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {cta?.headline ?? "Ready to dominate the app stores?"}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-ink-secondary">
              {cta?.description ??
                "Start your 14-day free trial and let AI optimize your app's visibility across the Apple App Store and Google Play. No credit card required."}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={cta?.cta_primary?.href ?? "/signup"}
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                {cta?.cta_primary?.text ?? "Start Free Trial"}
              </Link>
              {cta?.cta_secondary && (
                <Link
                  href={cta.cta_secondary.href}
                  className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
                >
                  {cta.cta_secondary.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
