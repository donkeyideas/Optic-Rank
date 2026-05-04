import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/editorial/page-hero";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { COMPETITORS } from "./_data/competitors";

export const metadata: Metadata = {
  title: "Compare Optic Rank vs Top SEO Tools",
  description:
    "See how Optic Rank compares to Ahrefs, Semrush, Moz, SE Ranking, Mangools, and SpyFu. Feature-by-feature comparison of pricing, AI capabilities, and more.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare Optic Rank vs Top SEO Tools",
    description:
      "Feature-by-feature comparison of Optic Rank against the biggest names in SEO.",
    images: OG_IMAGES,
  },
};

const FAQS = [
  {
    question: "Why should I switch from my current SEO tool?",
    answer:
      "Most traditional SEO tools were built for a world where Google organic rankings were the only thing that mattered. Today, your visibility spans AI search engines (ChatGPT, Perplexity, Gemini), social platforms, and app stores. Optic Rank is the first platform built to track all of these surfaces in one dashboard.",
  },
  {
    question: "Does Optic Rank offer a free trial?",
    answer:
      "Yes. Optic Rank offers a free tier with core features, plus a 14-day free trial of all paid plans. No credit card required to get started.",
  },
  {
    question: "Can I migrate my data from another tool?",
    answer:
      "Yes. Optic Rank supports keyword imports from CSV files, making it easy to bring your tracked keywords from any other platform. Your historical data starts building from day one on Optic Rank.",
  },
  {
    question: "What makes Optic Rank different from other SEO tools?",
    answer:
      "Three things: (1) AI-native intelligence covering ChatGPT, Perplexity, and Gemini visibility, (2) unified SEO + social + ASO in one platform, and (3) predictive analytics that forecast ranking changes before they happen.",
  },
];

export default function ComparePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Compare", path: "/compare" }])}
      />

      <PageHero
        label="Comparisons"
        headline="How Optic Rank Compares"
        description="See exactly how Optic Rank stacks up against the biggest names in SEO. Feature-by-feature, price-by-price — with complete transparency."
        ctaPrimary={{ text: "Start Free Trial", href: "/signup" }}
        ctaSecondary={{ text: "View Pricing", href: "/pricing" }}
      />

      {/* Comparison Cards Grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Choose a Comparison</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Optic Rank vs. the competition
            </h2>
            <p className="mt-3 text-base text-ink-secondary">
              Click any comparison to see a detailed feature-by-feature breakdown.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {COMPETITORS.map((comp) => (
              <Link
                key={comp.slug}
                href={`/compare/${comp.slug}`}
                className="group border border-rule p-6 transition-all hover:border-editorial-red hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                      Optic Rank vs
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
                      {comp.name}
                    </h3>
                  </div>
                  <ArrowRight
                    size={20}
                    strokeWidth={1.5}
                    className="mt-1 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-editorial-red"
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary line-clamp-2">
                  {comp.heroDescription}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-editorial-red">
                  View Comparison
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why switch section */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Why Switch</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              What every SEO tool is missing
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "AI Search Visibility",
                description:
                  "Traditional tools only track Google rankings. Optic Rank monitors your visibility across ChatGPT, Perplexity, Gemini, and Google SGE — the surfaces where your audience is shifting.",
              },
              {
                title: "Unified Intelligence",
                description:
                  "Stop paying for separate SEO, social media, and ASO tools. Optic Rank unifies search, social, and app store intelligence in one platform with one subscription.",
              },
              {
                title: "Predictive Analytics",
                description:
                  "Don't just react to ranking changes — predict them. Optic Rank's AI analyzes patterns to forecast ranking movements and recommend preemptive actions.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-rule p-6">
                <h3 className="font-serif text-lg font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection faqs={FAQS} headline="Frequently asked questions about switching" />

      <PageCta
        headline="Ready to see the difference?"
        description="Start your free trial and compare the results yourself. No credit card required."
      />
    </>
  );
}
