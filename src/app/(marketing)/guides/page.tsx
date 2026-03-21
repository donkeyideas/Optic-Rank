import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPublishedPosts } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: "Guides — Learn SEO with Optic Rank",
  description:
    "In-depth guides on keyword research, competitor analysis, technical SEO, and AI visibility. Step-by-step tutorials for every skill level.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Guides — Learn SEO with Optic Rank",
    description: "Step-by-step SEO guides and tutorials.",
  
    images: OG_IMAGES,},
};

export default async function GuidesPage() {
  const { data: guides } = await getPublishedPosts("guide");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Guides", path: "/guides" }])}
      />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Guides
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Learn SEO
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Step-by-step tutorials and in-depth guides to help you master
            search engine optimization with Optic Rank.
          </p>
        </header>

        {/* Topic Categories */}
        <section className="mb-12">
          <h2 className="mb-6 font-serif text-2xl font-bold text-ink">
            Topics We Cover
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-ink-secondary">
            Our guides cover the full spectrum of modern search optimization.
            Whether you are building your first SEO strategy or fine-tuning an
            enterprise campaign, each tutorial is written by practitioners who
            have managed rankings for hundreds of domains. Every guide includes
            actionable steps, real-world examples, and platform walkthroughs
            so you can apply what you learn immediately inside Optic Rank.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Keyword Research
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Discover high-value keywords, analyze search intent, and build
                data-driven keyword strategies that drive qualified organic traffic.
              </p>
            </div>
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Technical SEO
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Master site audits, fix crawl errors, optimize Core Web Vitals,
                and ensure your website meets modern search engine standards.
              </p>
            </div>
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                AI Visibility
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Track how your brand appears in AI-generated answers from
                ChatGPT, Gemini, Perplexity, and other large language models.
              </p>
            </div>
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Competitor Analysis
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Monitor competitor rankings, uncover their top-performing
                content, and identify gaps in your own SEO strategy.
              </p>
            </div>
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Content Strategy
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Plan, create, and optimize content that ranks — from topic
                clusters and editorial calendars to on-page optimization.
              </p>
            </div>
            <div className="border border-rule p-4">
              <h3 className="font-serif text-base font-bold text-ink">
                App Store Optimization
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Improve your app&apos;s visibility on the Apple App Store and
                Google Play with keyword optimization, rating strategies, and
                conversion insights.
              </p>
            </div>
          </div>
        </section>

        {guides.length === 0 ? (
          <div className="border border-rule p-12">
            <h2 className="text-center font-serif text-2xl font-bold text-ink">
              Expert Guides Coming Soon
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
              Our guides are being written by seasoned SEO professionals with
              years of hands-on experience in search engine optimization,
              technical auditing, and AI-powered content strategy. Each guide
              will walk you through real-world scenarios using the Optic Rank
              platform, from beginner fundamentals to advanced techniques used
              by enterprise teams.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Topics will range from setting up your first keyword tracking
              project to building sophisticated competitor monitoring workflows
              and interpreting AI visibility scores. Whether you are just
              starting with SEO or looking to sharpen your expertise, there
              will be something here for every skill level.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Each guide is structured around a specific outcome — improving
              your rank for a target keyword, diagnosing a traffic drop,
              auditing technical health, or measuring your brand&apos;s presence
              in AI-generated search results. We update guides regularly as
              search algorithms evolve and new platform features launch, so the
              advice you find here always reflects current best practices.
            </p>
            <p className="mt-4 text-center">
              <Link
                href="/blog"
                className="inline-flex h-10 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
              >
                Read Our Blog in the Meantime
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guides/${guide.slug}`}
                className="group flex gap-6 border border-rule p-6 transition-colors hover:border-ink"
              >
                <div className="flex-1">
                  {Array.isArray(guide.tags) && guide.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {(guide.tags as string[]).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="font-serif text-xl font-bold text-ink group-hover:text-editorial-red">
                    {guide.title}
                  </h2>
                  {guide.excerpt && (
                    <p className="mt-2 text-sm text-ink-secondary">
                      {guide.excerpt}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{guide.author_name ?? "Optic Rank Team"}</span>
                    {guide.published_at && (
                      <>
                        <span>&middot;</span>
                        <time>
                          {new Date(guide.published_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </time>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
