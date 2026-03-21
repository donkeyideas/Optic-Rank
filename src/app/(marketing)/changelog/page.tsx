import type { Metadata } from "next";
import Link from "next/link";
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
            A complete log of every feature, improvement, and fix we ship to the
            Optic Rank platform. Stay informed about what changed, when it
            launched, and how it affects your workflow.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            We ship updates weekly. Every feature, improvement, and bug fix is
            logged here so you always know what&apos;s new. Our engineering team
            is committed to continuous improvement — we listen to user feedback
            and prioritize the features that matter most to your SEO workflow.
            Transparency is a core value at Optic Rank, and this changelog is
            our way of keeping you informed about every change we make to the
            platform, no matter how small. Each release is tested across
            multiple environments before going live, and we monitor error rates
            and performance metrics after every deployment to ensure stability.
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="border border-rule p-12">
            <h2 className="text-center font-serif text-2xl font-bold text-ink">
              Updates Are on the Way
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
              We haven&apos;t published our first changelog entry yet, but
              that&apos;s about to change. Our team is actively building and
              refining Optic Rank, and this page will soon be filled with a
              detailed record of every release. We believe in building in
              public, which means you will see every change we make — from
              major feature launches and dashboard redesigns to small quality
              of life improvements and behind-the-scenes infrastructure
              upgrades that make the platform faster and more reliable.
            </p>

            <h3 className="mt-6 font-serif text-lg font-bold text-ink">
              What You&apos;ll Find Here
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Each changelog entry is categorized so you can quickly scan for
              what matters to you:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-editorial-green/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-editorial-green">Feature</span>
                Brand-new capabilities added to the platform, such as new
                dashboards, integrations, tracking modules, or entirely new
                tools like AI visibility monitoring and app store optimization.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-editorial-gold/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-editorial-gold">Improvement</span>
                Enhancements to existing features — faster load times, better
                data accuracy, refined user interfaces, improved reporting,
                and workflow optimizations that save you time every day.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 rounded bg-editorial-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-editorial-red">Fix</span>
                Bug fixes and reliability patches that keep your data accurate
                and your experience smooth, including performance improvements,
                data synchronization fixes, and cross-browser compatibility updates.
              </li>
            </ul>

            <h3 className="mt-6 font-serif text-lg font-bold text-ink">
              Stay in the Loop
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              You don&apos;t have to check this page manually. Subscribe to
              email notifications in your{" "}
              <Link href="/dashboard/settings" className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80">
                account settings
              </Link>{" "}
              and we&apos;ll send you a summary every time we publish a new
              release. You can also visit our{" "}
              <Link href="/roadmap" className="text-editorial-red underline underline-offset-2 hover:text-editorial-red/80">
                public roadmap
              </Link>{" "}
              to see upcoming features and vote on the improvements you want
              most. Your feedback directly shapes what we build next.
            </p>

            <h3 className="mt-6 font-serif text-lg font-bold text-ink">
              Our Release Process
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              We follow a continuous deployment model, releasing updates as
              soon as they pass our automated test suite and internal review.
              Major features go through a beta period with select users before
              general availability. Critical bug fixes are deployed
              immediately, while larger improvements are grouped into weekly
              releases to give you a clear picture of what changed and why.
              Every entry on this page links back to the relevant documentation
              so you can start using new capabilities right away.
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
