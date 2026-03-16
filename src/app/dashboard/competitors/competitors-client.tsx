"use client";

import { useState, useTransition } from "react";
import {
  Users,
  Globe,
  Plus,
  ExternalLink,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addCompetitor, removeCompetitor, generateCompetitorsAI } from "@/lib/actions/competitors";
import type { Competitor } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface CompetitorsClientProps {
  competitors: Competitor[];
  snapshots: Array<Record<string, unknown>>;
  projectId: string;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatTraffic(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

/* ------------------------------------------------------------------
   Main Client Component
   ------------------------------------------------------------------ */

export function CompetitorsClient({
  competitors,
  snapshots,
  projectId,
}: CompetitorsClientProps) {
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);

  function handleAddCompetitor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCompetitorError(null);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const domain = formData.get("domain") as string;

    if (!name?.trim() || !domain?.trim()) {
      setCompetitorError("Both name and domain are required.");
      return;
    }

    startTransition(async () => {
      const result = await addCompetitor(projectId, formData);
      if ("error" in result) {
        setCompetitorError(result.error);
      } else {
        setShowAddCompetitor(false);
        setCompetitorError(null);
      }
    });
  }

  const addCompetitorDialog = (
    <Dialog open={showAddCompetitor} onOpenChange={setShowAddCompetitor}>
      <DialogTrigger className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90">
        <Plus size={14} strokeWidth={2.5} />
        Add Competitor
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Enter the competitor name and domain to start tracking their SEO performance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddCompetitor}>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="competitor-name"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted"
              >
                Competitor Name
              </label>
              <input
                id="competitor-name"
                name="name"
                type="text"
                required
                className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                placeholder="e.g. Ahrefs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="competitor-domain"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted"
              >
                Domain
              </label>
              <input
                id="competitor-domain"
                name="domain"
                type="text"
                required
                className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                placeholder="e.g. ahrefs.com"
              />
            </div>
            {competitorError && (
              <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                {competitorError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddCompetitor(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Adding..." : "Add Competitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const generateButton = (
    <Button
      variant="outline"
      size="sm"
      disabled={isGenerating || isPending}
      onClick={() => {
        setIsGenerating(true);
        setGenerateStatus(null);
        startTransition(async () => {
          const result = await generateCompetitorsAI(projectId);
          if ("error" in result) {
            setGenerateStatus(`Error: ${result.error}`);
          } else {
            setGenerateStatus(`Added ${result.added} competitors (${result.source})`);
          }
          setIsGenerating(false);
        });
      }}
    >
      <Sparkles size={14} />
      {isGenerating ? "Discovering..." : "AI Discover"}
    </Button>
  );

  if (competitors.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Competitive Intelligence</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Monitor, analyze, and outmaneuver your competition
            </p>
          </div>
          <div className="flex items-center gap-2">
            {generateButton}
            {addCompetitorDialog}
          </div>
        </div>
        {generateStatus && (
          <div
            className={`border px-4 py-2 text-sm ${
              generateStatus.startsWith("Error")
                ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
                : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
            }`}
          >
            {generateStatus}
          </div>
        )}
        <EmptyState
          icon={Users}
          title="No Competitors Tracked Yet"
          description="Add competitors to monitor their SEO performance, keyword rankings, and content strategy."
          actionLabel="Add Competitor"
          onAction={() => setShowAddCompetitor(true)}
        />
      </div>
    );
  }

  // Build a map of latest snapshot per competitor
  const latestSnapshotMap = new Map<string, Record<string, unknown>>();
  for (const snap of snapshots) {
    const cid = snap.competitor_id as string;
    if (!latestSnapshotMap.has(cid)) {
      latestSnapshotMap.set(cid, snap);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Competitive Intelligence</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {competitors.length} competitor{competitors.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generateButton}
          {addCompetitorDialog}
        </div>
      </div>

      {/* Generate Status */}
      {generateStatus && (
        <div
          className={`border px-4 py-2 text-sm ${
            generateStatus.startsWith("Error")
              ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
              : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
          }`}
        >
          {generateStatus}
        </div>
      )}

      {/* Competitor Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Competitor Comparison</CardTitle>
          <CardDescription>
            Side-by-side analysis of your tracked competitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Organic Traffic</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-sans text-sm font-bold text-ink">
                    {comp.name}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-secondary">
                    <div className="flex items-center gap-1.5">
                      <Globe size={12} className="shrink-0 text-ink-muted" />
                      {comp.domain}
                      <ExternalLink size={10} className="shrink-0 text-ink-muted" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-serif text-lg font-bold text-ink">
                      {comp.authority_score ?? "---"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {comp.organic_traffic != null
                      ? formatTraffic(comp.organic_traffic)
                      : "---"}
                  </TableCell>
                  <TableCell>
                    {comp.keywords_count != null
                      ? formatNumber(comp.keywords_count)
                      : "---"}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      title="Remove competitor"
                      disabled={isPending}
                      onClick={() => {
                        if (!confirm(`Remove "${comp.name}"?`)) return;
                        startTransition(async () => {
                          await removeCompetitor(comp.id);
                        });
                      }}
                      className="rounded p-1 text-ink-muted transition-colors hover:bg-editorial-red/10 hover:text-editorial-red disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitors.map((comp) => {
          const snap = latestSnapshotMap.get(comp.id);
          return (
            <Card key={comp.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{comp.name}</CardTitle>
                  <button
                    type="button"
                    title="Remove competitor"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Remove "${comp.name}"?`)) return;
                      startTransition(async () => {
                        await removeCompetitor(comp.id);
                      });
                    }}
                    className="rounded p-1 text-ink-muted transition-colors hover:bg-editorial-red/10 hover:text-editorial-red disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="font-mono text-[11px] text-ink-muted">{comp.domain}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Authority</span>
                  <span className="font-serif text-xl font-bold text-ink">{comp.authority_score ?? "---"}</span>
                </div>
                <Progress value={comp.authority_score ?? 0} color="gold" size="sm" />
                <div className="grid grid-cols-2 gap-3 border-t border-rule pt-3">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Traffic</span>
                    <p className="font-mono text-sm font-bold text-ink">
                      {comp.organic_traffic != null ? formatTraffic(comp.organic_traffic) : "---"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keywords</span>
                    <p className="font-mono text-sm font-bold text-ink">
                      {comp.keywords_count != null ? formatNumber(comp.keywords_count) : "---"}
                    </p>
                  </div>
                  {snap && (
                    <>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Backlinks</span>
                        <p className="font-mono text-sm font-bold text-ink">
                          {(snap.backlinks_count as number) != null ? formatNumber(snap.backlinks_count as number) : "---"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Snapshot</span>
                        <p className="font-mono text-[10px] text-ink-muted">
                          {snap.snapshot_date as string ?? "---"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Authority Score Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Authority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {competitors.map((comp) => (
              <div key={comp.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[12px] font-medium text-ink-secondary">
                  {comp.name}
                </span>
                <Progress
                  value={comp.authority_score ?? 0}
                  color="gold"
                  size="md"
                  className="flex-1"
                />
                <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-ink-secondary">
                  {comp.authority_score ?? "---"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
