import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileSearch, Hash, Globe } from "lucide-react";
import { PageHero } from "@/components/editorial/page-hero";
import { PageCta } from "@/components/editorial/page-cta";
import { FaqSection } from "@/components/editorial/faq-section";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Free SEO Tools — Analyze, Check & Optimize",
  description:
    "Free SEO tools by Optic Rank. Analyze meta tags, check keyword density, and research SERP results — no signup required.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Free SEO Tools — Analyze, Check & Optimize",
    description: "Professional SEO analysis tools, completely free. No signup required.",
    images: OG_IMAGES,
  },
};

const TOOLS = [
  {
    href: "/tools/meta-tag-analyzer",
    icon: FileSearch,
    title: "Meta Tag Analyzer",
    description:
      "Analyze any webpage's title tags, meta descriptions, Open Graph tags, structured data, and more. Get an instant SEO score with actionable recommendations.",
  },
  {
    href: "/tools/keyword-density-checker",
    icon: Hash,
    title: "Keyword Density Checker",
    description:
      "Check keyword density for any URL or text. Identify over-optimized and under-optimized content with 1-gram, 2-gram, and 3-gram analysis.",
  },
  {
    href: "/tools/serp-checker",
    icon: Globe,
    title: "SERP Checker",
    description:
      "Research any keyword's search volume, CPC, difficulty, and intent. Discover related keywords and understand the competitive landscape.",
  },
];

const FAQS = [
  {
    question: "Are these tools really free?",
    answer:
      "Yes, completely free with no signup required. We rate-limit usage to ensure fair access for everyone, but there are no paywalls or hidden costs.",
  },
  {
    question: "How accurate is the data?",
    answer:
      "Our meta tag analyzer crawls pages in real-time for 100% accuracy. The SERP checker provides estimates based on keyword patterns — for live data, sign up for a free Optic Rank account to connect DataForSEO.",
  },
  {
    question: "Why does Optic Rank offer free tools?",
    answer:
      "We believe every team should have access to basic SEO analysis. These free tools give you a taste of what Optic Rank's full platform offers — including AI visibility tracking, competitor monitoring, and predictive analytics.",
  },
  {
    question: "What's the difference between these free tools and the full platform?",
    answer:
      "Free tools provide one-time analysis. The full Optic Rank platform offers daily tracking, historical trends, AI-powered predictions, competitor monitoring, social intelligence, and app store optimization — all in one dashboard.",
  },
];

export default function ToolsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Free Tools", path: "/tools" }])}
      />

      <PageHero
        label="Free SEO Tools"
        headline="Professional SEO Analysis, Free"
        description="Analyze meta tags, check keyword density, and research SERP data — no signup required. Built by the team behind Optic Rank."
        ctaPrimary={{ text: "Start Free Trial", href: "/signup" }}
        ctaSecondary={{ text: "View All Features", href: "/features" }}
      />

      {/* Tools Grid */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="grid gap-6 md:grid-cols-3">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col border border-rule p-6 transition-all hover:border-editorial-red"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                  <tool.icon size={22} strokeWidth={1.5} className="text-editorial-red" />
                </div>
                <h2 className="font-serif text-xl font-bold text-ink">
                  {tool.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-secondary">
                  {tool.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-editorial-red">
                  Try It Free
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FaqSection faqs={FAQS} headline="About our free SEO tools" />

      <PageCta
        headline="Need more than one-time analysis?"
        description="Optic Rank tracks your rankings daily with AI-powered predictions, competitor monitoring, and more."
      />
    </>
  );
}
