import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  OG_IMAGES,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  speakableJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Documentation & Guides",
  description:
    "Learn how to use Optic Rank with step-by-step guides, API documentation, and tutorials on SEO, AEO, GEO, and CRO.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Documentation & Guides",
    description:
      "Step-by-step guides and documentation for the Optic Rank SEO platform.",
    images: OG_IMAGES,
  },
};

export default function DocsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Documentation", path: "/docs" }])} />
      <JsonLd data={speakableJsonLd(["h1", "h2", "h3", "p"], "/docs")} />
      <JsonLd
        data={howToJsonLd(
          "How to get started with Optic Rank documentation",
          "Find the right guide for your needs in three simple steps.",
          [
            { name: "Browse by topic", text: "Explore guides organized by topic: keyword tracking, competitor analysis, site audits, AI insights, social intelligence, and app store optimization." },
            { name: "Follow step-by-step tutorials", text: "Each guide includes step-by-step instructions with screenshots and best practices to help you get the most out of Optic Rank." },
            { name: "Apply recommendations", text: "Put what you learn into practice using your Optic Rank dashboard. AI-powered recommendations help you prioritize the highest-impact actions." },
          ]
        )}
      />
      <JsonLd
        data={faqJsonLd([
          { question: "Where can I find Optic Rank documentation?", answer: "All documentation and guides are available at opticrank.com/docs and opticrank.com/guides. Topics cover keyword tracking, competitor analysis, site audits, AI insights, and more." },
          { question: "Does Optic Rank have an API?", answer: "Yes. Optic Rank provides a RESTful API for programmatic access to keyword data, rankings, site audit results, and AI insights. API documentation is available to paid plan subscribers." },
          { question: "How do I get help with Optic Rank?", answer: "Visit our guides for self-service tutorials, or contact our support team at opticrank.com/contact for personalized assistance." },
        ])}
      />

      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Documentation
          </span>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Guides & Documentation
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Everything you need to master Optic Rank and grow your organic traffic.
          </p>
        </header>

        <section className="space-y-8">
          <div className="border border-rule p-6">
            <h2 className="font-serif text-xl font-bold text-ink">
              What topics do our guides cover?
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                Keyword research and rank tracking setup
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                Competitor analysis and monitoring
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                Technical site audits and Core Web Vitals
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                AI-powered SEO insights and recommendations
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                Social media intelligence and analytics
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                App Store Optimization (ASO) for iOS and Android
              </li>
            </ul>
          </div>

          <div className="border border-rule p-6">
            <h3 className="font-serif text-lg font-bold text-ink">
              How do I get started?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Browse our in-depth guides for step-by-step tutorials on every Optic Rank feature.
              Whether you&apos;re new to SEO or an experienced practitioner, our documentation
              helps you get the most from the platform.
            </p>
            <Link
              href="/guides"
              className="mt-4 inline-flex h-10 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Browse All Guides
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
