import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { PageCta } from "@/components/editorial/page-cta";
import {
  JsonLd,
  OG_IMAGES,
  breadcrumbJsonLd,
  definitionJsonLd,
  speakableJsonLd,
} from "@/components/seo/json-ld";
import {
  getGlossaryTermBySlug,
  getRelatedGlossaryTerms,
  getPublishedGlossaryTerms,
} from "@/lib/dal/admin";

interface PageProps {
  params: Promise<{ term: string }>;
}

export async function generateStaticParams() {
  const terms = await getPublishedGlossaryTerms();
  return terms.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { term: slug } = await params;
  const entry = await getGlossaryTermBySlug(slug);
  if (!entry) return {};

  return {
    title: `What is ${entry.term}? — SEO Glossary`,
    description: entry.short_definition,
    alternates: { canonical: `/glossary/${entry.slug}` },
    openGraph: {
      title: `What is ${entry.term}? — SEO Glossary`,
      description: entry.short_definition,
      images: OG_IMAGES,
    },
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  "technical-seo": "Technical SEO",
  "on-page-seo": "On-Page SEO",
  "off-page-seo": "Off-Page SEO",
  "content-marketing": "Content Marketing",
  "link-building": "Link Building",
  "ai-search": "AI Search",
  analytics: "Analytics",
  general: "General",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-editorial-green border-editorial-green/30",
  intermediate: "text-editorial-gold border-editorial-gold/30",
  advanced: "text-editorial-red border-editorial-red/30",
};

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term: slug } = await params;
  const entry = await getGlossaryTermBySlug(slug);
  if (!entry) notFound();

  const relatedSlugs = (entry.related_terms as string[]) ?? [];
  const relatedTerms = await getRelatedGlossaryTerms(relatedSlugs);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Glossary", path: "/glossary" },
          { name: entry.term, path: `/glossary/${entry.slug}` },
        ])}
      />
      <JsonLd data={definitionJsonLd(entry.term, entry.short_definition)} />
      <JsonLd
        data={speakableJsonLd(["h1", "h2", "p"], `/glossary/${entry.slug}`)}
      />

      {/* Header */}
      <section className="border-b-4 border-double border-rule-dark">
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-16 md:pb-16 md:pt-20">
          <Link
            href="/glossary"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            Back to Glossary
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              {CATEGORY_LABELS[entry.category] ?? entry.category}
            </span>
            <span
              className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                DIFFICULTY_COLORS[entry.difficulty] ?? "text-ink-muted"
              }`}
            >
              {entry.difficulty}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
            {entry.term}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-secondary">
            {entry.short_definition}
          </p>
        </div>
      </section>

      {/* Full Explanation */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
          <div className="flex items-center gap-2">
            <BookOpen size={18} strokeWidth={1.5} className="text-editorial-red" />
            <span className="editorial-label">In Depth</span>
          </div>
          <h2 className="mt-3 font-serif text-2xl font-bold text-ink">
            Understanding {entry.term}
          </h2>
          <div className="mt-6 text-sm leading-relaxed text-ink-secondary">
            {entry.full_explanation.split("\n").map((paragraph: string, i: number) => (
              <p key={i} className="mt-4 first:mt-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Related Terms */}
      {relatedTerms.length > 0 && (
        <section className="border-b border-rule bg-surface-card">
          <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
            <span className="editorial-label">Related Terms</span>
            <h2 className="mt-3 font-serif text-2xl font-bold text-ink">
              Keep learning
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {relatedTerms.map((related) => (
                <Link
                  key={related.slug}
                  href={`/glossary/${related.slug}`}
                  className="group flex items-start justify-between border border-rule bg-surface-cream p-4 transition-colors hover:border-editorial-red"
                >
                  <div>
                    <h3 className="font-serif text-base font-bold text-ink group-hover:text-editorial-red">
                      {related.term}
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">
                      {related.short_definition}
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-editorial-red"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PageCta
        headline={`Track ${entry.term.toLowerCase()} and more with Optic Rank`}
        description="Get AI-powered SEO intelligence that puts glossary knowledge into actionable insights."
      />
    </>
  );
}
