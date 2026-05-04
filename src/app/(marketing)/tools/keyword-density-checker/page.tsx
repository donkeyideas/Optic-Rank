import type { Metadata } from "next";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { KeywordDensityCheckerTool } from "../_components/keyword-density-checker";

export const metadata: Metadata = {
  title: "Free Keyword Density Checker — Analyze Content Optimization",
  description:
    "Check keyword density for any URL or text. Analyze 1-gram, 2-gram, and 3-gram frequencies to optimize your content for search engines. Free, no signup required.",
  alternates: { canonical: "/tools/keyword-density-checker" },
  openGraph: {
    title: "Free Keyword Density Checker — Analyze Content Optimization",
    description: "Analyze keyword density and content optimization for any webpage or text. Free SEO tool.",
    images: OG_IMAGES,
  },
};

const FAQS = [
  { question: "What is keyword density?", answer: "Keyword density is the percentage of times a keyword or phrase appears on a page relative to the total word count. For example, if a 1,000-word article mentions 'SEO tools' 15 times, the keyword density is 1.5%. It helps identify over-optimization (keyword stuffing) and under-optimization." },
  { question: "What is the ideal keyword density?", answer: "There's no perfect number, but most SEO experts recommend 1-2% for primary keywords. More important than density is natural usage, semantic variations, and topical coverage. Over 3% may signal keyword stuffing to search engines." },
  { question: "What are n-grams?", answer: "N-grams are sequences of N words. 1-grams (unigrams) are single words, 2-grams (bigrams) are two-word phrases, and 3-grams (trigrams) are three-word phrases. Analyzing multi-word phrases helps identify your content's key topics and themes." },
  { question: "Can I analyze a competitor's page?", answer: "Yes. Enter any public URL to analyze its keyword density. This is useful for understanding what keywords competitors are targeting and how they structure their content." },
];

export default function KeywordDensityCheckerPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Free Tools", path: "/tools" },
          { name: "Keyword Density Checker", path: "/tools/keyword-density-checker" },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="editorial-label">Free Tool</span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
              Keyword Density Checker
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              Analyze keyword frequency for any URL or pasted text. Identify 1-gram, 2-gram, and 3-gram patterns to optimize your content strategy.
            </p>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <KeywordDensityCheckerTool />
        </div>
      </section>

      {/* Educational Content */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <span className="editorial-label">Content Optimization</span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            How to use keyword density analysis
          </h2>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <p>
              Keyword density analysis helps you understand how your content is structured from a search engine's perspective. While modern SEO has moved beyond simple keyword counting, density analysis remains a useful diagnostic tool.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Avoid Keyword Stuffing</h3>
            <p>
              If your primary keyword appears at more than 3% density, search engines may flag it as keyword stuffing. This can lead to ranking penalties. Use this tool to ensure your keyword usage feels natural and varies with synonyms and related terms.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Discover Content Themes</h3>
            <p>
              The 2-gram and 3-gram analysis reveals the key topics and themes in your content. Compare this against your target keywords to ensure your content actually focuses on the right topics. Often, content drifts from its intended focus.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Competitor Content Analysis</h3>
            <p>
              Run this analysis on competitor pages that rank well for your target keywords. Understanding their keyword usage patterns helps you create content that covers the same topics more thoroughly while maintaining natural language.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Content Gaps</h3>
            <p>
              If an important keyword doesn't appear in your density results, your content may not adequately cover that topic. Add relevant sections or paragraphs that naturally incorporate missing keywords and related concepts.
            </p>
          </div>
        </div>
      </section>

      <FaqSection faqs={FAQS} headline="Keyword density — common questions" />

      <PageCta
        headline="Want AI-powered content optimization?"
        description="Optic Rank's AI analyzes your content against top-ranking competitors and provides specific recommendations to improve rankings."
      />
    </>
  );
}
