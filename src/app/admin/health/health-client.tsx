"use client";

import {
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
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
import { EmptyState } from "@/components/shared/empty-state";

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
  const noJobsAtAll = totalJobs === 0 && recentJobs.length === 0;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          System Health
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Job queue status, recent jobs, and error tracking.
        </p>
      </div>

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
          TABS OR EMPTY STATE
          ================================================================ */}
      {noJobsAtAll ? (
        <div className="mt-8">
          <EmptyState
            icon={ListTodo}
            title="No jobs in the queue"
            description="No jobs in the queue. Jobs will appear when crawls, rank checks, or other background tasks run."
          />
        </div>
      ) : (
        <div className="mt-8">
          <Tabs defaultValue="jobs">
            <TabsList>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
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
                    <div className="py-8 text-center text-sm text-ink-muted">
                      No recent jobs found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Completed At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-sans font-medium text-ink">
                              {job.job_type}
                            </TableCell>
                            <TableCell>
                              {jobStatusBadge(job.status)}
                            </TableCell>
                            <TableCell className="font-mono text-sm tabular-nums text-ink-secondary">
                              {job.priority ?? "---"}
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
                              {job.job_type}
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
      )}
    </div>
  );
}
