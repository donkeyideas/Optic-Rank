"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialAnalysis, SocialGrowthTip } from "@/types";
import { getPlatformConfig } from "@/lib/social/platform-config";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface GrowthTabProps {
  profile: SocialProfile;
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

export function GrowthTab({ profile, analyses }: GrowthTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();

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
            AI-powered recommendations to grow @{profile.handle} on {profile.platform}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Analyzing..." : tips.length > 0 ? "Refresh" : "Generate Tips"}
        </Button>
      </div>

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
