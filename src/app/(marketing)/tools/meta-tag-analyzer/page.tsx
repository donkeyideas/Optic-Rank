import type { Metadata } from "next";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { MetaTagAnalyzerTool } from "../_components/meta-tag-analyzer";

export const metadata: Metadata = {
  title: "Free Meta Tag Analyzer — Check SEO Tags Instantly",
  description:
    "Analyze any webpage's meta tags, Open Graph tags, structured data, and SEO score for free. Get instant recommendations to improve your on-page SEO.",
  alternates: { canonical: "/tools/meta-tag-analyzer" },
  openGraph: {
    title: "Free Meta Tag Analyzer — Check SEO Tags Instantly",
    description: "Analyze meta tags, OG tags, and structured data for any URL. Free, no signup required.",
    images: OG_IMAGES,
  },
};

const FAQS = [
  { question: "What does the meta tag analyzer check?", answer: "It analyzes title tags (length and presence), meta descriptions, canonical URLs, H1 tags, Open Graph tags (title, description, image, type), Twitter Card tags, structured data (JSON-LD), word count, and robots directives. You get a score out of 100 with specific issues listed." },
  { question: "Is the analysis accurate?", answer: "Yes. The tool fetches and parses the actual HTML of the page in real-time. What you see is exactly what search engines see when they crawl your page." },
  { question: "How often should I check my meta tags?", answer: "Check after every major content update, redesign, or CMS migration. For ongoing monitoring, Optic Rank's full platform includes automated site audits that check meta tags and 100+ other SEO factors daily." },
  { question: "What is a good SEO score?", answer: "80-100 is excellent — your on-page SEO basics are solid. 50-79 means there are optimization opportunities. Below 50 indicates critical issues that should be fixed immediately." },
];

export default function MetaTagAnalyzerPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Free Tools", path: "/tools" },
          { name: "Meta Tag Analyzer", path: "/tools/meta-tag-analyzer" },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="editorial-label">Free Tool</span>
            <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
              Meta Tag Analyzer
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
              Enter any URL to analyze its title tag, meta description, Open Graph tags, structured data, and more. Get an instant SEO score with actionable recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <MetaTagAnalyzerTool />
        </div>
      </section>

      {/* Educational Content */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <span className="editorial-label">Why Meta Tags Matter</span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            The foundation of on-page SEO
          </h2>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <p>
              Meta tags are HTML elements that provide search engines with information about your page. They directly influence how your page appears in search results, social media shares, and AI-generated summaries.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Title Tags</h3>
            <p>
              The title tag is the single most important on-page SEO element. It appears as the clickable headline in search results and should be 30-60 characters, include your target keyword, and be compelling enough to earn clicks. A well-crafted title tag can improve click-through rates by 20-30%.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Meta Descriptions</h3>
            <p>
              While meta descriptions don't directly affect rankings, they influence click-through rates. Google displays them as the snippet below your title in search results. Keep them between 70-160 characters and include a clear value proposition with a call to action.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Open Graph Tags</h3>
            <p>
              Open Graph tags control how your page appears when shared on social media platforms like Facebook, LinkedIn, and Twitter. Without proper OG tags, social platforms will guess what image and text to display — often with poor results.
            </p>
            <h3 className="font-serif text-lg font-bold text-ink">Structured Data</h3>
            <p>
              Structured data (JSON-LD) helps search engines understand your content's context. It enables rich results like FAQ dropdowns, star ratings, recipe cards, and product information directly in search results. Pages with structured data see up to 30% higher click-through rates.
            </p>
          </div>
        </div>
      </section>

      <FaqSection faqs={FAQS} headline="Meta tag analyzer — common questions" />

      <PageCta
        headline="Need ongoing meta tag monitoring?"
        description="Optic Rank's site audit automatically checks meta tags, structured data, and 100+ SEO factors across your entire site — daily."
      />
    </>
  );
}
