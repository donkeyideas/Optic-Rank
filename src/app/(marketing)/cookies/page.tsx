import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Understand how Optic Rank uses cookies and similar technologies to enhance your browsing experience and analyze platform usage.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie Policy",
    description: "How Optic Rank uses cookies and tracking technologies.",
  
    images: OG_IMAGES,},
};

export default function CookiesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Cookie Policy", path: "/cookies" },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 border-b border-rule pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Legal
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-ink">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Last updated: March 15, 2026
          </p>
        </header>

        <div className="prose-editorial space-y-8 text-sm leading-relaxed text-ink-secondary">
          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              What Are Cookies?
            </h2>
            <p>
              Cookies are small text files stored on your device when you visit a
              website. They help the site remember your preferences and understand
              how you interact with it. Cookies are widely used to make websites
              work efficiently and provide useful information to site owners.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              How We Use Cookies
            </h2>
            <p>Optic Rank uses the following types of cookies:</p>

            <div className="mt-4 space-y-4">
              <div className="border border-rule p-4">
                <h3 className="font-semibold text-ink">
                  Essential Cookies
                </h3>
                <p className="mt-1">
                  Required for the Service to function. These handle
                  authentication, security, and session management. Cannot be
                  disabled. Specific examples include Supabase session tokens
                  (<code className="font-mono text-xs text-ink">sb-access-token</code>,{" "}
                  <code className="font-mono text-xs text-ink">sb-refresh-token</code>)
                  used to keep you signed in, and CSRF protection tokens that
                  guard against cross-site request forgery. Session tokens
                  typically expire at the end of your browser session or after 7
                  days if you select &ldquo;Remember me&rdquo; during sign-in.
                </p>
              </div>

              <div className="border border-rule p-4">
                <h3 className="font-semibold text-ink">
                  Analytics Cookies
                </h3>
                <p className="mt-1">
                  Help us understand how visitors interact with the Service. We
                  use Google Analytics 4 to collect anonymized usage data
                  including pages visited, time on site, and traffic sources.
                  GA4 sets cookies such as{" "}
                  <code className="font-mono text-xs text-ink">_ga</code> (used
                  to distinguish unique users, lasting up to 2 years) and{" "}
                  <code className="font-mono text-xs text-ink">_ga_XXXXXXX</code>{" "}
                  (used to persist session state, also lasting up to 2 years).
                  These cookies contain randomly generated identifiers and do not
                  store personally identifiable information.
                </p>
              </div>

              <div className="border border-rule p-4">
                <h3 className="font-semibold text-ink">
                  Functional Cookies
                </h3>
                <p className="mt-1">
                  Remember your preferences such as theme (dark/light mode),
                  language, and dashboard layout settings to provide a personalized
                  experience.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Third-Party Cookies
            </h2>
            <p>
              Some cookies are set by third-party services we use:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>
                <strong>Stripe</strong> — Payment processing and fraud prevention
              </li>
              <li>
                <strong>Google Analytics</strong> — Anonymous usage analytics
              </li>
              <li>
                <strong>Supabase</strong> — Authentication session management
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Managing Cookies
            </h2>
            <p>
              Most web browsers allow you to control cookies through their settings.
              You can typically find these in the &ldquo;Options&rdquo; or
              &ldquo;Preferences&rdquo; menu. You can set your browser to refuse
              cookies or delete them after visiting our site. Note that disabling
              essential cookies may prevent you from using certain features of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Your Rights
            </h2>
            <p>
              Depending on your location, you may have specific rights regarding
              cookies and tracking technologies under privacy regulations such as
              the General Data Protection Regulation (GDPR) and the California
              Consumer Privacy Act (CCPA). These rights may include the right to
              access data collected through cookies, the right to request
              deletion of that data, and the right to opt out of non-essential
              cookies such as analytics and functional cookies. To exercise any
              of these rights, please contact us at{" "}
              <a
                href="mailto:info@donkeyideas.com"
                className="text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>{" "}
              and we will respond within the timeframe required by applicable
              law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Updates to This Policy
            </h2>
            <p>
              We may update this cookie policy periodically. Changes will be posted
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              Contact
            </h2>
            <p>
              For questions about our cookie practices, contact us at{" "}
              <a
                href="mailto:info@donkeyideas.com"
                className="text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
