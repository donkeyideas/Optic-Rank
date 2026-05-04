import Link from "next/link";

interface PageHeroProps {
  label: string;
  headline: string;
  description: string;
  ctaPrimary?: { text: string; href: string };
  ctaSecondary?: { text: string; href: string };
}

export function PageHero({
  label,
  headline,
  description,
  ctaPrimary,
  ctaSecondary,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b-4 border-double border-rule-dark">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-rule-light)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-rule-light)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="editorial-label">{label}</span>
          <h1 className="mt-4 font-serif text-5xl font-bold leading-tight tracking-tight text-ink md:text-6xl lg:text-7xl">
            {headline}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-secondary md:text-xl">
            {description}
          </p>
          {(ctaPrimary || ctaSecondary) && (
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {ctaPrimary && (
                <Link
                  href={ctaPrimary.href}
                  className="inline-flex h-12 items-center justify-center bg-editorial-red px-8 text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
                >
                  {ctaPrimary.text}
                </Link>
              )}
              {ctaSecondary && (
                <Link
                  href={ctaSecondary.href}
                  className="inline-flex h-12 items-center justify-center border border-rule-dark bg-transparent px-8 text-sm font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
                >
                  {ctaSecondary.text}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
