import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/editorial/page-hero";
import { PageCta } from "@/components/editorial/page-cta";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { INDUSTRIES } from "./_data/industries";

export const metadata: Metadata = {
  title: "SEO Solutions by Industry",
  description:
    "Industry-specific SEO intelligence for e-commerce, SaaS, healthcare, legal, real estate, and more. See how Optic Rank helps businesses in your industry grow organic traffic.",
  alternates: { canonical: "/seo-for" },
  openGraph: {
    title: "SEO Solutions by Industry",
    description:
      "Industry-specific SEO intelligence powered by AI. Find your industry and see how Optic Rank can help.",
    images: OG_IMAGES,
  },
};

export default function SeoForPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "SEO by Industry", path: "/seo-for" }])}
      />

      <PageHero
        label="Industry Solutions"
        headline="SEO Intelligence for Every Industry"
        description="Every industry has unique SEO challenges. Optic Rank's AI-powered platform adapts to yours — from e-commerce product rankings to healthcare E-E-A-T compliance to local service visibility."
        ctaPrimary={{ text: "Start Free Trial", href: "/signup" }}
        ctaSecondary={{ text: "View Pricing", href: "/pricing" }}
      />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Find Your Industry</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Tailored SEO strategies by sector
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((ind) => (
              <Link
                key={ind.slug}
                href={`/seo-for/${ind.slug}`}
                className="group flex items-start justify-between border border-rule p-5 transition-all hover:border-editorial-red"
              >
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {ind.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-secondary line-clamp-2">
                    {ind.heroDescription}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  strokeWidth={1.5}
                  className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-editorial-red"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PageCta
        headline="Don't see your industry?"
        description="Optic Rank works for any industry. Start your free trial and discover how AI-powered SEO intelligence can grow your organic traffic."
      />
    </>
  );
}
