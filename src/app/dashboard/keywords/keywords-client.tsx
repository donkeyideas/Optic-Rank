"use client";

import { useState, useTransition, useRef, Fragment } from "react";
import {
  Search,
  Plus,
  Monitor,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Upload,
  Trash2,
  Sparkles,
} from "lucide-react";

import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { addKeywords, deleteKeyword, importKeywordsCSV, getKeywordRankHistory, generateKeywordsAI } from "@/lib/actions/keywords";
import { RankHistoryChart } from "@/components/charts/rank-history-chart";
import type { Keyword } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface KeywordsPageClientProps {
  projectId: string;
  keywords: Keyword[];
  totalCount: number;
  stats: {
    total: number;
    top3: number;
    avgPosition: string;
    keywordsUp: number;
    keywordsDown: number;
  };
}

/* ------------------------------------------------------------------
   Helper functions
   ------------------------------------------------------------------ */

function getIntentBadgeVariant(intent: Keyword["intent"]) {
  switch (intent) {
    case "informational":
      return "muted";
    case "navigational":
      return "info";
    case "transactional":
      return "success";
    case "commercial":
      return "warning";
    default:
      return "muted";
  }
}

function getDifficultyColor(difficulty: number): "green" | "gold" | "red" {
  if (difficulty < 40) return "green";
  if (difficulty < 70) return "gold";
  return "red";
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatVolume(value: number): string {
  if (value >= 10000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

const SERP_FEATURE_LABELS: Record<string, string> = {
  featured_snippet: "Featured",
  people_also_ask: "PAA",
  local_pack: "Local",
  knowledge_panel: "KP",
  video: "Video",
  images: "Images",
  shopping: "Shopping",
  news: "News",
  ai_overview: "AI",
  sitelinks: "Sitelinks",
  carousel: "Carousel",
  top_stories: "Stories",
  recipes: "Recipes",
  jobs: "Jobs",
  flights: "Flights",
  hotels: "Hotels",
};

function serpFeatureLabel(feature: string): string {
  return SERP_FEATURE_LABELS[feature] ?? feature.replace(/_/g, " ").slice(0, 8);
}

/* ------------------------------------------------------------------
   Keywords Page Client Component
   ------------------------------------------------------------------ */

export function KeywordsPageClient({
  projectId,
  keywords,
  totalCount,
  stats,
}: KeywordsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeywordsText, setNewKeywordsText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [expandedKeywordId, setExpandedKeywordId] = useState<string | null>(null);
  const [rankHistory, setRankHistory] = useState<{ date: string; position: number | null }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Client-side filtering of the server-fetched data
  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch = kw.keyword
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDevice =
      deviceFilter === "all" || kw.device === deviceFilter;
    return matchesSearch && matchesDevice;
  });

  const headlineStats = [
    {
      label: "Total Keywords",
      value: stats.total.toLocaleString(),
      delta: stats.total > 0 ? "Tracked" : "None yet",
      direction: stats.total > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Top 3 Keywords",
      value: String(stats.top3),
      delta: stats.top3 > 0 ? "In top 3" : "None yet",
      direction: stats.top3 > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Avg. Position",
      value: stats.avgPosition,
      delta: stats.avgPosition !== "--" ? "Across tracked" : "No data",
      direction: "neutral" as const,
    },
    {
      label: "Keywords Up",
      value: String(stats.keywordsUp),
      delta:
        stats.total > 0
          ? `${Math.round((stats.keywordsUp / Math.max(stats.total, 1)) * 100)}% of tracked`
          : "No changes",
      direction: stats.keywordsUp > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Keywords Down",
      value: String(stats.keywordsDown),
      delta:
        stats.total > 0
          ? `${Math.round((stats.keywordsDown / Math.max(stats.total, 1)) * 100)}% of tracked`
          : "No changes",
      direction: stats.keywordsDown > 0 ? ("down" as const) : ("neutral" as const),
    },
  ];

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Paginate filtered keywords on the client
  const paginatedKeywords = filteredKeywords.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await importKeywordsCSV(projectId, formData);
      if ("error" in result) {
        setImportStatus(`Error: ${result.error}`);
      } else {
        setImportStatus(`Imported ${result.imported} keywords.`);
      }
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleAddKeywords() {
    setAddError(null);
    const keywordsArray = newKeywordsText
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordsArray.length === 0) {
      setAddError("Please enter at least one keyword.");
      return;
    }

    startTransition(async () => {
      const result = await addKeywords(projectId, keywordsArray);
      if ("error" in result) {
        setAddError(result.error);
      } else {
        setNewKeywordsText("");
        setAddDialogOpen(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats Bar */}
      <HeadlineBar stats={headlineStats} />

      {/* Page Title */}
      <div className="border-b border-rule pb-3">
        <h1 className="font-serif text-2xl font-bold text-ink">
          Keyword Intelligence
        </h1>
        <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
          Track, Research &amp; Optimize Your Keyword Portfolio
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Keywords</TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB: All Keywords
            ============================================================ */}
        <TabsContent value="all">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center border-b border-rule pb-4">
            <Input
              placeholder="Search keywords..."
              prefixIcon={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-auto sm:flex-1 sm:min-w-[240px]"
            />

            {/* Device Toggle */}
            <div className="flex items-center border border-rule">
              <button
                onClick={() => setDeviceFilter("all")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  deviceFilter === "all"
                    ? "bg-ink text-surface-cream"
                    : "bg-surface-card text-ink-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDeviceFilter("desktop")}
                className={`flex items-center gap-1.5 border-l border-rule px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  deviceFilter === "desktop"
                    ? "bg-ink text-surface-cream"
                    : "bg-surface-card text-ink-muted hover:text-ink"
                }`}
              >
                <Monitor size={12} />
                Desktop
              </button>
              <button
                onClick={() => setDeviceFilter("mobile")}
                className={`flex items-center gap-1.5 border-l border-rule px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                  deviceFilter === "mobile"
                    ? "bg-ink text-surface-cream"
                    : "bg-surface-card text-ink-muted hover:text-ink"
                }`}
              >
                <Smartphone size={12} />
                Mobile
              </button>
            </div>

            {/* CSV Import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload size={14} />
              {isPending ? "Importing..." : "CSV Import"}
            </Button>

            {/* AI Generate Keywords */}
            <Button
              variant="outline"
              size="sm"
              disabled={isGenerating || isPending}
              onClick={() => {
                setIsGenerating(true);
                setGenerateStatus(null);
                startTransition(async () => {
                  const result = await generateKeywordsAI(projectId);
                  if ("error" in result) {
                    setGenerateStatus(`Error: ${result.error}`);
                  } else {
                    setGenerateStatus(
                      `Generated ${result.keywords.length} keywords (${result.source})`
                    );
                  }
                  setIsGenerating(false);
                });
              }}
            >
              <Sparkles size={14} />
              {isGenerating ? "Generating..." : "AI Generate"}
            </Button>

            {/* Add Keywords Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90">
                <Plus size={14} />
                Add Keywords
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Keywords</DialogTitle>
                  <DialogDescription>
                    Enter one keyword per line. They will be added to your
                    tracked keywords list and monitored for ranking changes.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-5">
                  <textarea
                    className="w-full min-h-[160px] resize-y border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                    placeholder={"e.g.\nzero trust architecture\ncloud security tools\nSIEM solutions 2026"}
                    value={newKeywordsText}
                    onChange={(e) => setNewKeywordsText(e.target.value)}
                  />
                  {addError && (
                    <p className="mt-2 text-[12px] font-semibold text-editorial-red">
                      {addError}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddKeywords}
                    disabled={isPending || newKeywordsText.trim().length === 0}
                  >
                    {isPending ? "Adding..." : "Add Keywords"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Import / Generate Status */}
          {(importStatus || generateStatus) && (
            <div className="flex flex-col gap-2">
              {importStatus && (
                <div
                  className={`border px-4 py-2 text-sm ${
                    importStatus.startsWith("Error")
                      ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
                      : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
                  }`}
                >
                  {importStatus}
                </div>
              )}
              {generateStatus && (
                <div
                  className={`border px-4 py-2 text-sm ${
                    generateStatus.startsWith("Error")
                      ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
                      : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
                  }`}
                >
                  {generateStatus}
                </div>
              )}
            </div>
          )}

          {/* Keywords Table or Empty State */}
          {filteredKeywords.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Keyword</TableHead>
                    <TableHead className="w-[80px]">Position</TableHead>
                    <TableHead className="w-[80px]">Change</TableHead>
                    <TableHead className="w-[120px]">SERP Features</TableHead>
                    <TableHead className="w-[80px]">Volume</TableHead>
                    <TableHead className="w-[70px]">CPC</TableHead>
                    <TableHead className="w-[140px]">Difficulty</TableHead>
                    <TableHead className="w-[110px]">Intent</TableHead>
                    <TableHead className="w-[70px]">AI Vis.</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedKeywords.map((kw) => {
                    const change =
                      kw.previous_position !== null &&
                      kw.current_position !== null
                        ? kw.previous_position - kw.current_position
                        : 0;

                    return (
                      <Fragment key={kw.id}>
                      <TableRow>
                        {/* Keyword */}
                        <TableCell className="font-sans font-semibold text-ink">
                          <button
                            type="button"
                            className="flex flex-col text-left hover:underline"
                            onClick={async () => {
                              if (expandedKeywordId === kw.id) {
                                setExpandedKeywordId(null);
                                return;
                              }
                              setExpandedKeywordId(kw.id);
                              setLoadingHistory(true);
                              const history = await getKeywordRankHistory(kw.id);
                              setRankHistory(history);
                              setLoadingHistory(false);
                            }}
                          >
                            <span className="text-[13px] font-bold">
                              {kw.keyword}
                            </span>
                            <span className="text-[10px] font-normal text-ink-muted">
                              {kw.device === "mobile" ? "Mobile" : "Desktop"}{" "}
                              &middot; {kw.location}
                            </span>
                          </button>
                        </TableCell>

                        {/* Position */}
                        <TableCell>
                          <span
                            className={`font-mono text-sm font-bold tabular-nums ${
                              kw.current_position === 1
                                ? "text-editorial-red"
                                : kw.current_position !== null &&
                                    kw.current_position <= 3
                                  ? "text-editorial-green"
                                  : "text-ink"
                            }`}
                          >
                            {kw.current_position !== null
                              ? `#${kw.current_position}`
                              : "\u2014"}
                          </span>
                        </TableCell>

                        {/* Change */}
                        <TableCell className="font-sans">
                          {change !== 0 ? (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[13px] font-semibold ${
                                change > 0
                                  ? "text-editorial-green"
                                  : "text-editorial-red"
                              }`}
                            >
                              {change > 0 ? (
                                <TrendingUp size={13} strokeWidth={2.5} />
                              ) : (
                                <TrendingDown size={13} strokeWidth={2.5} />
                              )}
                              {change > 0 ? `+${change}` : change}
                            </span>
                          ) : kw.previous_position === null && kw.current_position !== null ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                              New
                            </span>
                          ) : (
                            <span className="text-[13px] text-ink-muted">
                              &mdash;
                            </span>
                          )}
                        </TableCell>

                        {/* SERP Features */}
                        <TableCell>
                          {kw.serp_features && kw.serp_features.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {kw.serp_features.slice(0, 3).map((feat) => (
                                <Badge key={feat} variant="muted" className="text-[8px] px-1 py-0">
                                  {serpFeatureLabel(feat)}
                                </Badge>
                              ))}
                              {kw.serp_features.length > 3 && (
                                <span className="text-[9px] text-ink-muted">
                                  +{kw.serp_features.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-muted">&mdash;</span>
                          )}
                        </TableCell>

                        {/* Volume */}
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-ink-secondary">
                            {kw.search_volume !== null
                              ? formatVolume(kw.search_volume)
                              : "\u2014"}
                          </span>
                        </TableCell>

                        {/* CPC */}
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-ink-secondary">
                            {kw.cpc !== null ? formatCurrency(kw.cpc) : "\u2014"}
                          </span>
                        </TableCell>

                        {/* Difficulty */}
                        <TableCell>
                          {kw.difficulty !== null ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={kw.difficulty}
                                size="sm"
                                color={getDifficultyColor(kw.difficulty)}
                                className="flex-1"
                              />
                              <span className="w-7 font-mono text-xs tabular-nums text-ink-secondary">
                                {kw.difficulty}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ink-muted">&mdash;</span>
                          )}
                        </TableCell>

                        {/* Intent */}
                        <TableCell className="font-sans">
                          {kw.intent ? (
                            <Badge variant={getIntentBadgeVariant(kw.intent)}>
                              {kw.intent}
                            </Badge>
                          ) : (
                            <span className="text-ink-muted">&mdash;</span>
                          )}
                        </TableCell>

                        {/* AI Visibility */}
                        <TableCell>
                          <span className="font-mono text-sm tabular-nums text-ink-secondary">
                            {kw.ai_visibility_count ?? "\u2014"}
                          </span>
                        </TableCell>

                        {/* Delete */}
                        <TableCell>
                          <button
                            type="button"
                            title="Delete keyword"
                            disabled={deletingKeywordId === kw.id}
                            onClick={() => {
                              if (!confirm(`Delete "${kw.keyword}"?`)) return;
                              setDeletingKeywordId(kw.id);
                              startTransition(async () => {
                                await deleteKeyword(kw.id);
                                setDeletingKeywordId(null);
                              });
                            }}
                            className="rounded p-1 text-ink-muted transition-colors hover:bg-editorial-red/10 hover:text-editorial-red disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                      {/* Expandable rank history */}
                      {expandedKeywordId === kw.id && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-surface-raised p-4">
                            {loadingHistory ? (
                              <div className="flex h-[200px] items-center justify-center">
                                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                                  Loading rank history...
                                </span>
                              </div>
                            ) : (
                              <RankHistoryChart data={rankHistory} keyword={kw.keyword} />
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              </div>

              {/* Mobile card view */}
              <div className="flex flex-col gap-3 md:hidden">
                {paginatedKeywords.map((kw) => {
                  const change =
                    kw.previous_position !== null && kw.current_position !== null
                      ? kw.previous_position - kw.current_position
                      : 0;
                  return (
                    <div key={kw.id} className="border border-rule bg-surface-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-ink truncate">{kw.keyword}</p>
                          <p className="text-[10px] text-ink-muted mt-0.5">
                            {kw.device === "mobile" ? "Mobile" : "Desktop"} &middot; {kw.location}
                          </p>
                        </div>
                        <span className={`font-mono text-lg font-bold tabular-nums shrink-0 ${
                          kw.current_position === 1
                            ? "text-editorial-red"
                            : kw.current_position !== null && kw.current_position <= 3
                              ? "text-editorial-green"
                              : "text-ink"
                        }`}>
                          {kw.current_position !== null ? `#${kw.current_position}` : "\u2014"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <span className="editorial-overline">Change</span>
                          <p className={`font-mono text-sm font-semibold ${
                            change > 0 ? "text-editorial-green" : change < 0 ? "text-editorial-red" : "text-ink-muted"
                          }`}>
                            {change > 0 ? `+${change}` : change !== 0 ? String(change) : "\u2014"}
                          </p>
                        </div>
                        <div>
                          <span className="editorial-overline">Volume</span>
                          <p className="font-mono text-sm text-ink-secondary">
                            {kw.search_volume !== null ? formatVolume(kw.search_volume) : "\u2014"}
                          </p>
                        </div>
                        <div>
                          <span className="editorial-overline">Difficulty</span>
                          <p className="font-mono text-sm text-ink-secondary">
                            {kw.difficulty !== null ? kw.difficulty : "\u2014"}
                          </p>
                        </div>
                      </div>
                      {kw.intent && (
                        <div className="mt-2">
                          <Badge variant={getIntentBadgeVariant(kw.intent)}>{kw.intent}</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Table Footer */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-rule pt-3">
                <span className="text-[11px] font-semibold text-ink-muted">
                  Showing {paginatedKeywords.length} of {filteredKeywords.length} keywords
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="font-mono text-xs tabular-nums text-ink-secondary">
                    Page {page} of {Math.max(1, Math.ceil(filteredKeywords.length / PAGE_SIZE))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= Math.ceil(filteredKeywords.length / PAGE_SIZE)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : keywords.length === 0 ? (
            /* True empty state: no keywords in the project at all */
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
                <h2 className="font-serif text-xl font-bold text-ink">
                  No Keywords Tracked Yet
                </h2>
                <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
                  Add your first keywords to start monitoring rankings.
                  <br />
                  Position data will appear once tracking begins.
                </p>
              </div>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger className="inline-flex items-center gap-1.5 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90">
                  <Plus size={14} />
                  Add Your First Keywords
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Keywords</DialogTitle>
                    <DialogDescription>
                      Enter one keyword per line. They will be added to your
                      tracked keywords list and monitored for ranking changes.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-5">
                    <textarea
                      className="w-full min-h-[160px] resize-y border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                      placeholder={"e.g.\nzero trust architecture\ncloud security tools\nSIEM solutions 2026"}
                      value={newKeywordsText}
                      onChange={(e) => setNewKeywordsText(e.target.value)}
                    />
                    {addError && (
                      <p className="mt-2 text-[12px] font-semibold text-editorial-red">
                        {addError}
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddKeywords}
                      disabled={isPending || newKeywordsText.trim().length === 0}
                    >
                      {isPending ? "Adding..." : "Add Keywords"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            /* Filter produced no results but keywords exist */
            <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
              <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                No keywords match your search or filter.
              </span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
