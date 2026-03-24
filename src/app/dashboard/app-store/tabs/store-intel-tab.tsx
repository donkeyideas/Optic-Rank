"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  TrendingUp,
  Sparkles,
  Zap,
  Trophy,
  Star,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { AppSelectorStrip } from "@/components/app-store/app-selector-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";
import { AiMarkdown } from "@/components/shared/ai-markdown";
import {
  getCategoryLeaderboard,
  findKeywordOpportunities,
  analyzeCategoryTrends,
} from "@/lib/actions/app-store-intel";
import type { AppStoreListing } from "@/types";

interface StoreIntelTabProps {
  listings: AppStoreListing[];
}

export function StoreIntelTab({ listings }: StoreIntelTabProps) {
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  const [leaderboard, setLeaderboard] = useState<Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null; downloads_estimate: number | null }>>([]);
  const [opportunities, setOpportunities] = useState<Array<{ keyword: string; estimated_volume: string; competition: string; opportunity_score: number; reason: string }>>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);

  const listing = listings.find((l) => l.id === selectedListing);
  const autoLoaded = useRef(false);

  // Auto-load all data on mount
  useEffect(() => {
    if (autoLoaded.current || !selectedListing) return;
    autoLoaded.current = true;
    startTransition(async () => {
      setActionId("autoload");
      const [lbResult, oppResult, trendResult] = await Promise.all([
        getCategoryLeaderboard(selectedListing),
        findKeywordOpportunities(selectedListing),
        analyzeCategoryTrends(selectedListing),
      ]);
      if ("apps" in lbResult) setLeaderboard(lbResult.apps);
      if ("opportunities" in oppResult) setOpportunities(oppResult.opportunities);
      if ("analysis" in trendResult) setTrendAnalysis(trendResult.analysis);
      setActionId(null);
    });
  }, [selectedListing]);

  function handleLeaderboard() {
    runAction(
      {
        title: "Loading Category Leaderboard",
        description: "Fetching top apps in your category...",
        steps: ["Searching category", "Ranking apps", "Compiling results"],
        estimatedDuration: 15,
      },
      async () => {
        const result = await getCategoryLeaderboard(selectedListing);
        if ("apps" in result) setLeaderboard(result.apps);
        return "error" in result ? result : { message: `Found ${result.apps.length} top apps` };
      }
    );
  }

  function handleOpportunities() {
    runAction(
      {
        title: "Finding Keyword Opportunities",
        description: "Discovering untapped keywords for your app...",
        steps: ["Analyzing category keywords", "Evaluating competition", "Scoring opportunities", "Ranking results"],
        estimatedDuration: 20,
      },
      async () => {
        const result = await findKeywordOpportunities(selectedListing);
        if ("opportunities" in result) setOpportunities(result.opportunities);
        return "error" in result ? result : { message: `Found ${result.opportunities.length} opportunities` };
      }
    );
  }

  function handleTrends() {
    runAction(
      {
        title: "Analyzing Category Trends",
        description: "AI is analyzing market trends in your app category...",
        steps: ["Collecting market data", "Analyzing trends", "Identifying patterns", "Generating analysis"],
        estimatedDuration: 25,
      },
      async () => {
        const result = await analyzeCategoryTrends(selectedListing);
        if ("analysis" in result) setTrendAnalysis(result.analysis);
        return "error" in result ? result : { message: "Trend analysis complete" };
      }
    );
  }

  if (listings.length === 0) {
    return <EmptyState icon={TrendingUp} title="No Apps to Analyze" description="Add an app listing first to access store intelligence." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <AppSelectorStrip listings={listings} selected={selectedListing} onSelect={setSelectedListing} />

      {/* Actions */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <Button variant="outline" size="sm" onClick={handleLeaderboard} disabled={isActionRunning}>
          <Trophy size={12} />
          Category Top
        </Button>
        <Button variant="outline" size="sm" onClick={handleOpportunities} disabled={isActionRunning}>
          <Zap size={12} />
          Find Opportunities
        </Button>
        <Button variant="primary" size="sm" onClick={handleTrends} disabled={isActionRunning}>
          <Sparkles size={12} />
          Analyze Trends
        </Button>
      </div>

      {/* Category Trends Analysis */}
      {trendAnalysis && (
        <div className="border border-rule bg-surface-card p-5">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Market Trends — {listing?.category ?? "Category"}
          </span>
          <AiMarkdown content={trendAnalysis} className="mt-3 font-sans text-[12px] leading-relaxed" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category Leaderboard */}
        <div className="border border-rule bg-surface-card p-4">
          <ColumnHeader title="Category Leaderboard" subtitle={listing?.category ?? "Your category"} />
          {leaderboard.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center">
              <Trophy size={24} className="text-ink-muted" />
              <span className="text-[11px] text-ink-muted">Click &quot;Category Top&quot; to load the leaderboard</span>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-0">
              {leaderboard.map((app, i) => (
                <div key={app.app_id} className={`flex items-center gap-3 py-2.5 ${i < leaderboard.length - 1 ? "border-b border-rule" : ""}`}>
                  <span className="w-6 font-mono text-sm font-bold text-ink-muted">#{i + 1}</span>
                  {app.icon_url && <img src={app.icon_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded border border-rule" />}
                  <div className="flex-1">
                    <span className="text-[13px] font-semibold text-ink">{app.app_name}</span>
                    {app.developer && <span className="block text-[10px] text-ink-muted">{app.developer}</span>}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-ink">{app.rating?.toFixed(1) ?? "—"}</span>
                    <Star size={10} className="mb-0.5 ml-0.5 inline fill-editorial-gold text-editorial-gold" />
                    {app.downloads_estimate && (
                      <span className="block font-mono text-[10px] text-ink-muted">
                        {app.downloads_estimate >= 1000000 ? `${(app.downloads_estimate / 1000000).toFixed(1)}M` : `${(app.downloads_estimate / 1000).toFixed(0)}K`} dl
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Keyword Opportunities */}
        <div className="border border-rule bg-surface-card p-4">
          <ColumnHeader title="Keyword Opportunities" subtitle="Low competition + high relevance keywords" />
          {opportunities.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center">
              <Zap size={24} className="text-ink-muted" />
              <span className="text-[11px] text-ink-muted">Click &quot;Find Opportunities&quot; to discover untapped keywords</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Competition</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <span className="font-sans text-sm font-semibold text-ink">{opp.keyword}</span>
                        <span className="block text-[10px] text-ink-muted">{opp.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={opp.estimated_volume === "high" ? "success" : opp.estimated_volume === "medium" ? "warning" : "muted"}>
                        {opp.estimated_volume}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={opp.competition === "low" ? "success" : opp.competition === "medium" ? "warning" : "danger"}>
                        {opp.competition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm font-bold ${opp.opportunity_score >= 80 ? "text-editorial-green" : opp.opportunity_score >= 60 ? "text-editorial-gold" : "text-ink-secondary"}`}>
                        {opp.opportunity_score}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
