"use client";

import {
  Users,
  Building2,
  FolderKanban,
  Search,
  Link2,
  FileSearch,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

interface UsageRecord {
  id: string;
  metric?: string;
  value?: number;
  period_start?: string;
  period_end?: string;
  [key: string]: unknown;
}

interface AnalyticsClientProps {
  totalUsers: number;
  totalOrgs: number;
  activeProjects: number;
  totalKeywords: number;
  totalBacklinks: number;
  totalAudits: number;
  usageRecords: UsageRecord[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------
   Stat card items
   ------------------------------------------------------------------ */

interface StatItem {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AnalyticsClient({
  totalUsers,
  totalOrgs,
  activeProjects,
  totalKeywords,
  totalBacklinks,
  totalAudits,
  usageRecords,
}: AnalyticsClientProps) {
  const statItems: StatItem[] = [
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "Total Orgs", value: totalOrgs, icon: Building2 },
    { label: "Active Projects", value: activeProjects, icon: FolderKanban },
    { label: "Total Keywords", value: totalKeywords, icon: Search },
    { label: "Total Backlinks", value: totalBacklinks, icon: Link2 },
    { label: "Total Audits", value: totalAudits, icon: FileSearch },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          Platform Analytics
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Real platform statistics and usage data from the database.
        </p>
      </div>

      {/* ================================================================
          STATS GRID
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    className="text-ink-muted"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ================================================================
          USAGE RECORDS
          ================================================================ */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usage Records</CardTitle>
              <span className="text-xs text-ink-muted">
                {usageRecords.length} {usageRecords.length === 1 ? "record" : "records"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {usageRecords.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No usage records yet"
                description="Usage data will accumulate as the platform is used."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Period Start</TableHead>
                    <TableHead>Period End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-sans font-medium text-ink">
                        {record.metric ?? "---"}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-ink">
                        {record.value != null
                          ? record.value.toLocaleString()
                          : "---"}
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {formatDate(record.period_start)}
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {formatDate(record.period_end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
