import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  Link2,
  Shield,
  Users,
  Sparkles,
  Smartphone,
  FileText,
  Eye,
  TrendingUp,
  Zap,
  ArrowRight,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSiteContent } from "@/lib/dal/admin";
import { JsonLd, breadcrumbJsonLd, faqJsonLd, speakableJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "All SEO & Social Intelligence Features",
  description:
    "Keyword tracking, site audits, backlink monitoring, competitor analysis, AI visibility, and app store optimization. All in one platform.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "All SEO & Social Intelligence Features",
    description:
      "Explore Optic Rank's complete feature set for modern SEO and social media intelligence.",
  },
};

/* ── Icon Map ──────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  Search, Link2, Shield, Users, Sparkles, Smartphone, FileText, Eye, TrendingUp, Share2,
};

/* ── Helpers ───────────────────────────────────────────────────── */

function getSection<T>(sections: { section: string; content: unknown }[], key: string): T | null {
  const row = sections.find((s) => s.section === key);
  return row ? (row.content as T) : null;
}

/* ── Types ─────────────────────────────────────────────────────── */

interface FeatureSection {
  icon: string;
  title: string;
  description: string;
  capabilities: string[];
  badge?: string | null;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default async function FeaturesPage() {
  const sections = await getSiteContent("features");

  const hero = getSection<{
    label: string;
    headline: string;
    description: string;
    cta_primary?: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "hero");

  const featureSections = getSection<FeatureSection[]>(sections, "sections") ?? [];

  const cta = getSection<{
    headline: string;
    description: string;
    cta_primary?: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "cta");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Features", path: "/features" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "p"], "/features")} />
      <JsonLd
        data={faqJsonLd([
          { question: "What features does Optic Rank include?", answer: "Optic Rank includes keyword rank tracking, competitor analysis, technical site audits, backlink monitoring, AI-powered insights, content optimization, app store optimization, and social media intelligence — all in one platform." },
          { question: "How does AI-powered keyword tracking work?", answer: "Optic Rank tracks your keywords daily across search engines, monitors SERP features, and uses AI to identify ranking opportunities and predict trends before your competitors see them." },
          { question: "Can Optic Rank monitor competitors?", answer: "Yes. Optic Rank provides real-time competitor surveillance including ranking changes, new content detection, backlink acquisitions, and strategic shift alerts." },
          { question: "Does Optic Rank include site audit capabilities?", answer: "Optic Rank runs comprehensive crawl-based technical audits covering broken links, thin content, Core Web Vitals, indexability issues, and mobile optimization." },
          { question: "What social media platforms does Optic Rank support?", answer: "Optic Rank provides AI-powered analytics for Instagram, TikTok, YouTube, Twitter/X, and LinkedIn with earnings forecasts, growth strategies, and content optimization." },
        ])}
      />

      {/* ==== HERO SECTION ==== */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="editorial-label">
              {hero?.label ?? "Platform Overview"}
            </span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl lg:text-7xl">
              {hero?.headline ?? "The Complete SEO Intelligence Platform"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {hero?.description ??
                "Nine powerful modules unified by AI, presented with editorial clarity. From keyword tracking to AI visibility -- everything your SEO strategy needs in one place."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href={hero?.cta_primary?.href ?? "/signup"}
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                {hero?.cta_primary?.text ?? "Start Free Trial"}
              </Link>
              <Link
                href={hero?.cta_secondary?.href ?? "/pricing"}
                className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
              >
                {hero?.cta_secondary?.text ?? "View Pricing"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==== FEATURE SECTIONS (alternating layout) ==== */}
      {featureSections.map((feature, index) => {
        const Icon = ICON_MAP[feature.icon] ?? Search;
        const isEven = index % 2 === 1;
        const sectionBg = isEven ? "bg-surface-card" : "";

        return (
          <section
            key={feature.title}
            className={`border-b border-rule ${sectionBg}`}
          >
            <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
              <div
                className={`flex flex-col gap-12 md:items-center lg:gap-16 ${
                  isEven ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                {/* Text Content */}
                <div className="flex-1">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                      <Icon size={22} strokeWidth={1.5} className="text-editorial-red" />
                    </div>
                    {feature.badge && (
                      <Badge variant="danger">{feature.badge}</Badge>
                    )}
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                    Feature {String(index + 1).padStart(2, "0")}
                  </span>

                  <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                    {feature.title}
                  </h2>

                  <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                    {feature.description}
                  </p>

                  <div className="mt-6">
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Key Capabilities
                    </h4>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {feature.capabilities.map((cap) => (
                        <li key={cap} className="flex items-start gap-2">
                          <ArrowRight
                            size={12}
                            strokeWidth={2}
                            className="mt-1 shrink-0 text-editorial-red"
                          />
                          <span className="text-sm text-ink-secondary">{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Image Placeholder */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex h-72 w-full items-center justify-center border-2 border-dashed border-rule bg-surface-raised md:h-80 lg:h-96">
                    <div className="text-center">
                      <Icon size={36} strokeWidth={1} className="mx-auto text-ink-muted" />
                      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                        Screenshot Coming Soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ==== BOTTOM CTA SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">
                Ready to Transform Your SEO?
              </span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {cta?.headline ?? "Every tool, one platform, powered by AI"}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-ink-secondary">
              {cta?.description ??
                "Join thousands of SEO professionals who trust Optic Rank. Free 14-day trial, no credit card required."}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href={cta?.cta_primary?.href ?? "/signup"}
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                {cta?.cta_primary?.text ?? "Start Your Free Trial"}
              </Link>
              <Link
                href={cta?.cta_secondary?.href ?? "/pricing"}
                className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
              >
                {cta?.cta_secondary?.text ?? "Compare Plans"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
