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

        {guides.length === 0 ? (
          <div className="border border-rule p-12 text-center">
            <p className="text-sm text-ink-secondary">
              Guides are coming soon. Check back for in-depth tutorials!
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
