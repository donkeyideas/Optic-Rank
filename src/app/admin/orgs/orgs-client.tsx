"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Search,
  Trash2,
  Loader2,
  CreditCard,
  Users,
  FolderKanban,
  X,
  Clock,
  Crown,
  AlertTriangle,
  Tag,
  Mail,
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
import { getOrgDetails, deleteOrganization } from "@/lib/actions/admin";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  memberCount: number;
  projectCount: number;
}

interface OrgDetailsData {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    plan: string;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at: string | null;
    max_projects: number;
    max_keywords: number;
    max_pages_crawl: number;
    max_users: number;
    features: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
  members: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    system_role: string | null;
    created_at: string;
    email: string | null;
    provider: string;
    lastSignIn: string | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    domain: string | null;
    created_at: string;
  }>;
  usage: {
    projects: number;
    keywords: number;
    audits: number;
    apiKeys: number;
    members: number;
  };
  billingEvents: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    created_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    user_id: string | null;
    created_at: string;
  }>;
}

/* ------------------------------------------------------------------
   Provider Icon
   ------------------------------------------------------------------ */

function ProviderIcon({ provider }: { provider: string }) {
  switch (provider) {
    case "google":
      return (
        <span title="Google" className="inline-flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-ink" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </span>
      );
    default:
      return (
        <span title="Email" className="inline-flex items-center justify-center">
          <Mail size={12} className="text-ink-muted" />
        </span>
      );
  }
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

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active": return "success" as const;
    case "trialing": return "info" as const;
    case "past_due": return "warning" as const;
    case "canceled":
    case "unpaid": return "danger" as const;
    default: return "muted" as const;
  }
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "owner": return "warning" as const;
    case "admin": return "info" as const;
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
   Usage Bar
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
   Component
   ------------------------------------------------------------------ */

