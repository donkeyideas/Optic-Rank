import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPublishedChangelog } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: "Changelog — What's New",
  description:
    "See the latest features, improvements, and bug fixes shipped by the Optic Rank team. Stay up to date with every product update.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Changelog — What's New",
    description: "Latest features and improvements from Optic Rank.",
  
    images: OG_IMAGES,},
};

const typeBadge: Record<string, { label: string; className: string }> = {
  feature: {
    label: "Feature",
    className: "bg-editorial-green/10 text-editorial-green",
  },
  improvement: {
    label: "Improvement",
    className: "bg-editorial-gold/10 text-editorial-gold",
  },
  fix: {
    label: "Fix",
    className: "bg-editorial-red/10 text-editorial-red",
  },
};

export default async function ChangelogPage() {
  const { data: entries } = await getPublishedChangelog();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Changelog", path: "/changelog" },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Changelog
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            What&apos;s New
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            A log of every feature, improvement, and fix we ship.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="border border-rule p-12 text-center">
            <p className="text-sm text-ink-secondary">
              No changelog entries yet. Stay tuned!
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`relative border-l-2 border-rule py-8 pl-8 ${
                  i === 0 ? "" : "border-t border-t-transparent"
                }`}
              >
                {/* Timeline dot */}
                <div className="absolute -left-[5px] top-10 h-2 w-2 bg-editorial-red" />

                <div className="flex flex-wrap items-center gap-2">
                  {entry.version && (
                    <span className="border border-rule px-2 py-0.5 font-mono text-xs font-bold text-ink">
                      {entry.version}
                    </span>
                  )}
                  {entry.type && typeBadge[entry.type] && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${typeBadge[entry.type].className}`}
                    >
                      {typeBadge[entry.type].label}
                    </span>
                  )}
                  {entry.published_at && (
                    <time className="text-xs text-ink-muted">
                      {new Date(entry.published_at).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </time>
                  )}
                </div>

                <h2 className="mt-2 font-serif text-xl font-bold text-ink">
                  {entry.title}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
