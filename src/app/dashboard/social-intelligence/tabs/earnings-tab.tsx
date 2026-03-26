"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialAnalysis, EarningsForecast } from "@/types";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface EarningsTabProps {
  profile: SocialProfile;
  analyses: SocialAnalysis[];
}

export function EarningsTab({ profile, analyses }: EarningsTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();

  const earningsAnalysis = analyses.find((a) => a.analysis_type === "earnings_forecast");
  const forecast = earningsAnalysis?.result as unknown as EarningsForecast | null;

  function handleGenerate() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "earnings_forecast");
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 border border-editorial-gold/30 bg-editorial-gold/5 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-editorial-gold" />
        <p className="text-xs text-ink-secondary">
          <strong>Advisory:</strong> All earnings projections are estimates based on industry
          benchmarks and AI analysis. They are not guaranteed earnings. Actual income depends on
          many factors including content quality, consistency, audience demographics, and market
          conditions.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Earnings Forecast</h3>
          <p className="text-sm text-ink-secondary">
            AI-powered income projection for {profile.display_name || `@${profile.handle}`} on {profile.platform}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Calculating..." : forecast ? "Recalculate" : "Generate Forecast"}
        </Button>
      </div>

      {!forecast ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p className="text-sm text-ink-muted">
              Click &quot;Generate Forecast&quot; to get AI-powered earnings projections
              based on your profile metrics, niche, and platform.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Three scenario cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScenarioCard
              label="Conservative"
              color="text-ink-secondary"
              bgColor="bg-surface-card"
              monthly={forecast.scenarios?.conservative?.monthly ?? 0}
              annual={forecast.scenarios?.conservative?.annual ?? 0}
            />
            <ScenarioCard
              label="Realistic"
              color="text-editorial-green"
              bgColor="bg-editorial-green/5"
              monthly={forecast.scenarios?.realistic?.monthly ?? 0}
              annual={forecast.scenarios?.realistic?.annual ?? 0}
              highlighted
            />
            <ScenarioCard
              label="Optimistic"
              color="text-editorial-gold"
              bgColor="bg-editorial-gold/5"
              monthly={forecast.scenarios?.optimistic?.monthly ?? 0}
              annual={forecast.scenarios?.optimistic?.annual ?? 0}
            />
          </div>

          {/* Monetization factors */}
          {forecast.monetization_factors && forecast.monetization_factors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monetization Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {forecast.monetization_factors.map((factor, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{factor.factor}</span>
                        <span className="font-mono text-sm font-bold text-ink">
                          {factor.score}/100
                        </span>
                      </div>
                      <div className="mb-1 h-2 w-full bg-surface-card">
                        <div
                          className={`h-2 transition-all ${
                            factor.score >= 70
                              ? "bg-editorial-green"
                              : factor.score >= 40
                                ? "bg-editorial-gold"
                                : "bg-editorial-red"
                          }`}
                          style={{ width: `${factor.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-ink-muted">{factor.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue by source */}
          {forecast.revenue_sources && forecast.revenue_sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {forecast.revenue_sources.map((source, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-rule py-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 bg-editorial-red"
                          style={{ opacity: 1 - i * 0.15 }}
                        />
                        <span className="text-sm text-ink">{source.source}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="muted">{source.percentage}%</Badge>
                        <span className="w-24 text-right font-mono text-sm font-medium text-ink">
                          ${(source.estimated_monthly ?? 0).toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unlock actions */}
          {forecast.unlock_actions && forecast.unlock_actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <TrendingUp className="mr-2 inline h-4 w-4" />
                  How to Reach the Optimistic Scenario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {forecast.unlock_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center bg-ink font-mono text-[10px] font-bold text-surface-cream">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {earningsAnalysis && (
        <p className="text-xs text-ink-muted">
          Forecast generated {formatDate(earningsAnalysis.created_at, timezone)}.
          {earningsAnalysis.expires_at &&
            ` Refreshes ${formatDate(earningsAnalysis.expires_at, timezone)}.`}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Scenario Card Sub-component
   ------------------------------------------------------------------ */

function ScenarioCard({
  label,
  color,
  bgColor,
  monthly,
  annual,
  highlighted,
}: {
  label: string;
  color: string;
  bgColor: string;
  monthly: number;
  annual: number;
  highlighted?: boolean;
}) {
  return (
    <Card className={highlighted ? "ring-1 ring-editorial-green" : ""}>
      <CardContent className={`p-4 ${bgColor}`}>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <p className={`font-serif text-3xl font-bold ${color}`}>
          ${monthly.toLocaleString()}
        </p>
        <p className="text-xs text-ink-muted">per month</p>
        <div className="mt-2 border-t border-rule pt-2">
          <p className={`font-mono text-lg font-semibold ${color}`}>
            ${annual.toLocaleString()}
          </p>
          <p className="text-xs text-ink-muted">per year</p>
        </div>
      </CardContent>
    </Card>
  );
}