export function AdminOrgsClient({
  orgs,
  totalCount,
  stats,
}: {
  orgs: OrgRow[];
  totalCount: number;
  stats: {
    paidOrgs: number;
    trialingOrgs: number;
    orphanedOrgs: number;
    totalMembers: number;
    totalProjects: number;
  };
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Org detail modal state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetails, setOrgDetails] = useState<OrgDetailsData | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const filteredOrgs = orgs.filter((org) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.slug ?? "").toLowerCase().includes(q)
    );
  });

  function handleDelete(e: React.MouseEvent, org: OrgRow) {
    e.stopPropagation();
    setDeleteTarget({ id: org.id, name: org.name });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteOrganization(deleteTarget.id);
      if ("error" in result) {
        alert(result.error);
      }
      setDeleteTarget(null);
      window.location.reload();
    });
  }

  async function handleOrgClick(orgId: string) {
    setSelectedOrgId(orgId);
    setOrgDetails(null);
    setDetailsLoading(true);
    const result = await getOrgDetails(orgId);
    setDetailsLoading(false);
    if ("data" in result) {
      setOrgDetails(result.data as OrgDetailsData);
    }
  }

  function handleCloseDetail() {
    setSelectedOrgId(null);
    setOrgDetails(null);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          Organizations
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Manage organizations, view team composition, and track subscription
          health.
        </p>
      </div>

      {/* ================================================================
          STATS
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Orgs
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Building2 size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Paid
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-green">
                {stats.paidOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CreditCard size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Trialing
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {stats.trialingOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Clock size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Members
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {stats.totalMembers}
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
                Orphaned
              </p>
              <p className={`mt-1 font-serif text-2xl font-bold tracking-tight ${stats.orphanedOrgs > 0 ? "text-editorial-red" : "text-ink"}`}>
                {stats.orphanedOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <AlertTriangle size={18} strokeWidth={1.5} className="text-ink-muted" />
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
            placeholder="Search by organization name or slug..."
            prefixIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          ORGANIZATIONS TABLE
          ================================================================ */}
      {orgs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Building2}
            title="No Organizations Yet"
            description="No organizations have been created on the platform yet. Organizations will appear here as users create them."
          />
        </div>
      ) : (
        <>
          <Card className="mt-6">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Trial</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-12 text-center font-sans text-sm text-ink-muted"
                      >
                        No organizations match your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrgs.map((org) => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer"
                        onClick={() => handleOrgClick(org.id)}
                      >
                        <TableCell className="font-sans font-medium text-ink">
                          {org.name}
                          {org.memberCount === 0 && (
                            <span className="ml-2 inline-block text-editorial-red" title="No members — orphaned">
                              <AlertTriangle size={12} className="inline" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-secondary">
                          {org.slug ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={planBadgeVariant(org.plan)}>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className={org.memberCount === 0 ? "font-bold text-editorial-red" : "text-ink-secondary"}>
                          {org.memberCount}
                        </TableCell>
                        <TableCell className="text-ink-secondary">
                          {org.projectCount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(
                              org.subscription_status ?? "none"
                            )}
                          >
                            {org.subscription_status ?? "none"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {org.trial_ends_at ? (
                            <span className={`font-mono text-[11px] ${
                              new Date(org.trial_ends_at) < new Date()
                                ? "font-bold text-editorial-red"
                                : "text-ink-muted"
                            }`}>
                              {new Date(org.trial_ends_at) < new Date()
                                ? "Expired"
                                : `${Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left`}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">---</span>
                          )}
                        </TableCell>
                        <TableCell className="text-ink-muted">
                          {formatDate(org.created_at)}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, org)}
                            className="text-ink-muted transition-colors hover:text-editorial-red"
                            title="Delete organization"
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
            Showing {filteredOrgs.length} of {totalCount} organizations
          </p>
        </>
      )}

      {/* ================================================================
          ORG DETAIL MODAL
          ================================================================ */}
      {selectedOrgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-rule bg-surface-cream shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-surface-cream px-6 py-4">
              <h3 className="font-serif text-base font-bold text-ink">
                Organization Details
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
            ) : orgDetails ? (
              <div className="p-6 space-y-6">
                {/* Org Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-serif text-xl font-bold text-ink">
                      {orgDetails.organization.name}
                    </h4>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
                      {orgDetails.organization.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={planBadgeVariant(orgDetails.organization.plan)}>
                      {orgDetails.organization.plan}
                    </Badge>
                    <Badge variant={statusBadgeVariant(orgDetails.organization.subscription_status ?? "none")}>
                      {orgDetails.organization.subscription_status ?? "none"}
                    </Badge>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Members</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{orgDetails.usage.members}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Projects</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{orgDetails.usage.projects}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keywords</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{orgDetails.usage.keywords.toLocaleString()}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Audits</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{orgDetails.usage.audits}</p>
                  </div>
                  <div className="border border-rule bg-surface-card p-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">API Keys</p>
                    <p className="mt-1 font-serif text-xl font-bold text-ink">{orgDetails.usage.apiKeys}</p>
                  </div>
                </div>

                {/* Plan Limits */}
                <div className="border border-rule bg-surface-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={14} className="text-ink-muted" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Plan Limits & Usage
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <UsageBar
                      label="Projects"
                      current={orgDetails.usage.projects}
                      limit={orgDetails.organization.max_projects}
                    />
                    <UsageBar
                      label="Keywords"
                      current={orgDetails.usage.keywords}
                      limit={orgDetails.organization.max_keywords}
                    />
                    <UsageBar
                      label="Pages / Audit"
                      current={0}
                      limit={orgDetails.organization.max_pages_crawl}
                    />
                    <UsageBar
                      label="Team Members"
                      current={orgDetails.usage.members}
                      limit={orgDetails.organization.max_users}
                    />
                  </div>
                  {orgDetails.organization.trial_ends_at && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <Clock size={11} className="text-ink-muted" />
                      <span className={`font-mono text-[11px] ${
                        new Date(orgDetails.organization.trial_ends_at) < new Date()
                          ? "font-bold text-editorial-red"
                          : "text-ink-muted"
                      }`}>
                        Trial {new Date(orgDetails.organization.trial_ends_at) < new Date() ? "expired" : "ends"}{" "}
                        {formatDate(orgDetails.organization.trial_ends_at)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Members List */}
                <div className="border border-rule bg-surface-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-ink-muted" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Members ({orgDetails.members.length})
                    </span>
                  </div>
                  {orgDetails.members.length === 0 ? (
                    <p className="text-xs text-editorial-red font-medium">No members — this organization is orphaned</p>
                  ) : (
                    <div className="space-y-2">
                      {orgDetails.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <ProviderIcon provider={member.provider} />
                            <span className="font-medium text-ink">
                              {member.full_name ?? "Unknown"}
                            </span>
                            <span className="text-ink-muted">
                              {member.email ?? "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={roleBadgeVariant(member.role ?? "member")}>
                              {member.role ?? "member"}
                            </Badge>
                            {member.lastSignIn && (
                              <span className="font-mono text-[10px] text-ink-muted">
                                {timeAgo(member.lastSignIn)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects List */}
                {orgDetails.projects.length > 0 && (
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderKanban size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Projects ({orgDetails.usage.projects})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {orgDetails.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-ink">{project.name}</span>
                            {project.domain && (
                              <span className="ml-2 font-mono text-[10px] text-ink-muted">{project.domain}</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-ink-muted">
                            {formatDate(project.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing & Subscription + Org Info side by side */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Billing */}
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Billing & Subscription
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Plan</span>
                        <span className="font-medium capitalize text-ink">{orgDetails.organization.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Status</span>
                        <span className={`font-medium capitalize ${
                          orgDetails.organization.subscription_status === "active"
                            ? "text-editorial-green"
                            : orgDetails.organization.subscription_status === "past_due"
                            ? "text-editorial-red"
                            : "text-ink"
                        }`}>
                          {orgDetails.organization.subscription_status ?? "none"}
                        </span>
                      </div>
                      {orgDetails.organization.stripe_customer_id && (
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Customer</span>
                          <span className="font-mono text-[10px] text-ink-secondary">
                            {orgDetails.organization.stripe_customer_id.slice(0, 18)}…
                          </span>
                        </div>
                      )}
                      {orgDetails.organization.stripe_subscription_id && (
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Subscription</span>
                          <span className="font-mono text-[10px] text-ink-secondary">
                            {orgDetails.organization.stripe_subscription_id.slice(0, 18)}…
                          </span>
                        </div>
                      )}
                    </div>
                    {orgDetails.billingEvents.length > 0 && (
                      <>
                        <div className="my-2 border-t border-rule pt-2">
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                            Payment History
                          </span>
                        </div>
                        <div className="space-y-2">
                          {orgDetails.billingEvents.map((ev) => (
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
                  </div>

                  {/* Org Info */}
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Organization Info
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Created</span>
                        <span className="font-mono text-[11px] text-ink">{formatDate(orgDetails.organization.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Updated</span>
                        <span className="font-mono text-[11px] text-ink">{timeAgo(orgDetails.organization.updated_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Max Projects</span>
                        <span className="font-mono text-[11px] text-ink">{orgDetails.organization.max_projects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Max Keywords</span>
                        <span className="font-mono text-[11px] text-ink">{orgDetails.organization.max_keywords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Max Pages/Crawl</span>
                        <span className="font-mono text-[11px] text-ink">{orgDetails.organization.max_pages_crawl.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-muted">Max Users</span>
                        <span className="font-mono text-[11px] text-ink">{orgDetails.organization.max_users}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {orgDetails.recentActivity.length > 0 && (
                  <div className="border border-rule bg-surface-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} className="text-ink-muted" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Recent Activity
                      </span>
                    </div>
                    <div className="space-y-2">
                      {orgDetails.recentActivity.map((activity) => (
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
              </div>
            ) : (
              <div className="py-20 text-center text-sm text-ink-muted">
                Failed to load organization details.
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
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this organization?
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <div className="border border-rule bg-surface-raised p-4">
                <p className="text-sm font-bold text-ink">{deleteTarget.name}</p>
              </div>
              <p className="text-xs text-editorial-red">
                This action is permanent. All projects, keywords, audits, billing events, and other data
                belonging to this organization will be deleted. Member profiles will be unlinked.
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
                  Delete Organization
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
