import { JsonLd, faqJsonLd } from "@/components/seo/json-ld";

interface FaqSectionProps {
  label?: string;
  headline?: string;
  faqs: { question: string; answer: string }[];
  /** Set false to skip rendering the JSON-LD (e.g. if parent already renders it) */
  includeJsonLd?: boolean;
}

export function FaqSection({
  label = "Common Questions",
  headline = "Frequently asked questions",
  faqs,
  includeJsonLd = true,
}: FaqSectionProps) {
  return (
    <section className="border-b border-rule bg-surface-card">
      {includeJsonLd && <JsonLd data={faqJsonLd(faqs)} />}
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-12 text-center">
          <span className="editorial-label">{label}</span>
          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
            {headline}
          </h2>
        </div>
        <div className="divide-y divide-rule">
          {faqs.map((faq) => (
            <div key={faq.question} className="py-6">
              <h3 className="font-serif text-lg font-bold text-ink">
                {faq.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
