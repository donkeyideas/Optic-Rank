"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Flag, Save, TrendingUp } from "lucide-react";
import { saveSocialGoals } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialMetric, SocialGoal } from "@/types";

const OBJECTIVES = [
  { value: "grow_followers", label: "Grow Followers" },
  { value: "increase_engagement", label: "Increase Engagement" },
  { value: "monetize", label: "Monetize / Earn Revenue" },
  { value: "build_brand", label: "Build Brand Awareness" },
  { value: "drive_traffic", label: "Drive Website Traffic" },
  { value: "launch_product", label: "Launch a Product" },
];

const MONETIZATION_GOALS = [
  { value: "sponsorships", label: "Brand Sponsorships" },
  { value: "affiliate", label: "Affiliate Marketing" },
  { value: "digital_products", label: "Digital Products (courses, ebooks)" },
  { value: "coaching", label: "Coaching / Consulting" },
  { value: "ad_revenue", label: "Ad Revenue (YouTube, etc.)" },
  { value: "merchandise", label: "Merchandise" },
  { value: "none", label: "Not focused on monetization" },
];

const POSTING_OPTIONS = [
  { value: "1x_day", label: "1x per day" },
  { value: "3x_week", label: "3x per week" },
  { value: "5x_week", label: "5x per week" },
  { value: "7x_week", label: "Daily (7x per week)" },
  { value: "2x_day", label: "2x per day" },
  { value: "flexible", label: "Flexible / when I can" },
];

interface GoalsTabProps {
  profile: SocialProfile;
  metrics: SocialMetric[];
  goals: SocialGoal | null;
}

