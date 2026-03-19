import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "About Optic Rank",
  description:
    "Learn about Optic Rank's mission to democratize SEO intelligence with AI-powered tools. Meet the team building the future of search visibility.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Optic Rank",
    description:
      "Our mission: make world-class SEO intelligence accessible to every team.",
  
    images: OG_IMAGES,},
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "About", path: "/about" }])}
      />
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            About Us
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Building the Future of Search Intelligence
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Optic Rank was founded on a simple belief: every team deserves
            access to world-class SEO intelligence, powered by AI.
          </p>
        </header>

        {/* Mission */}
        <section className="mb-16">
          <div className="border-l-4 border-editorial-red pl-6">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Our Mission
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Search is evolving faster than ever. With AI-powered engines like
              ChatGPT, Perplexity, and Google&apos;s SGE reshaping how people find
              information, brands need a new approach to visibility. We&apos;re building
              the platform that tracks, analyzes, and optimizes your presence across
              every surface where people search.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            What We Stand For
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Data-Driven",
                description:
                  "Every recommendation is backed by real data, not guesswork. We believe in transparent metrics and actionable insights.",
              },
              {
                title: "Innovation First",
                description:
                  "We track what others don't — AI citations, answer engine visibility, and generative search presence alongside traditional SEO.",
              },
              {
                title: "Accessible to All",
                description:
                  "Enterprise-grade intelligence shouldn't require an enterprise budget. Our tools are designed for teams of every size.",
              },
            ].map((value) => (
              <div
                key={value.title}
                className="border border-rule p-6"
              >
                <h3 className="font-serif text-lg font-bold text-ink">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Four Pillars */}
        <section className="mb-16 border-y border-rule py-12">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            The Four Pillars
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "SEO",
                full: "Search Engine Optimization",
                description: "Traditional keyword tracking, rankings, and site audits.",
              },
              {
                label: "AEO",
                full: "Answer Engine Optimization",
                description: "Visibility in AI-generated answers and featured snippets.",
              },
              {
                label: "GEO",
                full: "Generative Engine Optimization",
                description: "Presence in ChatGPT, Perplexity, Gemini, and more.",
              },
              {
                label: "CRO",
                full: "Conversion Rate Optimization",
                description: "Turn visibility into revenue with data-driven optimization.",
              },
            ].map((pillar) => (
              <div key={pillar.label} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-ink font-serif text-xl font-bold text-ink">
                  {pillar.label}
                </div>
                <h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                  {pillar.full}
                </h3>
                <p className="mt-2 text-sm text-ink-secondary">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Our Journey
          </h2>
          <div className="space-y-6">
            {[
              {
                date: "Q4 2025",
                title: "The Idea",
                description:
                  "Recognized the gap in SEO tools that don't account for AI-powered search engines.",
              },
              {
                date: "Q1 2026",
                title: "Platform Launch",
                description:
                  "Launched Optic Rank with keyword tracking, site audits, and AI visibility monitoring.",
              },
              {
                date: "Q2 2026",
                title: "What's Next",
                description:
                  "Expanding integrations, multi-language support, and custom reporting for agencies.",
              },
            ].map((event) => (
              <div
                key={event.date}
                className="flex gap-6 border-l-2 border-rule pl-6"
              >
                <div className="shrink-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-editorial-red">
                    {event.date}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="border-2 border-ink p-10">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Ready to Get Started?
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Join thousands of teams using Optic Rank to dominate search.
            </p>
            <a
              href="/signup"
              className="mt-6 inline-flex h-11 items-center justify-center bg-editorial-red px-8 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Start Free Trial
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
