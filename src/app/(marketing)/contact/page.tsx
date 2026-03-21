import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Optic Rank team. Whether you have questions about our platform, need support, or want to discuss partnerships — we're here to help.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Us",
    description: "Reach the Optic Rank team for support or partnership inquiries.",
  
    images: OG_IMAGES,},
};

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Contact", path: "/contact" }])}
      />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            Get In Touch
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Contact Us
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Have a question, feedback, or partnership inquiry? We&apos;d love to
            hear from you.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <ContactForm />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">Email</h3>
              <a
                href="mailto:info@donkeyideas.com"
                className="mt-2 block text-sm text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">Support</h3>
              <a
                href="mailto:info@donkeyideas.com"
                className="mt-2 block text-sm text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>
              <p className="mt-1 text-xs text-ink-muted">
                For existing customers with technical issues
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                Partnerships
              </h3>
              <a
                href="mailto:info@donkeyideas.com"
                className="mt-2 block text-sm text-editorial-red hover:underline"
              >
                info@donkeyideas.com
              </a>
              <p className="mt-1 text-xs text-ink-muted">
                Agency partnerships, integrations, and reseller inquiries
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                Response Time
              </h3>
              <p className="mt-2 text-sm text-ink-secondary">
                We typically respond within 1-2 business days. For urgent support,
                paid plan customers get priority response within 4 hours.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                What&apos;s included in the free trial?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Every free trial includes full access to keyword tracking, site
                audits, AI visibility monitoring, and backlink analysis for 14
                days. You can track up to 100 keywords across Google, ChatGPT,
                Perplexity, and Gemini with no credit card required to start.
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                Can I cancel anytime?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Absolutely. All Optic Rank plans are billed monthly with no
                long-term contracts. You can cancel directly from your account
                settings at any time, and you will retain access until the end of
                your current billing cycle. We never charge cancellation fees.
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                Do you offer agency plans?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Yes. Our agency plans support multiple client workspaces under a
                single account with consolidated billing, white-label reporting,
                and team member permissions. Reach out to our partnerships team at
                the email above to discuss volume pricing and custom onboarding.
              </p>
            </div>

            <div className="border border-rule p-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                How fast is support?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                We respond to all inquiries within one to two business days.
                Customers on paid plans receive priority support with a guaranteed
                response time of four hours during business hours. Enterprise
                customers also get a dedicated account manager and private Slack
                channel.
              </p>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="mt-16 mb-4">
          <div className="border-2 border-ink p-10 text-center">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Join the Community
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              Connect with other SEO professionals, marketers, and founders who
              are navigating the shift to AI-powered search. Our community is the
              best place to share strategies, get platform tips, hear about new
              feature releases, and stay ahead of the latest changes across
              Google, ChatGPT, Perplexity, and other search surfaces.
            </p>
            <a
              href="/signup"
              className="mt-6 inline-flex h-11 items-center justify-center bg-editorial-red px-8 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Get Started Free
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
