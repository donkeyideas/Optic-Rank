import Link from "next/link";
import type { Metadata } from "next";
import {
  Search,
  MessageSquare,
  Brain,
  Target,
  ArrowRight,
  Zap,
  Check,
} from "lucide-react";
import { getSiteContent } from "@/lib/dal/admin";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd, faqJsonLd, speakableJsonLd, howToJsonLd } from "@/components/seo/json-ld";

/* ── SEO Meta ──────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: "SEO, AEO, GEO & CRO Strategy",
  description:
    "Master all four pillars of modern search: SEO for rankings, AEO for snippets, GEO for AI citations, and CRO for conversions.",
  alternates: { canonical: "/search-ai" },
  openGraph: {
    title: "SEO, AEO, GEO & CRO Strategy",
    description:
      "Master all four pillars of modern search: SEO for rankings, AEO for answer snippets, GEO for AI citations, and CRO for conversions.",
    images: OG_IMAGES,
  },
};

/* ── Icon Map ──────────────────────────────────────────────────── */

const PILLAR_ICONS = {
  seo: Search,
  aeo: MessageSquare,
  geo: Brain,
  cro: Target,
} as const;

const PILLAR_COLORS = {
  seo: "text-editorial-red",
  aeo: "text-editorial-gold",
  geo: "text-editorial-green",
  cro: "text-ink",
} as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getSection<T>(sections: { section: string; content: unknown }[], key: string): T | null {
  const row = sections.find((s) => s.section === key);
  return row ? (row.content as T) : null;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default async function SearchAIPage() {
  const sections = await getSiteContent("search-ai");

  // Extract section content with fallbacks
  const hero = getSection<{
    label?: string;
    headline: string;
    headline_highlight?: string;
    description: string;
  }>(sections, "hero");

  const pillars = getSection<
    { key: string; label: string; name: string; definition: string }[]
  >(sections, "pillars");

  const seo = getSection<{
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    stat_value: string;
    stat_label: string;
  }>(sections, "seo");

  const aeo = getSection<{
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    stat_value: string;
    stat_label: string;
  }>(sections, "aeo");

  const geo = getSection<{
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    stat_value: string;
    stat_label: string;
  }>(sections, "geo");

  const cro = getSection<{
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    stat_value: string;
    stat_label: string;
  }>(sections, "cro");

  const unified = getSection<{
    label: string;
    headline: string;
    description: string;
  }>(sections, "unified");

  const cta = getSection<{
    headline: string;
    description: string;
    cta_primary: { text: string; href: string };
    cta_secondary?: { text: string; href: string };
  }>(sections, "cta");

  const pillarSections = [
    { key: "seo" as const, data: seo },
    { key: "aeo" as const, data: aeo },
    { key: "geo" as const, data: geo },
    { key: "cro" as const, data: cro },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Search & AI", path: "/search-ai" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "p"], "/search-ai")} />
      <JsonLd
        data={howToJsonLd(
          "How to optimize for SEO, AEO, GEO, and CRO",
          "Master all four pillars of modern search visibility with this step-by-step approach.",
          [
            { name: "Optimize for traditional search (SEO)", text: "Research keywords, optimize on-page elements, build quality backlinks, and ensure your site is technically sound for search engine crawlers." },
            { name: "Optimize for answer engines (AEO)", text: "Structure content to directly answer questions using lists, tables, and concise definitions that search engines can extract for featured snippets and People Also Ask boxes." },
            { name: "Optimize for AI search engines (GEO)", text: "Create authoritative, well-cited content with proper schema markup so AI-powered engines like ChatGPT, Gemini, and Perplexity cite your pages." },
            { name: "Optimize for conversions (CRO)", text: "Improve page speed, refine calls-to-action, and optimize landing page design to convert organic visitors into customers." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "What is SEO?", answer: "SEO (Search Engine Optimization) is the practice of optimizing websites to rank higher in search engine results pages. It involves keyword research, on-page optimization, technical improvements, and link building to increase organic traffic." },
          { question: "What is AEO (Answer Engine Optimization)?", answer: "AEO optimizes content to appear in featured snippets, People Also Ask boxes, knowledge panels, and voice search results. It focuses on directly answering user questions in structured formats that search engines can extract." },
          { question: "What is GEO (Generative Engine Optimization)?", answer: "GEO is the strategy of optimizing content to be cited by AI-powered search engines like ChatGPT, Gemini, and Perplexity. It focuses on authoritative, well-structured content with proper schema markup for AI discoverability." },
          { question: "What is CRO (Conversion Rate Optimization)?", answer: "CRO focuses on converting search traffic into customers. It involves optimizing page load speed, calls-to-action, user experience, and landing page design to maximize the value of every visitor from organic search." },
          { question: "How do SEO, AEO, GEO, and CRO work together?", answer: "The four pillars form a complete search visibility strategy. SEO drives rankings, AEO captures featured snippets, GEO ensures AI citations, and CRO converts that traffic into revenue. Optic Rank unifies all four in one platform." },
        ])}
      />

      {/* ==================================================================
          HERO SECTION
          ================================================================== */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            {hero?.label && <span className="editorial-label">{hero.label}</span>}
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl lg:text-7xl">
              {hero?.headline ?? "What are the four pillars of search visibility?"}{" "}
              {hero?.headline_highlight && (
                <span className="text-editorial-red">{hero.headline_highlight}</span>
              )}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {hero?.description ??
                "Search has evolved beyond ten blue links. Today, winning requires mastery of four interconnected strategies."}
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================================
          4-PILLAR OVERVIEW STRIP
          ================================================================== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-px border-x border-rule bg-rule md:grid-cols-4">
            {(pillars ?? []).map((pillar) => {
              const Icon = PILLAR_ICONS[pillar.key as keyof typeof PILLAR_ICONS] ?? Search;
              const color = PILLAR_COLORS[pillar.key as keyof typeof PILLAR_COLORS] ?? "text-ink";
              return (
                <div key={pillar.key} className="flex flex-col items-center gap-3 bg-surface-card px-6 py-8">
                  <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                    <Icon size={22} strokeWidth={1.5} className={color} />
                  </div>
                  <span className="font-serif text-2xl font-bold tracking-tight text-ink">
                    {pillar.label}
                  </span>
                  <p className="text-center text-xs font-medium text-ink-secondary">
                    {pillar.name}
                  </p>
                  <p className="text-center text-[10px] text-ink-muted">
                    {pillar.definition}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================================
          PILLAR SECTIONS (alternating layout)
          ================================================================== */}
      {pillarSections.map(({ key, data }, index) => {
        if (!data) return null;
        const Icon = PILLAR_ICONS[key];
        const color = PILLAR_COLORS[key];
        const isEven = index % 2 === 1;

        return (
          <section
            key={key}
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
                      {key.toUpperCase()}
                    </span>
                  </div>

                  <h2 className="font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                    {data.title}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-ink-muted">
                    {data.subtitle}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-ink-secondary">
                    {data.description}
                  </p>

                  {/* Feature list */}
                  <ul className="mt-6 space-y-2">
                    {data.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="mt-0.5 shrink-0 text-editorial-green"
                        />
                        <span className="text-sm text-ink-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stat card */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex h-64 w-full flex-col items-center justify-center border-2 border-rule bg-surface-raised p-8">
                    <span className={`font-serif text-6xl font-bold tracking-tight ${color} md:text-7xl`}>
                      {data.stat_value}
                    </span>
                    <p className="mt-4 max-w-xs text-center text-sm text-ink-secondary">
                      {data.stat_label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ==================================================================
          UNIFIED SECTION
          ================================================================== */}
      {unified && (
        <section className="border-b border-rule">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="editorial-label">{unified.label}</span>
              <h2 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
                {unified.headline}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-secondary">
                {unified.description}
              </p>

              {/* 4-pillar flow diagram */}
              <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-0">
                {(["SEO", "AEO", "GEO", "CRO"] as const).map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-card font-serif text-sm font-bold text-ink">
                      {label}
                    </span>
                    {i < 3 && (
                      <ArrowRight
                        size={16}
                        strokeWidth={1.5}
                        className="hidden text-ink-muted sm:block"
                      />
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <ArrowRight
                    size={16}
                    strokeWidth={1.5}
                    className="hidden text-ink-muted sm:block"
                  />
                  <span className="flex h-12 items-center justify-center border-2 border-editorial-red bg-editorial-red/5 px-4 font-serif text-sm font-bold text-editorial-red">
                    Results
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================
          FAQ SECTION
          ================================================================== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Common Questions</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Frequently asked questions about search strategy
            </h2>
          </div>
          <div className="divide-y divide-rule">
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is SEO?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">SEO (Search Engine Optimization) is the practice of optimizing websites to rank higher in search engine results pages. It involves keyword research, on-page optimization, technical improvements, and link building to increase organic traffic.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is AEO (Answer Engine Optimization)?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">AEO optimizes content to appear in featured snippets, People Also Ask boxes, knowledge panels, and voice search results. It focuses on directly answering user questions in structured formats that search engines can extract.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is GEO (Generative Engine Optimization)?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">GEO is the strategy of optimizing content to be cited by AI-powered search engines like ChatGPT, Gemini, and Perplexity. It focuses on authoritative, well-structured content with proper schema markup for AI discoverability.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">What is CRO (Conversion Rate Optimization)?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">CRO focuses on converting search traffic into customers. It involves optimizing page load speed, calls-to-action, user experience, and landing page design to maximize the value of every visitor from organic search.</p>
            </div>
            <div className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">How do SEO, AEO, GEO, and CRO work together?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">The four pillars form a complete search visibility strategy. SEO drives rankings, AEO captures featured snippets, GEO ensures AI citations, and CRO converts that traffic into revenue. Optic Rank unifies all four in one platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================
          BOTTOM CTA
          ================================================================== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">Get Started</span>
            </div>

            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              {cta?.headline ?? "Ready to master all four pillars?"}
            </h2>

            <p className="mt-4 max-w-xl text-lg text-ink-secondary">
              {cta?.description ??
                "Start your 14-day free trial and see how Optic Rank unifies SEO, AEO, GEO, and CRO intelligence in one platform."}
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
