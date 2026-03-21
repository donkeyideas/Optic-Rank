"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialAnalysis, HashtagRecommendation } from "@/types";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface HashtagsTabProps {
  profile: SocialProfile;
  analyses: SocialAnalysis[];
}

const VOLUME_COLORS = {
  high: "danger" as const,
  medium: "warning" as const,
  low: "success" as const,
};

export function HashtagsTab({ profile, analyses }: HashtagsTabProps) {
  const timezone = useTimezone();
  const [isPending, startTransition] = useTransition();

  const hashAnalysis = analyses.find((a) => a.analysis_type === "hashtags");
  const hashtags = (hashAnalysis?.result as { hashtags?: HashtagRecommendation[] })?.hashtags ?? [];

  function handleAnalyze() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "hashtags");
    });
  }

  // Group by category
  const grouped: Record<string, HashtagRecommendation[]> = {};
  for (const tag of hashtags) {
    const cat = tag.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tag);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Hashtag Recommendations</h3>
          <p className="text-sm text-ink-secondary">
            Platform-specific hashtags for @{profile.handle} on {profile.platform}
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Analyzing..." : hashtags.length > 0 ? "Refresh" : "Generate Hashtags"}
        </Button>
      </div>

      {hashtags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              No hashtag recommendations yet. Click &quot;Generate Hashtags&quot; to get
              AI-powered suggestions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* All hashtags as copyable block */}
          <Card>
            <CardHeader>
              <CardTitle>Copy-Paste Block</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-surface-card p-3 font-mono text-sm text-ink-secondary">
                {hashtags.map((h) => `#${h.tag}`).join(" ")}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  navigator.clipboard.writeText(
                    hashtags.map((h) => `#${h.tag}`).join(" ")
                  )
                }
              >
                Copy All
              </Button>
            </CardContent>
          </Card>

          {/* Grouped by category */}
          {Object.entries(grouped).map(([category, tags]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} Hashtags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tags.map((tag, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-rule py-2 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-ink">
                          #{tag.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={VOLUME_COLORS[tag.volume] ?? "muted"}>
                          {tag.volume ?? "?"} vol
                        </Badge>
                        <Badge variant={VOLUME_COLORS[tag.competition] ?? "muted"}>
                          {tag.competition ?? "?"} comp
                        </Badge>
                        <span className="w-12 text-right font-mono text-xs text-ink-muted">
                          {tag.relevance != null ? `${tag.relevance}%` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {hashAnalysis && (
        <p className="text-xs text-ink-muted">
          Generated {formatDate(hashAnalysis.created_at, timezone)}.
        </p>
      )}
    </div>
  );
}
