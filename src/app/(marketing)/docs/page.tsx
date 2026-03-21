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
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">Keyword Research &amp; Rank Tracking</strong> — Learn
                  how to discover high-value keywords, set up automated rank tracking
                  across multiple search engines, and monitor your position changes
                  over time.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">Competitor Analysis &amp; Monitoring</strong> — Understand
                  how to identify your top SEO competitors, track their ranking
                  movements, and uncover content gaps you can exploit to gain
                  market share.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">Technical Site Audits &amp; Core Web Vitals</strong> — Run
                  comprehensive site audits to detect crawl errors, broken links,
                  missing meta tags, and performance bottlenecks that affect your
                  Core Web Vitals scores.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">AI-Powered SEO Insights</strong> — Explore how Optic
                  Rank uses artificial intelligence to surface actionable
                  recommendations, predict ranking trends, and track your
                  brand&apos;s visibility in AI-generated search results.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">Social Media Intelligence</strong> — Monitor social
                  signals, track brand mentions across platforms, and understand how
                  social engagement correlates with your organic search performance.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-editorial-green">✓</span>
                <span>
                  <strong className="text-ink">App Store Optimization (ASO)</strong> — Optimize your
                  iOS and Android app listings with keyword research, rating
                  analysis, and conversion rate insights tailored for the Apple App
                  Store and Google Play.
                </span>
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

          <div className="border border-rule p-6">
            <h2 className="font-serif text-xl font-bold text-ink">
              Getting Started
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Follow these four steps to set up Optic Rank and start improving
              your search performance right away.
            </p>
            <ol className="mt-4 space-y-4 text-sm text-ink-secondary">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-rule font-mono text-xs font-bold text-ink">
                  1
                </span>
                <span>
                  <strong className="text-ink">Create your account</strong> — Sign
                  up for a free Optic Rank account in under a minute using your
                  email, Google, or Apple login. No credit card required to get
                  started.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-rule font-mono text-xs font-bold text-ink">
                  2
                </span>
                <span>
                  <strong className="text-ink">Add your first project</strong> — Enter
                  your website URL and configure your target search engines,
                  locations, and languages so Optic Rank knows exactly what to
                  track.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-rule font-mono text-xs font-bold text-ink">
                  3
                </span>
                <span>
                  <strong className="text-ink">Track your keywords</strong> — Import
                  your target keywords manually, from a CSV file, or let our AI
                  suggest high-opportunity keywords based on your site&apos;s
                  existing content.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-rule font-mono text-xs font-bold text-ink">
                  4
                </span>
                <span>
                  <strong className="text-ink">Run your first site audit</strong> — Launch
                  a comprehensive technical audit to identify SEO issues, from
                  broken links and missing metadata to slow page speeds and
                  mobile usability problems.
                </span>
              </li>
            </ol>
          </div>

          <div className="border border-rule p-6">
            <h2 className="font-serif text-xl font-bold text-ink">
              Need Help?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              If you can&apos;t find what you&apos;re looking for in our
              documentation or guides, our support team is here to help. We
              typically respond within a few hours during business days and are
              happy to assist with account setup, technical questions, or
              anything else related to the platform.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Reach out to us directly through our{" "}
              <Link
                href="/contact"
                className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/90"
              >
                contact page
              </Link>
              , and a member of our team will get back to you as soon as
              possible.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
