"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
  Users,
  Search,
  Trash2,
  Loader2,
  UserPlus,
  ShieldCheck,
  CalendarDays,
  X,
  Mail,
  Building2,
  Crown,
  FolderKanban,
  KeyRound,
  FileSearch,
  Clock,
  CreditCard,
  Gift,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteUserAccount } from "@/lib/actions/auth";
import { getUserDetails, toggleCompAccount } from "@/lib/actions/admin";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  system_role: string | null;
  provider?: string | null;
  created_at: string;
  organizations: {
    name: string;
    plan: string;
  } | null;
}

interface UserDetailsData {
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    system_role: string | null;
    organization_id: string | null;
    onboarding_completed: boolean | null;
    timezone: string | null;
    comp_account: boolean;
    created_at: string;
    email: string | null;
    provider: string;
    lastSignIn: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at: string | null;
    max_projects: number;
    max_keywords: number;
    max_pages_crawl: number;
    max_users: number;
    created_at: string;
  } | null;
  usage: {
    projects: number;
    keywords: number;
    audits: number;
    members: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    created_at: string;
  }>;
  billingEvents: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    created_at: string;
  }>;
  emailLog: Array<{
    id: string;
    subject: string;
    email_type: string;
    status: string;
    error_message: string | null;
    sent_at: string;
    delivered_at: string | null;
    opened_at: string | null;
  }>;
  emailStats: {
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
  };
}

/* ------------------------------------------------------------------
   Provider Icon
   ------------------------------------------------------------------ */

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "google":
      return (
        <span title="Google" className="inline-flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </span>
      );
    case "github":
      return (
        <span title="GitHub" className="inline-flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-ink" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </span>
      );
    default:
      return (
        <span title="Email" className="inline-flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </span>
      );
  }
}

/* ------------------------------------------------------------------
   Email Status Helpers
   ------------------------------------------------------------------ */

function emailStatusColor(status: string) {
  switch (status) {
    case "delivered": return "text-editorial-green";
    case "bounced":
    case "complained":
    case "failed": return "text-editorial-red";
    case "sent": return "text-editorial-gold";
    default: return "text-ink-muted";
  }
}

function emailTypeBadge(type: string) {
  const labels: Record<string, string> = {
    signup_confirmation: "Signup",
    notification: "Notification",
    trial_warning: "Trial Warning",
    trial_expired: "Trial Expired",
    report: "Report",
    contact_confirmation: "Contact",
    support_reply: "Support",
    test_template: "Test",
    general: "General",
  };
  return labels[type] ?? type;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function planBadgeVariant(plan: string) {
  switch (plan) {
    case "business": return "default" as const;
    case "pro": return "danger" as const;
    case "starter": return "info" as const;
    default: return "muted" as const;
  }
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "superadmin": return "danger" as const;
    case "admin": return "warning" as const;
    default: return "muted" as const;
  }
}

