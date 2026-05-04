import Link from "next/link";
import { Zap } from "lucide-react";

interface PageCtaProps {
  label?: string;
  headline?: string;
  description?: string;
  ctaPrimary?: { text: string; href: string };
  ctaSecondary?: { text: string; href: string };
}

export function PageCta({
  label = "Ready to Transform Your SEO?",
  headline = "Every tool, one platform, powered by AI",
  description = "Join thousands of SEO professionals who trust Optic Rank. Free 14-day trial, no credit card required.",
  ctaPrimary = { text: "Start Your Free Trial", href: "/signup" },
  ctaSecondary = { text: "Compare Plans", href: "/pricing" },
}: PageCtaProps) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Zap size={20} strokeWidth={1.5} className="text-editorial-gold" />
            <span className="editorial-label">{label}</span>
          </div>

          <h2 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
            {headline}
          </h2>

          <p className="mt-4 max-w-xl text-lg text-ink-secondary">
            {description}
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href={ctaPrimary.href}
              className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              {ctaPrimary.text}
            </Link>
            <Link
              href={ctaSecondary.href}
              className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
            >
              {ctaSecondary.text}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
