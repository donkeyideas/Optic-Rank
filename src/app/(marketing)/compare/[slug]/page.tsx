import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { ComparisonTable } from "@/components/editorial/comparison-table";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { COMPETITORS } from "../_data/competitors";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const comp = COMPETITORS.find((c) => c.slug === slug);
  if (!comp) return {};

  return {
    title: comp.metaTitle,
    description: comp.metaDescription,
    alternates: { canonical: `/compare/${comp.slug}` },
    openGraph: {
      title: comp.metaTitle,
      description: comp.metaDescription,
      images: OG_IMAGES,
    },
  };
}

export default async function ComparisonDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const comp = COMPETITORS.find((c) => c.slug === slug);
  if (!comp) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Compare", path: "/compare" },
          { name: `vs ${comp.name}`, path: `/compare/${comp.slug}` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/compare"
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} />
              All Comparisons
            </Link>
            <span className="editorial-label block">{comp.tagline}</span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
              Optic Rank vs {comp.name}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {comp.heroDescription}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                Try Optic Rank Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Feature Comparison</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Feature-by-feature breakdown
            </h2>
          </div>
          <div className="border border-rule">
            <ComparisonTable
              columns={["Optic Rank", comp.name]}
              rows={comp.features.map((f) => ({
                feature: f.feature,
                values: [f.opticrank, f.competitor],
              }))}
              highlightColumn={0}
            />
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Pricing</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              How pricing compares
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border-2 border-editorial-red p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
                Optic Rank
              </p>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">
                {comp.pricing.opticrank}
              </p>
              <ul className="mt-4 space-y-2">
                {comp.prosOpticRank.slice(0, 4).map((pro) => (
                  <li key={pro} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-editorial-green" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-rule p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                {comp.name}
              </p>
              <p className="mt-2 font-serif text-2xl font-bold text-ink">
                {comp.pricing.competitor}
              </p>
              <ul className="mt-4 space-y-2">
                {comp.prosCompetitor.slice(0, 4).map((pro) => (
                  <li key={pro} className="flex items-start gap-2 text-sm text-ink-secondary">
                    <Check size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-muted" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-ink-secondary">
            {comp.pricing.note}
          </p>
        </div>
      </section>

      {/* Pros Breakdown */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Pros</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Strengths of each platform
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 font-serif text-xl font-bold text-editorial-red">
                Why choose Optic Rank
              </h3>
              <ul className="space-y-3">
                {comp.prosOpticRank.map((pro) => (
                  <li key={pro} className="flex items-start gap-2.5">
                    <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-editorial-green" />
                    <span className="text-sm leading-relaxed text-ink-secondary">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-serif text-xl font-bold text-ink">
                Why choose {comp.name}
              </h3>
              <ul className="space-y-3">
                {comp.prosCompetitor.map((pro) => (
                  <li key={pro} className="flex items-start gap-2.5">
                    <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-muted" />
                    <span className="text-sm leading-relaxed text-ink-secondary">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="border-l-4 border-editorial-red pl-6">
            <span className="editorial-label">Our Verdict</span>
            <h2 className="mt-3 font-serif text-2xl font-bold text-ink md:text-3xl">
              The bottom line
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-secondary">
              {comp.verdict}
            </p>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={comp.faqs}
        headline={`Optic Rank vs ${comp.name} — common questions`}
      />

      <PageCta
        headline={`Ready to try a better alternative to ${comp.name}?`}
        description="Start your free trial today. No credit card required."
      />
    </>
  );
}
