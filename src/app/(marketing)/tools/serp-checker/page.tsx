import type { Metadata } from "next";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { SerpCheckerTool } from "../_components/serp-checker";

export const metadata: Metadata = {
  title: "Free SERP Checker — Research Keywords & Search Results",
  description:
    "Check search volume, keyword difficulty, CPC, and intent for any keyword. Research SERP competition for free — no signup required.",
  alternates: { canonical: "/tools/serp-checker" },
  openGraph: {
    title: "Free SERP Checker — Research Keywords & Search Results",
    description: "Research any keyword's search volume, difficulty, CPC, and intent. Free SERP analysis tool.",
    images: OG_IMAGES,
  },
};

const FAQS = [
  { question: "What does the SERP checker show?", answer: "It provides estimated search volume (monthly searches), CPC (cost per click for ads), keyword difficulty (competition level out of 100), search intent classification (informational, commercial, transactional, or navigational), and related keyword suggestions." },
  { question: "How accurate are the estimates?", answer: "Without a DataForSEO connection, metrics are estimated based on keyword patterns and heuristics. For precise, live data, sign up for Optic Rank and connect your DataForSEO credentials. The free estimates provide a useful directional indication for keyword research." },
  { question: "What is keyword difficulty?", answer: "Keyword difficulty is a score from 0-100 indicating how hard it would be to rank in the top 10 for that keyword. Scores under 30 are considered easy (good for new sites), 30-60 are medium (requires quality content and some authority), and 60+ are hard (requires strong domain authority and comprehensive content)." },
  { question: "What is search intent?", answer: "Search intent is the goal behind a user's search query. Informational intent means the user wants to learn something. Commercial intent means they're researching before buying. Transactional intent means they're ready to purchase. Navigational intent means they're looking for a specific website or page." },
];

export default function SerpCheckerPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Free Tools", path: "/tools" },
          { name: "SERP Checker", path: "/tools/serp-checker" },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="editorial-label">Free Tool</span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
              SERP Checker
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              Research any keyword to see search volume, difficulty, CPC, and intent. Discover related keywords and understand the competitive landscape.
            </p>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <SerpCheckerTool />
        </div>
      </section>

      {/* Educational Content */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <span className="editorial-label">Keyword Research</span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            How to use SERP data for keyword strategy
          </h2>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <p>
              Understanding SERP data is the foundation of any keyword strategy. Search volume tells you demand, difficulty tells you competition, CPC reveals commercial value, and intent tells you what content to create.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Find Low-Competition Keywords</h3>
            <p>
              The best keyword opportunities have decent search volume (100+ monthly searches) with low difficulty (under 30). These are keywords where you can realistically rank in the top 10 without massive authority or backlink investments.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Understand Commercial Value</h3>
            <p>
              CPC (cost per click) indicates how much advertisers pay for that keyword. High CPC keywords have strong commercial intent — people searching for them are often ready to buy. Ranking organically for high-CPC keywords delivers exceptional ROI.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Match Content to Intent</h3>
            <p>
              Creating content that matches search intent is critical for ranking. Informational keywords need educational content (guides, tutorials, explainers). Commercial keywords need comparison and review content. Transactional keywords need product and pricing pages.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Build Keyword Clusters</h3>
            <p>
              Use related keyword suggestions to build topic clusters. Group related keywords together and create comprehensive content that covers the entire topic. This signals topical authority to search engines and helps you rank for multiple keywords with a single piece of content.
            </p>
          </div>
        </div>
      </section>

      <FaqSection faqs={FAQS} headline="SERP checker — common questions" />

      <PageCta
        headline="Need daily keyword tracking?"
        description="Optic Rank tracks your keywords daily with AI-powered predictions, competitor alerts, and SERP feature monitoring."
      />
    </>
  );
}
