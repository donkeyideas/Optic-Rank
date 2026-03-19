"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Share2,
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Clock,
  Eye,
  EyeOff,
  Plus,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Zap,
  Link2,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/shared/toast";
import {
  getSocialPosts,
  updateSocialPost,
  deleteSocialPost,
  bulkApproveDrafts,
  generateSocialPosts,
  publishPost,
  saveAutomationConfig,
  saveCredentials,
  testConnection,
} from "@/lib/actions/social-posts";
import type { AutomationConfig } from "@/lib/actions/social-posts";
import type {
  SocialMediaPost,
  SocialPlatform,
  PostStatus,
  ToneType,
} from "@/types/social-posts";
import {
  CHAR_LIMITS,
  PLATFORM_LABELS,
  ALL_PLATFORMS,
  TONE_OPTIONS,
  PLATFORM_CREDENTIALS,
  PLATFORM_GUIDES,
} from "@/types/social-posts";

// ─── Helpers ─────────────────────────────────────────────────

function platformIcon(platform: SocialPlatform) {
  const map: Record<SocialPlatform, string> = {
    TWITTER: "𝕏",
    LINKEDIN: "in",
    FACEBOOK: "f",
    INSTAGRAM: "◻",
    TIKTOK: "♪",
  };
  return map[platform] ?? "?";
}

function statusBadgeVariant(status: PostStatus) {
  const map: Record<PostStatus, "success" | "warning" | "muted" | "danger" | "info"> = {
    PUBLISHED: "success",
    SCHEDULED: "warning",
    DRAFT: "muted",
    FAILED: "danger",
    CANCELLED: "info",
  };
  return map[status] ?? "muted";
}

