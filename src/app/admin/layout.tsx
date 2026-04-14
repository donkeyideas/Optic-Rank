import type { Metadata } from "next";
import Link from "next/link";
import { Shield, LogOut } from "lucide-react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/actions/auth";
import { AdminNav } from "./admin-nav";
import { getUnreadContactCount } from "@/lib/dal/admin";
import { Notepad } from "@/components/shared/notepad";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let unreadCount = 0;
  try {
    unreadCount = await getUnreadContactCount();
  } catch {
    // Silently fail — layout should always render
  }
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
          <AdminNav unreadCount={unreadCount} />
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

      <Notepad />
    </div>
  );
}
