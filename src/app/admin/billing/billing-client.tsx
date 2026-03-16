"use client";

import {
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CalendarClock,
  XCircle,
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
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface BillingEvent {
  id: string;
  event_type?: string;
  stripe_event_id?: string;
  organization_id?: string;
  amount_cents?: number;
  currency?: string;
  created_at: string;
  [key: string]: unknown;
}

interface SubscriptionDetail {
  orgId: string;
  orgName: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  canceledAt: string | null;
  cancelAtPeriodEnd: boolean;
  created: string;
  trialEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface RevenueData {
  mrr: number;
  arr: number;
  arpu: number;
  totalRevenue: number;
  activeSubscriptions: number;
  trialingOrgs: number;
  canceledOrgs: number;
  pastDueOrgs: number;
  churnRate: number;
  trialConversion: number;
  revenueByPlan: Record<string, { count: number; mrr: number }>;
  monthlyRevenue: Record<string, number>;
}

interface BillingClientProps {
  totalOrgs: number;
  paidOrgs: number;
  planCounts: Record<string, number>;
  billingEvents: BillingEvent[];
  orgs: Org[];
  revenue: RevenueData;
  subscriptions: SubscriptionDetail[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function planBadgeVariant(plan: string) {
  switch (plan.toLowerCase()) {
    case "business": return "default" as const;
    case "pro": return "danger" as const;
    case "starter": return "info" as const;
    default: return "muted" as const;
  }
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="muted">None</Badge>;
  switch (status.toLowerCase()) {
    case "active": return <Badge variant="success">Active</Badge>;
    case "trialing": return <Badge variant="info">Trialing</Badge>;
    case "past_due": return <Badge variant="danger">Past Due</Badge>;
    case "canceled": return <Badge variant="muted">Canceled</Badge>;
    case "incomplete": return <Badge variant="warning">Incomplete</Badge>;
    default: return <Badge variant="muted">{status}</Badge>;
  }
}

function planColor(plan: string): "dark" | "red" | "blue" | "gold" {
  switch (plan.toLowerCase()) {
    case "business": return "dark";
    case "pro": return "red";
    case "starter": return "blue";
    default: return "gold";
  }
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDollars(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------
   Stat Card
   ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-serif text-2xl font-bold tracking-tight text-ink">
              {value}
            </p>
            {trend === "up" && <TrendingUp size={14} className="text-editorial-green" />}
            {trend === "down" && <TrendingDown size={14} className="text-editorial-red" />}
          </div>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[10px] text-ink-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
          <Icon size={18} strokeWidth={1.5} className="text-ink-muted" />
        </div>
      </CardContent>
    </Card>
  );
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
  revenue,
  subscriptions,
}: BillingClientProps) {
  const planEntries = Object.entries(planCounts).sort(([, a], [, b]) => b - a);
  const revenueByPlanEntries = Object.entries(revenue.revenueByPlan).sort(
    ([, a], [, b]) => b.mrr - a.mrr
  );
  const maxPlanMrr = revenueByPlanEntries.length > 0
    ? Math.max(...revenueByPlanEntries.map(([, v]) => v.mrr))
    : 0;

  const monthlyEntries = Object.entries(revenue.monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonthlyRevenue = monthlyEntries.length > 0
    ? Math.max(...monthlyEntries.map(([, v]) => v))
    : 0;

  // Payment transactions from billing events
  const transactions = billingEvents.filter(
    e => e.event_type === "invoice.paid" || e.event_type === "checkout.session.completed"
  );

  // Org lookup for enrichment
  const orgMap = new Map(orgs.map(o => [o.id, o]));

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">Billing & Revenue</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Revenue analytics, subscription health, and payment history.
        </p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatDollars(revenue.mrr)}
          icon={DollarSign}
          subtitle={`ARR: ${formatDollars(revenue.arr)}`}
          trend={revenue.mrr > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Active Subscriptions"
          value={String(revenue.activeSubscriptions)}
          icon={CreditCard}
          subtitle={`of ${totalOrgs} total orgs`}
        />
        <StatCard
          label="Avg Revenue Per User"
          value={formatDollars(revenue.arpu)}
          icon={Users}
          subtitle="per active subscription"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(revenue.totalRevenue)}
          icon={TrendingUp}
          subtitle="all-time collected"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Churn Rate"
          value={`${revenue.churnRate}%`}
          icon={TrendingDown}
          subtitle={`${revenue.canceledOrgs} canceled`}
          trend={revenue.churnRate > 10 ? "down" : "neutral"}
        />
        <StatCard
          label="Trial Conversion"
          value={`${revenue.trialConversion}%`}
          icon={ArrowUpRight}
          subtitle={`${revenue.trialingOrgs} in trial`}
          trend={revenue.trialConversion > 30 ? "up" : "neutral"}
        />
        <StatCard
          label="Past Due"
          value={String(revenue.pastDueOrgs)}
          icon={AlertTriangle}
          subtitle="at-risk subscriptions"
          trend={revenue.pastDueOrgs > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Trialing"
          value={String(revenue.trialingOrgs)}
          icon={Clock}
          subtitle="free trial active"
        />
      </div>

      {/* ================================================================
          TABS — Subscriptions first
          ================================================================ */}
      <div className="mt-8">
        <Tabs defaultValue="subscriptions">
          <TabsList>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          {/* ---- Subscriptions Tab (FIRST) ---- */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Subscriptions</CardTitle>
                  <span className="text-xs text-ink-muted">
                    {subscriptions.length} active subscriptions
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {subscriptions.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No active subscriptions"
                    description="Subscriptions will appear here when users upgrade to a paid plan."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period Start</TableHead>
                        <TableHead>Period End</TableHead>
                        <TableHead>Auto Renew</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub) => {
                        const willCancel = sub.cancelAtPeriodEnd || !!sub.cancelAt || !!sub.canceledAt;
                        const endDate = sub.cancelAt
                          ? formatDate(sub.cancelAt)
                          : sub.cancelAtPeriodEnd
                          ? formatDate(sub.currentPeriodEnd)
                          : sub.canceledAt
                          ? formatDate(sub.canceledAt)
                          : null;

                        return (
                          <TableRow key={sub.stripeSubscriptionId ?? sub.orgId}>
                            <TableCell className="font-sans font-medium text-ink">
                              {sub.orgName}
                            </TableCell>
                            <TableCell>
                              <Badge variant={planBadgeVariant(sub.plan)}>
                                {sub.plan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {statusBadge(sub.status)}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-bold tabular-nums text-ink">
                              {formatCurrency(sub.amount)}/mo
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-ink-muted">
                              {formatDate(sub.currentPeriodStart)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-ink-muted">
                              {formatDate(sub.currentPeriodEnd)}
                            </TableCell>
                            <TableCell>
                              {willCancel ? (
                                <div className="flex items-center gap-1.5">
                                  <XCircle size={12} className="text-editorial-red" />
                                  <span className="font-mono text-[11px] font-bold text-editorial-red">
                                    N
                                  </span>
                                  {endDate && (
                                    <span className="font-mono text-[10px] text-ink-muted">
                                      ends {endDate}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-bold text-editorial-green">
                                    Y
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Free / Trialing Orgs */}
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Free & Trialing Organizations</CardTitle>
                  <span className="text-xs text-ink-muted">
                    {orgs.filter(o => o.plan === "free" || o.subscription_status === "trialing").length} organizations
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trial Ends</TableHead>
                      <TableHead>Stripe Customer</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.filter(o => o.plan === "free" || o.subscription_status === "trialing").map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-sans font-medium text-ink">
                          {org.name}
                        </TableCell>
                        <TableCell>
                          {statusBadge(org.subscription_status)}
                        </TableCell>
                        <TableCell>
                          {org.trial_ends_at ? (
                            <span className={`font-mono text-[11px] ${
                              new Date(org.trial_ends_at) < new Date()
                                ? "font-bold text-editorial-red"
                                : "text-ink-muted"
                            }`}>
                              {new Date(org.trial_ends_at) < new Date()
                                ? "Expired " + formatDate(org.trial_ends_at)
                                : formatDate(org.trial_ends_at) + ` (${daysUntil(org.trial_ends_at)}d)`}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">No trial</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-ink-muted">
                          {org.stripe_customer_id ? "Yes" : "---"}
                        </TableCell>
                        <TableCell className="text-xs text-ink-muted">
                          {formatDate(org.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Payments Tab ---- */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment History</CardTitle>
                  <span className="text-xs text-ink-muted">
                    {transactions.length} payments
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <EmptyState
                    icon={DollarSign}
                    title="No payments yet"
                    description="Payments will appear here when customers complete their first subscription payment."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((event) => {
                        const org = event.organization_id ? orgMap.get(event.organization_id) : null;
                        return (
                          <TableRow key={event.id}>
                            <TableCell className="font-sans font-medium text-ink">
                              {org?.name ?? "Unknown"}
                              {org?.plan && org.plan !== "free" && (
                                <Badge variant={planBadgeVariant(org.plan)} className="ml-2">
                                  {org.plan}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="capitalize text-ink-secondary">
                              {(event.event_type ?? "payment").replace(/\./g, " ").replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-bold tabular-nums text-editorial-green">
                              {event.amount_cents != null && event.amount_cents > 0
                                ? `+${formatCurrency(event.amount_cents)}`
                                : "---"}
                            </TableCell>
                            <TableCell className="text-xs text-ink-muted">
                              {formatDateTime(event.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* All billing events (for debugging/audit) */}
            {billingEvents.length > transactions.length && (
              <Card className="mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Billing Events</CardTitle>
                    <span className="text-xs text-ink-muted">
                      {billingEvents.length} total events (includes failures, updates)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Stripe ID</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="capitalize text-ink">
                            {(event.event_type ?? "---").replace(/\./g, " ").replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-ink">
                            {event.amount_cents != null && event.amount_cents > 0
                              ? formatCurrency(event.amount_cents)
                              : "---"}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-ink-muted">
                            {event.stripe_event_id
                              ? event.stripe_event_id.slice(0, 24) + "..."
                              : "---"}
                          </TableCell>
                          <TableCell className="text-xs text-ink-muted">
                            {formatDateTime(event.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---- Revenue Tab ---- */}
          <TabsContent value="revenue">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueByPlanEntries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-muted">
                      No active paid subscriptions yet.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {revenueByPlanEntries.map(([plan, data]) => (
                        <div key={plan}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={planBadgeVariant(plan)}>{plan}</Badge>
                              <span className="text-xs text-ink-muted">{data.count} subs</span>
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                              {formatDollars(data.mrr)}/mo
                            </span>
                          </div>
                          <Progress
                            value={maxPlanMrr > 0 ? Math.round((data.mrr / maxPlanMrr) * 100) : 0}
                            color={planColor(plan)}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyEntries.length === 0 ? (
                    <p className="py-8 text-center text-sm text-ink-muted">
                      No revenue data yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {monthlyEntries.map(([month, cents]) => {
                        const pct = maxMonthlyRevenue > 0
                          ? Math.round((cents / maxMonthlyRevenue) * 100)
                          : 0;
                        const label = new Date(month + "-01").toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        });
                        return (
                          <div key={month}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs text-ink-secondary">{label}</span>
                              <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                                {formatCurrency(cents)}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-rule">
                              <div className="h-full bg-editorial-green transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---- Plans Tab ---- */}
          <TabsContent value="plans">
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
                      const percentage = totalOrgs > 0
                        ? Math.round((count / totalOrgs) * 100) : 0;
                      return (
                        <div key={plan}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={planBadgeVariant(plan)}>{plan}</Badge>
                              <span className="text-xs text-ink-muted">
                                {count} {count === 1 ? "org" : "orgs"}
                              </span>
                            </div>
                            <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                              {percentage}%
                            </span>
                          </div>
                          <Progress value={percentage} color={planColor(plan)} size="sm" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
