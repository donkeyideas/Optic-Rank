import type { Metadata } from "next";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Press & Media Kit",
  description:
    "Download Optic Rank brand assets, logos, and media kit. Find press releases and media contact information for journalists and publications.",
  alternates: { canonical: "/press" },
  openGraph: {
    title: "Press & Media Kit",
    description: "Optic Rank brand assets, press releases, and media contacts.",
  },
};

export default function PressPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Press", path: "/press" }])}
      />
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Press & Media
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Press Kit
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Everything you need to write about Optic Rank. Download brand assets,
            read press releases, and get in touch with our media team.
          </p>
        </header>

        {/* Brand Assets */}
        <section className="mb-16">
          <h2 className="mb-6 font-serif text-2xl font-bold text-ink">
            Brand Assets
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">Logo</h3>
              <div className="my-6 flex items-center justify-center border border-rule bg-surface-raised p-8">
                <span className="font-serif text-3xl font-bold tracking-tight text-ink">
                  Optic Rank
                </span>
              </div>
              <p className="text-sm text-ink-secondary">
                Our wordmark should be displayed in Playfair Display, bold weight.
                Minimum clear space is equal to the height of the &ldquo;O&rdquo;.
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                Brand Colors
              </h3>
              <div className="my-6 space-y-3">
                {[
                  { name: "Cream", hex: "#f5f2ed" },
                  { name: "Ink", hex: "#1a1a1a" },
                  { name: "Editorial Red", hex: "#c0392b" },
                  { name: "Success Green", hex: "#27ae60" },
                  { name: "Gold", hex: "#b8860b" },
                ].map((color) => (
                  <div key={color.name} className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 border border-rule"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <span className="text-sm font-semibold text-ink">
                        {color.name}
                      </span>
                      <span className="ml-2 font-mono text-xs text-ink-muted">
                        {color.hex}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="mb-6 font-serif text-2xl font-bold text-ink">
            Typography
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border border-rule p-6">
              <p className="font-serif text-2xl font-bold text-ink">
                Playfair Display
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
                Headlines & Branding
              </p>
            </div>
            <div className="border border-rule p-6">
              <p className="text-2xl font-medium text-ink">IBM Plex Sans</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
                Body Text & UI
              </p>
            </div>
            <div className="border border-rule p-6">
              <p className="font-mono text-2xl text-ink">IBM Plex Mono</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-ink-muted">
                Data & Code
              </p>
            </div>
          </div>
        </section>

        {/* Press Releases */}
        <section className="mb-16">
          <h2 className="mb-6 font-serif text-2xl font-bold text-ink">
            Press Releases
          </h2>
          <div className="space-y-4">
            {[
              {
                date: "March 2026",
                title: "Optic Rank Launches AI-Powered SEO Intelligence Platform",
                description:
                  "Optic Rank launches with a mission to track search visibility across traditional and AI-powered search engines, offering keyword tracking, site audits, and AI citation monitoring.",
              },
              {
                date: "February 2026",
                title:
                  "The Rise of Answer Engine Optimization: Why Brands Need AEO in 2026",
                description:
                  "With over 40% of search queries now triggering AI-generated responses, Optic Rank introduces AEO tracking to help brands maintain visibility.",
              },
            ].map((release) => (
              <div
                key={release.title}
                className="border border-rule p-6"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-editorial-red">
                  {release.date}
                </p>
                <h3 className="mt-2 font-serif text-lg font-bold text-ink">
                  {release.title}
                </h3>
                <p className="mt-2 text-sm text-ink-secondary">
                  {release.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* About Blurb */}
        <section className="mb-16 border border-rule p-8">
          <h2 className="font-serif text-xl font-bold text-ink">
            About Optic Rank
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
            Optic Rank is an AI-powered SEO intelligence platform that helps
            marketing teams track and optimize their visibility across traditional
            search engines and AI-powered answer engines. The platform combines
            keyword tracking, technical site audits, competitor analysis, and AI
            citation monitoring into a single dashboard designed for modern search
            marketers.
          </p>
          <p className="mt-3 text-sm italic text-ink-muted">
            Feel free to use this text when writing about Optic Rank.
          </p>
        </section>

        {/* Media Contact */}
        <section className="text-center">
          <div className="border-2 border-ink p-10">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Media Contact
            </h2>
            <p className="mt-3 text-sm text-ink-secondary">
              For press inquiries, interviews, and media requests:
            </p>
            <a
              href="mailto:info@donkeyideas.com"
              className="mt-4 inline-block text-lg font-semibold text-editorial-red hover:underline"
            >
              info@donkeyideas.com
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
