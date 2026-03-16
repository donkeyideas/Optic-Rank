"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  CreditCard,
  Target,
  Zap,
  Search,
  Link2,
  FileSearch,
  Activity,
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
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface GrowthPoint {
  month: string;
  count: number;
  cumulative: number;
}

interface AnalyticsClientProps {
  investorMetrics: {
    mrr: number;
    arr: number;
    arpu: number;
    estimatedLTV: number;
    totalOrgs: number;
    paidOrgs: number;
    freeOrgs: number;
    trialingOrgs: number;
    canceledOrgs: number;
    churnRate: number;
    trialConversionRate: number;
    freeToPaidRate: number;
    orgGrowthMoM: number;
  };
  growth: {
    userGrowth: GrowthPoint[];
    orgGrowth: GrowthPoint[];
    projectGrowth: GrowthPoint[];
    keywordGrowth: GrowthPoint[];
    auditGrowth: GrowthPoint[];
    orgsByPlanMonthly: { month: string; free: number; paid: number; trialing: number }[];
  };
  revenue: {
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
  };
  apiUsage: {
    totalCalls: number;
    totalCost: number;
    successfulCalls: number;
    failedCalls: number;
    byProvider: Record<string, { calls: number; cost: number; errors: number }>;
    dailyCosts: Record<string, number>;
    dailyCalls: Record<string, number>;
  };
  stats: {
    totalUsers: number;
    totalOrgs: number;
    activeProjects: number;
    pendingJobs: number;
  };
  usage: {
    totalKeywords: number;
    totalBacklinks: number;
    totalAudits: number;
    usageRecords: unknown[];
  };
  billing: {
    totalOrgs: number;
    paidOrgs: number;
    planCounts: Record<string, number>;
    billingEvents: unknown[];
    orgs: unknown[];
  };
}

/* ------------------------------------------------------------------
   Chart Styles (consistent with overview-client.tsx)
   ------------------------------------------------------------------ */

const tooltipStyle = {
  backgroundColor: "var(--color-surface-card, #1a1a1a)",
  border: "1px solid var(--color-rule, #333)",
  borderRadius: 0,
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 12,
};

