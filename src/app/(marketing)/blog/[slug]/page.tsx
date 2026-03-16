import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPostBySlug } from "@/lib/dal/admin";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt ?? `Read "${post.title}" on the Optic Rank blog.`,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
    },
  };
}

/** Detect if content is HTML (vs plain text / markdown) */
function isHTML(text: string): boolean {
  return /<(h[2-6]|p|ul|ol|li|a|strong|em|blockquote|div)\b/i.test(text);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.type !== "blog") notFound();

  const contentIsHTML = isHTML(post.content);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10 border-b border-rule pb-8">
          <Link
            href="/blog"
            className="text-xs font-bold uppercase tracking-widest text-editorial-red hover:underline"
          >
            &larr; Back to Blog
          </Link>

          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(post.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="bg-surface-raised px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-ink">
            {post.title}
          </h1>

          <div className="mt-4 flex items-center gap-3 text-sm text-ink-muted">
            <span>{post.author_name ?? "Optic Rank Team"}</span>
            {post.published_at && (
              <>
                <span>&middot;</span>
                <time>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </>
            )}
          </div>
        </header>

        {contentIsHTML ? (
          <div
            className="prose-editorial text-sm leading-relaxed text-ink-secondary [&_a]:text-editorial-red [&_a]:underline hover:[&_a]:text-editorial-red/80 [&_blockquote]:border-l-4 [&_blockquote]:border-rule [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted [&_em]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-ink [&_li]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div className="prose-editorial text-sm leading-relaxed text-ink-secondary">
            {post.content.split("\n").map((line: string, i: number) => {
              if (line.startsWith("## ")) {
                return (
                  <h2
                    key={i}
                    className="mb-3 mt-8 font-serif text-2xl font-bold text-ink"
                  >
                    {line.replace("## ", "")}
                  </h2>
                );
              }
              if (line.startsWith("### ")) {
                return (
                  <h3
                    key={i}
                    className="mb-2 mt-6 font-serif text-xl font-bold text-ink"
                  >
                    {line.replace("### ", "")}
                  </h3>
                );
              }
              if (line.startsWith("- ")) {
                return (
                  <li key={i} className="ml-6 list-disc">
                    {renderInline(line.replace("- ", ""))}
                  </li>
                );
              }
              if (line.match(/^\d+\.\s/)) {
                return (
                  <li key={i} className="ml-6 list-decimal">
                    {renderInline(line.replace(/^\d+\.\s/, ""))}
                  </li>
                );
              }
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="mb-3">{renderInline(line)}</p>;
            })}
          </div>
        )}
      </article>
    </>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part: string, i: number) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
