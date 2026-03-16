"use client";

import {
  Building2,
  CreditCard,
  DollarSign,
  Receipt,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Org {
  id: string;
  name: string;
  plan: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

interface BillingEvent {
  id: string;
  event_type?: string;
  stripe_event_id?: string;
  organization_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at: string;
  [key: string]: unknown;
}

interface BillingClientProps {
  totalOrgs: number;
  paidOrgs: number;
  planCounts: Record<string, number>;
  billingEvents: BillingEvent[];
  orgs: Org[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function planBadgeVariant(plan: string) {
  switch (plan.toLowerCase()) {
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

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="muted">None</Badge>;
  switch (status.toLowerCase()) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "trialing":
      return <Badge variant="info">Trialing</Badge>;
    case "past_due":
      return <Badge variant="danger">Past Due</Badge>;
    case "canceled":
      return <Badge variant="muted">Canceled</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}

function planColor(plan: string): "dark" | "red" | "blue" | "gold" {
  switch (plan.toLowerCase()) {
    case "business":
      return "dark";
    case "pro":
      return "red";
    case "starter":
      return "blue";
    default:
      return "gold";
  }
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function BillingClient({
  totalOrgs,
  paidOrgs,
  planCounts,
  billingEvents,
  orgs,
}: BillingClientProps) {
  // Sort plan entries for display — descending by count
  const planEntries = Object.entries(planCounts).sort(([, a], [, b]) => b - a);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">Billing</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Organization billing overview, subscriptions, and billing events.
        </p>
      </div>

      {/* ================================================================
          STATS CARDS
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Orgs */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Orgs
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Building2 size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Paid Orgs */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Paid Orgs
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {paidOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <DollarSign size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Free Orgs */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Free Orgs
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalOrgs - paidOrgs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Building2 size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Plan Count */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Distinct Plans
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {planEntries.length}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CreditCard size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          TABS
          ================================================================ */}
      <div className="mt-8">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          {/* ---- Overview Tab ---- */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {planEntries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">
                    No organizations exist yet.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {planEntries.map(([plan, count]) => {
                      const percentage =
                        totalOrgs > 0
                          ? Math.round((count / totalOrgs) * 100)
                          : 0;
                      return (
                        <div key={plan}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={planBadgeVariant(plan)}>
                                {plan}
                              </Badge>
                              <span className="text-xs text-ink-muted">
                                {count} {count === 1 ? "org" : "orgs"}
                              </span>
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                              {percentage}%
                            </span>
                          </div>
                          <Progress
                            value={percentage}
                            color={planColor(plan)}
                            size="sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Subscriptions Tab ---- */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Organizations</CardTitle>
                  <div className="flex items-center gap-2">
                    <CreditCard
                      size={14}
                      strokeWidth={1.5}
                      className="text-ink-muted"
                    />
                    <span className="text-xs text-ink-muted">
                      {orgs.length} {orgs.length === 1 ? "organization" : "organizations"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {orgs.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No organizations yet"
                    description="Organizations will appear here once users create them."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Subscription Status</TableHead>
                        <TableHead>Stripe Customer ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgs.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-sans font-medium text-ink">
                            {org.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={planBadgeVariant(org.plan)}>
                              {org.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {statusBadge(org.subscription_status)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink-muted">
                            {org.stripe_customer_id ?? "---"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Events Tab ---- */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Billing Events</CardTitle>
                  <div className="flex items-center gap-2">
                    <Receipt
                      size={14}
                      strokeWidth={1.5}
                      className="text-ink-muted"
                    />
                    <span className="text-xs text-ink-muted">
                      {billingEvents.length} {billingEvents.length === 1 ? "event" : "events"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {billingEvents.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No billing events"
                    description="No billing events recorded yet."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Stripe Event ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-sans font-medium text-ink">
                            {event.event_type ?? "---"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink-muted">
                            {event.stripe_event_id ?? "---"}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-ink">
                            {event.amount != null
                              ? `${event.currency?.toUpperCase() ?? "USD"} ${(event.amount / 100).toFixed(2)}`
                              : "---"}
                          </TableCell>
                          <TableCell>
                            {event.status ? (
                              <Badge
                                variant={
                                  event.status === "succeeded"
                                    ? "success"
                                    : event.status === "failed"
                                      ? "danger"
                                      : "muted"
                                }
                              >
                                {event.status}
                              </Badge>
                            ) : (
                              <span className="text-xs text-ink-muted">---</span>
                            )}
                          </TableCell>
                          <TableCell className="text-ink-muted">
                            {new Date(event.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
