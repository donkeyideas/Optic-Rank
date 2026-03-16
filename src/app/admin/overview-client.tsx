"use client";

import Link from "next/link";
import {
  Users,
  Building2,
  FolderKanban,
  ListTodo,
  Zap,
  DollarSign,
  Activity,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Search,
  Link2,
  FileSearch,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface AdminOverviewClientProps {
  stats: {
    totalUsers: number;
    totalOrgs: number;
    activeProjects: number;
    pendingJobs: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    role: string;
    createdAt: string;
    orgName: string | null;
    plan: string;
  }>;
  recentAuditLog: Array<{
    id: string;
    action: string;
    resource_type: string | null;
    created_at: string;
    user_id: string;
  }>;
  apiUsage: {
    totalCalls: number;
    totalCost: number;
    successfulCalls: number;
    failedCalls: number;
    byProvider: Record<string, { calls: number; cost: number; errors: number }>;
    dailyCosts: Record<string, number>;
    dailyCalls: Record<string, number>;
  };
  billing: {
    totalOrgs: number;
    paidOrgs: number;
    planCounts: Record<string, number>;
  };
  usage: {
    totalKeywords: number;
    totalBacklinks: number;
    totalAudits: number;
  };
  health: {
    pendingJobs: number;
    processingJobs: number;
    failedJobs: number;
    completedJobs: number;
  };
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatCost(cost: number): string {
  if (cost >= 100) return `$${cost.toFixed(0)}`;
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(4)}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

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

function planBarColor(plan: string): string {
  switch (plan.toLowerCase()) {
    case "business":
      return "bg-ink";
    case "pro":
      return "bg-editorial-red";
    case "starter":
      return "bg-editorial-blue";
    default:
      return "bg-ink-muted";
  }
}

function eventIcon(action: string) {
  if (action.includes("delete") || action.includes("fail") || action.includes("error")) {
    return <AlertTriangle size={14} strokeWidth={2} className="text-editorial-gold" />;
  }
  if (action.includes("create") || action.includes("success") || action.includes("complete")) {
    return <CheckCircle2 size={14} strokeWidth={2} className="text-editorial-green" />;
  }
  return <Clock size={14} strokeWidth={2} className="text-editorial-blue" />;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(dateStr);
}

const tooltipStyle = {
  backgroundColor: "var(--color-surface-card, #fff)",
  border: "1px solid var(--color-rule, #ddd)",
  borderRadius: 0,
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 12,
};

const axisTick = { fontSize: 9, fontFamily: "IBM Plex Mono, monospace" };

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AdminOverviewClient({
  stats,
  recentSignups,
  recentAuditLog,
  apiUsage,
  billing,
  usage,
  health,
}: AdminOverviewClientProps) {
  // Transform daily data for charts
  const dailyCallsData = Object.entries(apiUsage.dailyCalls)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, calls]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls,
    }));

  const dailyCostData = Object.entries(apiUsage.dailyCosts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, cost]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cost: parseFloat(cost.toFixed(4)),
    }));

  // Provider data for bar chart
  const providerData = Object.entries(apiUsage.byProvider)
    .sort((a, b) => b[1].calls - a[1].calls)
    .map(([provider, data]) => ({
      provider: provider.charAt(0).toUpperCase() + provider.slice(1),
      providerKey: provider,
      calls: data.calls,
      cost: data.cost,
      errors: data.errors,
      errorRate: data.calls > 0 ? ((data.errors / data.calls) * 100).toFixed(1) : "0",
    }));

  // Plan distribution
  const planOrder = ["free", "starter", "pro", "business"];
  const planEntries = planOrder
    .map((plan) => ({ plan, count: billing.planCounts[plan] ?? 0 }))
    .filter((p) => p.count > 0 || planOrder.includes(p.plan));

  // Success rate
  const successRate =
    apiUsage.totalCalls > 0
      ? ((apiUsage.successfulCalls / apiUsage.totalCalls) * 100).toFixed(1)
      : "100";

  // Conversion rate
  const conversionRate =
    billing.totalOrgs > 0
      ? ((billing.paidOrgs / billing.totalOrgs) * 100).toFixed(1)
      : "0";

  // Stats cards data
  const overviewStats = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users },
    { label: "Active Orgs", value: stats.totalOrgs.toLocaleString(), icon: Building2 },
    { label: "Active Projects", value: stats.activeProjects.toLocaleString(), icon: FolderKanban },
    { label: "Paid Orgs", value: billing.paidOrgs.toLocaleString(), icon: CreditCard },
    { label: "API Calls (30d)", value: formatCompact(apiUsage.totalCalls), icon: Zap },
    { label: "API Cost (30d)", value: formatCost(apiUsage.totalCost), icon: DollarSign },
    { label: "Success Rate", value: `${successRate}%`, icon: Activity },
    { label: "Pending Jobs", value: stats.pendingJobs.toLocaleString(), icon: ListTodo },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">Admin Overview</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Platform health, growth metrics, and API usage at a glance.
        </p>
      </div>

      {/* ================================================================
          STATS GRID — 8 cards
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
                  <Icon size={18} strokeWidth={1.5} className="text-ink-muted" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ================================================================
          API CHARTS — Calls & Cost trends
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Daily API Calls */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">API Calls — Last 30 Days</CardTitle>
              <Link
                href="/admin/api"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red transition-colors hover:text-editorial-red/80"
              >
                Details
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dailyCallsData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  No API call data yet
                </span>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-bold text-ink">
                    {formatCompact(apiUsage.totalCalls)}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                    total calls
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={dailyCallsData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [Number(value).toLocaleString(), "Calls"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="var(--color-editorial-red, #c0392b)"
                      strokeWidth={2}
                      fill="url(#callsGradient)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "var(--color-editorial-red, #c0392b)",
                        stroke: "var(--color-surface-card, #fff)",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        {/* Daily API Cost */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">API Spend — Last 30 Days</CardTitle>
              <Link
                href="/admin/billing"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red transition-colors hover:text-editorial-red/80"
              >
                Billing
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {dailyCostData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  No cost data yet
                </span>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="font-serif text-2xl font-bold text-ink">
                    {formatCost(apiUsage.totalCost)}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                    total spend
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={dailyCostData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-editorial-gold, #b8860b)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-editorial-gold, #b8860b)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`$${Number(value).toFixed(4)}`, "Cost"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="var(--color-editorial-gold, #b8860b)"
                      strokeWidth={2}
                      fill="url(#costGradient)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "var(--color-editorial-gold, #b8860b)",
                        stroke: "var(--color-surface-card, #fff)",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          PROVIDER BREAKDOWN + PLAN DISTRIBUTION
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Provider Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Usage by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {providerData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  No provider data yet
                </span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={providerData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                    <XAxis
                      dataKey="provider"
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={axisTick}
                      stroke="var(--color-ink-muted, #999)"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        name === "calls" ? Number(value).toLocaleString() : `$${Number(value).toFixed(4)}`,
                        name === "calls" ? "Calls" : "Cost",
                      ]}
                    />
                    <Bar dataKey="calls" fill="var(--color-editorial-red, #c0392b)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Provider stats table */}
                <div className="mt-4 divide-y divide-rule border-t border-rule">
                  {providerData.map((p) => (
                    <div key={p.providerKey} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 ${
                            p.errors === 0 ? "bg-editorial-green" : "bg-editorial-gold"
                          }`}
                        />
                        <span className="font-medium text-ink">{p.provider}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-ink-secondary">
                        <span>{p.calls.toLocaleString()} calls</span>
                        <span>{formatCost(p.cost)}</span>
                        {Number(p.errorRate) > 0 && (
                          <span className="text-editorial-red">{p.errorRate}% err</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planEntries.map(({ plan, count }) => {
                const pct = billing.totalOrgs > 0 ? (count / billing.totalOrgs) * 100 : 0;
                return (
                  <div key={plan}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={planBadgeVariant(plan)}>{plan}</Badge>
                        <span className="font-mono text-xs text-ink-secondary">
                          {count} {count === 1 ? "org" : "orgs"}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-ink-muted">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-raised">
                      <div
                        className={`h-full ${planBarColor(plan)} transition-all`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            <div className="mt-6 grid grid-cols-3 divide-x divide-rule border-t border-rule pt-4">
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total</p>
                <p className="mt-1 font-serif text-xl font-bold text-ink">{billing.totalOrgs}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Paid</p>
                <p className="mt-1 font-serif text-xl font-bold text-editorial-green">{billing.paidOrgs}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Conversion</p>
                <p className="mt-1 font-serif text-xl font-bold text-ink">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          PLATFORM METRICS STRIP
          ================================================================ */}
      <div className="mt-8">
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 divide-x divide-rule lg:grid-cols-5">
              {[
                { label: "Keywords Tracked", value: formatCompact(usage.totalKeywords), icon: Search },
                { label: "Backlinks Monitored", value: formatCompact(usage.totalBacklinks), icon: Link2 },
                { label: "Site Audits", value: formatCompact(usage.totalAudits), icon: FileSearch },
                { label: "Failed Jobs", value: health.failedJobs.toLocaleString(), icon: XCircle },
                { label: "Processing", value: health.processingJobs.toLocaleString(), icon: Loader2 },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="flex items-center gap-3 px-5 py-4">
                    <Icon size={16} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        {metric.label}
                      </p>
                      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-ink">
                        {metric.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          RECENT SIGNUPS + SYSTEM EVENTS
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Left: Recent Signups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Signups</CardTitle>
              <Link
                href="/admin/users"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red transition-colors hover:text-editorial-red/80"
              >
                View All
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentSignups.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-ink-muted">No users have signed up yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSignups.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-sans font-medium text-ink">{user.name}</TableCell>
                      <TableCell className="text-ink-secondary">{user.orgName ?? "No org"}</TableCell>
                      <TableCell>
                        <Badge variant={planBadgeVariant(user.plan)}>{user.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-ink-muted">{formatDate(user.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right: System Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>System Events</CardTitle>
              <Link
                href="/admin/health"
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red transition-colors hover:text-editorial-red/80"
              >
                System Health
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentAuditLog.length === 0 ? (
              <p className="text-sm text-ink-muted">No system events recorded yet.</p>
            ) : (
              <div className="divide-y divide-rule">
                {recentAuditLog.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 shrink-0">{eventIcon(event.action)}</span>
                    <div className="flex-1">
                      <p className="text-sm text-ink">
                        <span className="font-medium">{event.action}</span>
                        {event.resource_type && (
                          <span className="text-ink-secondary"> on {event.resource_type}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">{timeAgo(event.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          QUICK ACTIONS
          ================================================================ */}
      <div className="mt-8">
        <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Quick Actions
        </h3>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            { label: "View All Users", href: "/admin/users" },
            { label: "Billing Dashboard", href: "/admin/billing" },
            { label: "API Management", href: "/admin/api" },
            { label: "System Logs", href: "/admin/health" },
            { label: "Analytics", href: "/admin/analytics" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex h-10 items-center justify-center border border-rule-dark bg-transparent px-5 text-xs font-bold uppercase tracking-widest text-ink transition-colors hover:bg-surface-raised"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
