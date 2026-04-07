"use client";

import { useState, useTransition } from "react";
import {
  Smartphone,
  Bell,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Monitor,
  Tablet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { adminSendTestPush } from "@/lib/actions/push-notifications";
import { PUSH_TYPE_LABELS } from "@/lib/notifications/push-types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PushLogEntry {
  id: string;
  user_id: string | null;
  title: string;
  message: string | null;
  type: string;
  action_url: string | null;
  target: string;
  tokens_targeted: number;
  tokens_success: number;
  tokens_failed: number;
  errors: string[] | null;
  sent_by: string | null;
  sent_by_name: string;
  user_name: string | null;
  is_read: boolean;
  created_at: string;
}

export interface TokenStats {
  totalTokens: number;
  uniqueUsers: number;
  byDevice: Record<string, number>;
}

export interface DeliveryStats {
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
  deliveryRate: number;
  byType: Record<string, number>;
  notificationCount: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

function statusBadge(entry: PushLogEntry) {
  if (entry.tokens_targeted === 0)
    return <Badge variant="muted">No Tokens</Badge>;
  if (entry.tokens_failed === 0)
    return <Badge variant="success">Delivered</Badge>;
  if (entry.tokens_success === 0)
    return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="info">Partial</Badge>;
}

function targetLabel(target: string) {
  if (target === "all") return "All Users";
  if (target.startsWith("user:")) return "Single User";
  if (target === "admins") return "Admins";
  return target;
}

function deviceIcon(device: string) {
  switch (device.toLowerCase()) {
    case "windows":
    case "mac":
    case "linux":
      return <Monitor size={14} />;
    case "ios":
    case "android":
      return <Tablet size={14} />;
    default:
      return <Smartphone size={14} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PushStatsPanel({
  log,
  tokenStats,
  deliveryStats,
}: {
  log: PushLogEntry[];
  tokenStats: TokenStats;
  deliveryStats: DeliveryStats;
}) {
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  function handleSendTest() {
    setTestResult(null);
    startTransition(async () => {
      const res = await adminSendTestPush();
      if ("error" in res) {
        setTestResult(`Error: ${res.error}`);
      } else {
        setTestResult(
          `Test sent — ${res.stats.success} delivered, ${res.stats.failed} failed`
        );
      }
    });
  }

  return (
    <div>
      {/* Stats Strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Registered Devices
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {tokenStats.totalTokens}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Smartphone
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Active Users
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-editorial-green">
                {tokenStats.uniqueUsers}
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
                Delivery Rate
              </p>
              <p
                className={`mt-1 font-serif text-2xl font-bold tracking-tight ${
                  deliveryStats.deliveryRate >= 90
                    ? "text-editorial-green"
                    : deliveryStats.deliveryRate >= 70
                      ? "text-editorial-gold"
                      : "text-editorial-red"
                }`}
              >
                {deliveryStats.deliveryRate}%
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CheckCircle2
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Sent (30d)
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {deliveryStats.notificationCount}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Bell size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Push + Device Distribution */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* Test Push */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Test Push Delivery
            </h3>
            <p className="mb-4 text-xs text-ink-secondary">
              Send a test notification to your own devices to verify push
              delivery is working. Use the Broadcast tab to send to all users.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSendTest}
                disabled={isPending}
                className="flex items-center gap-2 border border-rule px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-secondary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FlaskConical size={12} />
                {isPending ? "Sending..." : "Send Test Push"}
              </button>

              {testResult && (
                <p
                  className={`text-[12px] font-semibold ${
                    testResult.startsWith("Error")
                      ? "text-editorial-red"
                      : "text-editorial-green"
                  }`}
                >
                  {testResult}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device Distribution */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Device Distribution
            </h3>

            {Object.keys(tokenStats.byDevice).length === 0 ? (
              <p className="text-sm text-ink-muted">No devices registered</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(tokenStats.byDevice)
                  .sort(([, a], [, b]) => b - a)
                  .map(([device, count]) => (
                    <div key={device} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-rule bg-surface-cream text-ink-muted dark:bg-ink/10">
                        {deviceIcon(device)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-sans text-[13px] font-semibold capitalize text-ink">
                          {device}
                        </p>
                        <div className="mt-1 h-1.5 w-full bg-surface-raised">
                          <div
                            className="h-full bg-editorial-green"
                            style={{
                              width: `${Math.round(
                                (count / tokenStats.totalTokens) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-ink-secondary">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Type breakdown */}
            {Object.keys(deliveryStats.byType).length > 0 && (
              <>
                <div className="my-4 h-px bg-rule" />
                <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  By Type (30d)
                </h3>
                <div className="space-y-1.5">
                  {Object.entries(deliveryStats.byType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-[11px] text-ink-secondary">
                          {PUSH_TYPE_LABELS[type] ?? type}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-ink">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Push Delivery History */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Push Delivery Log
          </span>
          <div className="h-px flex-1 bg-rule" />
          <span className="font-mono text-[10px] text-ink-muted">
            {log.length} entries
          </span>
        </div>

        {log.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No push notifications sent"
            description="Push delivery logs will appear here once you send your first broadcast or test push."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-rule">
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Time
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Title
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Target
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Type
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Targeted
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Delivered
                  </th>
                  <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Failed
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Sent By
                  </th>
                  <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Status
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => {
                  const isExpanded = expandedRow === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-rule transition-colors hover:bg-surface-raised"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-ink-muted">
                          <Clock size={10} />
                          <span className="font-mono text-[10px]">
                            {timeAgo(entry.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[9px] text-ink-muted">
                          {formatDateTime(entry.created_at)}
                        </p>
                      </td>
                      <td className="max-w-[200px] px-3 py-2.5">
                        <p className="truncate font-sans text-[13px] font-medium text-ink">
                          {entry.title}
                        </p>
                        {entry.message && (
                          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                            {entry.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] text-ink-secondary">
                          {targetLabel(entry.target)}
                        </span>
                        {entry.user_name && (
                          <p className="mt-0.5 text-[10px] text-ink-muted">
                            {entry.user_name}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] text-ink-muted">
                          {PUSH_TYPE_LABELS[entry.type] ?? entry.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-ink">
                        {entry.tokens_targeted}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-editorial-green">
                        {entry.tokens_success}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] text-editorial-red">
                        {entry.tokens_failed}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-ink-secondary">
                        {entry.sent_by_name}
                      </td>
                      <td className="px-3 py-2.5">{statusBadge(entry)}</td>
                      <td className="px-1 py-2.5">
                        {entry.errors && entry.errors.length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : entry.id)
                            }
                            className="p-1 text-ink-muted transition-colors hover:text-ink"
                          >
                            {isExpanded ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded error details */}
            {expandedRow &&
              (() => {
                const entry = log.find((l) => l.id === expandedRow);
                if (!entry?.errors?.length) return null;
                return (
                  <div className="border border-t-0 border-rule bg-surface-raised px-4 py-3">
                    <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                      Errors
                    </p>
                    <ul className="space-y-0.5">
                      {entry.errors.map((err, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[11px] text-ink-secondary"
                        >
                          <XCircle
                            size={10}
                            className="mt-0.5 shrink-0 text-editorial-red"
                          />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
          </div>
        )}
      </div>
    </div>
  );
}
