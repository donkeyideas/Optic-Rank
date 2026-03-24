"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import {
  Users,
  Globe,
  Plus,
  ExternalLink,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  ArrowRight,
  Target,
  BarChart3,
  Shield,
  Eye,
  Zap,
  TrendingUp,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecommendationsTab, StrategyGuideTab } from "@/components/shared/page-guide";
import type { Recommendation, StrategyContent } from "@/components/shared/page-guide";
import { EmptyState } from "@/components/shared/empty-state";
import { addCompetitor, removeCompetitor, generateCompetitorsAI } from "@/lib/actions/competitors";
import { useActionProgress } from "@/components/shared/action-progress";
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
  const { runAction, isRunning: isActionRunning } = useActionProgress();

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
      disabled={isActionRunning || isPending}
      onClick={() => {
        runAction(
          {
            title: "Discovering Competitors",
            description: "Analyzing your niche and finding competitors...",
            steps: ["Fetching website data", "Analyzing business context", "Identifying industry niche", "Finding direct competitors", "Enriching competitor metrics"],
            estimatedDuration: 25,
          },
          () => generateCompetitorsAI(projectId)
        );
      }}
    >
      <Sparkles size={14} />
      Discover
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

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    competitors.forEach((comp) => {
      const snap = latestSnapshotMap.get(comp.id);

      // Low authority competitors — easy to outrank
      if (comp.authority_score != null && comp.authority_score < 30) {
        recs.push({
          id: `weak-${comp.id}`,
          priority: "high",
          category: "Quick Win",
          icon: Zap,
          item: comp.name,
          action: `Target ${comp.name}'s top keywords — their low domain authority (${comp.authority_score}) means you can outrank them with quality content.`,
          where: "Create content targeting keywords where this competitor currently ranks in the top 10.",
          estimatedImpact: `Potential to capture a share of their ${comp.organic_traffic != null ? formatTraffic(comp.organic_traffic) : "unknown"} monthly organic visits.`,
          details: "Low-authority competitors are the easiest to displace. Focus on producing higher-quality, more comprehensive content for their ranking keywords.",
        });
      }

      // High-traffic competitors — learn from them
      if (comp.organic_traffic != null && comp.organic_traffic > 50000) {
        recs.push({
          id: `learn-${comp.id}`,
          priority: "medium",
          category: "Content Gap",
          icon: Eye,
          item: comp.name,
          action: `Analyze ${comp.name}'s top-performing pages to identify content gaps in your own site.`,
          where: "Use a keyword gap tool to find keywords they rank for that you don't.",
          estimatedImpact: `${comp.name} gets ${formatTraffic(comp.organic_traffic)}/mo organic traffic — even capturing 10% would be ${formatTraffic(Math.round(comp.organic_traffic * 0.1))}/mo new visits.`,
          details: "High-traffic competitors have validated demand. Reverse-engineering their content strategy reveals proven topics and keyword clusters.",
        });
      }

      // Competitors with more keywords — keyword expansion opportunity
      if (comp.keywords_count != null && comp.keywords_count > 500) {
        recs.push({
          id: `keywords-${comp.id}`,
          priority: "medium",
          category: "Keyword Expansion",
          icon: Target,
          item: comp.name,
          action: `${comp.name} ranks for ${formatNumber(comp.keywords_count)} keywords. Identify overlapping and unique keywords to expand your targeting.`,
          where: "Run a competitor keyword analysis to find keywords they rank for that you're missing.",
          estimatedImpact: "Expanding your keyword footprint by 20-30% could significantly increase organic visibility.",
          details: "Competitor keyword analysis reveals not just individual keywords but entire topic clusters you may be missing.",
        });
      }

      // High authority competitors — backlink opportunities
      if (comp.authority_score != null && comp.authority_score > 60) {
        recs.push({
          id: `backlink-${comp.id}`,
          priority: "low",
          category: "Link Building",
          icon: Globe,
          item: comp.name,
          action: `Study ${comp.name}'s backlink profile (DA: ${comp.authority_score}) to find link-building opportunities.`,
          where: "Analyze their referring domains in the Backlinks section to find sites that may also link to you.",
          estimatedImpact: "Acquiring even 5-10 high-quality backlinks from shared referrers can boost domain authority by 3-5 points.",
          details: "Sites that link to your competitors are more likely to link to you since they're already interested in your niche.",
        });
      }

      // Competitors with high backlinks from snapshot
      if (snap) {
        const backlinksCount = snap.backlinks_count as number | null;
        if (backlinksCount != null && backlinksCount > 10000) {
          recs.push({
            id: `backlinkgap-${comp.id}`,
            priority: "medium",
            category: "Backlink Gap",
            icon: Shield,
            item: comp.name,
            action: `${comp.name} has ${formatNumber(backlinksCount)} backlinks. Identify high-value referring domains you're missing.`,
            where: "Cross-reference their backlink sources with yours in the Backlinks page.",
            estimatedImpact: "Closing the backlink gap with top competitors typically yields 15-25% organic traffic growth over 3-6 months.",
            details: "Focus on their highest-authority referring domains first. Look for guest post opportunities, resource pages, and broken link replacement.",
          });
        }
      }
    });

    // General recommendations when few competitors tracked
    if (competitors.length < 3) {
      recs.push({
        id: "add-more",
        priority: "high",
        category: "Setup",
        icon: Users,
        item: "Track More Competitors",
        action: "Add at least 3-5 competitors for meaningful competitive intelligence. Use the 'Discover' button to auto-detect competitors.",
        where: "Click 'Add Competitor' or 'Discover' at the top of this page.",
        estimatedImpact: "More competitors tracked = better keyword gap analysis, more backlink opportunities, and clearer content strategy.",
        details: "The ideal competitor set includes 2-3 direct competitors (similar size) and 1-2 aspirational competitors (larger, market leaders).",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [competitors, latestSnapshotMap]);

  const strategyContent: StrategyContent = useMemo(() => ({
    title: "Competitive Intelligence Strategy Guide",
    intro: "Understanding your competitors' SEO strategies is essential to outranking them. This guide explains how to use competitive data to identify opportunities, close gaps, and build a winning strategy.",
    cards: [
      {
        icon: Target,
        iconColor: "text-editorial-red",
        title: "Keyword Gap Analysis",
        bullets: [
          { bold: "Find missing keywords", text: "Discover high-value keywords your competitors rank for that you don't." },
          { bold: "Identify weak spots", text: "Find keywords where competitors rank poorly and you can easily overtake." },
          { bold: "Cluster opportunities", text: "Group related keywords into content clusters for maximum topical authority." },
        ],
      },
      {
        icon: Shield,
        iconColor: "text-editorial-gold",
        title: "Backlink Intelligence",
        bullets: [
          { bold: "Shared referrers", text: "Sites linking to competitors are predisposed to link to you too." },
          { bold: "Link gap analysis", text: "Find high-authority domains linking to competitors but not to you." },
          { bold: "Outreach targets", text: "Build a prioritized list of domains for link-building campaigns." },
        ],
      },
      {
        icon: BarChart3,
        iconColor: "text-editorial-green",
        title: "Traffic & Authority",
        bullets: [
          { bold: "Benchmark your DA", text: "Compare your domain authority against competitors to gauge your competitive position." },
          { bold: "Traffic trends", text: "Monitor competitor traffic changes to spot market shifts early." },
          { bold: "Growth rate", text: "Track how fast competitors are growing to set realistic targets." },
        ],
      },
    ],
    steps: [
      { step: "1", title: "Add Competitors", desc: "Add 3-5 direct competitors and 1-2 aspirational competitors. Use 'Discover' to auto-detect." },
      { step: "2", title: "Analyze Authority", desc: "Compare domain authority scores. Identify which competitors are within striking distance." },
      { step: "3", title: "Find Keyword Gaps", desc: "Use keyword data to find topics your competitors cover that you don't." },
      { step: "4", title: "Study Backlinks", desc: "Analyze competitor backlink profiles to find link-building opportunities." },
      { step: "5", title: "Create Content", desc: "Build content that's better than what competitors have for target keywords." },
      { step: "6", title: "Monitor & Repeat", desc: "Track changes monthly. Competitors adapt, and so should your strategy." },
    ],
    dos: [
      { text: "Track both direct competitors and aspirational leaders in your space." },
      { text: "Focus on competitors with similar or lower domain authority for quick wins." },
      { text: "Analyze the content format and depth of top-ranking competitor pages." },
      { text: "Look for patterns in competitor backlink acquisition strategies." },
      { text: "Update your competitor list quarterly as the landscape changes." },
    ],
    donts: [
      { text: "Don't just copy competitor content — create something significantly better." },
      { text: "Don't ignore smaller competitors who may be growing fast." },
      { text: "Don't focus solely on vanity metrics like domain authority without context." },
      { text: "Don't try to compete on every keyword — prioritize based on business value." },
      { text: "Don't neglect monitoring — competitive landscapes shift constantly." },
    ],
    metrics: [
      { label: "Domain Authority", desc: "A score (0-100) predicting how well a site will rank. Higher is better. Compare yours against competitors.", color: "text-editorial-red" },
      { label: "Organic Traffic", desc: "Estimated monthly visitors from organic search. Indicates overall SEO effectiveness.", color: "text-editorial-gold" },
      { label: "Keywords Count", desc: "Total keywords a competitor ranks for. More keywords = broader visibility.", color: "text-editorial-green" },
      { label: "Backlinks", desc: "Total inbound links from other sites. A key ranking factor and authority signal.", color: "text-ink" },
    ],
  }), []);

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

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="flex flex-col gap-6">
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
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsTab
            recommendations={recommendations}
            itemLabel="competitor"
            emptyMessage="Add competitors to generate personalized competitive intelligence recommendations."
          />
        </TabsContent>

        <TabsContent value="strategy">
          <StrategyGuideTab content={strategyContent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
