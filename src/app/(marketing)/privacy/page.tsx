import type { Metadata } from "next";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Optic Rank collects, uses, and protects your personal data. Our privacy policy outlines your rights and our commitment to data security.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy",
    description:
      "How Optic Rank handles and protects your personal data.",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12 border-b border-rule pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Legal
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-ink">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Last updated: March 15, 2026
          </p>
        </header>

        <div className="prose-editorial space-y-8 text-sm leading-relaxed text-ink-secondary">
          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              1. Information We Collect
            </h2>
            <p>
              When you use Optic Rank, we collect information you provide directly,
              such as your name, email address, and payment details when you create
              an account or subscribe to a plan. We also automatically collect usage
              data including pages visited, features used, IP address, browser type,
              and device information.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              2. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              3. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We may share your data with
              third-party service providers who perform services on our behalf, such
              as payment processing (Stripe), cloud hosting (Vercel, Supabase), and
              analytics. These providers are contractually obligated to protect your
              data and use it only for the services they provide to us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              4. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your data,
              including encryption in transit (TLS), encryption at rest, and regular
              security audits. However, no method of transmission over the internet
              is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              5. Data Retention
            </h2>
            <p>
              We retain your personal data for as long as your account is active or
              as needed to provide you services. You may request deletion of your
              account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              6. Your Rights
            </h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability — receive your data in a structured format</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              7. Cookies
            </h2>
            <p>
              We use cookies and similar tracking technologies to improve your
              experience. See our{" "}
              <a href="/cookies" className="text-editorial-red hover:underline">
                Cookie Policy
              </a>{" "}
              for more details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will notify
              you of any material changes by posting the updated policy on this page
              and updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-bold text-ink">
              9. Contact Us
            </h2>
            <p>
              If you have any questions about this privacy policy or our data
              practices, please contact us at{" "}
              <a
                href="mailto:info@donkeyideas.com"
                className="text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>{" "}
              or visit our{" "}
              <a href="/contact" className="text-editorial-red hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
