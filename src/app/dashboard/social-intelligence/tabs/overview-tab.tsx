"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FollowerGrowthChart } from "@/components/charts/follower-growth-chart";
import { EngagementChart } from "@/components/charts/engagement-chart";
import { HealthScore } from "@/components/editorial/health-score";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type {
  SocialProfile,
  SocialMetric,
  SocialAnalysis,
  SocialAnalysisType,
  EarningsForecast,
  SocialGrowthTip,
  ContentStrategy,
} from "@/types";
import { getPlatformConfig } from "@/lib/social/platform-config";

interface OverviewTabProps {
  profile: SocialProfile;
  metrics: SocialMetric[];
  analyses: SocialAnalysis[];
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
};

const ALL_ANALYSIS_TYPES: { key: SocialAnalysisType; label: string }[] = [
  { key: "growth", label: "Growth Tips" },
  { key: "content_strategy", label: "Content Strategy" },
  { key: "hashtags", label: "Hashtags" },
  { key: "competitors", label: "Competitors" },
  { key: "insights", label: "AI Insights" },
  { key: "earnings_forecast", label: "Earnings Forecast" },
  { key: "thirty_day_plan", label: "30-Day Plan" },
];

const PRIORITY_COLORS = {
  high: "danger" as const,
  medium: "warning" as const,
  low: "info" as const,
};