export function GoalsTab({ profile, metrics, goals }: GoalsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [objective, setObjective] = useState(goals?.primary_objective ?? "grow_followers");
  const [targetValue, setTargetValue] = useState(goals?.target_value?.toString() ?? "");
  const [targetDays, setTargetDays] = useState(goals?.target_days?.toString() ?? "90");
  const [niche, setNiche] = useState(goals?.content_niche ?? profile.niche ?? "");
  const [monetization, setMonetization] = useState(goals?.monetization_goal ?? "none");
  const [posting, setPosting] = useState(goals?.posting_commitment ?? "3x_week");
  const [audience, setAudience] = useState(goals?.target_audience ?? "");
  const [aspiration, setAspiration] = useState(goals?.competitive_aspiration ?? "");

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const result = await saveSocialGoals(profile.id, {
        primary_objective: objective,
        target_value: targetValue ? Number(targetValue) : null,
        target_days: targetDays ? Number(targetDays) : null,
        content_niche: niche || null,
        monetization_goal: monetization,
        posting_commitment: posting,
        target_audience: audience || null,
        competitive_aspiration: aspiration || null,
      });
      if ("success" in result) setSaved(true);
    });
  }

  // Progress calculation
  const currentFollowers = profile.followers_count;
  const target = targetValue ? Number(targetValue) : null;
  const days = targetDays ? Number(targetDays) : null;
  const progress = target && target > 0 ? Math.min(100, Math.round((currentFollowers / target) * 100)) : null;

  // Daily rate needed
  const remaining = target ? target - currentFollowers : null;
  const dailyNeeded = remaining && days && days > 0 ? Math.ceil(remaining / days) : null;

  // Current daily rate from metrics
  const sortedMetrics = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const latestFollowers = (sortedMetrics.length > 0 ? sortedMetrics[sortedMetrics.length - 1].followers : null) ?? currentFollowers;
  const earliestFollowers = (sortedMetrics.length > 1 ? sortedMetrics[0].followers : null) ?? currentFollowers;
  const metricDays = sortedMetrics.length > 1 ? Math.max(1, Math.round((new Date(sortedMetrics[sortedMetrics.length - 1].date).getTime() - new Date(sortedMetrics[0].date).getTime()) / 86400000)) : 1;
  const currentDailyRate = Math.round((latestFollowers - earliestFollowers) / metricDays);

  const Overline = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
      {children}
    </label>
  );

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h3 className="font-serif text-lg font-bold text-ink">Goals & Strategy</h3>
        <p className="text-sm text-ink-secondary">
          Define your objectives for @{profile.handle} on {profile.platform}. AI will tailor all recommendations to help you reach these goals.
        </p>
      </div>

      {/* Goals Form */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Primary Objective */}
            <div>
              <Overline>Primary Objective</Overline>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {OBJECTIVES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Target */}
            <div>
              <Overline>Target</Overline>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={objective === "grow_followers" ? "e.g. 10000" : "Target value"}
                  className="flex-1"
                />
                <span className="flex items-center text-xs text-ink-muted">in</span>
                <Input
                  type="number"
                  value={targetDays}
                  onChange={(e) => setTargetDays(e.target.value)}
                  placeholder="90"
                  className="w-20"
                />
                <span className="flex items-center text-xs text-ink-muted">days</span>
              </div>
            </div>

            {/* Content Niche */}
            <div>
              <Overline>Content Niche</Overline>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Fitness for busy professionals"
              />
            </div>

            {/* Monetization Goal */}
            <div>
              <Overline>Monetization Goal</Overline>
              <select
                value={monetization}
                onChange={(e) => setMonetization(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {MONETIZATION_GOALS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Posting Commitment */}
            <div>
              <Overline>Posting Commitment</Overline>
              <select
                value={posting}
                onChange={(e) => setPosting(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {POSTING_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <Overline>Target Audience</Overline>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. 25-35 year old professionals"
              />
            </div>
          </div>

          {/* Aspiration Account */}
          <div>
            <Overline>Aspiration Account (who do you want to be like?)</Overline>
            <Input
              value={aspiration}
              onChange={(e) => setAspiration(e.target.value)}
              placeholder="@competitor or account you admire"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isPending ? "Saving..." : "Save Goals"}
            </Button>
            {saved && (
              <span className="text-sm text-editorial-green">Goals saved. AI will now tailor recommendations to your objectives.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Toward Goals */}
      {target && target > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="mb-4 font-serif text-base font-bold text-ink">Progress Toward Goals</h4>

            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-secondary">
                    {objective === "grow_followers" ? "Followers" : "Progress"}: {currentFollowers.toLocaleString()} → {target.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs font-bold text-ink">{progress}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden bg-surface-raised">
                  <div
                    className="h-full bg-editorial-green transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Pace analysis */}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    Current Pace
                  </span>
                  <p className="font-mono text-ink">
                    {currentDailyRate >= 0 ? "+" : ""}{currentDailyRate}/day
                  </p>
                </div>
                {dailyNeeded !== null && (
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      Needed Pace
                    </span>
                    <p className={`font-mono ${currentDailyRate >= dailyNeeded ? "text-editorial-green" : "text-editorial-red"}`}>
                      +{dailyNeeded}/day
                    </p>
                  </div>
                )}
                {remaining !== null && (
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      Remaining
                    </span>
                    <p className="font-mono text-ink">
                      {remaining > 0 ? remaining.toLocaleString() : "Goal reached!"}
                    </p>
                  </div>
                )}
                {days && (
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      Timeframe
                    </span>
                    <p className="font-mono text-ink">{days} days</p>
                  </div>
                )}
              </div>

              {/* Status badge */}
              {dailyNeeded !== null && (
                <div className="border-t border-rule pt-3">
                  {currentDailyRate >= dailyNeeded ? (
                    <Badge variant="success">On track — keep it up!</Badge>
                  ) : (
                    <Badge variant="warning">
                      Below target pace — check Growth and Content tabs for tips
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <p className="text-center text-xs text-ink-muted">
        Goals are used across all tabs — Growth tips, Content strategy, AI Insights, Earnings forecasts, and the Generate tab all adapt to your objectives.
      </p>
    </div>
  );
}
