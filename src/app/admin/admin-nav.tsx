"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Building2,
  CreditCard,
  Activity,
  BarChart3,
  Key,
  Tag,
  FileText,
  Search,
  BookOpen,
  History,
  Map,
  Briefcase,
  Mail,
  Bell,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin",            label: "Overview",       icon: BarChart3 },
  { href: "/admin/users",      label: "Users",          icon: Users },
  { href: "/admin/orgs",       label: "Organizations",  icon: Building2 },
  { href: "/admin/billing",    label: "Billing",        icon: CreditCard },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Tag },
  { href: "/admin/content",    label: "Content",        icon: FileText },
  { href: "/admin/search-ai",  label: "Search & AI",    icon: Search },
  { href: "/admin/api",        label: "API Management", icon: Key },
  { href: "/admin/health",     label: "System Health",  icon: Activity },
  { href: "/admin/analytics",  label: "Analytics",      icon: BarChart3 },
  { href: "/admin/blog",       label: "Blog",           icon: BookOpen },
  { href: "/admin/changelog",  label: "Changelog",      icon: History },
  { href: "/admin/roadmap",    label: "Roadmap",        icon: Map },
  { href: "/admin/careers",    label: "Careers",        icon: Briefcase },
  { href: "/admin/contacts",   label: "Contacts",       icon: Mail },
];

export function AdminNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        const isNotifications = item.href === "/admin/notifications";

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-none px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-l-2 border-editorial-red bg-surface-raised text-ink"
                  : "border-l-2 border-transparent text-ink-secondary hover:bg-surface-raised hover:text-ink"
              }`}
            >
              <span className="relative shrink-0">
                <Icon size={16} strokeWidth={1.5} />
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-editorial-red px-0.5 text-[8px] font-bold leading-none text-white animate-bounce">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="flex-1">{item.label}</span>
              {isNotifications && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-editorial-red px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
