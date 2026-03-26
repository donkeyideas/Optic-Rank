"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FollowerGrowthChart } from "@/components/charts/follower-growth-chart";
import { EngagementChart } from "@/components/charts/engagement-chart";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialMetric, SocialAnalysis, SocialGrowthTip } from "@/types";
import { getPlatformConfig } from "@/lib/social/platform-config";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";
import { computeGrowthVelocity } from "@/lib/social/period-comparison";

interface GrowthTabProps {
  profile: SocialProfile;
  metrics: SocialMetric[];
  analyses: SocialAnalysis[];
}

const PRIORITY_COLORS = {
  high: "danger" as const,
  medium: "warning" as const,
  low: "info" as const,
};

const CATEGORY_LABELS: Record<string, string> = {
  content: "Content",
  engagement: "Engagement",
  timing: "Timing",
  profile: "Profile",
  collaboration: "Collaboration",
};

export function GrowthTab({ profile, metrics, analyses }: GrowthTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();
  const pConfig = getPlatformConfig(profile.platform);

  const velocity = computeGrowthVelocity(metrics);
  const growthAnalysis = analyses.find((a) => a.analysis_type === "growth");
  const tips = (growthAnalysis?.result as { tips?: SocialGrowthTip[] })?.tips ?? [];

  function handleAnalyze() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "growth");
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">{getPlatformConfig(profile.platform).growthTitle}</h3>
          <p className="text-sm text-ink-secondary">
            AI-powered recommendations to grow {profile.display_name || `@${profile.handle}`} on {profile.platform}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Analyzing..." : tips.length > 0 ? "Refresh" : "Generate Tips"}
        </Button>
      </div>

      {/* Growth Velocity Stats */}
      {(velocity.dailyAvgFollowerGrowth != null || velocity.dailyAvgEngagementChange != null) && (
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
          <div className="bg-surface-card px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Daily Avg Growth
            </span>
            <p
              className={`mt-0.5 font-serif text-xl font-bold ${
                (velocity.dailyAvgFollowerGrowth ?? 0) > 0
                  ? "text-editorial-green"
                  : (velocity.dailyAvgFollowerGrowth ?? 0) < 0
                    ? "text-editorial-red"
                    : "text-ink"
              }`}
            >
              {velocity.dailyAvgFollowerGrowth != null
                ? `${velocity.dailyAvgFollowerGrowth > 0 ? "+" : ""}${velocity.dailyAvgFollowerGrowth.toLocaleString()}`
                : "—"}
            </p>
            <span className="font-mono text-[10px] text-ink-muted">followers/day</span>
          </div>
          <div className="bg-surface-card px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Weekly Avg Growth
            </span>
            <p
              className={`mt-0.5 font-serif text-xl font-bold ${
                (velocity.weeklyAvgFollowerGrowth ?? 0) > 0
                  ? "text-editorial-green"
                  : (velocity.weeklyAvgFollowerGrowth ?? 0) < 0
                    ? "text-editorial-red"
                    : "text-ink"
              }`}
            >
              {velocity.weeklyAvgFollowerGrowth != null
                ? `${velocity.weeklyAvgFollowerGrowth > 0 ? "+" : ""}${velocity.weeklyAvgFollowerGrowth.toLocaleString()}`
                : "—"}
            </p>
            <span className="font-mono text-[10px] text-ink-muted">followers/week</span>
          </div>
          <div className="bg-surface-card px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Daily Eng. Change
            </span>
            <p className="mt-0.5 font-serif text-xl font-bold text-ink">
              {velocity.dailyAvgEngagementChange != null
                ? `${velocity.dailyAvgEngagementChange > 0 ? "+" : ""}${velocity.dailyAvgEngagementChange}%`
                : "—"}
            </p>
            <span className="font-mono text-[10px] text-ink-muted">per day</span>
          </div>
          <div className="bg-surface-card px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Weekly Eng. Change
            </span>
            <p className="mt-0.5 font-serif text-xl font-bold text-ink">
              {velocity.weeklyAvgEngagementChange != null
                ? `${velocity.weeklyAvgEngagementChange > 0 ? "+" : ""}${velocity.weeklyAvgEngagementChange}%`
                : "—"}
            </p>
            <span className="font-mono text-[10px] text-ink-muted">per week</span>
          </div>
        </div>
      )}

      {/* Growth Charts (full dataset) */}
      {metrics.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{pConfig.chartTitles.followerGrowth}</CardTitle>
            </CardHeader>
            <CardContent>
              <FollowerGrowthChart metrics={metrics} label={pConfig.fields.followers.label} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{pConfig.chartTitles.engagementRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <EngagementChart metrics={metrics} />
            </CardContent>
          </Card>
        </div>
      )}

      {tips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              No growth tips generated yet. Click &quot;Generate Tips&quot; to get AI-powered
              recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={PRIORITY_COLORS[tip.priority]}>
                        {tip.priority}
                      </Badge>
                      <Badge variant="muted">
                        {CATEGORY_LABELS[tip.category] ?? tip.category}
                      </Badge>
                    </div>
                    <h4 className="font-serif text-base font-bold text-ink">{tip.title}</h4>
                    <p className="mt-1 text-sm text-ink-secondary">{tip.description}</p>
                  </div>
                  {tip.estimated_impact && (
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                        Impact
                      </span>
                      <p className="text-sm font-semibold text-editorial-green">
                        {tip.estimated_impact}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {growthAnalysis && (
        <p className="text-xs text-ink-muted">
          Generated {formatDate(growthAnalysis.created_at, timezone)}.
          {growthAnalysis.expires_at &&
            ` Expires ${formatDate(growthAnalysis.expires_at, timezone)}.`}
        </p>
      )}
    </div>
  );
}
