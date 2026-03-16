import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPublishedPosts } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: "Blog — SEO Insights & Updates",
  description:
    "Stay up to date with the latest SEO strategies, AI search trends, and product updates from the Optic Rank team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — SEO Insights & Updates",
    description: "SEO strategies, AI search trends, and product updates.",
  },
};

export default async function BlogPage() {
  const { data: posts } = await getPublishedPosts("blog");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Blog", path: "/blog" }])} />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Blog
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Insights & Updates
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Expert analysis on SEO, AEO, and AI-powered search — plus product
            news from the Optic Rank team.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="border border-rule p-12 text-center">
            <p className="text-sm text-ink-secondary">
              No posts yet. Check back soon for our first articles!
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group border border-rule transition-colors hover:border-ink"
              >
                {post.cover_image && (
                  <div className="aspect-video border-b border-rule bg-surface-raised" />
                )}
                <div className="p-5">
                  {/* Tags */}
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {(post.tags as string[]).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 className="font-serif text-lg font-bold text-ink group-hover:text-editorial-red">
                    {post.title}
                  </h2>

                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-ink-secondary">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
                    <span>{post.author_name ?? "Optic Rank Team"}</span>
                    {post.published_at && (
                      <time>
                        {new Date(post.published_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </time>
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
