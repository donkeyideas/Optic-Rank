import Link from "next/link";
import {
  Users,
  Building2,
  CreditCard,
  Activity,
  BarChart3,
  Shield,
  LogOut,
  Key,
  Tag,
  FileText,
  Search,
  BookOpen,
  History,
  Map,
  Briefcase,
  Mail,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/actions/auth";

const adminNavItems = [
  { href: "/admin",            label: "Overview",      icon: BarChart3 },
  { href: "/admin/users",      label: "Users",         icon: Users },
  { href: "/admin/orgs",       label: "Organizations", icon: Building2 },
  { href: "/admin/billing",    label: "Billing",       icon: CreditCard },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
  { href: "/admin/content",    label: "Content",       icon: FileText },
  { href: "/admin/search-ai",  label: "Search & AI",   icon: Search },
  { href: "/admin/api",         label: "API Management", icon: Key },
  { href: "/admin/health",     label: "System Health",  icon: Activity },
  { href: "/admin/analytics",  label: "Analytics",     icon: BarChart3 },
  { href: "/admin/blog",       label: "Blog",          icon: BookOpen },
  { href: "/admin/changelog",  label: "Changelog",     icon: History },
  { href: "/admin/roadmap",    label: "Roadmap",       icon: Map },
  { href: "/admin/careers",    label: "Careers",       icon: Briefcase },
  { href: "/admin/contacts",   label: "Contacts",      icon: Mail },
];

/**
 * Admin Layout
 *
 * Simple sidebar navigation layout for internal admin pages.
 * Protected by admin-only role check (to be added later).
 */
// TODO: Add admin-only role check using Supabase auth + RLS
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-cream">
      {/* ---- Sidebar ---- */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-rule bg-surface-card">
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold tracking-tight text-ink">
              Optic Rank
            </span>
          </Link>
          <Badge variant="danger">Admin</Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink"
                  >
                    <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-rule px-5 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-medium text-ink-muted transition-colors hover:text-ink-secondary"
            >
              &larr; Back to Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ---- Main Content Area ---- */}
      <div className="flex flex-1 flex-col">
        {/* Admin Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule bg-surface-cream/95 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Shield size={16} strokeWidth={1.5} className="text-editorial-red" />
            <h1 className="text-sm font-bold uppercase tracking-widest text-ink">
              Administration
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-ink-muted transition-colors hover:text-ink-secondary"
            >
              User Dashboard
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-editorial-red"
              >
                <LogOut size={14} strokeWidth={1.5} />
                Sign Out
              </button>
            </form>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
