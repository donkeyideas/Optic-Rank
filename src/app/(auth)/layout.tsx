import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-cream px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="font-serif text-2xl font-bold tracking-tight text-ink">
          Optic Rank
        </span>
      </Link>

      {/* Card Container */}
      <div className="w-full max-w-md border border-rule bg-surface-card">
        <div className="p-8">{children}</div>
      </div>

      {/* Back to Home */}
      <Link
        href="/"
        className="mt-6 text-sm text-ink-muted transition-colors hover:text-ink-secondary"
      >
        &larr; Back to homepage
      </Link>
    </div>
  );
}
