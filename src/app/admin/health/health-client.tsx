"use client";

import { useState, useTransition } from "react";
import {
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Play,
  FileText,
  Search,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { triggerCronJob, clearOldJobs } from "@/lib/actions/health";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Job {
  id: string;
  job_type: string;
  status: string;
  priority?: number;
  attempts?: number;
  last_error?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
  completed_at?: string | null;
  [key: string]: unknown;
}

interface HealthClientProps {
  pendingJobs: number;
  processingJobs: number;
  failedJobs: number;
  completedJobs: number;
  recentJobs: Job[];
  recentErrors: Job[];
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function jobStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "processing":
      return <Badge variant="info">Processing</Badge>;
    case "failed":
      return <Badge variant="danger">Failed</Badge>;
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}

function jobTypeLabel(jobType: string) {
  switch (jobType) {
    case "rank_check":
      return "Rank Check";
    case "send_reports":
      return "Report Generation";
    case "api_test":
      return "API Connection Test";
    case "crawl":
      return "Site Crawl";
    default:
      return jobType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(created: string, completed: string | null | undefined) {
  if (!completed) return "---";
  const ms = new Date(completed).getTime() - new Date(created).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function HealthClient({
  pendingJobs,
  processingJobs,
  failedJobs,
  completedJobs,
  recentJobs,
  recentErrors,
}: HealthClientProps) {
  const totalJobs = pendingJobs + processingJobs + failedJobs + completedJobs;

  const [isPending, startTransition] = useTransition();
  const [triggerStatus, setTriggerStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  function handleTrigger(jobType: "rank_check" | "send_reports") {
    setTriggerStatus(null);
    setRunningJob(jobType);
    startTransition(async () => {
      const result = await triggerCronJob(jobType);
      if ("error" in result) {
        setTriggerStatus({ type: "error", message: result.error });
      } else {
        setTriggerStatus({ type: "success", message: result.message });
      }
      setRunningJob(null);
    });
  }

  function handleClear() {
    setTriggerStatus(null);
    startTransition(async () => {
      const result = await clearOldJobs(30);
      if ("error" in result) {
        setTriggerStatus({ type: "error", message: result.error });
      } else {
        setTriggerStatus({
          type: "success",
          message: `Cleared ${result.deleted} old job${result.deleted !== 1 ? "s" : ""}.`,
        });
      }
    });
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">
            System Health
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Background job queue, cron executions, and error tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTrigger("rank_check")}
            disabled={isPending}
          >
            {runningJob === "rank_check" ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Search size={14} className="mr-1.5" />
            )}
            Run Rank Check
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTrigger("send_reports")}
            disabled={isPending}
          >
            {runningJob === "send_reports" ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <FileText size={14} className="mr-1.5" />
            )}
            Run Reports
          </Button>
          {totalJobs > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={isPending}
            >
              <Trash2 size={14} className="mr-1.5" />
              Clear Old
            </Button>
          )}
        </div>
      </div>

      {/* Status message */}
      {triggerStatus && (
        <div
          className={`mb-4 flex items-center gap-2 border p-3 text-sm ${
            triggerStatus.type === "success"
              ? "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
              : "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
          }`}
        >
          {triggerStatus.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {triggerStatus.message}
        </div>
      )}

      {/* ================================================================
          STATUS SUMMARY CARDS
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Pending */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Pending
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {pendingJobs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Clock size={18} strokeWidth={1.5} className="text-editorial-gold" />
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Processing
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {processingJobs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Loader2 size={18} strokeWidth={1.5} className="text-editorial-blue" />
            </div>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Failed
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {failedJobs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <AlertTriangle size={18} strokeWidth={1.5} className="text-editorial-red" />
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Completed
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {completedJobs}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <CheckCircle2 size={18} strokeWidth={1.5} className="text-editorial-green" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          TABS - always shown
          ================================================================ */}
      <div className="mt-8">
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="errors">
              Errors
              {failedJobs > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center bg-editorial-red px-1 text-[10px] font-bold text-white">
                  {failedJobs}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- Jobs Tab ---- */}
          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Jobs</CardTitle>
                  <span className="text-xs text-ink-muted">
                    {recentJobs.length} most recent
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentJobs.length === 0 ? (
                  <div className="py-12 text-center">
                    <ListTodo size={32} strokeWidth={1} className="mx-auto mb-3 text-ink-muted/50" />
                    <p className="text-sm font-medium text-ink-secondary">No jobs yet</p>
                    <p className="mt-1 max-w-sm mx-auto text-xs text-ink-muted">
                      Jobs appear when cron tasks run (rank checks, report generation)
                      or when you test API connections. Use the buttons above to trigger a job manually.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Completed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-sans font-medium text-ink">
                            {jobTypeLabel(job.job_type)}
                          </TableCell>
                          <TableCell>
                            {jobStatusBadge(job.status)}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-ink-secondary">
                            {formatDuration(job.created_at, job.completed_at)}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-ink-secondary">
                            {job.attempts ?? 0}
                          </TableCell>
                          <TableCell className="text-ink-muted">
                            {formatDate(job.created_at)}
                          </TableCell>
                          <TableCell className="text-ink-muted">
                            {formatDate(job.completed_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Errors Tab ---- */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Errors</CardTitle>
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={14}
                      strokeWidth={1.5}
                      className="text-editorial-red"
                    />
                    <span className="text-xs text-ink-muted">
                      {recentErrors.length} {recentErrors.length === 1 ? "error" : "errors"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentErrors.length === 0 ? (
                  <div className="py-8 text-center text-sm text-ink-muted">
                    No errors recorded. All jobs are running smoothly.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Type</TableHead>
                        <TableHead>Last Error</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentErrors.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-sans font-medium text-ink">
                            {jobTypeLabel(job.job_type)}
                          </TableCell>
                          <TableCell className="max-w-md truncate text-sm text-editorial-red">
                            {job.last_error ?? "Unknown error"}
                          </TableCell>
                          <TableCell className="font-mono text-sm tabular-nums text-ink-secondary">
                            {job.attempts ?? 0}
                          </TableCell>
                          <TableCell className="text-ink-muted">
                            {formatDate(job.created_at)}
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
