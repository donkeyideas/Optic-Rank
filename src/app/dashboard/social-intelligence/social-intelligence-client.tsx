"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  TrendingUp,
  Calendar,
  Hash,
  Target,
  Brain,
  DollarSign,
  Trash2,
  Instagram,
  Youtube,
  Linkedin,
  Loader2,
  Zap,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { addSocialProfile, removeSocialProfile, lookupSocialProfile, analyzeSocialProfile } from "@/lib/actions/social-intelligence";

import { OverviewTab } from "./tabs/overview-tab";
import { GrowthTab } from "./tabs/growth-tab";
import { ContentStrategyTab } from "./tabs/content-strategy-tab";
import { HashtagsTab } from "./tabs/hashtags-tab";
import { CompetitorsTab } from "./tabs/competitors-tab";
import { AIInsightsTab } from "./tabs/ai-insights-tab";
import { EarningsTab } from "./tabs/earnings-tab";

import type { SocialProfile, SocialMetric, SocialAnalysis, SocialCompetitor, SocialAnalysisType } from "@/types";

const ALL_ANALYSIS_TYPES: SocialAnalysisType[] = [
  "growth", "content_strategy", "hashtags", "competitors",
  "insights", "earnings_forecast", "thirty_day_plan",
];

/* ------------------------------------------------------------------
   Platform config
   ------------------------------------------------------------------ */