function charCountColor(len: number, limit: number): string {
  const ratio = len / limit;
  if (ratio > 1) return "text-editorial-red";
  if (ratio > 0.9) return "text-editorial-gold";
  return "text-editorial-green";
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────

interface Props {
  initialPosts: SocialMediaPost[];
  initialAutomation: AutomationConfig;
  initialCredentials: Record<string, string>;
}

export function SocialPostsClient({
  initialPosts,
  initialAutomation,
  initialCredentials,
}: Props) {
  const { toast } = useToast();
  const [posts, setPosts] = useState(initialPosts);
  const [, startTransition] = useTransition();

  // Refresh posts from server
  const refreshPosts = useCallback(() => {
    startTransition(async () => {
      const result = await getSocialPosts();
      if (result.data) setPosts(result.data);
    });
  }, []);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">Social Posts</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Generate, manage, and publish AI-powered social media content
        </p>
      </div>

      <Tabs defaultValue="generator">
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <GeneratorTab
            onGenerated={refreshPosts}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="queue">
          <QueueTab
            posts={posts.filter((p) => p.status === "DRAFT" || p.status === "SCHEDULED")}
            onAction={refreshPosts}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="published">
          <PublishedTab
            posts={posts.filter((p) => p.status === "PUBLISHED")}
          />
        </TabsContent>

        <TabsContent value="automation">
          <AutomationTab
            initial={initialAutomation}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="connections">
          <ConnectionsTab
            initial={initialCredentials}
            toast={toast}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: GENERATOR
// ═══════════════════════════════════════════════════════════════

function GeneratorTab({
  onGenerated,
  toast,
}: {
  onGenerated: () => void;
  toast: (msg: string, variant?: "success" | "error" | "info") => void;
}) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneType>("engaging");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "TWITTER",
    "LINKEDIN",
  ]);
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<SocialMediaPost[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  function togglePlatform(p: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleGenerate() {
    if (selectedPlatforms.length === 0) {
      toast("Select at least one platform.", "error");
      return;
    }

    setGenerating(true);
    setGeneratedPosts([]);
    try {
      const result = await generateSocialPosts({
        topic: topic.trim() || undefined,
        tone,
        platforms: selectedPlatforms,
      });

      if ("error" in result) {
        toast(result.error, "error");
      } else {
        setGeneratedPosts(result.posts);
        if (result.errors.length > 0) {
          toast(`Generated with ${result.errors.length} error(s): ${result.errors[0]}`, "error");
        } else {
          toast(`Generated ${result.posts.length} post(s)`, "success");
        }
        onGenerated();
      }
    } catch {
      toast("Generation failed unexpectedly.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(post: SocialMediaPost) {
    const hashStr = post.hashtags.length > 0
      ? "\n\n" + post.hashtags.map((h) => `#${h}`).join(" ")
      : "";
    await navigator.clipboard.writeText(post.content + hashStr);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleApprove(post: SocialMediaPost) {
    const tomorrow9am = new Date();
    tomorrow9am.setUTCDate(tomorrow9am.getUTCDate() + 1);
    tomorrow9am.setUTCHours(9, 0, 0, 0);

    const result = await updateSocialPost(post.id, {
      status: "SCHEDULED",
      scheduled_at: tomorrow9am.toISOString(),
    });

    if ("error" in result) {
      toast(result.error, "error");
    } else {
      setGeneratedPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast("Scheduled for tomorrow 9 AM UTC", "success");
      onGenerated();
    }
  }

  async function handleDiscard(post: SocialMediaPost) {
    const result = await deleteSocialPost(post.id);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      setGeneratedPosts((prev) => prev.filter((p) => p.id !== post.id));
      onGenerated();
    }
  }

  function handleContentEdit(postId: string, newContent: string) {
    setGeneratedPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content: newContent } : p))
    );
    // Debounced save to server
    updateSocialPost(postId, { content: newContent });
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Topic / Theme
              <span className="ml-1 font-normal normal-case tracking-normal text-ink-faint">(optional — AI picks a trending topic if blank)</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 5 SEO mistakes killing your rankings in 2026… or leave blank for AI to choose"
              rows={3}
              className="mt-1 w-full border border-rule bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-editorial-red focus:outline-none focus:ring-2 focus:ring-editorial-red/20"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Tone */}
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="mt-1 w-full border border-rule bg-surface-card px-3 py-2 text-sm text-ink focus:border-editorial-red focus:outline-none focus:ring-2 focus:ring-editorial-red/20"
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Platforms */}
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Platforms
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedPlatforms.includes(p)
                        ? "border-editorial-red bg-editorial-red/10 text-editorial-red"
                        : "border-rule bg-surface-card text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    <span className="font-mono text-[10px]">{platformIcon(p)}</span>
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={generating}
            disabled={generating}
          >
            <Sparkles size={14} className="mr-1.5" />
            Generate All
          </Button>
        </CardContent>
      </Card>

      {/* Generated Results */}
      {generatedPosts.length > 0 && (
        <div className="space-y-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Generated Posts ({generatedPosts.length})
          </p>
          {generatedPosts.map((post) => {
            const limit = CHAR_LIMITS[post.platform];
            const len = post.content.length;

            return (
              <Card key={post.id}>
                <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b border-rule">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center border border-rule bg-surface-raised font-mono text-sm font-bold">
                      {platformIcon(post.platform)}
                    </span>
                    <CardTitle className="text-sm">
                      {PLATFORM_LABELS[post.platform]}
                    </CardTitle>
                  </div>
                  <span className={`font-mono text-xs ${charCountColor(len, limit)}`}>
                    {len}/{limit}
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <textarea
                    value={post.content}
                    onChange={(e) => handleContentEdit(post.id, e.target.value)}
                    rows={Math.max(3, Math.ceil(post.content.length / 80))}
                    className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none focus:ring-2 focus:ring-editorial-red/20"
                  />

                  {/* Collapsible Hashtags */}
                  {post.hashtags.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSection(`hash-${post.id}`)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
                      >
                        {expandedSections[`hash-${post.id}`] ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        Hashtags ({post.hashtags.length})
                      </button>
                      {expandedSections[`hash-${post.id}`] && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {post.hashtags.map((h, i) => (
                            <span
                              key={i}
                              className="inline-flex border border-rule bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-ink-secondary"
                            >
                              #{h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsible Image Prompt */}
                  {post.image_prompt && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSection(`img-${post.id}`)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
                      >
                        {expandedSections[`img-${post.id}`] ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        Image Prompt
                      </button>
                      {expandedSections[`img-${post.id}`] && (
                        <p className="mt-1 border-l-2 border-rule pl-3 text-xs text-ink-secondary italic">
                          {post.image_prompt}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-rule pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(post)}
                    >
                      {copiedId === post.id ? (
                        <Check size={14} className="mr-1 text-editorial-green" />
                      ) : (
                        <Copy size={14} className="mr-1" />
                      )}
                      {copiedId === post.id ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(post)}
                    >
                      <Clock size={14} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDiscard(post)}
                      className="text-ink-muted hover:text-editorial-red"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Discard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: QUEUE
// ═══════════════════════════════════════════════════════════════

function QueueTab({
  posts,
  onAction,
  toast,
}: {
  posts: SocialMediaPost[];
  onAction: () => void;
  toast: (msg: string, variant?: "success" | "error" | "info") => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "SCHEDULED">("ALL");
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "ALL">("ALL");
  const [approving, setApproving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const filtered = posts.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (platformFilter !== "ALL" && p.platform !== platformFilter) return false;
    return true;
  });

  const draftCount = posts.filter((p) => p.status === "DRAFT").length;

  async function handleBulkApprove() {
    setApproving(true);
    const result = await bulkApproveDrafts();
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast(`Scheduled ${result.count} draft(s) for tomorrow 9 AM UTC`, "success");
      onAction();
    }
    setApproving(false);
  }

  async function handlePublishNow(id: string) {
    setPublishingId(id);
    const result = await publishPost(id);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast("Published successfully!", "success");
    }
    onAction();
    setPublishingId(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteSocialPost(id);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast("Post deleted.", "info");
      onAction();
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ListFilter size={14} className="text-ink-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="border border-rule bg-surface-card px-2 py-1.5 text-xs text-ink focus:border-editorial-red focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
            className="border border-rule bg-surface-card px-2 py-1.5 text-xs text-ink focus:border-editorial-red focus:outline-none"
          >
            <option value="ALL">All Platforms</option>
            {ALL_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {draftCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkApprove}
            loading={approving}
            disabled={approving}
          >
            <Check size={14} className="mr-1" />
            Approve all {draftCount} draft{draftCount !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts in queue"
          description="Generate some posts from the Generator tab to get started."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Platform</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-40">Scheduled</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <span className="flex h-7 w-7 items-center justify-center border border-rule bg-surface-raised font-mono text-xs font-bold">
                        {platformIcon(post.platform)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="text-sm text-ink">
                        {truncate(post.content, 80)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(post.status)}>
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-ink-secondary">
                      {formatDate(post.scheduled_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post.id)}
                          disabled={publishingId === post.id}
                          className="p-1.5 text-ink-muted hover:text-editorial-green disabled:opacity-50"
                          title="Publish Now"
                        >
                          {publishingId === post.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 text-ink-muted hover:text-editorial-red"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: PUBLISHED
// ═══════════════════════════════════════════════════════════════

function PublishedTab({ posts }: { posts: SocialMediaPost[] }) {
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "ALL">("ALL");

  const filtered =
    platformFilter === "ALL"
      ? posts
      : posts.filter((p) => p.platform === platformFilter);

  // Stats per platform
  const stats = ALL_PLATFORMS.map((p) => ({
    platform: p,
    count: posts.filter((post) => post.platform === p).length,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.platform}>
            <CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  {PLATFORM_LABELS[s.platform]}
                </p>
                <p className="mt-1 font-serif text-2xl font-bold text-ink">
                  {s.count}
                </p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center border border-rule bg-surface-raised font-mono text-sm font-bold text-ink-muted">
                {platformIcon(s.platform)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <ListFilter size={14} className="text-ink-muted" />
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
          className="border border-rule bg-surface-card px-2 py-1.5 text-xs text-ink focus:border-editorial-red focus:outline-none"
        >
          <option value="ALL">All Platforms</option>
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No published posts"
          description="Published posts will appear here after you publish them from the Queue."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Platform</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-40">Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <span className="flex h-7 w-7 items-center justify-center border border-rule bg-surface-raised font-mono text-xs font-bold">
                        {platformIcon(post.platform)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-sm text-ink">
                        {truncate(post.content, 100)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-ink-secondary">
                      {formatDate(post.published_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: AUTOMATION
// ═══════════════════════════════════════════════════════════════

function AutomationTab({
  initial,
  toast,
}: {
  initial: AutomationConfig;
  toast: (msg: string, variant?: "success" | "error" | "info") => void;
}) {
  const [config, setConfig] = useState<AutomationConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [newTopic, setNewTopic] = useState("");

  function update(partial: Partial<AutomationConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  function toggleAutoPlatform(p: SocialPlatform) {
    const platforms = config.platforms.includes(p)
      ? config.platforms.filter((x) => x !== p)
      : [...config.platforms, p];
    update({ platforms });
  }

  function addTopic() {
    const t = newTopic.trim();
    if (!t || config.topics.includes(t)) return;
    update({ topics: [...config.topics, t] });
    setNewTopic("");
  }

  function removeTopic(t: string) {
    update({ topics: config.topics.filter((x) => x !== t) });
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveAutomationConfig(config);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast("Automation settings saved.", "success");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Daily Auto-Generation</p>
              <p className="text-xs text-ink-secondary">
                Automatically generate social posts on a daily schedule
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full border border-rule bg-surface-inset transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rule after:bg-surface-card after:transition-all peer-checked:bg-editorial-red peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-editorial-red/20" />
            </label>
          </div>

          {/* Platforms */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Auto-Generate for Platforms
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleAutoPlatform(p)}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                    config.platforms.includes(p)
                      ? "border-editorial-red bg-editorial-red/10 text-editorial-red"
                      : "border-rule bg-surface-card text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[10px]">{platformIcon(p)}</span>
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Cron Hour */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Generation Hour (UTC)
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={23}
                value={config.hour}
                onChange={(e) => update({ hour: parseInt(e.target.value, 10) })}
                className="flex-1 accent-editorial-red"
              />
              <span className="w-14 border border-rule bg-surface-card px-2 py-1 text-center font-mono text-sm text-ink">
                {String(config.hour).padStart(2, "0")}:00
              </span>
            </div>
          </div>

          {/* Topic Pool */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Topic Rotation Pool
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {config.topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 border border-rule bg-surface-raised px-2 py-1 text-xs text-ink"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTopic(t)}
                    className="text-ink-muted hover:text-editorial-red"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Add a topic…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addTopic}>
                <Plus size={14} />
              </Button>
            </div>
          </div>

          {/* Domain Content Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Use Recent Content</p>
              <p className="text-xs text-ink-secondary">
                Pull themes from recent domain content (debates, articles)
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.useDomainContent}
                onChange={(e) => update({ useDomainContent: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full border border-rule bg-surface-inset transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rule after:bg-surface-card after:transition-all peer-checked:bg-editorial-red peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-editorial-red/20" />
            </label>
          </div>

          {/* Require Approval Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Require Approval</p>
              <p className="text-xs text-ink-secondary">
                Posts land as DRAFT requiring manual approval before publishing
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.requireApproval}
                onChange={(e) => update({ requireApproval: e.target.checked })}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full border border-rule bg-surface-inset transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-rule after:bg-surface-card after:transition-all peer-checked:bg-editorial-red peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-editorial-red/20" />
            </label>
          </div>

          <div className="border-t border-rule pt-4">
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={saving}
            >
              Save Automation Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: CONNECTIONS
// ═══════════════════════════════════════════════════════════════

function ConnectionsTab({
  initial,
  toast,
}: {
  initial: Record<string, string>;
  toast: (msg: string, variant?: "success" | "error" | "info") => void;
}) {
  const [creds, setCreds] = useState<Record<string, string>>(initial);
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testingPlatform, setTestingPlatform] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  function updateCred(key: string, value: string) {
    setCreds((prev) => ({ ...prev, [key]: value }));
  }

  function toggleShow(key: string) {
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isConfigured(platform: string): boolean {
    const fields = PLATFORM_CREDENTIALS[platform];
    if (!fields) return false;
    return fields.every((f) => !!creds[f.key]?.trim());
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveCredentials(creds);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast("Credentials saved.", "success");
    }
    setSaving(false);
  }

  async function handleTest(platform: string) {
    setTestingPlatform(platform);
    const result = await testConnection(platform);
    if ("error" in result) {
      toast(result.error, "error");
    } else {
      toast(result.message, "success");
    }
    setTestingPlatform(null);
  }

  const platforms = ["TWITTER", "LINKEDIN", "FACEBOOK", "INSTAGRAM"] as const;

  return (
    <div className="space-y-4">
      {platforms.map((platform) => {
        const fields = PLATFORM_CREDENTIALS[platform] ?? [];
        const configured = isConfigured(platform);
        const guide = PLATFORM_GUIDES[platform];

        return (
          <Card key={platform}>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-rule">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border border-rule bg-surface-raised font-mono text-sm font-bold">
                  {platformIcon(platform as SocialPlatform)}
                </span>
                <div>
                  <CardTitle className="text-sm">
                    {PLATFORM_LABELS[platform as SocialPlatform]}
                  </CardTitle>
                  {platform === "INSTAGRAM" && (
                    <p className="text-[10px] text-ink-muted italic">
                      Text-only posts not supported via API
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={configured ? "success" : "muted"}>
                {configured ? "Configured" : "Not Configured"}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    {field.label}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showFields[field.key] ? "text" : "password"}
                      value={creds[field.key] ?? ""}
                      onChange={(e) => updateCred(field.key, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}…`}
                      className="w-full border border-rule bg-surface-card px-3 py-2 pr-10 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-editorial-red focus:outline-none focus:ring-2 focus:ring-editorial-red/20"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShow(field.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    >
                      {showFields[field.key] ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(platform)}
                  loading={testingPlatform === platform}
                  disabled={!configured || testingPlatform === platform}
                >
                  <Zap size={14} className="mr-1" />
                  Test Connection
                </Button>

                {guide && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGuide(expandedGuide === platform ? null : platform)
                    }
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                  >
                    <Link2 size={12} />
                    Setup Guide
                    {expandedGuide === platform ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                  </button>
                )}
              </div>

              {expandedGuide === platform && guide && (
                <div className="border-l-2 border-rule bg-surface-raised p-3 text-xs text-ink-secondary">
                  <p>
                    Set up your credentials at the{" "}
                    <a
                      href={guide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-editorial-red underline"
                    >
                      {guide.label}
                    </a>
                    .
                  </p>
                  {platform === "TWITTER" && (
                    <p className="mt-1">
                      Create a project and app, then generate OAuth 1.0a keys
                      under &quot;Keys and Tokens&quot;. Ensure read &amp; write permissions
                      are enabled.
                    </p>
                  )}
                  {platform === "LINKEDIN" && (
                    <p className="mt-1">
                      Create an app and request the &quot;w_member_social&quot; scope.
                      Generate an OAuth 2.0 access token. Your Person URN looks
                      like &quot;urn:li:person:ABC123&quot;.
                    </p>
                  )}
                  {platform === "FACEBOOK" && (
                    <p className="mt-1">
                      Create a Facebook App, add the Pages API product, then
                      generate a Page Access Token with &quot;pages_manage_posts&quot;
                      permission.
                    </p>
                  )}
                  {platform === "INSTAGRAM" && (
                    <p className="mt-1">
                      Instagram API does not support text-only posts.
                      Image/video posts require the Instagram Graph API with a
                      connected Facebook Page.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          Save All Credentials
        </Button>
      </div>
    </div>
  );
}
