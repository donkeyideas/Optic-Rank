"use client";

import { Fragment, useState } from "react";
import {
  Sparkles,
  Database,
  BarChart3,
  Cpu,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AIInteraction } from "@/lib/dal/admin";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AIIntelligenceClientProps {
  interactions: { data: AIInteraction[]; count: number };
  usageByFeature: Record<
    string,
    { calls: number; tokens: number; cost: number; avg_response_ms: number; success_rate: number }
  >;
  providerPerformance: Record<
    string,
    { calls: number; cost: number; avg_response_ms: number; success_rate: number; error_count: number; total_tokens: number }
  >;
  costTrend: Array<{ date: string; cost: number; calls: number }>;
}

/* ------------------------------------------------------------------
   Styles
   ------------------------------------------------------------------ */

const tooltipStyle = {
  backgroundColor: "var(--color-surface-card, #fff)",
  border: "1px solid var(--color-rule, #ddd)",
  borderRadius: 0,
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 11,
};

const axisTick = { fontSize: 9, fontFamily: "IBM Plex Mono, monospace" };

const PIE_COLORS = ["#c0392b", "#b8860b", "#27ae60", "#2980b9", "#8e44ad", "#e67e22", "#1abc9c", "#34495e"];

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AIIntelligenceClient({
  interactions,
  usageByFeature,
  providerPerformance,
  costTrend,
}: AIIntelligenceClientProps) {
  const [activeTab, setActiveTab] = useState<"knowledge" | "usage" | "providers" | "costs">("knowledge");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Summary stats
  const totalInteractions = interactions.count;
  const totalCost = Object.values(usageByFeature).reduce((s, f) => s + f.cost, 0);
  const totalTokens = Object.values(usageByFeature).reduce((s, f) => s + f.tokens, 0);
  const avgResponseMs = (() => {
    const entries = Object.values(providerPerformance);
    if (entries.length === 0) return 0;
    const totalMs = entries.reduce((s, p) => s + p.avg_response_ms * p.calls, 0);
    const totalCalls = entries.reduce((s, p) => s + p.calls, 0);
    return totalCalls > 0 ? Math.round(totalMs / totalCalls) : 0;
  })();

  const tabs = [
    { id: "knowledge" as const, label: "Knowledge Base", icon: Database },
    { id: "usage" as const, label: "Usage Analytics", icon: BarChart3 },
    { id: "providers" as const, label: "Provider Performance", icon: Cpu },
    { id: "costs" as const, label: "Cost Optimization", icon: DollarSign },
  ];

  // Filtered interactions
  const filteredInteractions = searchQuery
    ? interactions.data.filter(
        (i) =>
          i.feature.includes(searchQuery.toLowerCase()) ||
          i.provider.includes(searchQuery.toLowerCase()) ||
          i.prompt_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.response_text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : interactions.data;

  // Usage by feature for charts
  const featureData = Object.entries(usageByFeature)
    .map(([feature, stats]) => ({ feature, ...stats }))
    .sort((a, b) => b.calls - a.calls);

  const costByFeature = Object.entries(usageByFeature)
    .map(([feature, stats]) => ({ name: feature, value: Math.round(stats.cost * 10000) / 10000 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-rule pb-4">
        <h2 className="font-serif text-2xl font-bold text-ink">AI Intelligence</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Knowledge base, usage analytics, and provider performance — every AI interaction stored for learning and optimization.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Interactions", value: totalInteractions.toLocaleString(), icon: Sparkles },
          { label: "Total Cost (30d)", value: `$${totalCost.toFixed(4)}`, icon: DollarSign },
          { label: "Total Tokens (30d)", value: totalTokens.toLocaleString(), icon: Database },
          { label: "Avg Response", value: `${avgResponseMs}ms`, icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="border border-rule bg-surface-card p-4">
            <div className="flex items-center gap-2 text-ink-muted">
              <stat.icon size={14} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]">{stat.label}</span>
            </div>
            <span className="mt-1 block font-mono text-xl font-bold text-ink">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-rule">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-editorial-red text-ink"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "knowledge" && (
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prompts, responses, features, providers..."
              className="h-10 w-full border border-rule bg-surface-card pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
            />
          </div>

          {/* Interactions Table */}
          <div className="border border-rule">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-rule bg-surface-raised">
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Date</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Feature</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Sub Type</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Provider</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted text-right">Tokens</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted text-right">Cost</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted text-right">Time</th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted text-center">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInteractions.map((interaction) => (
                  <Fragment key={interaction.id}>
                    <tr
                      className="border-b border-rule transition-colors hover:bg-surface-raised cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === interaction.id ? null : interaction.id)}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] text-ink-secondary">
                        {new Date(interaction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-[11px] font-medium text-ink">{interaction.feature}</td>
                      <td className="px-3 py-2 text-[11px] text-ink-secondary">{interaction.sub_type ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block border border-rule px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-secondary">
                          {interaction.provider}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-ink">
                        {interaction.total_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-ink">
                        ${Number(interaction.cost_usd).toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-ink-secondary">
                        {interaction.response_time_ms ? `${interaction.response_time_ms}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {interaction.is_success ? (
                          <CheckCircle size={14} className="inline text-editorial-green" />
                        ) : (
                          <XCircle size={14} className="inline text-editorial-red" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {expandedRow === interaction.id ? (
                          <ChevronUp size={14} className="text-ink-muted" />
                        ) : (
                          <ChevronDown size={14} className="text-ink-muted" />
                        )}
                      </td>
                    </tr>
                    {expandedRow === interaction.id && (
                      <tr key={`${interaction.id}-expanded`} className="border-b border-rule">
                        <td colSpan={9} className="bg-surface-raised px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                                Prompt
                              </span>
                              <pre className="max-h-60 overflow-auto border border-rule bg-surface-card p-3 font-mono text-[11px] text-ink whitespace-pre-wrap">
                                {interaction.prompt_text?.slice(0, 2000) ?? "No prompt stored"}
                              </pre>
                            </div>
                            <div>
                              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                                Response
                              </span>
                              <pre className="max-h-60 overflow-auto border border-rule bg-surface-card p-3 font-mono text-[11px] text-ink whitespace-pre-wrap">
                                {interaction.response_text?.slice(0, 2000) ?? "No response"}
                              </pre>
                            </div>
                          </div>
                          {interaction.error_message && (
                            <div className="mt-3 border border-editorial-red/30 bg-editorial-red/5 px-3 py-2 text-[11px] text-editorial-red">
                              Error: {interaction.error_message}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filteredInteractions.length === 0 && (
              <div className="flex h-32 items-center justify-center text-sm text-ink-muted">
                {searchQuery ? "No interactions match your search." : "No AI interactions recorded yet. Run any AI feature to start building the knowledge base."}
              </div>
            )}
          </div>
          <p className="text-[10px] text-ink-muted">
            Showing {filteredInteractions.length} of {interactions.count} total interactions
          </p>
        </div>
      )}

      {activeTab === "usage" && (
        <div className="flex flex-col gap-6">
          {/* Calls by Feature Bar Chart */}
          <div className="border border-rule bg-surface-card p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Calls by Feature (Last 30 Days)
            </h3>
            {featureData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureData} margin={{ top: 5, right: 5, left: 5, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
                  <XAxis
                    dataKey="feature"
                    tick={axisTick}
                    stroke="var(--color-ink-muted, #999)"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={axisTick} stroke="var(--color-ink-muted, #999)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="calls" fill="var(--color-editorial-red, #c0392b)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-ink-muted">No usage data yet</div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost by Feature Pie */}
            <div className="border border-rule bg-surface-card p-4">
              <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Cost Distribution by Feature
              </h3>
              {costByFeature.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={costByFeature} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: $${e.value}`}>
                      {costByFeature.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-ink-muted">No cost data yet</div>
              )}
            </div>

            {/* Feature Stats Table */}
            <div className="border border-rule bg-surface-card p-4">
              <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Feature Breakdown
              </h3>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-rule">
                    <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Feature</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Calls</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Tokens</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Avg ms</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Success</th>
                  </tr>
                </thead>
                <tbody>
                  {featureData.map((f) => (
                    <tr key={f.feature} className="border-b border-rule/50">
                      <td className="py-1.5 font-medium text-ink">{f.feature}</td>
                      <td className="py-1.5 text-right font-mono text-ink">{f.calls}</td>
                      <td className="py-1.5 text-right font-mono text-ink-secondary">{f.tokens.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-mono text-ink-secondary">{f.avg_response_ms}</td>
                      <td className="py-1.5 text-right font-mono">
                        <span className={f.success_rate >= 95 ? "text-editorial-green" : f.success_rate >= 80 ? "text-editorial-gold" : "text-editorial-red"}>
                          {f.success_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "providers" && (
        <div className="flex flex-col gap-6">
          {/* Provider Comparison Table */}
          <div className="border border-rule bg-surface-card p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Provider Comparison (Last 30 Days)
            </h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Provider</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Calls</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total Cost</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Avg Latency</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Success Rate</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Errors</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total Tokens</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(providerPerformance).map(([provider, stats]) => (
                  <tr key={provider} className="border-b border-rule/50">
                    <td className="py-2.5">
                      <span className="inline-block border border-rule px-2 py-0.5 text-[11px] font-bold uppercase text-ink">
                        {provider}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[12px] text-ink">{stats.calls.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono text-[12px] text-ink">${stats.cost.toFixed(4)}</td>
                    <td className="py-2.5 text-right font-mono text-[12px] text-ink-secondary">{stats.avg_response_ms}ms</td>
                    <td className="py-2.5 text-right font-mono text-[12px]">
                      <span className={stats.success_rate >= 95 ? "text-editorial-green" : stats.success_rate >= 80 ? "text-editorial-gold" : "text-editorial-red"}>
                        {stats.success_rate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[12px] text-editorial-red">{stats.error_count}</td>
                    <td className="py-2.5 text-right font-mono text-[12px] text-ink-secondary">{stats.total_tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(providerPerformance).length === 0 && (
              <div className="flex h-20 items-center justify-center text-sm text-ink-muted">No provider data yet</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "costs" && (
        <div className="flex flex-col gap-6">
          {/* Cost Trend Chart */}
          <div className="border border-rule bg-surface-card p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Daily AI Cost Trend (Last 30 Days)
            </h3>
            {costTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={costTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
                  <XAxis dataKey="date" tick={axisTick} stroke="var(--color-ink-muted, #999)" />
                  <YAxis tick={axisTick} stroke="var(--color-ink-muted, #999)" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(4)}`, "Cost"]} />
                  <Area type="monotone" dataKey="cost" stroke="var(--color-editorial-red, #c0392b)" strokeWidth={2} fill="url(#costGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-ink-muted">No cost data yet</div>
            )}
          </div>

          {/* Cost per Feature Breakdown */}
          <div className="border border-rule bg-surface-card p-4">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Cost per Feature
            </h3>
            <div className="flex flex-col gap-2">
              {costByFeature.map((f) => {
                const maxCost = costByFeature[0]?.value || 1;
                return (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="w-40 truncate text-[11px] font-medium text-ink">{f.name}</span>
                    <div className="flex-1 bg-surface-raised">
                      <div
                        className="h-4 bg-editorial-red/70"
                        style={{ width: `${(f.value / maxCost) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-[11px] text-ink">${f.value.toFixed(4)}</span>
                  </div>
                );
              })}
              {costByFeature.length === 0 && (
                <div className="flex h-20 items-center justify-center text-sm text-ink-muted">No cost data yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
