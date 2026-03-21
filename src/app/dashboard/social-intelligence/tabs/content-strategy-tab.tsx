"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialAnalysis, ContentStrategy } from "@/types";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface ContentStrategyTabProps {
  profile: SocialProfile;
  analyses: SocialAnalysis[];
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ContentStrategyTab({ profile, analyses }: ContentStrategyTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();

  const csAnalysis = analyses.find((a) => a.analysis_type === "content_strategy");
  const strategy = csAnalysis?.result as unknown as ContentStrategy | null;

  function handleAnalyze() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "content_strategy");
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Content Strategy</h3>
          <p className="text-sm text-ink-secondary">
            Posting schedule and content mix for @{profile.handle}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Analyzing..." : strategy ? "Refresh" : "Generate Strategy"}
        </Button>
      </div>

      {!strategy || !strategy.weekly_schedule ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              No content strategy generated yet. Click &quot;Generate Strategy&quot; to get a
              personalized posting plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Posting frequency + content mix */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Posting Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-2xl font-bold text-ink">
                  {strategy.posting_frequency || "3-5 per week"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(strategy.content_mix ?? []).map((cm, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="h-2 bg-editorial-red"
                        style={{ width: `${cm.percentage}%`, minWidth: 4 }}
                      />
                      <span className="text-sm text-ink-secondary">
                        {cm.type} ({cm.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Posting Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-rule">
                {(strategy.weekly_schedule ?? [])
                  .sort(
                    (a, b) =>
                      DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
                  )
                  .map((day, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-6"
                    >
                      <span className="w-24 shrink-0 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                        {day.day}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(day.best_times ?? []).map((time, j) => (
                          <Badge key={j} variant="muted">
                            {time}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(day.content_types ?? []).map((ct, j) => (
                          <Badge key={j} variant="info">
                            {ct}
                          </Badge>
                        ))}
                      </div>
                      {day.theme && (
                        <span className="text-sm text-ink-secondary">{day.theme}</span>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          {strategy.tips && strategy.tips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pro Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {strategy.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 bg-editorial-red" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {csAnalysis && (
        <p className="text-xs text-ink-muted">
          Generated {formatDate(csAnalysis.created_at, timezone)}.
        </p>
      )}
    </div>
  );
}
