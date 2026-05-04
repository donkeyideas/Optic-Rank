import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Target, Lightbulb, BarChart3 } from "lucide-react";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd, speakableJsonLd } from "@/components/seo/json-ld";
import { INDUSTRIES } from "../_data/industries";

interface PageProps {
  params: Promise<{ industry: string }>;
}

export function generateStaticParams() {
  return INDUSTRIES.map((ind) => ({ industry: ind.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { industry } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === industry);
  if (!ind) return {};

  return {
    title: ind.metaTitle,
    description: ind.metaDescription,
    alternates: { canonical: `/seo-for/${ind.slug}` },
    openGraph: {
      title: ind.metaTitle,
      description: ind.metaDescription,
      images: OG_IMAGES,
    },
  };
}

export default async function IndustryDetailPage({ params }: PageProps) {
  const { industry } = await params;
  const ind = INDUSTRIES.find((i) => i.slug === industry);
  if (!ind) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "SEO by Industry", path: "/seo-for" },
          { name: ind.name, path: `/seo-for/${ind.slug}` },
        ])}
      />
      <JsonLd data={speakableJsonLd(["h1", "h2", "p"], `/seo-for/${ind.slug}`)} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/seo-for"
              className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} />
              All Industries
            </Link>
            <span className="editorial-label block">{ind.name}</span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
              {ind.heroHeadline}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              {ind.heroDescription}
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
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-px">
          {ind.stats.map((stat) => (
            <div key={stat.label} className="px-6 py-8 text-center">
              <p className="font-serif text-3xl font-bold text-editorial-red md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-ink-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Challenges */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Challenges</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              {ind.name} SEO challenges
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {ind.challenges.map((challenge, i) => (
              <div key={challenge.title} className="border border-rule p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
                  <Target size={18} strokeWidth={1.5} className="text-editorial-red" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                  Challenge {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-serif text-lg font-bold text-ink">
                  {challenge.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {challenge.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">How Optic Rank Helps</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              AI-powered solutions for {ind.name.toLowerCase()}
            </h2>
          </div>
          <div className="space-y-6">
            {ind.solutions.map((sol, i) => (
              <div
                key={sol.feature}
                className="flex gap-6 border-l-2 border-rule pl-6"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-red text-xs font-bold text-white">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {sol.feature}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                    {sol.benefit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Link */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
          <div className="flex items-center justify-center gap-3">
            <Lightbulb size={20} strokeWidth={1.5} className="text-editorial-gold" />
            <span className="editorial-label">Explore the Platform</span>
          </div>
          <h2 className="mt-6 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            See all features for {ind.name.toLowerCase()}
          </h2>
          <p className="mt-4 text-lg text-ink-secondary">
            Optic Rank includes keyword tracking, site audits, backlink monitoring,
            AI visibility, social intelligence, and more — all in one platform.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-editorial-red transition-colors hover:text-editorial-red/80"
            >
              View All Features
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
            <Link
              href="/search-ai"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-secondary transition-colors hover:text-ink"
            >
              Search & AI Platform
              <ArrowRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={ind.faqs}
        headline={`${ind.name} SEO — common questions`}
      />

      <PageCta
        headline={`Ready to grow your ${ind.name.toLowerCase()} SEO?`}
        description="Start your free trial today. No credit card required."
      />
    </>
  );
}
