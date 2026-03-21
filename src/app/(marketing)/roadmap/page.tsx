import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPublishedRoadmap } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: "Product Roadmap",
  description:
    "See what we're building next at Optic Rank. Our public roadmap shows planned features, in-progress work, and recently completed improvements.",
  alternates: { canonical: "/roadmap" },
  openGraph: {
    title: "Product Roadmap",
    description: "See what's planned, in progress, and recently shipped.",
  
    images: OG_IMAGES,},
};

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  planned: {
    label: "Planned",
    color: "text-ink-muted",
    bgColor: "bg-surface-raised",
  },
  in_progress: {
    label: "In Progress",
    color: "text-editorial-gold",
    bgColor: "bg-editorial-gold/10",
  },
  completed: {
    label: "Completed",
    color: "text-editorial-green",
    bgColor: "bg-editorial-green/10",
  },
};

const categoryBadge: Record<string, string> = {
  feature: "bg-editorial-red/10 text-editorial-red",
  improvement: "bg-editorial-gold/10 text-editorial-gold",
  integration: "bg-blue-500/10 text-blue-600",
};

export default async function RoadmapPage() {
  const items = await getPublishedRoadmap();

  const grouped = {
    planned: items.filter((i) => i.status === "planned"),
    in_progress: items.filter((i) => i.status === "in_progress"),
    completed: items.filter((i) => i.status === "completed"),
  };

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Roadmap", path: "/roadmap" },
        ])}
      />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Roadmap
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Product Roadmap
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Transparency is a core value. Here&apos;s what we&apos;re working on
            and what&apos;s coming next.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            We build in public because transparency builds trust. This roadmap
            reflects our current priorities based on user feedback, market
            trends, and our product vision. Have a feature request? We&apos;d
            love to hear from you&nbsp;&mdash; reach out via our{" "}
            <a
              href="/contact"
              className="text-editorial-red hover:underline"
            >
              contact page
            </a>
            .
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {(["in_progress", "planned", "completed"] as const).map((status) => {
            const config = statusConfig[status];
            const statusItems = grouped[status];

            return (
              <div key={status}>
                <div className="mb-4 flex items-center gap-2">
                  <h2
                    className={`text-xs font-bold uppercase tracking-[0.15em] ${config.color}`}
                  >
                    {config.label}
                  </h2>
                  <span className="text-xs text-ink-muted">
                    ({statusItems.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {statusItems.length === 0 ? (
                    <div className="border border-dashed border-rule p-6 text-center text-xs text-ink-muted">
                      Nothing here yet. Check back soon&nbsp;&mdash; we update
                      this roadmap regularly as priorities shift and new items
                      move through our pipeline.
                    </div>
                  ) : (
                    statusItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-rule p-4"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.category && categoryBadge[item.category] && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${categoryBadge[item.category]}`}
                            >
                              {item.category}
                            </span>
                          )}
                          {item.quarter && (
                            <span className="text-[10px] font-bold text-ink-muted">
                              {item.quarter}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-serif text-base font-bold text-ink">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* How We Prioritize */}
        <div className="mt-12 border border-rule p-6">
          <h2 className="mb-4 font-serif text-xl font-bold text-ink">
            How We Prioritize
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-ink-secondary">
            Every item on this roadmap is evaluated against three criteria before
            it enters our development pipeline:
          </p>
          <ul className="ml-6 list-disc space-y-2 text-sm leading-relaxed text-ink-secondary">
            <li>
              <strong className="text-ink">
                User feedback and feature requests
              </strong>{" "}
              &mdash; the most consistent signal we use to shape what gets built
              next
            </li>
            <li>
              <strong className="text-ink">
                Impact on search visibility and ROI
              </strong>{" "}
              &mdash; we focus on features that deliver measurable value to your
              SEO and AEO workflows
            </li>
            <li>
              <strong className="text-ink">
                Technical feasibility and platform stability
              </strong>{" "}
              &mdash; we balance ambition with reliability to keep the platform
              fast and dependable
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