function statusBadgeVariant(status: string | null) {
  switch (status) {
    case "active": return "success" as const;
    case "trialing": return "info" as const;
    case "past_due": return "danger" as const;
    case "canceled": return "muted" as const;
    default: return "muted" as const;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/* ------------------------------------------------------------------
   Usage Bar (for detail modal)
   ------------------------------------------------------------------ */

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-ink-secondary">{label}</span>
        <span className={`font-mono text-[11px] tabular-nums ${pct >= 100 ? "font-bold text-editorial-red" : pct >= 80 ? "text-editorial-gold" : "text-ink-muted"}`}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-rule">
        <div
          className={`h-full transition-all ${pct >= 100 ? "bg-editorial-red" : pct >= 80 ? "bg-editorial-gold" : "bg-editorial-green"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Avatar with broken-image fallback
   ------------------------------------------------------------------ */

function AvatarWithFallback({ url, size }: { url: string | null; size: number }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center border border-rule bg-surface-raised"
        style={{ width: size, height: size }}
      >
        <Users size={size * 0.43} className="text-ink-muted" />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 overflow-hidden border border-rule bg-surface-raised"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AdminUsersClient({
  users,
  totalCount,
  stats,
}: {
  users: UserRow[];
  totalCount: number;
  stats: {
    newThisWeek: number;
    newThisMonth: number;
    providerCounts: Record<string, number>;
    adminCount: number;
  };
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // User detail modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const filteredUsers = users.filter((user) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.full_name ?? "").toLowerCase().includes(q) ||
      (user.email ?? "").toLowerCase().includes(q) ||
      (user.organizations?.name ?? "").toLowerCase().includes(q)
    );
  });

  function handleDelete(e: React.MouseEvent, user: UserRow) {
    e.stopPropagation();
    setDeleteTarget({
      id: user.id,
      name: user.full_name ?? "Unknown",
      email: user.email ?? "N/A",
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteUserAccount(deleteTarget.id);
      if ("error" in result) {
        alert(result.error);
      }
      setDeleteTarget(null);
      window.location.reload();
    });
  }

  async function handleUserClick(userId: string) {
    setSelectedUserId(userId);
    setUserDetails(null);
    setDetailsLoading(true);
    const result = await getUserDetails(userId);
    setDetailsLoading(false);
    if ("data" in result) {
      setUserDetails(result.data as UserDetailsData);
    }
  }

  function handleCloseDetail() {
    setSelectedUserId(null);
    setUserDetails(null);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          User Management
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          View, search, and manage all registered users across the platform.
        </p>
      </div>

      {/* ================================================================
          STATS
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Users
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Users size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                New This Week
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-green">
                {stats.newThisWeek}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <UserPlus size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                New This Month
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {stats.newThisMonth}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CalendarDays size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Admins
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {stats.adminCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <ShieldCheck size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SEARCH TOOLBAR
          ================================================================ */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email, or organization..."
            prefixIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          USERS TABLE
          ================================================================ */}
      {users.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="No Users Yet"
            description="No users have registered on the platform yet. Users will appear here as they sign up."
          />
        </div>
      ) : (
        <>
          <Card className="mt-6">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-12 text-center font-sans text-sm text-ink-muted"
                      >
                        No users match your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <TableCell>
                          <ProviderIcon provider={user.provider ?? "email"} />
                        </TableCell>
                        <TableCell className="font-sans font-medium text-ink">
                          {user.full_name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-ink-secondary">
                          {user.email ?? "N/A"}
                        </TableCell>
                        <TableCell className="font-sans text-ink-secondary">
                          {user.organizations?.name ?? "No org"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={planBadgeVariant(user.organizations?.plan ?? "free")}>
                            {user.organizations?.plan ?? "free"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-sans text-ink-secondary">
                          {user.role ?? "member"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariant(user.system_role ?? "user")}>
                            {user.system_role ?? "user"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-ink-muted">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, user)}
                            className="text-ink-muted transition-colors hover:text-editorial-red"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="mt-3 text-xs text-ink-muted">
            Showing {filteredUsers.length} of {totalCount} users
          </p>
        </>
      )}

      {/* ================================================================
          USER DETAIL MODAL
          ================================================================ */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-rule bg-surface-cream shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-surface-cream px-6 py-4">
              <h3 className="font-serif text-base font-bold text-ink">
                User Details
              </h3>
              <button
                onClick={handleCloseDetail}
                className="flex h-7 w-7 items-center justify-center text-ink-muted transition-colors hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-ink-muted" />
              </div>
            ) : userDetails ? (
              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-start gap-4">
                  <AvatarWithFallback
                    url={userDetails.profile.avatar_url}
                    size={56}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-xl font-bold text-ink">
                        {userDetails.profile.full_name ?? "Unknown"}
                      </h4>
                      <Badge variant={roleBadgeVariant(userDetails.profile.system_role ?? "user")}>
                        {userDetails.profile.system_role ?? "user"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Mail size={11} />
                        {userDetails.profile.email ?? "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <ProviderIcon provider={userDetails.profile.provider} />
                        {userDetails.profile.provider}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Projects</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{userDetails.usage.projects}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keywords</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{userDetails.usage.keywords.toLocaleString()}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Site Audits</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{userDetails.usage.audits}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Team Members</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{userDetails.usage.members}</p>
                  </div>
                </div>

                {/* Organization & Plan */}
                {userDetails.organization && (
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Organization
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-serif text-sm font-bold text-ink">
                          {userDetails.organization.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                          {userDetails.organization.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={planBadgeVariant(userDetails.organization.plan)}>
                          {userDetails.organization.plan}
                        </Badge>
                        <Badge variant={statusBadgeVariant(userDetails.organization.subscription_status)}>
                          {userDetails.organization.subscription_status ?? "none"}
                        </Badge>
                      </div>
                    </div>

                    {/* Usage bars */}
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      <UsageBar
                        label="Projects"
                        current={userDetails.usage.projects}
                        limit={userDetails.organization.max_projects}
                      />
                      <UsageBar
                        label="Keywords"
                        current={userDetails.usage.keywords}
                        limit={userDetails.organization.max_keywords}
                      />
                      <UsageBar
                        label="Pages / Audit"
                        current={0}
                        limit={userDetails.organization.max_pages_crawl}
                      />
                      <UsageBar
                        label="Team Members"
                        current={userDetails.usage.members}
                        limit={userDetails.organization.max_users}
                      />
                    </div>

                    {/* Trial info */}
                    {userDetails.organization.trial_ends_at && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs">
                        <Clock size={11} className="text-ink-muted" />
                        <span className={`font-mono text-[11px] ${
                          new Date(userDetails.organization.trial_ends_at) < new Date()
                            ? "font-bold text-editorial-red"
                            : "text-ink-muted"
                        }`}>
                          Trial {new Date(userDetails.organization.trial_ends_at) < new Date() ? "expired" : "ends"}{" "}
                          {formatDate(userDetails.organization.trial_ends_at)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Account Details */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Account Info
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Role</span>
                        <span className="font-medium text-ink">{userDetails.profile.role ?? "member"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Created</span>
                        <span className="font-mono text-[11px] text-ink">{formatDate(userDetails.profile.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Last Sign In</span>
                        <span className="font-mono text-[11px] text-ink">
                          {userDetails.profile.lastSignIn ? timeAgo(userDetails.profile.lastSignIn) : "Never"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Timezone</span>
                        <span className="font-mono text-[11px] text-ink">{userDetails.profile.timezone ?? "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Onboarding</span>
                        <span className={`font-mono text-[11px] ${userDetails.profile.onboarding_completed ? "text-editorial-green" : "text-editorial-gold"}`}>
                          {userDetails.profile.onboarding_completed ? "Complete" : "Incomplete"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Billing & Subscription */}
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Billing & Subscription
                      </span>
                    </div>

                    {/* Subscription info from org */}
                    {userDetails.organization && (
                      <div className="space-y-2 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Plan</span>
                          <span className="font-medium capitalize text-ink">{userDetails.organization.plan}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Status</span>
                          <span className={`font-medium capitalize ${
                            userDetails.organization.subscription_status === "active"
                              ? "text-editorial-green"
                              : userDetails.organization.subscription_status === "past_due"
                              ? "text-editorial-red"
                              : "text-ink"
                          }`}>
                            {userDetails.organization.subscription_status ?? "none"}
                          </span>
                        </div>
                        {userDetails.organization.stripe_customer_id && (
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Stripe Customer</span>
                            <span className="font-mono text-[10px] text-ink-secondary">
                              {userDetails.organization.stripe_customer_id.slice(0, 18)}…
                            </span>
                          </div>
                        )}
                        {userDetails.organization.stripe_subscription_id && (
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Subscription ID</span>
                            <span className="font-mono text-[10px] text-ink-secondary">
                              {userDetails.organization.stripe_subscription_id.slice(0, 18)}…
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Billing events */}
                    {userDetails.billingEvents.length > 0 && (
                      <>
                        <div className="mb-2 border-t border-rule pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                            Payment History
                          </span>
                        </div>
                        <div className="space-y-2">
                          {userDetails.billingEvents.map((ev) => (
                            <div key={ev.id} className="flex items-center justify-between text-xs">
                              <span className="capitalize text-ink-secondary">
                                {ev.event_type.replace(/\./g, " ").replace(/_/g, " ")}
                              </span>
                              <div className="flex items-center gap-2">
                                {ev.amount_cents != null && ev.amount_cents > 0 && (
                                  <span className="font-mono text-[11px] font-bold text-editorial-green">
                                    ${(ev.amount_cents / 100).toFixed(2)}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-ink-muted">
                                  {timeAgo(ev.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {!userDetails.organization?.stripe_customer_id && userDetails.billingEvents.length === 0 && (
                      <p className="text-xs text-ink-muted">No billing activity yet</p>
                    )}
                  </div>
                </div>

                {/* Complimentary Account Toggle */}
                <div className="border border-rule bg-surface-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gift size={16} className="text-editorial-gold" />
                      <div>
                        <p className="text-xs font-bold text-ink">Complimentary Account</p>
                        <p className="mt-0.5 text-[10px] text-ink-muted">
                          Unlimited plan access — no billing. Unchecking starts the billing clock.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={userDetails.profile.comp_account}
                        onChange={async (e) => {
                          const enabled = e.target.checked;
                          // Optimistically update UI
                          setUserDetails((prev) =>
                            prev
                              ? { ...prev, profile: { ...prev.profile, comp_account: enabled } }
                              : prev
                          );
                          const res = await toggleCompAccount(userDetails.profile.id, enabled);
                          if ("error" in res) {
                            // Revert on failure
                            setUserDetails((prev) =>
                              prev
                                ? { ...prev, profile: { ...prev.profile, comp_account: !enabled } }
                                : prev
                            );
                          }
                        }}
                      />
                      <div className="h-5 w-9 border border-rule bg-surface-card peer-checked:bg-editorial-green peer-checked:border-editorial-green transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-3.5 after:w-3.5 after:border after:border-rule after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  </div>
                  {userDetails.profile.comp_account && (
                    <div className="mt-3 flex items-center gap-1.5 border-t border-rule pt-3">
                      <span className="font-mono text-[10px] font-bold text-editorial-green">
                        ACTIVE — Unlimited plan, $0 forever
                      </span>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                {userDetails.recentActivity.length > 0 && (
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Recent Activity
                      </span>
                    </div>
                    <div className="space-y-2">
                      {userDetails.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-ink">{activity.action}</span>
                            {activity.resource_type && (
                              <span className="text-ink-muted">on {activity.resource_type}</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-ink-muted">
                            {timeAgo(activity.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email Delivery Log */}
                <div className="border border-rule bg-surface-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail size={14} className="text-ink-muted" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Email Delivery
                    </span>
                  </div>

                  {/* Email stats summary */}
                  {userDetails.emailStats && userDetails.emailStats.sent > 0 && (
                    <div className="mb-3 flex items-center gap-3 text-xs">
                      <span className="font-mono text-[11px] text-ink">
                        {userDetails.emailStats.sent} sent
                      </span>
                      <span className="font-mono text-[11px] text-editorial-green">
                        {userDetails.emailStats.delivered} delivered
                      </span>
                      {userDetails.emailStats.bounced > 0 && (
                        <span className="font-mono text-[11px] text-editorial-red">
                          {userDetails.emailStats.bounced} bounced
                        </span>
                      )}
                      {userDetails.emailStats.opened > 0 && (
                        <span className="font-mono text-[11px] text-ink-secondary">
                          {userDetails.emailStats.opened} opened
                        </span>
                      )}
                    </div>
                  )}

                  {/* Email log table */}
                  {userDetails.emailLog && userDetails.emailLog.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.emailLog.map((email) => (
                        <div key={email.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`shrink-0 font-mono text-[10px] font-bold uppercase ${emailStatusColor(email.status)}`}>
                              {email.status}
                            </span>
                            <span className="shrink-0 border border-rule bg-surface-raised px-1.5 py-0.5 font-mono text-[9px] text-ink-muted">
                              {emailTypeBadge(email.email_type)}
                            </span>
                            <span className="truncate text-ink" title={email.subject}>
                              {email.subject}
                            </span>
                          </div>
                          <span className="shrink-0 ml-2 font-mono text-[10px] text-ink-muted">
                            {timeAgo(email.sent_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">No emails sent to this user yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-ink-muted">
                Failed to load user details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          DELETE CONFIRMATION MODAL
          ================================================================ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this user?
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <div className="border border-rule bg-surface-raised p-4">
                <p className="text-sm font-bold text-ink">{deleteTarget.name}</p>
                <p className="text-xs text-ink-muted">{deleteTarget.email}</p>
              </div>
              <p className="text-xs text-editorial-red">
                This action is permanent. The user&apos;s profile, data, and authentication will be deleted.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmDelete}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
