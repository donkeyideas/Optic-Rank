"use client";

import { useState, useTransition } from "react";
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Zap,
  DollarSign,
  Activity,
  BarChart3,
  Clock,
  Loader2,
  Save,
  TestTube2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { saveAPIConfig, testAPIConnection, toggleAPIConfig } from "@/lib/actions/api-config";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface APIConfig {
  id: string;
  provider: string;
  display_name: string;
  api_key: string | null;
  api_secret: string | null;
  base_url: string | null;
  is_active: boolean;
  config: Record<string, unknown> | null;
  last_tested_at: string | null;
  test_status: string | null;
  created_at: string;
  updated_at: string;
}

interface UsageStats {
  totalCalls: number;
  totalCost: number;
  successfulCalls: number;
  failedCalls: number;
  byProvider: Record<string, { calls: number; cost: number; errors: number }>;
  dailyCosts: Record<string, number>;
  dailyCalls: Record<string, number>;
}

interface CallLogEntry {
  id: string;
  provider: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  response_time_ms: number | null;
  tokens_used: number;
  cost_usd: number;
  is_success: boolean;
  error_message: string | null;
  created_at: string;
}

interface Props {
  configs: APIConfig[];
  usageStats: UsageStats;
  callLog: CallLogEntry[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function maskKey(key: string | null): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(dateStr: string): string {
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

const providerColors: Record<string, string> = {
  pagespeed: "text-editorial-green",
  gemini: "text-editorial-blue",
  dataforseo: "text-editorial-gold",
  openai: "text-editorial-green",
  anthropic: "text-editorial-red",
  majestic: "text-editorial-gold",
  scrapingbee: "text-editorial-blue",
  moz: "text-editorial-red",
  stripe: "text-[#635bff]",
  deepseek: "text-editorial-blue",
};

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function APIManagementClient({ configs, usageStats, callLog }: Props) {
  const [activeTab, setActiveTab] = useState<"configs" | "usage" | "logs">("logs");

  const overviewStats = [
    {
      label: "Total API Calls",
      value: usageStats.totalCalls.toLocaleString(),
      icon: Zap,
    },
    {
      label: "Total Cost",
      value: formatCost(usageStats.totalCost),
      icon: DollarSign,
    },
    {
      label: "Success Rate",
      value: usageStats.totalCalls > 0
        ? `${((usageStats.successfulCalls / usageStats.totalCalls) * 100).toFixed(1)}%`
        : "N/A",
      icon: Activity,
    },
    {
      label: "Active Providers",
      value: configs.filter((c) => c.is_active && c.api_key).length.toString(),
      icon: Key,
    },
  ];

  const tabs = [
    { key: "logs" as const, label: "Call History" },
    { key: "usage" as const, label: "Usage & Costs" },
    { key: "configs" as const, label: "API Configuration" },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          API Management
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure API keys, monitor usage, and track costs across all platform integrations.
        </p>
      </div>

      {/* Stats Grid */}
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

      {/* Tabs */}
      <div className="mt-8 flex gap-0 border-b border-rule">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-editorial-red text-editorial-red"
                : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "configs" && <ConfigsTab configs={configs} />}
        {activeTab === "usage" && <UsageTab usageStats={usageStats} />}
        {activeTab === "logs" && <LogsTab callLog={callLog} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Configs Tab — Provider Cards
   ------------------------------------------------------------------ */

function ConfigsTab({ configs }: { configs: APIConfig[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {configs.map((config) => (
        <ProviderCard key={config.id} config={config} />
      ))}
    </div>
  );
}

function ProviderCard({ config }: { config: APIConfig }) {
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [apiKey, setApiKey] = useState(config.api_key ?? "");
  const [apiSecret, setApiSecret] = useState(config.api_secret ?? "");
  const [baseUrl, setBaseUrl] = useState(config.base_url ?? "");
  const [isSaving, startSaveTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const hasSecret = config.provider === "dataforseo" || config.provider === "stripe";

  function handleSave() {
    setStatus(null);
    const fd = new FormData();
    fd.set("api_key", apiKey);
    fd.set("api_secret", apiSecret);
    fd.set("base_url", baseUrl);
    fd.set("is_active", config.is_active ? "true" : "false");

    startSaveTransition(async () => {
      const result = await saveAPIConfig(config.id, fd);
      if ("error" in result) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: "Configuration saved." });
      }
    });
  }

  function handleTest() {
    setStatus(null);
    startTestTransition(async () => {
      const result = await testAPIConnection(config.id);
      if ("error" in result) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({ type: "success", message: result.message });
      }
    });
  }

  function handleToggle() {
    startSaveTransition(async () => {
      await toggleAPIConfig(config.id, !config.is_active);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center border border-rule bg-surface-raised ${
                providerColors[config.provider] ?? "text-ink-muted"
              }`}
            >
              <Key size={16} strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-sm">{config.display_name}</CardTitle>
              <p className="text-[10px] font-mono text-ink-muted">{config.provider}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.test_status === "success" && (
              <Badge variant="default">
                <CheckCircle2 size={10} className="mr-1" />
                Verified
              </Badge>
            )}
            {config.test_status === "failed" && (
              <Badge variant="danger">
                <XCircle size={10} className="mr-1" />
                Failed
              </Badge>
            )}
            <button
              onClick={handleToggle}
              disabled={isSaving}
              className="text-ink-muted transition-colors hover:text-ink"
              title={config.is_active ? "Disable" : "Enable"}
            >
              {config.is_active ? (
                <ToggleRight size={22} className="text-editorial-green" />
              ) : (
                <ToggleLeft size={22} />
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* API Key */}
        <div className="relative">
          <Input
            label="API Key"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key..."
            className="pr-10 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-[34px] text-ink-muted hover:text-ink"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* API Secret (only for providers that need it) */}
        {hasSecret && (
          <div className="relative">
            <Input
              label={config.provider === "stripe" ? "Webhook Secret" : "API Secret / Password"}
              type={showSecret ? "text" : "password"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={config.provider === "stripe" ? "whsec_..." : "Enter API secret..."}
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-3 top-[34px] text-ink-muted hover:text-ink"
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        )}

        {/* Base URL (optional) */}
        {config.base_url !== null && (
          <Input
            label="Base URL (optional)"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="font-mono text-xs"
          />
        )}

        {/* Last tested */}
        {config.last_tested_at && (
          <p className="text-[10px] text-ink-muted">
            Last tested: {timeAgo(config.last_tested_at)}
          </p>
        )}

        {/* Status message */}
        {status && (
          <p
            className={`text-xs font-medium ${
              status.type === "success" ? "text-editorial-green" : "text-editorial-red"
            }`}
          >
            {status.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isTesting}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting || isSaving || !apiKey}
          >
            {isTesting ? <Loader2 size={12} className="animate-spin" /> : <TestTube2 size={12} />}
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------
   Usage Tab — Provider Stats + Cost Breakdown
   ------------------------------------------------------------------ */

function UsageTab({ usageStats }: { usageStats: UsageStats }) {
  const providers = Object.entries(usageStats.byProvider).sort(
    (a, b) => b[1].calls - a[1].calls
  );

  // Build full 30-day range (fill in zeros for days with no calls)
  const dailyEntries: [string, number][] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyEntries.push([key, usageStats.dailyCalls[key] ?? 0]);
  }

  return (
    <div className="space-y-6">
      {/* Provider Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Provider</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {providers.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-muted">No API calls recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead className="text-right">Error Rate</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map(([provider, stats]) => (
                  <TableRow key={provider}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            stats.errors === 0 ? "bg-editorial-green" : "bg-editorial-gold"
                          }`}
                        />
                        <span className="font-medium text-ink">{provider}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {stats.calls.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-editorial-red">
                      {stats.errors}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {stats.calls > 0
                        ? `${((stats.errors / stats.calls) * 100).toFixed(1)}%`
                        : "0%"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCost(stats.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Daily Activity (SVG bar chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Daily API Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const maxCalls = Math.max(...dailyEntries.map(([, c]) => c), 1);
            const totalInRange = dailyEntries.reduce((s, [, c]) => s + c, 0);
            const activeDays = dailyEntries.filter(([, c]) => c > 0).length;
            const avgCalls = activeDays > 0 ? Math.round(totalInRange / activeDays) : 0;
            const chartH = 180;
            const barW = Math.max(Math.floor(680 / dailyEntries.length) - 2, 6);
            const chartW = dailyEntries.length * (barW + 2);
            return (
              <>
                <div className="mb-3 flex flex-wrap items-baseline gap-4">
                  <span className="font-mono text-xs text-ink-muted">
                    <span className="font-semibold text-ink">{totalInRange.toLocaleString()}</span> calls
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    Peak: <span className="font-semibold text-ink">{maxCalls.toLocaleString()}</span>/day
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    Avg: <span className="font-semibold text-ink">{avgCalls.toLocaleString()}</span>/day
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    Active days: <span className="font-semibold text-ink">{activeDays}</span>/30
                  </span>
                </div>
                <div className="w-full overflow-x-auto">
                  <svg
                    width={chartW}
                    height={chartH + 24}
                    viewBox={`0 0 ${chartW} ${chartH + 24}`}
                    className="min-w-full"
                    role="img"
                    aria-label="Daily API calls bar chart"
                  >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
                      <line
                        key={frac}
                        x1={0}
                        y1={chartH - frac * chartH}
                        x2={chartW}
                        y2={chartH - frac * chartH}
                        stroke="currentColor"
                        strokeOpacity={0.08}
                        strokeDasharray={frac === 0 ? "none" : "4 4"}
                      />
                    ))}
                    {/* Bars */}
                    {dailyEntries.map(([day, calls], i) => {
                      const barH = calls > 0
                        ? Math.max((calls / maxCalls) * (chartH - 4), 4)
                        : 0;
                      const x = i * (barW + 2);
                      const y = chartH - barH;
                      const shortDay = day.slice(8); // DD
                      const showLabel = i === 0 || i === dailyEntries.length - 1 || i % 5 === 0;
                      return (
                        <g key={day}>
                          {/* Baseline tick for empty days */}
                          {calls === 0 && (
                            <rect
                              x={x}
                              y={chartH - 2}
                              width={barW}
                              height={2}
                              rx={1}
                              className="fill-rule/40"
                            />
                          )}
                          {/* Data bar */}
                          {calls > 0 && (
                            <rect
                              x={x}
                              y={y}
                              width={barW}
                              height={barH}
                              rx={2}
                              className="fill-editorial-red/70 hover:fill-editorial-red transition-colors"
                            />
                          )}
                          {/* Value label on tall bars */}
                          {calls > 0 && barH > 20 && (
                            <text
                              x={x + barW / 2}
                              y={y - 4}
                              textAnchor="middle"
                              className="fill-ink text-[9px] font-mono"
                            >
                              {calls >= 1000 ? `${(calls / 1000).toFixed(1)}k` : calls}
                            </text>
                          )}
                          {/* X-axis date labels */}
                          {showLabel && (
                            <text
                              x={x + barW / 2}
                              y={chartH + 14}
                              textAnchor="middle"
                              className="fill-ink-muted text-[9px] font-mono"
                            >
                              {day.slice(5)}
                            </text>
                          )}
                          {/* Hover target */}
                          <title>{`${day}: ${calls.toLocaleString()} calls`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------
   Logs Tab — Recent Call History
   ------------------------------------------------------------------ */

function LogsTab({ callLog }: { callLog: CallLogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent API Calls</CardTitle>
          <Badge variant="muted">{callLog.length} entries</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {callLog.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-ink-muted">
            No API calls recorded yet. Calls will appear here as the platform makes external API requests.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-ink-muted text-xs">
                      {timeAgo(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.is_success ? "default" : "danger"}
                      >
                        {entry.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-ink-secondary">
                      {entry.method} {entry.endpoint}
                    </TableCell>
                    <TableCell>
                      {entry.is_success ? (
                        <span className="flex items-center gap-1 text-xs text-editorial-green">
                          <CheckCircle2 size={12} />
                          {entry.status_code ?? 200}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-editorial-red">
                          <XCircle size={12} />
                          {entry.status_code ?? "ERR"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {entry.response_time_ms != null
                        ? `${entry.response_time_ms}ms`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {entry.tokens_used > 0 ? entry.tokens_used.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {entry.cost_usd > 0 ? formatCost(entry.cost_usd) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
