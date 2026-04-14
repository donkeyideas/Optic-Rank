import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-cream px-4 py-12">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
        404
      </span>
      <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-ink">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-ink-secondary">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center bg-editorial-red px-6 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
      >
        Back to Homepage
      </Link>
    </div>
  );
}