const PLATFORMS = [
  { id: "instagram" as const, label: "Instagram", icon: Instagram, color: "text-pink-600" },
  { id: "tiktok" as const, label: "TikTok", icon: Target, color: "text-ink" },
  { id: "youtube" as const, label: "YouTube", icon: Youtube, color: "text-red-600" },
  { id: "twitter" as const, label: "X (Twitter)", icon: Hash, color: "text-blue-500" },
  { id: "linkedin" as const, label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
];

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface SocialIntelligenceClientProps {
  profiles: SocialProfile[];
  metricsMap: Record<string, SocialMetric[]>;
  analysesMap: Record<string, SocialAnalysis[]>;
  competitorsMap: Record<string, SocialCompetitor[]>;
  projectId: string;
  maxProfiles: number;
  plan: string;
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function SocialIntelligenceClient({
  profiles,
  metricsMap,
  analysesMap,
  competitorsMap,
  projectId,
  maxProfiles,
  plan,
}: SocialIntelligenceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles[0]?.id ?? null
  );
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; handle: string } | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState("");

  // Sync selectedProfileId when profiles change (e.g. after adding the first profile)
  useEffect(() => {
    if (profiles.length > 0 && !profiles.find((p) => p.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedMetrics = selectedProfileId ? metricsMap[selectedProfileId] ?? [] : [];
  const selectedAnalyses = selectedProfileId ? analysesMap[selectedProfileId] ?? [] : [];
  const selectedCompetitors = selectedProfileId ? competitorsMap[selectedProfileId] ?? [] : [];

  // Headline stats
  const totalFollowers = profiles.reduce((sum, p) => sum + p.followers_count, 0);
  const avgEngagement =
    profiles.length > 0
      ? profiles.reduce((sum, p) => sum + (p.engagement_rate ?? 0), 0) / profiles.length
      : 0;
  const totalPosts = profiles.reduce((sum, p) => sum + p.posts_count, 0);

  function handleAddProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addSocialProfile(projectId, formData);
      if ("error" in result) setAddError(result.error);
      else {
        setShowAddProfile(false);
        setStatusMsg("Social profile added.");
      }
    });
  }

  async function handleLookup() {
    const form = formRef.current;
    if (!form) return;

    const platform = new FormData(form).get("platform") as string;
    const handle = (form.querySelector<HTMLInputElement>("[name=handle]")?.value ?? "").trim();
    if (!handle) return;

    setIsLooking(true);
    setLookupMsg(null);
    setAddError(null);

    const result = await lookupSocialProfile(platform, handle);

    if (result.success) {
      // Auto-fill form fields
      const setField = (name: string, value: string) => {
        const input = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
        if (input) {
          // Trigger React-compatible value update
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
          )?.set;
          nativeInputValueSetter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      const d = result.data;
      if (d.display_name) setField("display_name", d.display_name);
      if (d.followers_count) setField("followers_count", String(d.followers_count));
      if (d.following_count) setField("following_count", String(d.following_count));
      if (d.posts_count) setField("posts_count", String(d.posts_count));
      if (d.engagement_rate != null) setField("engagement_rate", String(d.engagement_rate));
      if (d.country) setField("country", d.country);
      if (d.bio) setField("bio", d.bio);

      setLookupMsg(`Found! Stats auto-filled from ${platform}.`);
    } else {
      setLookupMsg(result.error);
    }

    setIsLooking(false);
  }

  function handleDeleteProfile() {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    startTransition(async () => {
      const result = await removeSocialProfile(deletedId);
      if ("error" in result) {
        setStatusMsg(result.error);
      } else {
        setStatusMsg(`@${deleteTarget.handle} removed.`);
        // Auto-select another profile if the deleted one was selected
        if (selectedProfileId === deletedId) {
          const remaining = profiles.filter((p) => p.id !== deletedId);
          setSelectedProfileId(remaining[0]?.id ?? null);
        }
      }
      setDeleteTarget(null);
    });
  }

  async function handleRunAllAnalyses() {
    setIsRunningAll(true);
    const total = profiles.length * ALL_ANALYSIS_TYPES.length;
    let done = 0;
    for (const p of profiles) {
      for (const aType of ALL_ANALYSIS_TYPES) {
        setRunAllProgress(`@${p.handle} — ${aType.replace(/_/g, " ")} (${done + 1}/${total})`);
        try {
          await analyzeSocialProfile(p.id, aType);
        } catch {
          // Continue on error
        }
        done++;
      }
    }
    setIsRunningAll(false);
    setRunAllProgress("");
    setStatusMsg(`All analyses complete across ${profiles.length} profiles.`);
    router.refresh();
  }

  /* ------------------------------------------------------------------
     Empty state
     ------------------------------------------------------------------ */

  if (profiles.length === 0) {
    return (
      <div>
        <HeadlineBar
          stats={[
            { label: "Profiles", value: "0", delta: 0, direction: "neutral" as const },
            { label: "Followers", value: "0", delta: 0, direction: "neutral" as const },
            { label: "Avg Engagement", value: "0%", delta: 0, direction: "neutral" as const },
          ]}
        />
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No Social Profiles Yet"
            description="Add a social media profile to get AI-powered growth tips, content strategy, hashtag recommendations, competitor benchmarking, and earnings projections."
            actionLabel="Add Social Profile"
            onAction={() => setShowAddProfile(true)}
          />
        </div>
        {renderAddDialog()}
      </div>
    );
  }

  /* ------------------------------------------------------------------
     Main render
     ------------------------------------------------------------------ */

  return (
    <div>
      {/* Status toast */}
      {statusMsg && (
        <div className="mb-4 border border-editorial-green/30 bg-editorial-green/10 px-4 py-2 text-sm text-editorial-green">
          {statusMsg}
          <button
            onClick={() => setStatusMsg(null)}
            className="ml-4 text-xs underline"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Headline stats */}
      <HeadlineBar
        stats={[
          { label: "Profiles", value: String(profiles.length), delta: 0, direction: "neutral" as const },
          { label: "Total Followers", value: totalFollowers.toLocaleString(), delta: 0, direction: "neutral" as const },
          { label: "Avg Engagement", value: `${avgEngagement.toFixed(1)}%`, delta: 0, direction: "neutral" as const },
          { label: "Total Posts", value: totalPosts.toLocaleString(), delta: 0, direction: "neutral" as const },
        ]}
      />

      {/* Profile selector bar */}
      <div className="mt-4 flex items-center gap-2 border-b border-rule pb-3">
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-ink-muted">
          Profile:
        </span>
        {profiles.map((p) => {
          const platformConf = PLATFORMS.find((pl) => pl.id === p.platform);
          const Icon = platformConf?.icon ?? Users;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProfileId(p.id)}
              className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedProfileId === p.id
                  ? "border-ink bg-ink text-surface-cream"
                  : "border-rule text-ink-secondary hover:bg-surface-card"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${platformConf?.color ?? ""}`} />
              @{p.handle}
            </button>
          );
        })}
        {profiles.length < maxProfiles && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddProfile(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
        <button
          onClick={() => startTransition(() => handleRunAllAnalyses())}
          disabled={isPending || isRunningAll}
          className="flex items-center gap-1.5 rounded-sm bg-editorial-red px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
        >
          {isRunningAll ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Zap size={12} />
          )}
          {isRunningAll ? "Analyzing..." : "Run All Analyses"}
        </button>
        {isRunningAll && (
          <span className="font-mono text-[10px] text-ink-muted">
            {runAllProgress}
          </span>
        )}
        {selectedProfile && (
          <button
            onClick={() =>
              setDeleteTarget({ id: selectedProfile.id, handle: selectedProfile.handle })
            }
            className="ml-auto text-xs text-ink-muted hover:text-editorial-red"
            title="Remove profile"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {selectedProfile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="growth">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Growth
            </TabsTrigger>
            <TabsTrigger value="content">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Content
            </TabsTrigger>
            <TabsTrigger value="hashtags">
              <Hash className="mr-1.5 h-3.5 w-3.5" />
              Hashtags
            </TabsTrigger>
            <TabsTrigger value="competitors">
              <Target className="mr-1.5 h-3.5 w-3.5" />
              Competitors
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Brain className="mr-1.5 h-3.5 w-3.5" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="earnings">
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              profile={selectedProfile}
              metrics={selectedMetrics}
              analyses={selectedAnalyses}
            />
          </TabsContent>
          <TabsContent value="growth">
            <GrowthTab
              profile={selectedProfile}
              analyses={selectedAnalyses}
            />
          </TabsContent>
          <TabsContent value="content">
            <ContentStrategyTab
              profile={selectedProfile}
              analyses={selectedAnalyses}
            />
          </TabsContent>
          <TabsContent value="hashtags">
            <HashtagsTab
              profile={selectedProfile}
              analyses={selectedAnalyses}
            />
          </TabsContent>
          <TabsContent value="competitors">
            <CompetitorsTab
              profile={selectedProfile}
              competitors={selectedCompetitors}
              profileId={selectedProfile.id}
            />
          </TabsContent>
          <TabsContent value="insights">
            <AIInsightsTab
              profile={selectedProfile}
              analyses={selectedAnalyses}
            />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTab
              profile={selectedProfile}
              analyses={selectedAnalyses}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      {renderAddDialog()}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Social Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove @{deleteTarget?.handle}? This will delete all
              associated metrics, analyses, and competitor data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteProfile} disabled={isPending}>
              {isPending ? "Removing..." : "Remove Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  /* ------------------------------------------------------------------
     Add Profile Dialog
     ------------------------------------------------------------------ */

  function renderAddDialog() {
    return (
      <Dialog open={showAddProfile} onOpenChange={(open) => {
        setShowAddProfile(open);
        if (!open) { setLookupMsg(null); setAddError(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Social Profile</DialogTitle>
            <DialogDescription>
              Enter a handle or profile URL and click Lookup to auto-fill stats.
              Works for all public accounts. Private accounts require manual entry.
              {plan === "free" && (
                <span className="mt-1 block text-editorial-gold">
                  Free plan: {profiles.length}/{maxProfiles} profile
                  {maxProfiles > 1 ? "s" : ""} used.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleAddProfile}>
            <div className="max-h-[calc(85vh-10rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {/* Platform selector */}
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                  Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <label key={p.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="platform"
                        value={p.id}
                        defaultChecked={p.id === "instagram"}
                        className="peer sr-only"
                      />
                      <div className="flex items-center gap-1.5 border border-rule px-3 py-2 text-xs font-medium transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface-cream">
                        <p.icon className="h-3.5 w-3.5" />
                        {p.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Handle + Lookup */}
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                  Handle / Username
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      name="handle"
                      placeholder="@username or channel URL"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLookup}
                    disabled={isLooking || isPending}
                    className="shrink-0 self-end"
                  >
                    {isLooking ? "Looking up..." : "Lookup"}
                  </Button>
                </div>
                {lookupMsg && (
                  <p className={`mt-1 text-xs ${
                    lookupMsg.includes("Found")
                      ? "text-editorial-green"
                      : lookupMsg.includes("private") || lookupMsg.includes("blocked") || lookupMsg.includes("suspended")
                        ? "text-editorial-gold"
                        : "text-ink-muted"
                  }`}>
                    {lookupMsg}
                  </p>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                  Display Name
                </label>
                <Input name="display_name" placeholder="Display name (optional)" />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Followers
                  </label>
                  <Input name="followers_count" type="number" min="0" placeholder="e.g. 15000" />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Following
                  </label>
                  <Input name="following_count" type="number" min="0" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Posts
                  </label>
                  <Input name="posts_count" type="number" min="0" placeholder="e.g. 120" />
                </div>
              </div>

              {/* Engagement + Niche */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Engagement Rate %
                  </label>
                  <Input name="engagement_rate" type="number" step="0.01" min="0" max="100" placeholder="e.g. 3.5" />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Niche
                  </label>
                  <Input name="niche" placeholder="e.g. fitness, tech, food" />
                </div>
              </div>

              {/* Country + Bio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Country
                  </label>
                  <Input name="country" placeholder="e.g. US, UK, BR" />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                    Bio
                  </label>
                  <Input name="bio" placeholder="Short bio (optional)" />
                </div>
              </div>

              {addError && (
                <p className="text-sm text-editorial-red">{addError}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddProfile(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
}
