import Link from "next/link";
import type { Metadata } from "next";
import {
  Instagram,
  Youtube,
  Linkedin,
  Hash,
  Share2,
  Users,
  DollarSign,
  Calendar,
  Target,
  TrendingUp,
  ArrowRight,
  Check,
  Zap,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSiteContent } from "@/lib/dal/admin";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";

/* ── SEO Meta ──────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Social Intelligence — AI-Powered Social Media Analytics",
  description:
    "Track your social media performance across Instagram, TikTok, YouTube, Twitter, and LinkedIn. AI earnings forecasts, growth strategies, competitor benchmarking, content optimization, and more.",
  alternates: { canonical: "/social-intelligence" },
  openGraph: {
    title: "Social Intelligence — AI-Powered Social Media Analytics",
    description:
      "AI-powered analytics for Instagram, TikTok, YouTube, Twitter, and LinkedIn. Earnings forecasts, growth strategies, and competitor benchmarking.",
  
    images: OG_IMAGES,},
};

/* ── Icon Map ──────────────────────────────────────────────────── */

const PLATFORM_ICONS = {
  instagram: Instagram,
  tiktok: Hash,
  youtube: Youtube,
  twitter: Hash,
  linkedin: Linkedin,
} as const;

const PLATFORM_COLORS = {
  instagram: "text-pink-500",
  tiktok: "text-ink",
  youtube: "text-red-600",
  twitter: "text-blue-500",
  linkedin: "text-blue-700",
} as const;

const FEATURE_ICONS = {
  audience: Users,
  earnings: DollarSign,
  content: Calendar,
  competitors: Target,
  growth: TrendingUp,
} as const;

const FEATURE_COLORS = {
  audience: "text-editorial-red",
  earnings: "text-editorial-green",
  content: "text-editorial-gold",
  competitors: "text-ink",
  growth: "text-editorial-red",
} as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getSection<T>(sections: { section: string; content: unknown }[], key: string): T | null {
  const row = sections.find((s) => s.section === key);
  return row ? (row.content as T) : null;
}

/* ── Defaults ──────────────────────────────────────────────────── */

const DEFAULT_PLATFORMS = [
  { key: "instagram", label: "Instagram", description: "Reels, Stories, carousel analytics and engagement tracking" },
  { key: "tiktok", label: "TikTok", description: "Short-form video performance, virality metrics, and trend analysis" },
  { key: "youtube", label: "YouTube", description: "Subscriber growth, watch time analytics, and revenue projections" },
  { key: "twitter", label: "X (Twitter)", description: "Tweet performance, follower growth, and conversation analytics" },
  { key: "linkedin", label: "LinkedIn", description: "Professional network growth, post engagement, and B2B visibility" },
];

