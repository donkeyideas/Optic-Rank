import type { Metadata } from "next";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { getActiveJobs } from "@/lib/dal/admin";

export const metadata: Metadata = {
  title: "Careers at Optic Rank",
  description:
    "Join the Optic Rank team and help build the future of AI-powered SEO intelligence. View open positions in engineering, design, and marketing.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers at Optic Rank",
    description: "Join our team and help build the future of search intelligence.",
  },
};

export default async function CareersPage() {
  const jobs = await getActiveJobs();

  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Careers", path: "/careers" }])}
      />
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Careers
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Join Our Team
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            We&apos;re building the future of search intelligence. Come work with
            a small, talented team that ships fast and cares deeply about craft.
          </p>
        </header>

        {/* Why Join */}
        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Remote First",
                description:
                  "Work from anywhere. We believe great talent isn't limited by geography.",
              },
              {
                title: "High Impact",
                description:
                  "Small team, big ownership. Every person here shapes the product and the company.",
              },
              {
                title: "Growth",
                description:
                  "Learn and grow with a fast-moving startup tackling hard problems in AI and search.",
              },
            ].map((perk) => (
              <div key={perk.title} className="border border-rule p-6">
                <h3 className="font-serif text-lg font-bold text-ink">
                  {perk.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {perk.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Open Positions */}
        <section>
          <h2 className="mb-8 font-serif text-2xl font-bold text-ink">
            Open Positions
          </h2>

          {jobs.length === 0 ? (
            <div className="border border-rule p-8 text-center">
              <p className="text-sm text-ink-secondary">
                No open positions at the moment. Check back soon or send your
                resume to{" "}
                <a
                  href="mailto:info@donkeyideas.com"
                  className="text-editorial-red hover:underline"
                >
                  info@donkeyideas.com
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {departments.map((dept) => (
                <div key={dept}>
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-ink-muted">
                    {dept}
                  </h3>
                  <div className="space-y-3">
                    {jobs
                      .filter((j) => j.department === dept)
                      .map((job) => (
                        <details
                          key={job.id}
                          className="group border border-rule"
                        >
                          <summary className="flex cursor-pointer items-center justify-between p-5 hover:bg-surface-raised">
                            <div>
                              <h4 className="font-serif text-lg font-bold text-ink">
                                {job.title}
                              </h4>
                              <div className="mt-1 flex gap-3 text-xs text-ink-muted">
                                <span>{job.location}</span>
                                <span>&middot;</span>
                                <span className="capitalize">{job.type}</span>
                              </div>
                            </div>
                            <span className="text-ink-muted transition-transform group-open:rotate-180">
                              &#9662;
                            </span>
                          </summary>
                          <div className="border-t border-rule p-5">
                            <div
                              className="prose-sm text-sm leading-relaxed text-ink-secondary"
                              dangerouslySetInnerHTML={{
                                __html: job.description.replace(/\n/g, "<br />"),
                              }}
                            />
                            {Array.isArray(job.requirements) &&
                              job.requirements.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                                    Requirements
                                  </h5>
                                  <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-ink-secondary">
                                    {(job.requirements as string[]).map(
                                      (req, i) => (
                                        <li key={i}>{req}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            <a
                              href={`mailto:info@donkeyideas.com?subject=Application: ${job.title}`}
                              className="mt-6 inline-flex h-9 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
                            >
                              Apply Now
                            </a>
                          </div>
                        </details>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
