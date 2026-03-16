import Link from "next/link";
import type { Metadata } from "next";
import { Check, X, Zap } from "lucide-react";
import { getPricingPlans } from "@/lib/dal/admin";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Plans & Pricing for Every Team",
  description:
    "Choose the right Optic Rank plan for your team. From free starter accounts to enterprise-grade SEO intelligence, find pricing that scales with your growth.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Plans & Pricing for Every Team",
    description:
      "From free starter to enterprise SEO intelligence. Find pricing that scales with your growth.",
  },
};

/* ── Helpers ───────────────────────────────────────────────────── */

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  return (raw as T) ?? fallback;
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check size={16} strokeWidth={2} className="text-editorial-green" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <X size={16} strokeWidth={2} className="text-ink-muted" />
      </span>
    );
  }
  return (
    <span className="font-mono text-sm tabular-nums text-ink">{value}</span>
  );
}

/* ── FAQ data (static — not frequently edited) ────────────────── */

const faqs = [
  { question: "Is there a free trial?", answer: "Yes. All paid plans include a 14-day free trial with full access. No credit card required to start." },
  { question: "Can I change plans later?", answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes are prorated and take effect immediately." },
  { question: "What payment methods do you accept?", answer: "We accept all major credit cards (Visa, Mastercard, American Express) and process payments securely through Stripe. Annual plans can also be paid via invoice." },
  { question: "Do you offer annual billing?", answer: "Yes. Annual billing saves you 20% compared to monthly pricing. Contact us for custom enterprise agreements." },
  { question: "What happens when I exceed my keyword limit?", answer: "You will receive a notification when you reach 80% of your keyword limit. You can upgrade your plan at any time, or remove tracked keywords to stay within your current tier." },
  { question: "Can I cancel anytime?", answer: "Yes. There are no long-term contracts. Cancel anytime from your account settings and you will retain access until the end of your current billing period." },
];

/* ── Page ──────────────────────────────────────────────────────── */

export default async function PricingPage() {
  const dbPlans = await getPricingPlans();

  // Transform DB plans for display (exclude enterprise — shown separately)
  const displayPlans = dbPlans.filter((p) => p.plan_key !== "enterprise");
  const enterprisePlan = dbPlans.find((p) => p.plan_key === "enterprise");

  // Build comparison matrix from plan comparison JSONB
  const comparisonKeys = new Set<string>();
  for (const plan of displayPlans) {
    const comp = parseJson<Record<string, string | boolean>>(plan.comparison, {});
    Object.keys(comp).forEach((k) => comparisonKeys.add(k));
  }

  const comparisonFeatures = Array.from(comparisonKeys).map((name) => {
    const row: Record<string, string | boolean> = { name: name as string };
    for (const plan of displayPlans) {
      const comp = parseJson<Record<string, string | boolean>>(plan.comparison, {});
      row[plan.plan_key] = comp[name] ?? false;
    }
    return row;
  });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Pricing", path: "/pricing" }])} />
      <JsonLd data={faqJsonLd(faqs)} />

      {/* ==== HEADER SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center md:pb-20 md:pt-28">
          <span className="editorial-label">Choose Your Intelligence Level</span>
          <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl">
            Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            From solo bloggers to enterprise teams, pick the plan that matches
            your SEO ambitions. All paid plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* ==== PLAN CARDS ==== */}
      <section className="border-b border-rule bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {displayPlans.map((plan) => {
              const features = parseJson<string[]>(plan.features, []);
              return (
                <div
                  key={plan.plan_key}
                  className={[
                    "relative flex flex-col border bg-surface-cream p-6",
                    plan.is_highlighted
                      ? "border-editorial-red border-2 shadow-lg"
                      : "border-rule",
                  ].join(" ")}
                >
                  {plan.is_highlighted && plan.highlight_label && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center bg-editorial-red px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white">
                        {plan.highlight_label}
                      </span>
                    </div>
                  )}

                  <h3 className="font-serif text-xl font-bold text-ink">{plan.name}</h3>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-bold tracking-tight text-ink">
                      {plan.price_monthly === 0 ? "$0" : `$${plan.price_monthly}`}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {plan.price_monthly === 0 ? "forever" : "/mo"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
                    {plan.description}
                  </p>

                  <div className="my-6 h-px bg-rule" />

                  <ul className="flex-1 space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="mt-0.5 shrink-0 text-editorial-green"
                        />
                        <span className="text-sm text-ink-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.cta_href}
                    className={[
                      "mt-8 inline-flex h-11 items-center justify-center text-xs font-bold uppercase tracking-widest transition-colors",
                      plan.is_highlighted
                        ? "bg-editorial-red text-white hover:bg-editorial-red/90"
                        : "border border-rule-dark bg-transparent text-ink hover:bg-surface-raised",
                    ].join(" ")}
                  >
                    {plan.cta_text}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==== FEATURE COMPARISON TABLE ==== */}
      {comparisonFeatures.length > 0 && (
        <section className="border-b border-rule">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="mb-12 text-center">
              <span className="editorial-label">Detailed Comparison</span>
              <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                Compare all features
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] caption-bottom text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-3 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Feature
                    </th>
                    {displayPlans.map((plan) => (
                      <th
                        key={plan.plan_key}
                        className={`px-4 py-3 text-center text-[9px] font-bold uppercase tracking-[0.15em] ${
                          plan.is_highlighted ? "text-editorial-red" : "text-ink-muted"
                        }`}
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr
                      key={feature.name as string}
                      className="border-b border-rule transition-colors hover:bg-surface-raised"
                    >
                      <td className="py-3 pr-4 text-sm font-medium text-ink">
                        {feature.name as string}
                      </td>
                      {displayPlans.map((plan) => {
                        const val = feature[plan.plan_key];
                        const isHighlighted = plan.is_highlighted;
                        return (
                          <td
                            key={plan.plan_key}
                            className={`px-4 py-3 text-center ${isHighlighted ? "bg-editorial-red/[0.03]" : ""}`}
                          >
                            <ComparisonCell value={val as string | boolean} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==== ENTERPRISE SECTION ==== */}
      {enterprisePlan && (
        <section className="border-b border-rule bg-surface-card">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
              <div className="max-w-xl">
                <span className="editorial-label">Enterprise</span>
                <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
                  Need a custom solution?
                </h2>
                <p className="mt-3 text-lg leading-relaxed text-ink-secondary">
                  {enterprisePlan.description}
                </p>
                <ul className="mt-6 grid grid-cols-2 gap-3">
                  {parseJson<string[]>(enterprisePlan.features, []).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check size={14} strokeWidth={2.5} className="shrink-0 text-editorial-green" />
                      <span className="text-sm text-ink-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Link
                  href={enterprisePlan.cta_href}
                  className="inline-flex h-12 items-center justify-center bg-ink px-8 text-sm font-bold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/90"
                >
                  {enterprisePlan.cta_text}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==== FAQ SECTION ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <div className="mb-12 text-center">
            <span className="editorial-label">Common Questions</span>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="divide-y divide-rule">
            {faqs.map((faq) => (
              <div key={faq.question} className="py-6">
                <h3 className="font-serif text-lg font-bold text-ink">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==== BOTTOM CTA ==== */}
      <section className="border-b border-rule">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
              <span className="editorial-label">Ready to Get Started?</span>
            </div>
            <h2 className="mt-6 max-w-2xl font-serif text-3xl font-bold leading-tight tracking-tight text-ink md:text-4xl">
              Start your 14-day free trial today
            </h2>
            <p className="mt-4 max-w-lg text-lg text-ink-secondary">
              No credit card required. Full access to all features during your trial period.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
