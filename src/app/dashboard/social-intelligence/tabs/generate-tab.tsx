"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, Check, Lightbulb, MessageSquare, Calendar, Video, LayoutGrid, UserCircle, Zap, Loader2, RefreshCw } from "lucide-react";
import { generateSocialContent, analyzeSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialGoal, GeneratedContent, SocialAnalysisType } from "@/types";

const ALL_ANALYSIS_TYPES: SocialAnalysisType[] = [
  "growth", "content_strategy", "hashtags", "competitors",
  "insights", "earnings_forecast", "thirty_day_plan",
];

const CONTENT_TYPES = [
  { value: "post_ideas", label: "Post Ideas", icon: Lightbulb, description: "Creative post concepts with hooks and angles" },
  { value: "captions", label: "Captions", icon: MessageSquare, description: "Ready-to-use captions with emojis and CTAs" },
  { value: "content_calendar", label: "Content Calendar", icon: Calendar, description: "7-day posting schedule with topics" },
  { value: "video_scripts", label: "Video Scripts", icon: Video, description: "Hook → body → CTA for Reels/TikToks/Shorts" },
  { value: "carousel", label: "Carousel Outlines", icon: LayoutGrid, description: "Slide-by-slide breakdown for carousels" },
  { value: "bio", label: "Bio Optimization", icon: UserCircle, description: "Optimized bio text for your platform" },
] as const;

const TONES = [
  { value: "casual", label: "Casual & Friendly" },
  { value: "professional", label: "Professional" },
  { value: "witty", label: "Witty & Humorous" },
  { value: "inspirational", label: "Inspirational" },
  { value: "educational", label: "Educational" },
  { value: "bold", label: "Bold & Provocative" },
];

interface GenerateTabProps {
  profile: SocialProfile;
  goals: SocialGoal | null;
}

export function GenerateTab({ profile, goals }: GenerateTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<string>("post_ideas");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [count, setCount] = useState("5");
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runProgress, setRunProgress] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  function handleGenerate() {
    setError(null);
    setResults([]);
    startTransition(async () => {
      const result = await generateSocialContent(profile.id, {
        contentType: selectedType,
        topic: topic || undefined,
        tone,
        count: Number(count),
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setResults(result.content);
      }
    });
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  async function handleRunAllAnalyses() {
    setIsRunningAll(true);
    for (let i = 0; i < ALL_ANALYSIS_TYPES.length; i++) {
      const aType = ALL_ANALYSIS_TYPES[i];
      setRunProgress(`${aType.replace(/_/g, " ")} (${i + 1}/${ALL_ANALYSIS_TYPES.length})`);
      try {
        await analyzeSocialProfile(profile.id, aType);
      } catch {
        // Continue on error
      }
    }
    setIsRunningAll(false);
    setRunProgress("");
    router.refresh();
  }

  function handleSync() {
    setIsSyncing(true);
    router.refresh();
    setTimeout(() => setIsSyncing(false), 1500);
  }

  const selectedConfig = CONTENT_TYPES.find((t) => t.value === selectedType);

  return (
    <div className="mt-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Content Generator</h3>
          <p className="text-sm text-ink-secondary">
            Content creation for @{profile.handle} on {profile.platform}
            {goals ? ` — aligned with your goal to ${goals.primary_objective.replace(/_/g, " ")}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary transition-colors hover:bg-surface-card disabled:opacity-50"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            Sync
          </button>
          <button
            onClick={handleRunAllAnalyses}
            disabled={isRunningAll || isPending}
            className="flex items-center gap-1.5 bg-editorial-red px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
          >
            {isRunningAll ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {isRunningAll ? "Analyzing..." : "Run All Analyses"}
          </button>
        </div>
      </div>
      {isRunningAll && (
        <div className="border border-editorial-gold/30 bg-editorial-gold/10 px-4 py-2 text-xs text-editorial-gold">
          Running: {runProgress}
        </div>
      )}

      {/* Content Type Selection */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {CONTENT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`flex flex-col items-center gap-2 border p-4 text-center transition-colors ${
                isSelected
                  ? "border-editorial-red bg-editorial-red/5 text-editorial-red"
                  : "border-rule bg-surface-card text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Options */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Topic / Theme (optional)
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`e.g. ${profile.niche || "morning routines, productivity tips"}`}
              />
            </div>
            <div className="w-44">
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {selectedType !== "bio" && selectedType !== "content_calendar" && (
              <div className="w-20">
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Count
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                >
                  {[3, 5, 7, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={handleGenerate} disabled={isPending} className="h-[38px]">
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              {isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
          {selectedConfig && (
            <p className="mt-2 text-xs text-ink-muted">{selectedConfig.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Loading state */}
      {isPending && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-editorial-red border-t-transparent" />
              <p className="text-sm text-ink-secondary">
                Crafting {selectedConfig?.label.toLowerCase()} for @{profile.handle}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/10 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-base font-bold text-ink">
              {results.length} {selectedConfig?.label} Generated
            </h4>
            <Badge variant="muted">{profile.platform}</Badge>
          </div>

          {results.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-ink-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-serif text-sm font-bold text-ink">{item.title}</span>
                      {item.format && (
                        <Badge variant="muted" className="text-[9px]">{item.format}</Badge>
                      )}
                    </div>

                    {item.hook && (
                      <p className="mb-1 text-xs text-editorial-red">
                        Hook: {item.hook}
                      </p>
                    )}

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                      {item.content}
                    </p>

                    {item.hashtags && item.hashtags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.hashtags.map((tag) => (
                          <span key={tag} className="text-xs text-editorial-red">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.cta && (
                      <p className="mt-1 text-xs font-medium text-editorial-green">
                        CTA: {item.cta}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopy(
                      `${item.title}\n\n${item.content}${item.hashtags ? "\n\n" + item.hashtags.map(t => "#" + t).join(" ") : ""}`,
                      i
                    )}
                    className="shrink-0 rounded p-1.5 text-ink-muted hover:bg-surface-raised hover:text-ink"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === i ? (
                      <Check className="h-4 w-4 text-editorial-green" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isPending && results.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wand2 className="mx-auto mb-3 h-8 w-8 text-ink-muted" />
            <p className="text-sm text-ink-muted">
              Select a content type and click Generate to create content for @{profile.handle}.
            </p>
            {!goals && (
              <p className="mt-2 text-xs text-editorial-gold">
                Tip: Set your goals in the Goals tab to get content aligned with your objectives.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
