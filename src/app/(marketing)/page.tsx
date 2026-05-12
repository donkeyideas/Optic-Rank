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
import { MobileAppBanner } from "@/components/shared/mobile-app-banner";
import {
  JsonLd,
  OG_IMAGES,
  organizationJsonLd,
  webSiteJsonLd,
  softwareApplicationJsonLd,
  speakableJsonLd,
  howToJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "SEO Rank Tracker | Keyword Rank Checker | Optic Rank" },
  description:
    "Track your search rankings and check keyword positions with AI-powered insights. Try Optic Rank's all-in-one SEO rank tracker and improve your visibility today.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SEO Rank Tracker | Keyword Rank Checker | Optic Rank",
    description:
      "Track your search rankings and check keyword positions with AI-powered insights. Try Optic Rank's all-in-one SEO rank tracker and improve your visibility today.",
    images: OG_IMAGES,
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
  { icon: "Search", title: "Keyword Rank Checker", description: "Track thousands of keywords across search engines with daily rank updates, SERP feature monitoring, and historical trend analysis. The website ranking tracker built for SEO professionals." },
  { icon: "Users", title: "SEO Competitor Analysis Tool", description: "Monitor your competitors' every move. See their ranking changes, new content, backlink acquisitions, and strategic shifts -- the SEO competitor analysis tool that keeps you ahead." },
  { icon: "Shield", title: "Technical Site Audit", description: "Comprehensive crawl-based audits that uncover critical issues: broken links, thin content, Core Web Vitals failures, and indexability problems across local and global pages." },
  { icon: "Sparkles", title: "AI-Powered SEO Insights", description: "AI content analysis that surfaces actionable recommendations and predicts ranking opportunities. Track SEO performance with insights your competitors wish they had." },
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
  const [sections, globalSections] = await Promise.all([
    getSiteContent("homepage"),
    getSiteContent("global"),
  ]);

  const mobileApp = getSection<{
    enabled: boolean;
    headline: string;
    description: string;
    app_store_url: string;
    app_store_enabled: boolean;
    google_play_url: string;
    google_play_enabled: boolean;
  }>(globalSections, "mobile_app");

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
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={breadcrumbJsonLd([])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", ".editorial-headline"], "/")} />
      <JsonLd
        data={howToJsonLd(
          "How do you improve your SEO with Optic Rank?",
          "Get started with AI-powered SEO intelligence in three simple steps.",
          [
            { name: "Connect Your Properties", text: "Add your domains, connect Google Search Console, and import your keyword targets. Setup takes under 5 minutes." },
            { name: "AI Analyzes Everything", text: "Our AI continuously monitors rankings, crawls your site, watches competitors, and identifies patterns humans miss." },
            { name: "Act on Intelligence Briefs", text: "Receive daily editorial-style briefings with prioritized actions. No data overload, just clear, actionable intelligence." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "What is Optic Rank?", answer: "Optic Rank is an AI-powered SEO dashboard tool and search engine ranking software that tracks keyword rankings, monitors competitors, performs technical site audits, analyzes backlinks, and provides actionable AI insights to help grow organic traffic." },
          { question: "How much does Optic Rank cost?", answer: "Optic Rank offers a free starter plan, with paid plans starting at $29/month for small teams up to $199/month for businesses. All paid plans include a 14-day free trial with no credit card required." },
          { question: "What makes Optic Rank different from other SEO tools?", answer: "Optic Rank unifies SEO, AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and CRO (Conversion Rate Optimization) in one SEO analytics software platform, with AI content analysis that continuously surfaces actionable recommendations." },
          { question: "Does Optic Rank offer a free trial?", answer: "Yes, Optic Rank offers a free 14-day trial on all paid plans with no credit card required. You can also use the free starter plan indefinitely with limited features." },
          { question: "Is Optic Rank a keyword rank checker and website ranking tracker?", answer: "Yes. Optic Rank is a full keyword rank checker that tracks your positions daily across Google, Bing, and local search results. As a website ranking tracker, it monitors ranking changes over time, alerts you to drops, and highlights new opportunities." },
          { question: "Does Optic Rank support local SEO tools and competitor analysis?", answer: "Absolutely. Optic Rank includes local SEO tools to track location-specific rankings and Google Business Profile visibility. The built-in SEO competitor analysis tool lets you compare rankings, backlinks, and content strategies against any competitor." },
          { question: "How does AI content analysis work in Optic Rank?", answer: "Optic Rank uses AI content analysis to evaluate your pages for keyword coverage, readability, and search intent alignment. It compares your content against top-ranking competitors and provides specific recommendations to improve your search engine rankings." },
        ])}
      />

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
            {hero?.headline ?? "AI-Powered SEO Rank Tracker"}{" "}
            <span className="text-editorial-red">
              {hero?.headline_highlight ?? "& Keyword Checker"}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary md:text-2xl">
            {hero?.subheadline ??
              "The SEO rank tracker that transforms raw ranking data into editorial-grade intelligence. Check keyword positions daily, analyze competitors, audit your site, and act on AI-powered insights — your all-in-one keyword rank checker and SEO dashboard."}
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
                "The best SEO dashboard tool for every strategist"}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
              {featuresHeader?.description ??
                "Six pillars of search engine ranking software and social intelligence, sharpened by AI content analysis and unified in one SEO analytics platform."}
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
              {howItWorksHeader?.title ?? "How does Optic Rank work?"}
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

      {/* ==== WHY OPTIC RANK SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mb-16 max-w-3xl">
            <span className="editorial-label">Why Use AI for Keyword Rankings?</span>
            <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              How Optic Rank&rsquo;s SEO rank tracker works
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
              Most SEO tools give you data. Optic Rank gives you intelligence. Our AI-powered keyword rank checker goes beyond simple rank tracking
              to surface the insights that actually move the needle for organic traffic growth. Whether you are an SEO agency managing dozens of clients,
              an in-house marketer tracking your brand, or a freelancer building your portfolio, Optic Rank adapts to your workflow.
            </p>
          </div>

          <div className="grid gap-px border border-rule bg-rule md:grid-cols-2">
            <div className="bg-surface-card p-8 md:p-10">
              <h3 className="font-serif text-xl font-bold tracking-tight text-ink">Daily Keyword Rank Monitoring</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Optic Rank checks your keyword positions every day across Google, Bing, and local search results.
                Unlike tools that update weekly, our daily tracking catches ranking changes the moment they happen,
                so you can respond before traffic drops. Each keyword is tracked with full SERP feature data —
                featured snippets, People Also Ask, local packs, and AI overviews — giving you the complete picture
                of how search results are evolving for your target terms.
              </p>
            </div>
            <div className="bg-surface-card p-8 md:p-10">
              <h3 className="font-serif text-xl font-bold tracking-tight text-ink">AI-Powered Opportunity Detection</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Our AI continuously analyzes your ranking patterns to identify opportunities you would miss manually.
                It detects near-miss keywords sitting at positions 4-10 where a small improvement could capture
                significant traffic. It spots content gaps where competitors rank but you do not, and it flags
                technical issues that silently suppress your rankings. The result is a prioritized action list
                that tells you exactly what to work on next for maximum impact.
              </p>
            </div>
            <div className="bg-surface-card p-8 md:p-10">
              <h3 className="font-serif text-xl font-bold tracking-tight text-ink">Competitor Intelligence Built In</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Every ranking exists relative to your competitors. Optic Rank monitors competitor domains alongside yours,
                tracking their keyword movements, new content, and backlink acquisitions. When a competitor gains ground
                on a keyword you care about, you get alerted immediately. When they lose a position, you see the
                opportunity to take it. This is not just rank tracking — it is competitive intelligence that helps
                you make strategic decisions about where to invest your SEO resources.
              </p>
            </div>
            <div className="bg-surface-card p-8 md:p-10">
              <h3 className="font-serif text-xl font-bold tracking-tight text-ink">Technical Site Auditing</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Rankings depend on technical health. Optic Rank performs comprehensive crawl-based site audits that uncover
                issues search engines penalize: broken links, missing meta tags, slow page speeds, Core Web Vitals failures,
                crawl errors, and indexability problems. Each issue comes with a severity rating and a clear recommendation
                for how to fix it. Re-run audits after making changes to verify improvements and track your technical
                SEO progress over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==== COMPARISON TABLE SECTION ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
          <div className="mb-12 text-center">
            <span className="editorial-label">The Difference</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Manual SEO tracking vs. Optic Rank
            </h2>
            <p className="mt-4 text-lg text-ink-secondary">
              See how an AI-powered SEO dashboard replaces hours of manual work with automated intelligence.
            </p>
          </div>
          <div className="overflow-hidden border border-rule">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule bg-surface-raised">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Task</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Manual Process</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red">Optic Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                <tr className="bg-surface-card">
                  <td className="px-6 py-4 font-medium text-ink">Rank checking</td>
                  <td className="px-6 py-4 text-ink-secondary">Search each keyword individually in an incognito browser, record positions in a spreadsheet</td>
                  <td className="px-6 py-4 text-ink-secondary">Automated daily tracking across all keywords with historical trends and alerts</td>
                </tr>
                <tr className="bg-surface-card">
                  <td className="px-6 py-4 font-medium text-ink">Competitor analysis</td>
                  <td className="px-6 py-4 text-ink-secondary">Visit competitor sites one by one, compare content and backlinks manually</td>
                  <td className="px-6 py-4 text-ink-secondary">Real-time competitor monitoring with automatic change detection and gap analysis</td>
                </tr>
                <tr className="bg-surface-card">
                  <td className="px-6 py-4 font-medium text-ink">Technical auditing</td>
                  <td className="px-6 py-4 text-ink-secondary">Use multiple free tools for different checks, compile results manually</td>
                  <td className="px-6 py-4 text-ink-secondary">Full crawl-based audit with prioritized issues, severity ratings, and fix recommendations</td>
                </tr>
                <tr className="bg-surface-card">
                  <td className="px-6 py-4 font-medium text-ink">Content optimization</td>
                  <td className="px-6 py-4 text-ink-secondary">Read competitor pages, guess at keyword density, rewrite without data</td>
                  <td className="px-6 py-4 text-ink-secondary">AI-powered page optimizer with real-time scoring, keyword placement matrix, and variant generation</td>
                </tr>
                <tr className="bg-surface-card">
                  <td className="px-6 py-4 font-medium text-ink">Reporting</td>
                  <td className="px-6 py-4 text-ink-secondary">Build reports in Google Sheets or Slides every week, hours of formatting</td>
                  <td className="px-6 py-4 text-ink-secondary">Automated editorial-style intelligence briefs with actionable insights, generated in seconds</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==== WHAT IS SEO RANK TRACKING SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <div className="mb-10">
            <span className="editorial-label">SEO Fundamentals</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              What is SEO rank tracking?
            </h2>
          </div>
          <div className="prose prose-sm max-w-none text-ink-secondary">
            <p className="text-base leading-relaxed">
              SEO rank tracking is the process of monitoring where your website appears in search engine results pages (SERPs)
              for specific keywords over time. A keyword rank checker like Optic Rank automates this process by checking your
              positions daily across Google, Bing, and local search results, then recording historical data so you can spot
              trends and measure the impact of your SEO efforts.
            </p>
            <p className="mt-4 text-base leading-relaxed">
              Without an SEO rank tracker, you are flying blind. You might publish new content, optimize your pages, or build
              backlinks, but you have no way to know whether those actions actually improved your rankings. Manual rank checking —
              searching each keyword in an incognito browser — is time-consuming, inaccurate due to personalization, and impossible
              to scale beyond a handful of keywords.
            </p>
            <p className="mt-4 text-base leading-relaxed">
              Optic Rank solves this by tracking thousands of keywords automatically, alerting you to ranking changes the moment
              they happen, and using AI to identify which changes matter most for your traffic. Our keyword rank checker does not just
              tell you where you rank — it tells you what to do about it.
            </p>
          </div>
        </div>
      </section>

      {/* ==== WHO USES OPTIC RANK SECTION ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="mb-16 text-center">
            <span className="editorial-label">Built For You</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Who uses Optic Rank&rsquo;s SEO rank tracker?
            </h2>
          </div>
          <div className="grid gap-px border border-rule bg-rule md:grid-cols-3">
            <div className="bg-surface-card p-8">
              <h3 className="font-serif text-lg font-bold text-ink">SEO Agencies</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Manage keyword rankings across dozens of client domains from a single dashboard. White-label reports, automated
                alerts for ranking drops, and AI-generated action plans save hours of manual work each week. Your team focuses
                on strategy while Optic Rank handles the monitoring.
              </p>
            </div>
            <div className="bg-surface-card p-8">
              <h3 className="font-serif text-lg font-bold text-ink">In-House Marketers</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Track your brand&rsquo;s search visibility alongside competitors without juggling multiple tools. The keyword rank
                checker shows exactly which content investments are paying off and where to double down. Share clear, visual reports
                with stakeholders who need to see ROI, not raw data.
              </p>
            </div>
            <div className="bg-surface-card p-8">
              <h3 className="font-serif text-lg font-bold text-ink">Freelancers &amp; Consultants</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                Demonstrate your value to clients with before-and-after ranking data that speaks for itself. The SEO rank tracker
                runs in the background while you work on other projects, notifying you only when something needs attention. Start
                free and scale as your client base grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==== GET STARTED CTA SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Get started with your free SEO rank tracker
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            Add your domain, import your keywords, and start tracking rankings in under 5 minutes.
            No credit card required — your first 14 days are free on any plan.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
            >
              See Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      {/* ==== FAQ SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <div className="mb-12 text-center">
            <span className="editorial-label">Common Questions</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Frequently asked questions about Optic Rank
            </h2>
          </div>
          <div className="divide-y divide-rule">
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is Optic Rank?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Optic Rank is an AI-powered SEO intelligence platform that tracks keyword rankings, monitors competitors, performs technical site audits, analyzes backlinks, and provides actionable AI insights to help grow organic traffic.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">How much does Optic Rank cost?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Optic Rank offers a free starter plan, with paid plans starting at $29/month for small teams up to $199/month for businesses. All paid plans include a 14-day free trial with no credit card required.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What makes Optic Rank different from other SEO tools?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Optic Rank unifies SEO, AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and CRO (Conversion Rate Optimization) in one platform, with AI that continuously analyzes data and surfaces actionable recommendations.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">Does Optic Rank offer a free trial?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Yes, Optic Rank offers a free 14-day trial on all paid plans with no credit card required. You can also use the free starter plan indefinitely with limited features.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">Is Optic Rank a keyword rank checker and website ranking tracker?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Yes. Optic Rank is a full keyword rank checker that tracks your positions daily across Google, Bing, and local search results. As a website ranking tracker, it monitors ranking changes over time, alerts you to drops, and highlights new opportunities to improve.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">Does Optic Rank support local SEO tools and competitor analysis?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Absolutely. Optic Rank includes local SEO tools to track location-specific rankings and Google Business Profile visibility. The built-in SEO competitor analysis tool lets you compare rankings, backlinks, and content strategies against any competitor in your market.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">How does AI content analysis work in Optic Rank?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">Optic Rank uses AI content analysis to evaluate your pages for keyword coverage, readability, and search intent alignment. It compares your content against top-ranking competitors and provides specific recommendations to improve your SEO analytics and search engine rankings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==== MOBILE APP SECTION ==== */}
      {mobileApp?.enabled && (mobileApp.app_store_enabled || mobileApp.google_play_enabled) && (
        <MobileAppBanner
          headline={mobileApp.headline}
          description={mobileApp.description}
          appStoreUrl={mobileApp.app_store_enabled ? mobileApp.app_store_url : undefined}
          googlePlayUrl={mobileApp.google_play_enabled ? mobileApp.google_play_url : undefined}
        />
      )}

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
