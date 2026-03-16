"use client";

import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface OrgRow {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  subscription_status: string | null;
  created_at: string;
  memberCount: number;
  projectCount: number;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function planBadgeVariant(plan: string) {
  switch (plan) {
    case "business":
      return "default" as const;
    case "pro":
      return "danger" as const;
    case "starter":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "trialing":
      return "info" as const;
    case "past_due":
      return "warning" as const;
    case "canceled":
    case "unpaid":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AdminOrgsClient({
  orgs,
  totalCount,
}: {
  orgs: OrgRow[];
  totalCount: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrgs = orgs.filter((org) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.slug ?? "").toLowerCase().includes(q)
    );
  });

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Organizations
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Building2
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted"
              />
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
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center font-sans text-sm text-ink-muted"
                      >
                        No organizations match your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrgs.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-sans font-medium text-ink">
                          {org.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-secondary">
                          {org.slug ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={planBadgeVariant(org.plan)}>
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-ink-secondary">
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
                        <TableCell className="text-ink-muted">
                          {formatDate(org.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Result count */}
          <p className="mt-3 text-xs text-ink-muted">
            Showing {filteredOrgs.length} of {totalCount} organizations
          </p>
        </>
      )}
    </div>
  );
}
