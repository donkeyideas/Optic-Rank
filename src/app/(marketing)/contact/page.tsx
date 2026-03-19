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
      </div>
    </>
  );
}
