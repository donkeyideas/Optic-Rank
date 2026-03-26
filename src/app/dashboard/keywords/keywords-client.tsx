"use client";

import { useState, useTransition, useRef, useCallback, useMemo, Fragment } from "react";
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
  Copy,
  Check,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Globe,
  Zap,
  Shield,
  TrendingUp as TrendUpIcon,
  Eye,
  FileEdit,
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
import { importKeywordsFromGSC } from "@/lib/actions/gsc";
import { useActionProgress } from "@/components/shared/action-progress";
import { RankHistoryChart } from "@/components/charts/rank-history-chart";
import type { Keyword, ComparisonTimeRange } from "@/types";
import { PeriodComparisonBar } from "@/components/editorial/period-comparison-bar";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";

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
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
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

const LOCATION_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "KR", label: "South Korea" },
];

/* ------------------------------------------------------------------
   Recommendation Engine
   ------------------------------------------------------------------ */

interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: string;
  icon: typeof Target;
  keyword: string;
  action: string;
  where: string;
  estimatedImpact: string;
  details: string;
}

function generateRecommendations(keywords: Keyword[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const ranked = keywords.filter((k) => k.current_position !== null);
  const unranked = keywords.filter((k) => k.current_position === null);

  // 1. Quick Wins — ranking 4-20 with decent volume (biggest opportunity)
  const quickWins = ranked
    .filter((k) => k.current_position! >= 4 && k.current_position! <= 20 && (k.search_volume ?? 0) >= 100)
    .sort((a, b) => (a.current_position ?? 99) - (b.current_position ?? 99));

  for (const kw of quickWins.slice(0, 5)) {
    const pos = kw.current_position!;
    const vol = kw.search_volume ?? 0;
    const onPage1 = pos <= 10;
    const estClicks = onPage1
      ? Math.round(vol * 0.03 * (11 - pos) / 10)
      : Math.round(vol * 0.15);
    recs.push({
      id: `qw-${kw.id}`,
      priority: pos <= 10 ? "high" : "medium",
      category: "Quick Win",
      icon: Zap,
      keyword: kw.keyword,
      action: onPage1
        ? `Move from #${pos} to top 3 by strengthening on-page SEO`
        : `Push from page 2 (#${pos}) to page 1 with content optimization`,
      where: "Page title, H1 heading, meta description, first paragraph, internal links pointing to this page",
      estimatedImpact: onPage1
        ? `+${estClicks.toLocaleString()} clicks/mo (top 3 gets ~60% of clicks for ${vol.toLocaleString()} monthly searches)`
        : `+${estClicks.toLocaleString()} clicks/mo (page 1 vs page 2 is a 10x difference in traffic)`,
      details: kw.difficulty !== null && kw.difficulty < 40
        ? "Low competition keyword — a well-optimized page can rank quickly."
        : kw.difficulty !== null && kw.difficulty >= 70
          ? "High competition — consider building backlinks alongside content improvements."
          : "Focus on matching search intent better than current top results.",
    });
  }

  // 2. High Value — commercial/transactional intent keywords
  const highValue = ranked
    .filter((k) => (k.intent === "commercial" || k.intent === "transactional") && (k.cpc ?? 0) >= 1)
    .sort((a, b) => (b.cpc ?? 0) - (a.cpc ?? 0));

  for (const kw of highValue.slice(0, 3)) {
    const pos = kw.current_position!;
    const cpc = kw.cpc ?? 0;
    const vol = kw.search_volume ?? 0;
    const monthlyValue = Math.round(vol * 0.05 * cpc);
    recs.push({
      id: `hv-${kw.id}`,
      priority: "high",
      category: "Revenue Opportunity",
      icon: Target,
      keyword: kw.keyword,
      action: pos <= 10
        ? `Optimize conversion path — you rank #${pos} for a high-value buyer keyword`
        : `Create or improve a dedicated landing page targeting this buyer keyword`,
      where: "Dedicated landing page with clear CTA, product/service comparison tables, pricing info, trust signals (reviews, case studies)",
      estimatedImpact: `Worth ~$${monthlyValue.toLocaleString()}/mo in equivalent ad spend ($${cpc.toFixed(2)} CPC × ${vol.toLocaleString()} searches)`,
      details: `${kw.intent === "transactional" ? "Transactional" : "Commercial"} intent — searchers are ready to take action. Ensure your page has a clear conversion path.`,
    });
  }

  // 3. Defend positions — keywords that dropped
  const dropped = ranked
    .filter((k) => k.previous_position !== null && k.current_position! > k.previous_position!)
    .sort((a, b) => (b.previous_position! - b.current_position!) - (a.previous_position! - a.current_position!));

  for (const kw of dropped.slice(0, 3)) {
    const drop = kw.current_position! - kw.previous_position!;
    const vol = kw.search_volume ?? 0;
    recs.push({
      id: `def-${kw.id}`,
      priority: drop >= 5 ? "high" : "medium",
      category: "Defend Position",
      icon: Shield,
      keyword: kw.keyword,
      action: `Dropped ${drop} positions (was #${kw.previous_position}, now #${kw.current_position}) — investigate and recover`,
      where: "Check the ranking page for: outdated content, broken links, slower load time, competitor updates. Update content freshness and add new information.",
      estimatedImpact: vol > 0
        ? `Recover ~${Math.round(vol * 0.02 * drop / 10).toLocaleString()} lost clicks/mo`
        : "Prevent further decline and protect your search presence",
      details: "Common causes: competitor published better content, your page lost backlinks, Google algorithm update, or technical issues like slow page speed.",
    });
  }

  // 4. SERP Feature opportunities
  const serpOpps = ranked
    .filter((k) => k.serp_features && k.serp_features.length > 0 && k.current_position! <= 10)
    .slice(0, 3);

  for (const kw of serpOpps) {
    const features = kw.serp_features ?? [];
    const hasFeatured = features.includes("featured_snippet");
    const hasPAA = features.includes("people_also_ask");
    recs.push({
      id: `serp-${kw.id}`,
      priority: "medium",
      category: "SERP Feature",
      icon: Eye,
      keyword: kw.keyword,
      action: hasFeatured
        ? `Win the featured snippet for "${kw.keyword}" — you're already on page 1 (#${kw.current_position})`
        : hasPAA
          ? `Target "People Also Ask" boxes by answering related questions on your page`
          : `Optimize for ${features.map((f) => SERP_FEATURE_LABELS[f] || f).join(", ")} features`,
      where: hasFeatured
        ? "Add a concise 40-60 word answer paragraph right after your H2. Use definition format, numbered lists, or tables."
        : hasPAA
          ? "Add an FAQ section with H3 question headings and direct 2-3 sentence answers."
          : "Structure your content to match the SERP feature format (lists, tables, images, videos).",
      estimatedImpact: "Featured snippets get ~8% of clicks and appear above #1 — massive visibility boost with no extra backlinks needed",
      details: `Current SERP features: ${features.map((f) => SERP_FEATURE_LABELS[f] || f).join(", ")}. These represent extra real estate on the search results page.`,
    });
  }

  // 5. Content gaps — unranked keywords with volume
  const gaps = unranked
    .filter((k) => (k.search_volume ?? 0) >= 50)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));

  for (const kw of gaps.slice(0, 3)) {
    const vol = kw.search_volume ?? 0;
    const diff = kw.difficulty ?? 50;
    recs.push({
      id: `gap-${kw.id}`,
      priority: diff < 40 ? "high" : "medium",
      category: "Content Gap",
      icon: FileEdit,
      keyword: kw.keyword,
      action: `Create a new page targeting "${kw.keyword}" — you have no ranking page yet`,
      where: "Write a comprehensive blog post or landing page. Include the keyword in the URL slug, title, H1, and throughout the content. Aim for 1,500+ words.",
      estimatedImpact: diff < 40
        ? `${vol.toLocaleString()} monthly searches with low competition — could rank within 2-4 weeks`
        : `${vol.toLocaleString()} monthly searches — may take 1-3 months to reach page 1`,
      details: kw.intent
        ? `Search intent: ${kw.intent}. Match your content format to what the searcher expects.`
        : "Research the current top 10 results to understand what Google rewards for this query.",
    });
  }

  // 6. Low difficulty, high volume opportunities not yet in top 3
  const easyWins = ranked
    .filter((k) => (k.difficulty ?? 100) < 30 && (k.search_volume ?? 0) >= 200 && k.current_position! > 3)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));

  for (const kw of easyWins.slice(0, 3)) {
    const vol = kw.search_volume ?? 0;
    recs.push({
      id: `easy-${kw.id}`,
      priority: "high",
      category: "Low Hanging Fruit",
      icon: TrendUpIcon,
      keyword: kw.keyword,
      action: `Low competition (difficulty ${kw.difficulty}) with ${vol.toLocaleString()} searches — push #${kw.current_position} into top 3`,
      where: "Strengthen your existing page: add more depth, update with fresh data, improve internal linking from high-authority pages on your site",
      estimatedImpact: `Top 3 for this keyword could bring ~${Math.round(vol * 0.15).toLocaleString()} clicks/mo`,
      details: "Low difficulty means fewer strong competitors. Small improvements in content quality and internal linking can make a big difference.",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs;
}

/* ------------------------------------------------------------------
   Keywords Page Client Component
   ------------------------------------------------------------------ */

export function KeywordsPageClient({
  projectId,
  keywords,
  totalCount,
  stats,
  comparisons,
}: KeywordsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeywordsText, setNewKeywordsText] = useState("");
  const [addLocation, setAddLocation] = useState("US");
  const [addDevice, setAddDevice] = useState<"desktop" | "mobile">("desktop");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();
  const [deletingKeywordId, setDeletingKeywordId] = useState<string | null>(null);
  const [expandedKeywordId, setExpandedKeywordId] = useState<string | null>(null);
  const [rankHistory, setRankHistory] = useState<{ date: string; position: number | null }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedRecId, setCopiedRecId] = useState<string | null>(null);

  // Generate recommendations from keyword data
  const recommendations = useMemo(() => generateRecommendations(keywords), [keywords]);

  // Client-side filtering of the server-fetched data
  const filteredKeywords = keywords.filter((kw) => {
    const matchesSearch = kw.keyword
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesDevice =
      deviceFilter === "all" || kw.device === deviceFilter;
    const matchesLocation =
      locationFilter === "all" || kw.location === locationFilter;
    return matchesSearch && matchesDevice && matchesLocation;
  });

  const handleCopyKeywords = useCallback(() => {
    const text = filteredKeywords.map((kw) => kw.keyword).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [filteredKeywords]);

  // Get unique locations from keywords for the filter dropdown
  const uniqueLocations = [...new Set(keywords.map((kw) => kw.location || "US"))];

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
      const result = await addKeywords(projectId, keywordsArray, addLocation, addDevice);
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

      {/* Period Comparison */}
      <PeriodComparisonBar comparisons={comparisons} />

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
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Guide</TabsTrigger>
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

            {/* Location Filter */}
            {uniqueLocations.length > 1 && (
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="border border-rule bg-surface-card px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-ink focus:border-editorial-red focus:outline-none"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}

            {/* Copy Keywords */}
            {filteredKeywords.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyKeywords}
                title="Copy all visible keywords to clipboard"
              >
                {copied ? <Check size={14} className="text-editorial-green" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy All"}
              </Button>
            )}

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

            {/* Generate Keywords */}
            <Button
              variant="outline"
              size="sm"
              disabled={isActionRunning || isPending}
              onClick={() => {
                runAction(
                  {
                    title: "Generating Keywords",
                    description: "Researching and generating keyword suggestions...",
                    steps: ["Analyzing website content", "Researching keyword opportunities", "Evaluating search volume", "Assessing keyword difficulty", "Finalizing suggestions"],
                    estimatedDuration: 20,
                  },
                  () => generateKeywordsAI(projectId, addLocation, addDevice)
                );
              }}
            >
              <Sparkles size={14} />
              Generate
            </Button>

            {/* Import from GSC */}
            <Button
              variant="outline"
              size="sm"
              disabled={isActionRunning || isPending}
              onClick={() => {
                runAction(
                  {
                    title: "Importing from GSC",
                    description: "Fetching top search queries from Google Search Console...",
                    steps: ["Connecting to GSC", "Fetching top queries", "Filtering duplicates", "Adding keywords"],
                    estimatedDuration: 10,
                  },
                  () => importKeywordsFromGSC(projectId, 50, addLocation, addDevice)
                );
              }}
            >
              <Search size={14} />
              Import GSC
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
                    className="w-full min-h-[140px] resize-y border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                    placeholder={"e.g.\nzero trust architecture\ncloud security tools\nSIEM solutions 2026"}
                    value={newKeywordsText}
                    onChange={(e) => setNewKeywordsText(e.target.value)}
                  />
                  <div className="mt-3 flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Location</label>
                      <select
                        value={addLocation}
                        onChange={(e) => setAddLocation(e.target.value)}
                        className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink focus:border-editorial-red focus:outline-none"
                      >
                        {LOCATION_OPTIONS.map((loc) => (
                          <option key={loc.value} value={loc.value}>{loc.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Device</label>
                      <select
                        value={addDevice}
                        onChange={(e) => setAddDevice(e.target.value as "desktop" | "mobile")}
                        className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink focus:border-editorial-red focus:outline-none"
                      >
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                      </select>
                    </div>
                  </div>
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

          {/* Import Status */}
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
                      className="w-full min-h-[140px] resize-y border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                      placeholder={"e.g.\nzero trust architecture\ncloud security tools\nSIEM solutions 2026"}
                      value={newKeywordsText}
                      onChange={(e) => setNewKeywordsText(e.target.value)}
                    />
                    <div className="mt-3 flex gap-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Location</label>
                        <select
                          value={addLocation}
                          onChange={(e) => setAddLocation(e.target.value)}
                          className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink focus:border-editorial-red focus:outline-none"
                        >
                          {LOCATION_OPTIONS.map((loc) => (
                            <option key={loc.value} value={loc.value}>{loc.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Device</label>
                        <select
                          value={addDevice}
                          onChange={(e) => setAddDevice(e.target.value as "desktop" | "mobile")}
                          className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink focus:border-editorial-red focus:outline-none"
                        >
                          <option value="desktop">Desktop</option>
                          <option value="mobile">Mobile</option>
                        </select>
                      </div>
                    </div>
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

        {/* ============================================================
            TAB: Recommendations
            ============================================================ */}
        <TabsContent value="recommendations">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="border-b border-rule pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-bold text-ink">
                    Keyword Recommendations
                  </h2>
                  <p className="mt-1 max-w-2xl font-sans text-[13px] text-ink-secondary">
                    Personalized actions based on your keyword data. Each recommendation tells you
                    exactly what to do, where to do it, and the estimated impact.
                  </p>
                </div>
                {recommendations.length > 0 && (
                  <button
                    onClick={() => {
                      const text = recommendations
                        .map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.category}: "${r.keyword}"\n   Action: ${r.action}\n   Where: ${r.where}\n   Impact: ${r.estimatedImpact}\n   Note: ${r.details}`)
                        .join("\n\n");
                      navigator.clipboard.writeText(text).then(() => {
                        setCopiedRecId("all");
                        setTimeout(() => setCopiedRecId(null), 2000);
                      });
                    }}
                    className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-surface-raised"
                  >
                    {copiedRecId === "all" ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
                    {copiedRecId === "all" ? "Copied!" : "Copy All"}
                  </button>
                )}
              </div>
            </div>

            {/* Summary stats */}
            {recommendations.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border border-rule bg-surface-card p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-ink">{recommendations.length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total Actions</div>
                </div>
                <div className="border border-editorial-red/30 bg-editorial-red/5 p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-editorial-red">{recommendations.filter((r) => r.priority === "high").length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">High Priority</div>
                </div>
                <div className="border border-editorial-gold/30 bg-editorial-gold/5 p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-editorial-gold">{recommendations.filter((r) => r.priority === "medium").length}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Medium Priority</div>
                </div>
                <div className="border border-rule bg-surface-card p-3 text-center">
                  <div className="font-mono text-2xl font-bold text-editorial-green">
                    {keywords.filter((k) => k.current_position !== null && k.current_position <= 3).length}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Already Top 3</div>
                </div>
              </div>
            )}

            {/* Recommendation cards */}
            {recommendations.length > 0 ? (
              <div className="flex flex-col gap-4">
                {recommendations.map((rec) => {
                  const Icon = rec.icon;
                  const priorityStyles = {
                    high: "border-l-editorial-red",
                    medium: "border-l-editorial-gold",
                    low: "border-l-ink-muted",
                  };
                  const priorityBadge = {
                    high: "bg-editorial-red/10 text-editorial-red",
                    medium: "bg-editorial-gold/10 text-editorial-gold",
                    low: "bg-ink/10 text-ink-muted",
                  };
                  return (
                    <div
                      key={rec.id}
                      className={`border border-rule border-l-[3px] ${priorityStyles[rec.priority]} bg-surface-card`}
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 border-b border-rule/50 px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface-raised">
                            <Icon size={16} className="text-ink" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${priorityBadge[rec.priority]}`}>
                                {rec.priority}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                                {rec.category}
                              </span>
                            </div>
                            <p className="mt-0.5 font-mono text-[13px] font-bold text-ink truncate">
                              {rec.keyword}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const text = `Keyword: "${rec.keyword}"\nAction: ${rec.action}\nWhere: ${rec.where}\nEstimated Impact: ${rec.estimatedImpact}\nNote: ${rec.details}`;
                            navigator.clipboard.writeText(text).then(() => {
                              setCopiedRecId(rec.id);
                              setTimeout(() => setCopiedRecId(null), 2000);
                            });
                          }}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-ink-muted transition-colors hover:text-ink"
                          title="Copy recommendation"
                        >
                          {copiedRecId === rec.id ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
                        </button>
                      </div>

                      {/* Card body */}
                      <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                            What to Do
                          </span>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                            {rec.action}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-gold">
                            Where to Do It
                          </span>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                            {rec.where}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">
                            Estimated Impact
                          </span>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                            {rec.estimatedImpact}
                          </p>
                        </div>
                      </div>

                      {/* Details footer */}
                      <div className="border-t border-rule/50 bg-surface-raised/50 px-5 py-2.5">
                        <p className="text-[11px] text-ink-muted">
                          <Lightbulb size={11} className="mr-1 inline" />
                          {rec.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
                  <h2 className="font-serif text-xl font-bold text-ink">
                    No Recommendations Yet
                  </h2>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
                    Add keywords and wait for position data to generate personalized recommendations.
                    <br />
                    The more keywords you track, the better the recommendations will be.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Strategy Guide
            ============================================================ */}
        <TabsContent value="strategy">
          <div className="flex flex-col gap-8">
            {/* Intro */}
            <div className="border-b border-rule pb-6">
              <h2 className="font-serif text-xl font-bold text-ink">
                Keyword Strategy Guide
              </h2>
              <p className="mt-2 max-w-3xl font-sans text-[13px] leading-relaxed text-ink-secondary">
                Keywords are the search terms your audience types into Google, Bing, and other engines.
                Tracking and optimizing for the right keywords is the foundation of organic growth &mdash;
                it determines whether your website shows up when people search for what you offer.
              </p>
            </div>

            {/* Why Keywords Matter */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="border border-rule bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={18} className="text-editorial-red" />
                  <h3 className="font-serif text-base font-bold text-ink">Why Track Keywords?</h3>
                </div>
                <ul className="flex flex-col gap-2 text-[13px] text-ink-secondary">
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span>See exactly where your site ranks for target terms</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span>Identify which pages bring organic traffic</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span>Spot ranking drops before they impact revenue</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span>Discover new opportunities your competitors rank for</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span>Measure the ROI of your SEO efforts over time</li>
                </ul>
              </div>

              <div className="border border-rule bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={18} className="text-editorial-gold" />
                  <h3 className="font-serif text-base font-bold text-ink">How to Use This Data</h3>
                </div>
                <ul className="flex flex-col gap-2 text-[13px] text-ink-secondary">
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-gold font-bold">&bull;</span><strong className="text-ink">Position:</strong> Your current Google ranking (1 = first result)</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-gold font-bold">&bull;</span><strong className="text-ink">Volume:</strong> Monthly searches &mdash; higher means more potential traffic</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-gold font-bold">&bull;</span><strong className="text-ink">Difficulty:</strong> How hard it is to rank &mdash; start with low difficulty</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-gold font-bold">&bull;</span><strong className="text-ink">CPC:</strong> What advertisers pay per click &mdash; higher CPC = more commercial value</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-gold font-bold">&bull;</span><strong className="text-ink">Intent:</strong> What the searcher wants (info, purchase, navigation)</li>
                </ul>
              </div>

              <div className="border border-rule bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-editorial-green" />
                  <h3 className="font-serif text-base font-bold text-ink">Where to Use Keywords</h3>
                </div>
                <ul className="flex flex-col gap-2 text-[13px] text-ink-secondary">
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">Page titles</strong> &mdash; the most important on-page factor</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">Meta descriptions</strong> &mdash; improve click-through rates</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">H1 &amp; H2 headings</strong> &mdash; structure content around topics</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">Body content</strong> &mdash; naturally within the first 100 words</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">Image alt text</strong> &mdash; describe images with target terms</li>
                  <li className="flex gap-2"><span className="shrink-0 text-editorial-green font-bold">&bull;</span><strong className="text-ink">URL slugs</strong> &mdash; keep short and keyword-rich</li>
                </ul>
              </div>
            </div>

            {/* Strategy Steps */}
            <div className="border border-rule bg-surface-card p-6">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Step-by-Step: How to Rank Higher
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    step: "1",
                    title: "Add Your Target Keywords",
                    desc: "Start by adding 20-50 keywords relevant to your business. Use the Generate button to discover opportunities, or import from Google Search Console to see what you already rank for.",
                  },
                  {
                    step: "2",
                    title: "Prioritize by Opportunity",
                    desc: "Focus on keywords where you rank 4-20 (positions close to page 1). These are your quick wins. Sort by position and look for high-volume, low-difficulty terms.",
                  },
                  {
                    step: "3",
                    title: "Optimize Your Content",
                    desc: "For each target keyword, ensure you have a dedicated page. Include the keyword in the title, H1, meta description, and naturally in the body text. Don't stuff — write for humans first.",
                  },
                  {
                    step: "4",
                    title: "Build Quality Backlinks",
                    desc: "Links from other websites signal trust to Google. Focus on getting mentions from relevant industry sites, write guest posts, and create shareable content that earns links naturally.",
                  },
                  {
                    step: "5",
                    title: "Monitor & Iterate",
                    desc: "Check your rankings weekly. When a keyword moves up, double down on what worked. When it drops, investigate — did a competitor publish better content? Did your page lose links?",
                  },
                  {
                    step: "6",
                    title: "Expand Your Portfolio",
                    desc: "Once your primary keywords are ranking well, use the data to find related long-tail keywords. These often have less competition and convert better because they're more specific.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-editorial-red text-[12px] font-bold text-white">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-sans text-[13px] font-bold text-ink">{item.title}</h4>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-editorial-green/20 bg-editorial-green/5 p-5">
                <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink mb-3">
                  <Lightbulb size={16} className="text-editorial-green" />
                  Do This
                </h3>
                <ul className="flex flex-col gap-2 text-[12px] text-ink-secondary">
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Target one primary keyword per page</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Include 2-3 secondary/related keywords per page</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Write content that fully answers the searcher&apos;s question</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Update content regularly to keep it fresh</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Track keywords across both desktop and mobile</li>
                  <li className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />Use long-tail keywords for faster wins</li>
                </ul>
              </div>
              <div className="border border-editorial-red/20 bg-editorial-red/5 p-5">
                <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink mb-3">
                  <Trash2 size={16} className="text-editorial-red" />
                  Avoid This
                </h3>
                <ul className="flex flex-col gap-2 text-[12px] text-ink-secondary">
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Keyword stuffing (repeating the same word unnaturally)</li>
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Targeting only head terms with 100K+ volume</li>
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Ignoring search intent (informational vs. commercial)</li>
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Creating multiple pages for the same keyword</li>
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Chasing rankings without measuring conversions</li>
                  <li className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />Neglecting technical SEO (site speed, mobile-friendly)</li>
                </ul>
              </div>
            </div>

            {/* Understanding Metrics */}
            <div className="border border-rule bg-surface-card p-6">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Understanding Your Metrics
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Position #1-3", desc: "Top of page 1. These keywords drive the most clicks — roughly 60% of all search traffic goes to the top 3 results.", color: "text-editorial-green" },
                  { label: "Position #4-10", desc: "Still on page 1 but below the fold. Good visibility but significantly lower click rates. Optimize content to push into top 3.", color: "text-editorial-gold" },
                  { label: "Position #11-20", desc: "Page 2. Very few searchers click here. These are your best opportunities — small improvements can move you to page 1.", color: "text-editorial-red" },
                  { label: "High Volume + Low Difficulty", desc: "The ideal keyword. Lots of searches and relatively easy to rank for. Prioritize these in your content strategy.", color: "text-editorial-green" },
                  { label: "Commercial Intent", desc: "Keywords where the searcher is ready to buy (e.g., 'best CRM software', 'buy running shoes'). These drive revenue, not just traffic.", color: "text-editorial-gold" },
                  { label: "SERP Features", desc: "Special results like featured snippets, videos, or image packs. If your keyword triggers these, optimize your content format to win them.", color: "text-ink" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1">
                    <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${item.color}`}>{item.label}</span>
                    <p className="text-[12px] leading-relaxed text-ink-secondary">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