const axisTick = {
  fontSize: 9,
  fontFamily: "IBM Plex Mono, monospace",
  fill: "var(--color-ink-muted, #999)",
};

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatCurrency(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDollars(dollars: number) {
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toLocaleString()}`;
}

function formatMonth(monthStr: string) {
  const [y, m] = monthStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${y?.slice(2)}`;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center border border-dashed border-rule bg-surface-raised">
      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AnalyticsClient({
  investorMetrics: im,
  growth,
  revenue,
  apiUsage,
  stats,
  usage,
}: AnalyticsClientProps) {
  // Prepare chart data
  const monthlyRevenueData = Object.entries(revenue.monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cents]) => ({ month, label: formatMonth(month), revenue: cents / 100 }));

  const orgGrowthData = growth.orgGrowth.map(g => ({
    ...g,
    label: formatMonth(g.month),
  }));

  const signupData = growth.orgGrowth.map(g => ({
    month: g.month,
    label: formatMonth(g.month),
    signups: g.count,
  }));

  // Daily API costs for last 30 days
  const dailyCostEntries: { day: string; cost: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyCostEntries.push({ day: key.slice(5), cost: apiUsage.dailyCosts[key] ?? 0 });
  }

  // Plan distribution for pie chart
  const planColors: Record<string, string> = {
    free: "var(--color-ink-muted, #888)",
    starter: "var(--color-editorial-blue, #2980b9)",
    pro: "var(--color-editorial-red, #c0392b)",
    business: "var(--color-editorial-gold, #b8860b)",
    enterprise: "var(--color-ink, #1a1a1a)",
  };

  const planData = Object.entries(revenue.revenueByPlan)
    .map(([plan, data]) => ({
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      value: data.count,
      mrr: data.mrr,
      color: planColors[plan] ?? "var(--color-ink-muted, #888)",
    }));

  // Add free orgs to plan data
  const freeCount = im.freeOrgs;
  if (freeCount > 0) {
    planData.unshift({
      name: "Free",
      value: freeCount,
      mrr: 0,
      color: planColors.free,
    });
  }

  // Funnel data
  const funnelSteps = [
    { label: "Total Signups", value: im.totalOrgs, color: "bg-ink" },
    { label: "Free", value: im.freeOrgs, color: "bg-ink-muted/50" },
    { label: "Trialing", value: im.trialingOrgs, color: "bg-editorial-gold" },
    { label: "Paid", value: im.paidOrgs, color: "bg-editorial-green" },
    { label: "Churned", value: im.canceledOrgs, color: "bg-editorial-red" },
  ];
  const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1);

  // Engagement metrics
  const engagementItems = [
    { label: "Keywords Tracked", value: usage.totalKeywords, icon: Search },
    { label: "Backlinks Monitored", value: usage.totalBacklinks, icon: Link2 },
    { label: "Site Audits Run", value: usage.totalAudits, icon: FileSearch },
    { label: "API Calls (30d)", value: apiUsage.totalCalls, icon: Zap },
    { label: "Active Projects", value: stats.activeProjects, icon: Activity },
  ];
  const engagementMax = Math.max(...engagementItems.map(e => e.value), 1);

  const apiSuccessRate = apiUsage.totalCalls > 0
    ? ((apiUsage.successfulCalls / apiUsage.totalCalls) * 100).toFixed(1)
    : "0";

  return (
    <div>
      {/* ================================================================
          PAGE HEADER
          ================================================================ */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          Platform Analytics
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Investor-ready metrics, growth trends, and unit economics.
        </p>
      </div>

      {/* ================================================================
          SECTION 1: HEADLINE KPIs (8 cards)
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="MRR"
          value={formatDollars(im.mrr)}
          subtitle={`${im.paidOrgs} active subs`}
          icon={DollarSign}
          color="text-editorial-green"
        />
        <KPICard
          label="ARR"
          value={formatDollars(im.arr)}
          subtitle="Annualized"
          icon={DollarSign}
          color="text-editorial-green"
        />
        <KPICard
          label="Total Customers"
          value={im.totalOrgs.toLocaleString()}
          subtitle={`${stats.totalUsers} users`}
          icon={Building2}
          color="text-ink"
        />
        <KPICard
          label="Paid Customers"
          value={im.paidOrgs.toLocaleString()}
          subtitle={`${im.freeToPaidRate}% of total`}
          icon={CreditCard}
          color="text-editorial-green"
        />
        <KPICard
          label="ARPU"
          value={formatDollars(im.arpu)}
          subtitle="Per paid customer/mo"
          icon={Users}
          color="text-ink"
        />
        <KPICard
          label="Est. LTV"
          value={formatDollars(im.estimatedLTV)}
          subtitle="ARPU / churn rate"
          icon={Target}
          color="text-editorial-gold"
        />
        <KPICard
          label="Churn Rate"
          value={`${im.churnRate}%`}
          subtitle={`${im.canceledOrgs} canceled`}
          icon={im.churnRate > 5 ? TrendingDown : TrendingUp}
          color={im.churnRate > 5 ? "text-editorial-red" : "text-editorial-green"}
        />
        <KPICard
          label="MoM Growth"
          value={`${im.orgGrowthMoM > 0 ? "+" : ""}${im.orgGrowthMoM}%`}
          subtitle="Customer growth"
          icon={im.orgGrowthMoM >= 0 ? TrendingUp : TrendingDown}
          color={im.orgGrowthMoM >= 0 ? "text-editorial-green" : "text-editorial-red"}
        />
      </div>

      {/* ================================================================
          SECTION 2: REVENUE CHARTS
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenueData.length === 0 ? (
              <EmptyChart label="No revenue data yet" />
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-xl font-bold text-editorial-green">
                    {formatCurrency(revenue.totalRevenue)}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">total revenue</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #333)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-editorial-green, #27ae60)"
                      strokeWidth={2}
                      fill="url(#gradRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Period</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenueData.length === 0 ? (
              <EmptyChart label="No revenue data yet" />
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-xl font-bold text-ink">
                    {formatDollars(im.mrr)}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">MRR</span>
                  <Badge variant="muted" className="font-mono text-[10px]">
                    {formatDollars(im.arr)} ARR
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenueData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #333)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="var(--color-editorial-green, #27ae60)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SECTION 3: CUSTOMER GROWTH
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Customer Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {orgGrowthData.length === 0 ? (
              <EmptyChart label="No customer data yet" />
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-xl font-bold text-ink">
                    {im.totalOrgs}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">total customers</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={orgGrowthData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-ink, #1a1a1a)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="var(--color-ink, #1a1a1a)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #333)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="var(--color-ink, #1a1a1a)"
                      strokeWidth={2}
                      fill="url(#gradGrowth)"
                      name="Customers"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly New Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {signupData.length === 0 ? (
              <EmptyChart label="No signup data yet" />
            ) : (
              <>
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-serif text-xl font-bold text-ink">
                    {signupData[signupData.length - 1]?.signups ?? 0}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">this month</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={signupData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #333)" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="signups" fill="var(--color-editorial-red, #c0392b)" radius={[2, 2, 0, 0]} name="Signups" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SECTION 4: UNIT ECONOMICS STRIP
          ================================================================ */}
      <Card className="mt-8">
        <CardContent className="grid grid-cols-3 divide-x divide-rule p-0 lg:grid-cols-6">
          <MetricCell label="ARPU" value={formatDollars(im.arpu)} />
          <MetricCell label="Est. LTV" value={formatDollars(im.estimatedLTV)} />
          <MetricCell label="Churn Rate" value={`${im.churnRate}%`} danger={im.churnRate > 5} />
          <MetricCell label="Trial → Paid" value={`${im.trialConversionRate}%`} />
          <MetricCell label="Free → Paid" value={`${im.freeToPaidRate}%`} />
          <MetricCell label="MoM Growth" value={`${im.orgGrowthMoM > 0 ? "+" : ""}${im.orgGrowthMoM}%`} success={im.orgGrowthMoM > 0} />
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 5: FUNNEL & PLAN MIX
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelSteps.map((step) => {
                const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0;
                return (
                  <div key={step.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">{step.label}</span>
                      <span className="font-mono text-xs tabular-nums text-ink-muted">
                        {step.value}
                        {im.totalOrgs > 0 && step.label !== "Total Signups" && (
                          <span className="ml-1 text-ink-muted/60">
                            ({Math.round((step.value / im.totalOrgs) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-5 w-full bg-surface-raised">
                      <div
                        className={`h-full ${step.color} transition-all`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length === 0 ? (
              <EmptyChart label="No plan data yet" />
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative h-[200px] w-[200px] flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {planData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-serif text-2xl font-bold text-ink">{im.totalOrgs}</span>
                    <span className="text-[9px] uppercase tracking-widest text-ink-muted">total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {planData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="h-3 w-3" style={{ backgroundColor: entry.color }} />
                      <span className="flex-1 text-xs text-ink">{entry.name}</span>
                      <span className="font-mono text-xs tabular-nums text-ink-muted">{entry.value}</span>
                      {entry.mrr > 0 && (
                        <span className="font-mono text-[10px] text-editorial-green">{formatDollars(entry.mrr)}/mo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SECTION 6: ENGAGEMENT & API COSTS
          ================================================================ */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Platform Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {engagementItems.map((item) => {
                const Icon = item.icon;
                const pct = engagementMax > 0 ? (item.value / engagementMax) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <Icon size={14} strokeWidth={1.5} className="flex-shrink-0 text-ink-muted" />
                    <span className="w-36 flex-shrink-0 text-xs text-ink">{item.label}</span>
                    <div className="h-4 flex-1 bg-surface-raised">
                      <div
                        className="h-full bg-editorial-red/70 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs tabular-nums text-ink">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* API Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>API Cost — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-baseline gap-4">
              <span className="font-mono text-xs text-ink-muted">
                Total: <span className="font-semibold text-ink">${apiUsage.totalCost.toFixed(4)}</span>
              </span>
              <span className="font-mono text-xs text-ink-muted">
                Success: <span className="font-semibold text-editorial-green">{apiSuccessRate}%</span>
              </span>
              <span className="font-mono text-xs text-ink-muted">
                Calls: <span className="font-semibold text-ink">{apiUsage.totalCalls.toLocaleString()}</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={dailyCostEntries} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-editorial-gold, #b8860b)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-editorial-gold, #b8860b)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #333)" vertical={false} />
                <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(4)}`, "Cost"]} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-editorial-gold, #b8860b)"
                  strokeWidth={2}
                  fill="url(#gradCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SECTION 7: GROWTH TABLE (Cohort)
          ================================================================ */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Cohort Overview</CardTitle>
            <Badge variant="muted">{growth.orgGrowth.length} months</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {growth.orgGrowth.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-muted">
              No cohort data yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">New Signups</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Keywords</TableHead>
                    <TableHead className="text-right">Audits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {growth.orgGrowth.slice().reverse().map((row) => {
                    const userRow = growth.userGrowth.find(u => u.month === row.month);
                    const kwRow = growth.keywordGrowth.find(k => k.month === row.month);
                    const auditRow = growth.auditGrowth.find(a => a.month === row.month);
                    return (
                      <TableRow key={row.month}>
                        <TableCell className="font-mono text-sm text-ink">
                          {formatMonth(row.month)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-ink">
                          {row.count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-ink-muted">
                          {row.cumulative}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-ink-muted">
                          {userRow?.count ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-ink-muted">
                          {kwRow?.count ?? 0}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-ink-muted">
                          {auditRow?.count ?? 0}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
   Sub-components
   ------------------------------------------------------------------ */

function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            {label}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
            {value}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-ink-muted">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
          <Icon size={18} strokeWidth={1.5} className={color} />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCell({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div className="px-5 py-4 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-bold tabular-nums ${
          danger ? "text-editorial-red" : success ? "text-editorial-green" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
