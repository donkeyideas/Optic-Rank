import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/search-ai", label: "Search & AI" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

const footerSections = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/search-ai", label: "Search & AI" },
      { href: "/pricing", label: "Pricing" },
      { href: "/changelog", label: "Changelog" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/guides", label: "Guides" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
      { href: "/press", label: "Press" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
    ],
  },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ---- Top Navigation ---- */}
      <header className="sticky top-0 z-50 border-b border-rule bg-surface-cream/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold tracking-tight text-ink">
              Optic Rank
            </span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-ink-secondary transition-colors hover:text-ink sm:inline-block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center bg-editorial-red px-5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* ---- Main Content ---- */}
      <main className="flex-1">{children}</main>

      {/* ---- Footer ---- */}
      <footer className="border-t-4 border-double border-rule-dark bg-surface-card">
        <div className="mx-auto max-w-7xl px-6 py-16">
          {/* Footer Grid */}
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/" className="inline-block">
                <span className="font-serif text-xl font-bold tracking-tight text-ink">
                  Optic Rank
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-secondary">
                AI-powered SEO intelligence for modern teams. Track, analyze,
                and optimize your search presence.
              </p>
            </div>

            {/* Link Sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  {section.title}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-secondary transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-rule pt-8 sm:flex-row">
            <p className="text-xs text-ink-muted">
              &copy; {new Date().getFullYear()} Optic Rank. All rights
              reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-xs text-ink-muted transition-colors hover:text-ink-secondary"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-xs text-ink-muted transition-colors hover:text-ink-secondary"
              >
                Terms
              </Link>
              <Link
                href="/cookies"
                className="text-xs text-ink-muted transition-colors hover:text-ink-secondary"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