const DEFAULT_FEATURES = [
  {
    key: "audience",
    title: "Audience Analytics",
    subtitle: "Know Your Audience Inside Out",
    description: "Track follower growth, engagement trends, and audience demographics across all your social platforms. AI identifies patterns, detects growth spurts, and alerts you to engagement drops before they become problems.",
    features: ["Real-time follower tracking & growth trends", "Engagement rate monitoring with historical comparisons", "Average likes, comments, views, and shares per post", "Growth trajectory analysis with AI predictions", "Platform-specific metric dashboards", "Daily metric snapshots with trend arrows"],
    stat_value: "5",
    stat_label: "Platforms tracked simultaneously with unified analytics",
  },
  {
    key: "earnings",
    title: "AI Earnings Forecast",
    subtitle: "Your Monetization Potential, Quantified",
    description: "AI-powered income projections based on your audience size, engagement quality, niche CPM rates, and growth trajectory. Three-scenario forecasting gives you conservative, realistic, and optimistic revenue targets.",
    features: ["Three-scenario earnings projections (conservative, realistic, optimistic)", "Monetization readiness score with factor breakdown", "Revenue source analysis (sponsorships, affiliate, digital products)", "Niche CPM rate benchmarking", "Audience geography impact on earnings", "Growth trajectory income forecasting"],
    stat_value: "$",
    stat_label: "Personalized earnings projections based on real industry benchmarks",
  },
  {
    key: "content",
    title: "Content Strategy Engine",
    subtitle: "Post Smarter, Not Harder",
    description: "AI analyzes your content performance to recommend optimal posting frequency, content mix, best posting times, and trending hashtags. Stop guessing what to post and when — let data drive your content calendar.",
    features: ["Optimal posting frequency recommendations", "Content mix analysis (photos, videos, carousels, stories)", "Best posting times by day of week", "AI-curated hashtag recommendations with volume & competition", "Content calendar generation", "Platform-specific content format suggestions"],
    stat_value: "24/7",
    stat_label: "AI continuously analyzes your content performance to refine recommendations",
  },
  {
    key: "competitors",
    title: "Competitor Benchmarking",
    subtitle: "See How You Stack Up",
    description: "AI discovers your top competitors and benchmarks your performance against theirs. Track follower gaps, engagement differences, and strategic opportunities your competitors are missing.",
    features: ["AI-powered competitor discovery in your niche", "Follower count & engagement rate comparisons", "Content strategy gap analysis", "Growth rate benchmarking", "Competitive positioning insights", "Automated competitor monitoring"],
    stat_value: "vs",
    stat_label: "Head-to-head benchmarking against your top competitors",
  },
  {
    key: "growth",
    title: "Growth Intelligence",
    subtitle: "Actionable Steps to Scale",
    description: "Receive prioritized, actionable growth tips tailored to your specific profile, niche, and audience. Each tip includes estimated impact so you can focus on the highest-ROI activities first.",
    features: ["Prioritized growth tips (high/medium/low impact)", "30-day action plans with daily tasks", "AI strategic insights and trend analysis", "Estimated follower impact per recommendation", "Niche-specific growth strategies", "Weekly intelligence briefs with progress tracking"],
    stat_value: "30",
    stat_label: "Day AI-generated action plans tailored to your goals",
  },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default async function SocialIntelligencePage() {
  const sections = await getSiteContent("social-intelligence");

  const hero = getSection<{
    label?: string;
    headline: string;
    headline_highlight?: string;
    description: string;
  }>(sections, "hero");

  const platforms = getSection<
    { key: string; label: string; description: string }[]
  >(sections, "platforms") ?? DEFAULT_PLATFORMS;

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
      <JsonLd data={breadcrumbJsonLd([{ name: "Social Intelligence", path: "/social-intelligence" }])} />

      {/* ==== HERO SECTION ==== */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <span className="editorial-label">
              {hero?.label ?? "Social Media Intelligence"}
            </span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl lg:text-7xl">
              {hero?.headline ?? "Your Social Presence,"}{" "}
              <span className="text-editorial-red">
                {hero?.headline_highlight ?? "Decoded by AI"}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {hero?.description ??
                "Track your social media performance across Instagram, TikTok, YouTube, Twitter, and LinkedIn. AI-powered earnings forecasts, growth strategies, competitor benchmarking, and content optimization — all in one command center."}
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

      {/* ==== PLATFORM STRIP ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-px border-x border-rule bg-rule md:grid-cols-5">
            {platforms.map((platform) => {
              const Icon = PLATFORM_ICONS[platform.key as keyof typeof PLATFORM_ICONS] ?? Share2;
              const color = PLATFORM_COLORS[platform.key as keyof typeof PLATFORM_COLORS] ?? "text-ink";
              return (
                <div key={platform.key} className="flex flex-col items-center gap-3 bg-surface-card px-4 py-8">
                  <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                    <Icon size={22} strokeWidth={1.5} className={color} />
                  </div>
                  <span className="font-serif text-lg font-bold tracking-tight text-ink">
                    {platform.label}
                  </span>
                  <p className="text-center text-[10px] leading-relaxed text-ink-muted">
                    {platform.description}
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
                    {index === 0 && <Badge variant="danger">New</Badge>}
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
              Three steps to social intelligence
            </h2>
          </div>

          <div className="grid gap-12 md:grid-cols-3">
            {(howItWorks ?? [
              { icon: "Share2", step: "Step 01", title: "Connect Your Profiles", description: "Add your Instagram, TikTok, YouTube, Twitter, or LinkedIn handle. We'll pull in your metrics automatically." },
              { icon: "Sparkles", step: "Step 02", title: "AI Analyzes Everything", description: "Our AI runs 7 analysis types: growth tips, content strategy, hashtags, competitors, earnings forecast, 30-day plan, and strategic insights." },
              { icon: "TrendingUp", step: "Step 03", title: "Act on Intelligence", description: "Receive prioritized recommendations, generate content, track progress toward goals, and benchmark against competitors." },
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

      {/* ==== BOTTOM CTA ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">Get Started</span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {cta?.headline ?? "Ready to decode your social presence?"}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-ink-secondary">
              {cta?.description ??
                "Start your 14-day free trial and let AI analyze your social profiles. No credit card required."}
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
