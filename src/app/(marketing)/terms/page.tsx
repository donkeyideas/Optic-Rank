import type { Metadata } from "next";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the terms and conditions governing your use of Optic Rank's SEO intelligence platform, including acceptable use, billing, and liability.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service",
    description: "Terms and conditions for using Optic Rank.",
  },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Terms of Service", path: "/terms" },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 border-b border-rule pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Legal
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-ink">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Last updated: March 15, 2026
          </p>
        </header>

        <div className="prose-editorial space-y-8 text-sm leading-relaxed text-ink-secondary">
          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Optic Rank (&ldquo;the Service&rdquo;), you
              agree to be bound by these Terms of Service. If you do not agree to
              these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              2. Description of Service
            </h2>
            <p>
              Optic Rank is an AI-powered SEO intelligence platform that provides
              keyword tracking, site auditing, competitor analysis, and AI
              visibility monitoring. The Service is provided on a subscription basis
              with various plan tiers.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              3. Account Registration
            </h2>
            <p>
              You must provide accurate and complete information when creating an
              account. You are responsible for maintaining the confidentiality of
              your account credentials and for all activities under your account.
              You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Attempt to gain unauthorized access to any part of the Service
              </li>
              <li>Interfere with or disrupt the Service or its servers</li>
              <li>Scrape, data mine, or reverse engineer the Service</li>
              <li>
                Use the Service to send spam or unsolicited communications
              </li>
              <li>
                Resell or redistribute access to the Service without authorization
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              5. Billing and Payments
            </h2>
            <p>
              Paid subscriptions are billed in advance on a monthly or annual basis.
              All fees are non-refundable except as required by law. We may change
              pricing with 30 days&apos; notice. Failure to pay may result in
              suspension or termination of your account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality are
              owned by Optic Rank and are protected by copyright, trademark, and
              other intellectual property laws. You retain ownership of data you
              upload to the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              7. Data and Privacy
            </h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy" className="text-editorial-red hover:underline">
                Privacy Policy
              </a>
              . By using the Service, you consent to the collection and use of
              information as described therein.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Optic Rank shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages arising from your use of the Service. Our total liability
              shall not exceed the amount paid by you in the 12 months preceding the
              claim.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              9. Termination
            </h2>
            <p>
              We may terminate or suspend your access to the Service immediately,
              without prior notice, for conduct that we believe violates these Terms
              or is harmful to other users or the Service. Upon termination, your
              right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              10. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Material
              changes will be communicated via email or a prominent notice on the
              Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              11. Contact
            </h2>
            <p>
              Questions about these terms? Contact us at{" "}
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
