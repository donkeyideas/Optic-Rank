"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiMarkdown } from "@/components/shared/ai-markdown";
import { analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialAnalysis } from "@/types";

interface AIInsightsTabProps {
  profile: SocialProfile;
  analyses: SocialAnalysis[];
}

export function AIInsightsTab({ profile, analyses }: AIInsightsTabProps) {
  const [isPending, startTransition] = useTransition();

  const insightAnalysis = analyses.find((a) => a.analysis_type === "insights");
  const planAnalysis = analyses.find((a) => a.analysis_type === "thirty_day_plan");

  const insights = (insightAnalysis?.result as { insights?: string })?.insights ?? null;
  const plan = (planAnalysis?.result as { plan?: string })?.plan ?? null;

  function handleGenerateInsights() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "insights");
    });
  }

  function handleGenerate30DayPlan() {
    startTransition(async () => {
      await analyzeSocialProfile(profile.id, "thirty_day_plan");
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">AI Strategic Insights</h3>
          <p className="text-sm text-ink-secondary">
            In-depth analysis and actionable strategy for @{profile.handle}
          </p>
        </div>
        <Button onClick={handleGenerateInsights} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Analyzing..." : insights ? "Refresh Insights" : "Generate Insights"}
        </Button>
      </div>

      {insights ? (
        <Card>
          <CardHeader>
            <CardTitle>Strategic Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-ink-secondary">
              <AiMarkdown content={insights} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              Click &quot;Generate Insights&quot; to get an AI-powered strategic analysis of
              your social media presence.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between border-t border-rule pt-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">30-Day Growth Plan</h3>
          <p className="text-sm text-ink-secondary">
            Day-by-day action plan tailored to your account
          </p>
        </div>
        <Button onClick={handleGenerate30DayPlan} disabled={isPending} variant="outline" size="sm">
          {isPending ? "Generating..." : plan ? "Regenerate Plan" : "Generate 30-Day Plan"}
        </Button>
      </div>

      {plan ? (
        <Card>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none text-ink-secondary">
              <AiMarkdown content={plan} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              Generate a detailed week-by-week plan with daily tasks, content themes, and
              growth milestones.
            </p>
          </CardContent>
        </Card>
      )}

      {(insightAnalysis || planAnalysis) && (
        <p className="text-xs text-ink-muted">
          {insightAnalysis &&
            `Insights generated ${new Date(insightAnalysis.created_at).toLocaleDateString()}.`}
          {planAnalysis &&
            ` Plan generated ${new Date(planAnalysis.created_at).toLocaleDateString()}.`}
        </p>
      )}
    </div>
  );
}
