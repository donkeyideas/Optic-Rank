"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  /** Whether this nav item is the currently active route */
  active?: boolean;
  /** Additional path prefixes that should also highlight this nav item */
  matchPaths?: string[];
}

export interface PaperNavProps {
  items: NavItem[];
  /** Callback when a nav link is clicked. If not provided, native <a> navigation is used. */
  onNavigate?: (href: string) => void;
  className?: string;
}

export function PaperNav({ items, onNavigate, className }: PaperNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function isActive(item: NavItem) {
    const matchesExtra = item.matchPaths?.some((p) => pathname.startsWith(p)) ?? false;
    return (
      item.active ??
      (item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href) || matchesExtra)
    );
  }

  return (
    <>
      {/* ── Desktop nav ── */}
      <nav
        className={cn(
          "hidden lg:flex items-center justify-center gap-8 border-b border-rule bg-surface-card px-6 py-3",
          className,
        )}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate(item.href);
              }
            }}
            className={cn(
              "relative font-sans text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors",
              "hover:text-editorial-red",
              isActive(item)
                ? "text-editorial-red after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary",
            )}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* ── Mobile hamburger bar ── */}
      <div
        className={cn(
          "flex lg:hidden items-center justify-between border-b border-rule bg-surface-card px-4 py-3",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 text-ink hover:text-editorial-red transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={20} strokeWidth={2} />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px]">Menu</span>
        </button>
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-surface-card border-r border-rule shadow-xl",
          "transform transition-transform duration-300 ease-in-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-rule px-4 py-4">
          <span className="font-serif text-lg font-bold text-ink">
            Optic <span className="text-editorial-red">Rank</span>
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="inline-flex items-center justify-center h-8 w-8 text-ink-muted hover:text-ink transition-colors"
            aria-label="Close navigation menu"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Drawer nav items */}
        <nav className="flex flex-col py-2">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate(item.href);
                }
                setDrawerOpen(false);
              }}
              className={cn(
                "px-5 py-3 font-sans text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors",
                "border-l-2",
                isActive(item)
                  ? "text-editorial-red border-l-editorial-red bg-surface-raised"
                  : "text-ink-secondary border-l-transparent hover:text-ink hover:bg-surface-raised",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