export function OverviewTab({ profile, metrics, analyses }: OverviewTabProps) {
  const pConfig = getPlatformConfig(profile.platform);

  // --- Compute derived data ---

  const latestMetric = metrics[metrics.length - 1];
  const earliestMetric = metrics[0];

  // Follower growth delta
  const followerGrowth =
    earliestMetric && latestMetric && earliestMetric.followers && latestMetric.followers
      ? latestMetric.followers - earliestMetric.followers
      : null;

  // Engagement trend
  const engagementDelta =
    earliestMetric?.engagement_rate != null && latestMetric?.engagement_rate != null
      ? latestMetric.engagement_rate - earliestMetric.engagement_rate
      : null;

  // Earnings forecast
  const earningsAnalysis = analyses.find((a) => a.analysis_type === "earnings_forecast");
  const forecast = earningsAnalysis?.result as unknown as EarningsForecast | null;
  const realisticMonthly = forecast?.scenarios?.realistic?.monthly ?? null;

  // Growth tips (top 3 by priority)
  const growthAnalysis = analyses.find((a) => a.analysis_type === "growth");
  const allTips = (growthAnalysis?.result as { tips?: SocialGrowthTip[] })?.tips ?? [];
  const topTips = getTopTips(allTips, 3);

  // Content strategy
  const csAnalysis = analyses.find((a) => a.analysis_type === "content_strategy");
  const strategy = csAnalysis?.result as unknown as ContentStrategy | null;

  // Monetization factors → HealthScore
  const factors = forecast?.monetization_factors ?? [];
  const monetizationScore =
    factors.length > 0
      ? Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length)
      : null;

  // Latest avg likes/views
  const avgLikes = latestMetric?.avg_likes ?? null;
  const avgViews = latestMetric?.avg_views ?? null;

  return (
    <div className="mt-4 space-y-6">
      {/* ----------------------------------------------------------------
          1. Profile Header (compact)
          ---------------------------------------------------------------- */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="font-serif text-xl font-bold text-ink">@{profile.handle}</h2>
            <Badge variant={profile.verified ? "success" : "muted"}>
              {PLATFORM_LABELS[profile.platform]}
            </Badge>
            {profile.verified && <Badge variant="info">Verified</Badge>}
            {profile.display_name && (
              <span className="text-sm text-ink-secondary">{profile.display_name}</span>
            )}
            {profile.niche && (
              <Badge variant="muted">{profile.niche}</Badge>
            )}
            {profile.country && (
              <span className="font-mono text-xs text-ink-muted">{profile.country}</span>
            )}
            {pConfig.extraBadges.map((badge) => {
              const extra = (profile as unknown as Record<string, unknown>).extra as Record<string, unknown> | undefined;
              const val = extra?.[badge.key];
              if (val == null || val === "" || val === false) return null;
              const display = badge.format ? badge.format(val) : String(val);
              if (!display) return null;
              return <Badge key={badge.key} variant="muted">{display}</Badge>;
            })}
          </div>
          {profile.bio && (
            <p className="mt-2 text-sm text-ink-secondary">{profile.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------
          2. Key Metrics Grid — platform-aware hero stats
          ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
        {pConfig.heroStats.map((stat, i) => {
          const extra = (profile as unknown as Record<string, unknown>).extra as Record<string, unknown> | undefined;

          // Build per-stat overrides for live data (deltas, analysis-derived values)
          let value = stat.getValue(profile, extra);
          let delta: number | null | undefined;
          let suffix: string | undefined;
          let subtext = stat.getSubtext?.(profile, extra);

          // Override audience stat (slot 0) with growth delta
          if (i === 0) {
            delta = followerGrowth;
          }
          // Override engagement stat with delta
          if (stat.label === "Engagement Rate") {
            delta = engagementDelta != null ? +engagementDelta.toFixed(2) : null;
            suffix = "%";
          }
          // Override earnings stat with analysis data
          if (stat.label === "Est. Monthly Earnings") {
            value = realisticMonthly != null ? `$${realisticMonthly.toLocaleString()}` : "—";
            subtext = realisticMonthly != null ? "realistic scenario" : "run analysis to project";
          }
          // Override avg likes/post with metric data
          if (stat.label === "Avg. Likes/Post") {
            value = avgLikes != null
              ? Math.round(avgLikes).toLocaleString()
              : avgViews != null
                ? Math.round(avgViews).toLocaleString()
                : profile.posts_count.toLocaleString();
            subtext = avgLikes == null && avgViews == null ? "total posts" : undefined;
          }

          return (
            <HeroStat
              key={stat.label}
              label={stat.label}
              value={value}
              delta={delta}
              suffix={suffix}
              subtext={subtext}
              highlight={stat.highlight}
            />
          );
        })}
      </div>

      {/* ----------------------------------------------------------------
          3. Earnings Snapshot — 3 scenario mini-cards
          ---------------------------------------------------------------- */}
      {forecast?.scenarios && (
        <div>
          <Overline>Earnings Projection</Overline>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ScenarioMini
              label="Conservative"
              monthly={forecast.scenarios.conservative?.monthly ?? 0}
              color="text-ink-secondary"
            />
            <ScenarioMini
              label="Realistic"
              monthly={forecast.scenarios.realistic?.monthly ?? 0}
              color="text-editorial-green"
              highlighted
            />
            <ScenarioMini
              label="Optimistic"
              monthly={forecast.scenarios.optimistic?.monthly ?? 0}
              color="text-editorial-gold"
            />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          4. Trend Charts
          ---------------------------------------------------------------- */}
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

      {/* ----------------------------------------------------------------
          5. Monetization Readiness + Top Revenue Source (side by side)
          ---------------------------------------------------------------- */}
      {monetizationScore != null && factors.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monetization Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              <HealthScore
                score={monetizationScore}
                categories={factors.map((f) => ({
                  name: f.factor,
                  value: f.score,
                  color:
                    f.score >= 70
                      ? "var(--color-editorial-green)"
                      : f.score >= 40
                        ? "var(--color-editorial-gold)"
                        : "var(--color-editorial-red)",
                }))}
              />
            </CardContent>
          </Card>

          {/* Top revenue sources */}
          {forecast?.revenue_sources && forecast.revenue_sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forecast.revenue_sources.slice(0, 5).map((source, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 bg-editorial-red"
                          style={{ opacity: 1 - i * 0.15 }}
                        />
                        <span className="text-sm text-ink">{source.source}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-muted">{source.percentage}%</span>
                        <span className="w-20 text-right font-mono text-sm font-bold text-ink">
                          ${(source.estimated_monthly ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------
          6. Top Growth Tips (top 3)
          ---------------------------------------------------------------- */}
      {topTips.length > 0 && (
        <div>
          <Overline>Top Growth Recommendations</Overline>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {topTips.map((tip, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={PRIORITY_COLORS[tip.priority]}>{tip.priority}</Badge>
                    {tip.estimated_impact && (
                      <span className="ml-auto font-mono text-[10px] font-semibold text-editorial-green">
                        {tip.estimated_impact}
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif text-sm font-bold leading-snug text-ink">
                    {tip.title}
                  </h4>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          7. Content Strategy Snapshot
          ---------------------------------------------------------------- */}
      {strategy && (strategy.posting_frequency || (strategy.content_mix && strategy.content_mix.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Content Strategy Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Left: Posting frequency + content mix */}
              <div className="space-y-4">
                {strategy.posting_frequency && (
                  <div>
                    <Overline>Recommended Frequency</Overline>
                    <p className="mt-1 font-serif text-base font-bold text-ink">
                      {strategy.posting_frequency}
                    </p>
                  </div>
                )}
                {strategy.content_mix && strategy.content_mix.length > 0 && (
                  <div>
                    <Overline>Content Mix</Overline>
                    <div className="mt-2 space-y-2">
                      {strategy.content_mix.slice(0, 5).map((mix, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-24 truncate text-sm text-ink">{mix.type}</span>
                          <div className="flex-1">
                            <div className="h-[6px] w-full bg-surface-inset">
                              <div
                                className="h-full bg-editorial-red transition-all"
                                style={{ width: `${Math.min(mix.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-10 text-right font-mono text-xs text-ink-muted">
                            {mix.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Best posting times */}
              {strategy.weekly_schedule && strategy.weekly_schedule.length > 0 && (
                <div>
                  <Overline>Best Posting Times</Overline>
                  <div className="mt-2 space-y-1.5">
                    {strategy.weekly_schedule.slice(0, 7).map((day, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-20 font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                          {day.day.slice(0, 3)}
                        </span>
                        <span className="text-ink-secondary">
                          {day.best_times?.join(", ") || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------
          8. Analysis Completeness Grid
          ---------------------------------------------------------------- */}
      <div>
        <Overline>Analysis Status</Overline>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ALL_ANALYSIS_TYPES.map(({ key, label }) => (
            <AnalysisStatusCard
              key={key}
              label={label}
              analysis={analyses.find((a) => a.analysis_type === key)}
            />
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------------
          9. Disclaimer
          ---------------------------------------------------------------- */}
      <div className="flex items-start gap-2 border border-editorial-gold/30 bg-editorial-gold/5 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-editorial-gold" />
        <p className="text-xs text-ink-secondary">
          <strong>Disclaimer:</strong> All metrics, earnings projections, and growth estimates are
          AI-generated based on industry benchmarks and publicly available data. They are not
          guaranteed and should be used for strategic planning purposes only. Actual results depend
          on content quality, consistency, audience demographics, and market conditions.
        </p>
      </div>

      {/* ----------------------------------------------------------------
          10. Footer
          ---------------------------------------------------------------- */}
      <p className="text-xs text-ink-muted">
        Profile added {new Date(profile.created_at).toLocaleDateString()}.
        {profile.last_synced_at &&
          ` Last synced ${new Date(profile.last_synced_at).toLocaleDateString()}.`}
        {" "}Stats are manually entered. Update them anytime via the edit form.
      </p>
    </div>
  );
}

/* ====================================================================
   Sub-components
   ==================================================================== */

/** Overline section label */
function Overline({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
      {children}
    </span>
  );
}

/** Hero stat block for the top KPI grid */
function HeroStat({
  label,
  value,
  delta,
  suffix,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface-card px-4 py-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <p
        className={`mt-1 font-serif text-2xl font-bold sm:text-3xl ${
          highlight ? "text-editorial-red" : "text-ink"
        }`}
      >
        {value}
      </p>
      {delta != null && (
        <span
          className={`mt-0.5 inline-flex items-center gap-1 font-mono text-xs ${
            delta > 0 ? "text-editorial-green" : delta < 0 ? "text-editorial-red" : "text-ink-muted"
          }`}
        >
          {delta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : delta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString()}{suffix ?? ""}
        </span>
      )}
      {subtext && !delta && (
        <span className="mt-0.5 block font-mono text-[10px] text-ink-muted">{subtext}</span>
      )}
    </div>
  );
}

/** Mini earnings scenario card */
function ScenarioMini({
  label,
  monthly,
  color,
  highlighted,
}: {
  label: string;
  monthly: number;
  color: string;
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "ring-1 ring-editorial-green" : ""}>
      <CardContent className={`p-4 ${highlighted ? "bg-editorial-green/5" : ""}`}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <p className={`font-serif text-2xl font-bold ${color}`}>
          ${monthly.toLocaleString()}
        </p>
        <span className="font-mono text-[10px] text-ink-muted">per month</span>
      </CardContent>
    </Card>
  );
}

/** Analysis status badge card */
function AnalysisStatusCard({
  label,
  analysis,
}: {
  label: string;
  analysis?: SocialAnalysis;
}) {
  const isExpired = analysis?.expires_at && new Date(analysis.expires_at) < new Date();
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            {label}
          </span>
          {analysis ? (
            <Badge variant={isExpired ? "warning" : "success"}>
              {isExpired ? "Expired" : "Ready"}
            </Badge>
          ) : (
            <Badge variant="muted">Not run</Badge>
          )}
        </div>
        {analysis && (
          <p className="mt-1 text-[10px] text-ink-muted">
            {new Date(analysis.created_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Get top N tips sorted by priority (high → medium → low) */
function getTopTips(tips: SocialGrowthTip[], n: number): SocialGrowthTip[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...tips]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, n);
}
