import type { Metadata } from "next";
import { PageHero } from "@/components/editorial/page-hero";
import { PageCta } from "@/components/editorial/page-cta";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPublishedGlossaryTerms } from "@/lib/dal/admin";
import { GlossarySearch } from "./_components/glossary-search";

export const metadata: Metadata = {
  title: "SEO Glossary — 50+ SEO Terms Defined",
  description:
    "Learn SEO terminology with our comprehensive glossary. Clear definitions and explanations for technical SEO, on-page SEO, link building, AI search, and analytics terms.",
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "SEO Glossary — 50+ SEO Terms Defined",
    description:
      "Comprehensive SEO glossary with clear definitions. From backlinks to Core Web Vitals — every term explained.",
    images: OG_IMAGES,
  },
};

export default async function GlossaryPage() {
  const terms = await getPublishedGlossaryTerms();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Glossary", path: "/glossary" }])}
      />

      <PageHero
        label="SEO Glossary"
        headline="Every SEO Term, Defined"
        description="A comprehensive glossary of SEO terminology — from technical fundamentals to AI search optimization. Clear definitions written for practitioners, not textbooks."
        ctaPrimary={{ text: "Start Free Trial", href: "/signup" }}
        ctaSecondary={{ text: "View Features", href: "/features" }}
      />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <GlossarySearch
            terms={terms.map((t) => ({
              term: t.term,
              slug: t.slug,
              short_definition: t.short_definition,
              category: t.category,
            }))}
          />
        </div>
      </section>

      <PageCta
        headline="Put SEO knowledge into action"
        description="Optic Rank tracks everything in this glossary — keywords, backlinks, Core Web Vitals, AI visibility, and more — in one platform."
      />
    </>
  );
}
