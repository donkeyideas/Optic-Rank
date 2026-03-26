"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";
import {
  FileText,
  Lightbulb,
  ExternalLink,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Target,
  Pencil,
  Trash2,
  TrendingDown,
  Copy,
  Link2,
  Calendar,
  Shield,
  Eye,
  Zap,
  BarChart3,
  ArrowRight,
  Check as CheckIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";
import { SortableHeader } from "@/components/editorial/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { RecommendationsTab, StrategyGuideTab } from "@/components/shared/page-guide";
import type { Recommendation, StrategyContent } from "@/components/shared/page-guide";
import {
  addContentPage,
  deleteContentPage,
  updateContentPageStatus,
  scoreContentPages,
  detectContentDecay,
  detectCannibalization,
  suggestInternalLinks,
  addCalendarEntry,
  updateCalendarEntryStatus,
  deleteCalendarEntry,
  generateContentBriefs,
  generateCalendarEntries,
  updateContentBrief,
  deleteContentBrief,
} from "@/lib/actions/content";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface ContentPage {
  id: string;
  project_id: string;
  url?: string | null;
  title?: string | null;
  content_score?: number | null;
  organic_traffic?: number | null;
  traffic_source?: "ga4" | "estimated" | null;
  word_count?: number | null;
  last_modified?: string | null;
  updated_at?: string | null;
  status?: string | null;
  decay_risk?: string | null;
  cannibalization_group?: string | null;
  suggested_internal_links?: Array<{ target_url: string; anchor_text: string }> | null;
  [key: string]: unknown;
}

interface ContentBrief {
  id: string;
  project_id: string;
  topic?: string | null;
  target_keyword?: string | null;
  estimated_traffic?: number | null;
  difficulty?: number | null;
  status?: string | null;
  word_target?: number | null;
  [key: string]: unknown;
}

interface CalendarEntry {
  id: string;
  title?: string | null;
  target_keyword?: string | null;
  target_date?: string | null;
  status?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

interface ContentClientProps {
  contentPages: ContentPage[];
  contentBriefs: ContentBrief[];
  calendarEntries: CalendarEntry[];
  projectId: string;
  hasKeywords?: boolean;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function scoreColor(score: number) {
  if (score >= 80) return "green" as const;
  if (score >= 60) return "gold" as const;
  return "red" as const;
}

const STATUS_OPTIONS = [
  { value: "published", label: "Published", variant: "success" as const },
  { value: "draft", label: "Draft", variant: "muted" as const },
  { value: "needs_update", label: "Needs Update", variant: "warning" as const },
  { value: "archived", label: "Archived", variant: "muted" as const },
];

const CALENDAR_STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "published", label: "Published" },
  { value: "postponed", label: "Postponed" },
];

function statusBadge(status: string | null | undefined) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  if (opt) return { variant: opt.variant, label: opt.label };
  return { variant: "muted" as const, label: status ?? "Unknown" };
}

function decayBadge(risk: string | null | undefined) {
  if (risk === "high") return { variant: "danger" as const, label: "High Risk" };
  if (risk === "medium") return { variant: "warning" as const, label: "Medium Risk" };
  if (risk === "low") return { variant: "muted" as const, label: "Low Risk" };
  return { variant: "success" as const, label: "Healthy" };
}

/* ------------------------------------------------------------------
   Content Client Component
   ------------------------------------------------------------------ */

export function ContentClient({
  contentPages,
  contentBriefs,
  calendarEntries,
  projectId,
  hasKeywords = false,
}: ContentClientProps) {
  const timezone = useTimezone();
  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddContent, setShowAddContent] = useState(false);
  const [showAddCalendar, setShowAddCalendar] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Intelligence action states
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  // Calendar month view state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);

  // ── Table sort hooks ──
  const {
    sortKey: invSortKey,
    sortDir: invSortDir,
    toggleSort: invToggleSort,
    sort: invSort,
  } = useTableSort<"title" | "content_score" | "organic_traffic" | "word_count" | "updated_at" | "status">("title", "asc");

  const {
    sortKey: decaySortKey,
    sortDir: decaySortDir,
    toggleSort: decayToggleSort,
    sort: decaySort,
  } = useTableSort<"title" | "decay_risk" | "organic_traffic" | "updated_at">("decay_risk", "desc");

  const {
    sortKey: calSortKey,
    sortDir: calSortDir,
    toggleSort: calToggleSort,
    sort: calSort,
  } = useTableSort<"title" | "target_keyword" | "target_date" | "status">("target_date", "asc");

  function handleAddContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData(e.currentTarget);
    const url = formData.get("url") as string;
    if (!url?.trim()) { setAddError("URL is required."); return; }
    startTransition(async () => {
      const result = await addContentPage(projectId, formData);
      if ("error" in result) setAddError(result.error);
      else { setShowAddContent(false); setAddError(null); }
    });
  }

  function handleAddCalendar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCalendarError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addCalendarEntry(projectId, formData);
      if ("error" in result) setCalendarError(result.error);
      else { setShowAddCalendar(false); setCalendarError(null); }
    });
  }

  function handleDetectDecay() {
    runAction(
      {
        title: "Detecting Content Decay",
        description: "Analyzing content freshness and traffic patterns...",
        steps: ["Scanning content pages", "Analyzing traffic trends", "Identifying declining content", "Scoring decay severity", "Generating recovery suggestions"],
        estimatedDuration: 20,
      },
      () => detectContentDecay(projectId)
    );
  }

  function handleDetectCannibalization() {
    runAction(
      {
        title: "Checking Cannibalization",
        description: "Scanning for keyword overlap between pages...",
        steps: ["Collecting page keywords", "Comparing keyword targets", "Detecting overlaps", "Ranking conflict severity", "Building recommendations"],
        estimatedDuration: 15,
      },
      () => detectCannibalization(projectId)
    );
  }

  function handleSuggestLinks() {
    runAction(
      {
        title: "Suggesting Internal Links",
        description: "Analyzing content relationships for linking opportunities...",
        steps: ["Mapping content topics", "Analyzing page relationships", "Identifying link opportunities", "Scoring link value", "Generating suggestions"],
        estimatedDuration: 15,
      },
      () => suggestInternalLinks(projectId)
    );
  }

  /* ---- Dialogs ---- */

  const addContentDialog = (
    <Dialog open={showAddContent} onOpenChange={setShowAddContent}>
      <DialogTrigger className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90">
        <Plus size={14} />
        New Content
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Content Page</DialogTitle>
          <DialogDescription>Enter the URL and title of the content page you want to track.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddContent}>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="content-url" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">URL</label>
              <input id="content-url" name="url" type="url" required className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" placeholder="e.g. https://example.com/blog/post" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="content-title" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title</label>
              <input id="content-title" name="title" type="text" className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" placeholder="e.g. How to Improve SEO Rankings" />
            </div>
            {addError && <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">{addError}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddContent(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>{isPending ? "Adding..." : "Add Page"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const addCalendarDialog = (
    <Dialog open={showAddCalendar} onOpenChange={setShowAddCalendar}>
      <DialogTrigger className="inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90">
        <Plus size={14} />
        New Entry
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Calendar Entry</DialogTitle>
          <DialogDescription>Plan a new content piece for your editorial calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddCalendar}>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-title" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title</label>
              <input id="cal-title" name="title" type="text" required className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" placeholder="e.g. Ultimate Guide to Link Building" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-keyword" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Target Keyword</label>
              <input id="cal-keyword" name="target_keyword" type="text" className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" placeholder="e.g. link building strategies" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-date" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Target Date</label>
              <input id="cal-date" name="target_date" type="date" required className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cal-notes" className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Notes</label>
              <textarea id="cal-notes" name="notes" rows={3} className="w-full border border-rule bg-surface-card px-3 py-2 font-sans text-[13px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" placeholder="Any notes about this content piece..." />
            </div>
            {calendarError && <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">{calendarError}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCalendar(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>{isPending ? "Adding..." : "Add Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  /* ---- Filtered data ---- */

  const decayPages = contentPages.filter((p) => p.decay_risk && p.decay_risk !== "none");
  const cannibalGroups = new Map<string, ContentPage[]>();
  for (const page of contentPages) {
    if (page.cannibalization_group) {
      if (!cannibalGroups.has(page.cannibalization_group)) cannibalGroups.set(page.cannibalization_group, []);
      cannibalGroups.get(page.cannibalization_group)!.push(page);
    }
  }
  const pagesWithLinks = contentPages.filter((p) => p.suggested_internal_links && p.suggested_internal_links.length > 0);

  const hasNoData = contentPages.length === 0 && contentBriefs.length === 0;

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Low content score pages
    contentPages.filter(p => p.content_score != null && p.content_score < 60).forEach((page) => {
      recs.push({
        id: `score-${page.id}`,
        priority: page.content_score != null && page.content_score < 40 ? "high" : "medium",
        category: "Content Quality",
        icon: FileText,
        item: page.title ?? page.url ?? "Untitled page",
        action: `Improve content quality — current score is ${page.content_score}/100. Add more depth, update outdated information, and improve readability.`,
        where: page.url ?? "Check your content inventory",
        estimatedImpact: `Improving content score to 80+ typically results in 20-40% more organic traffic for this page.`,
        details: "Focus on comprehensive coverage of the topic, add visuals, update statistics, and improve internal linking.",
      });
    });

    // Decay risk pages
    contentPages.filter(p => p.decay_risk === "high").forEach((page) => {
      recs.push({
        id: `decay-${page.id}`,
        priority: "high",
        category: "Content Decay",
        icon: TrendingDown,
        item: page.title ?? page.url ?? "Untitled page",
        action: "This page is losing rankings. Refresh the content immediately — update facts, add new sections, and re-optimize for target keywords.",
        where: page.url ?? "Check the Decay tab for affected pages",
        estimatedImpact: "Refreshing decaying content typically recovers 50-80% of lost traffic within 4-8 weeks.",
        details: "Content decay happens when competitors publish better content or search intent shifts. Regular updates maintain rankings.",
      });
    });

    // Cannibalization issues
    const groups = Array.from(new Map(contentPages.filter(p => p.cannibalization_group).map(p => [p.cannibalization_group, p])).values());
    if (groups.length > 0) {
      recs.push({
        id: "cannibalization",
        priority: "high",
        category: "Cannibalization",
        icon: Target,
        item: `${groups.length} Keyword Cannibalization Groups`,
        action: "Multiple pages compete for the same keywords, splitting your ranking power. Consolidate or differentiate these pages.",
        where: "Check the Cannibalization tab for affected pages.",
        estimatedImpact: "Resolving cannibalization can improve rankings by 2-5 positions for affected keywords.",
        details: "Either merge competing pages into one comprehensive piece, add canonical tags, or differentiate their target keywords.",
      });
    }

    // Pages needing internal links
    const noLinks = contentPages.filter(p => !p.suggested_internal_links || (Array.isArray(p.suggested_internal_links) && p.suggested_internal_links.length === 0));
    if (noLinks.length > 3) {
      recs.push({
        id: "internal-links",
        priority: "medium",
        category: "Internal Linking",
        icon: Lightbulb,
        item: `${noLinks.length} Pages Missing Internal Links`,
        action: "Run the internal link suggestion tool to find linking opportunities between your content pages.",
        where: "Go to the Internal Links tab and click 'Generate Suggestions'.",
        estimatedImpact: "Strong internal linking improves crawlability and can boost page authority by 10-20%.",
        details: "Internal links distribute page authority and help search engines understand your site's topical structure.",
      });
    }

    // Low word count pages
    contentPages.filter(p => p.word_count != null && p.word_count < 500 && p.status !== "archived").forEach((page) => {
      recs.push({
        id: `thin-${page.id}`,
        priority: "medium",
        category: "Thin Content",
        icon: FileText,
        item: page.title ?? page.url ?? "Untitled page",
        action: `This page has only ${page.word_count} words. Expand it to at least 1,000-1,500 words with comprehensive topic coverage.`,
        where: page.url ?? "Check your content inventory",
        estimatedImpact: "Pages with 1,000+ words rank significantly better for competitive keywords.",
        details: "Thin content often fails to satisfy search intent. Add sections addressing related questions, examples, and actionable advice.",
      });
    });

    // Draft briefs ready to write
    contentBriefs.filter(b => b.status === "ready" || b.status === "draft").forEach((brief) => {
      recs.push({
        id: `brief-${brief.id}`,
        priority: "low",
        category: "Content Creation",
        icon: Pencil,
        item: brief.topic ?? brief.target_keyword ?? "Untitled brief",
        action: `You have a content brief ready for "${brief.target_keyword}". Start writing to capture an estimated ${brief.estimated_traffic ?? "unknown"} monthly visits.`,
        where: "Go to the Briefs tab to view the full brief and start writing.",
        estimatedImpact: brief.estimated_traffic ? `Potential ${brief.estimated_traffic.toLocaleString()} monthly organic visits.` : "New content expands your keyword footprint.",
        details: `Target keyword: ${brief.target_keyword}, Difficulty: ${brief.difficulty ?? "N/A"}, Word target: ${brief.word_target ?? "1,500"}+.`,
      });
    });

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [contentPages, contentBriefs]);

  const strategyContent: StrategyContent = useMemo(() => ({
    title: "Content Optimization Strategy Guide",
    intro: "Great content is the foundation of SEO success. This guide helps you create, optimize, and maintain content that ranks well and drives organic traffic to your site.",
    cards: [
      {
        icon: FileText,
        iconColor: "text-editorial-red",
        title: "Content Quality",
        bullets: [
          { bold: "Comprehensive coverage", text: "Cover your topic thoroughly — aim for the best resource on the web for that query." },
          { bold: "Search intent match", text: "Ensure your content format matches what searchers actually want (guide, list, tool, etc.)." },
          { bold: "Regular updates", text: "Refresh content every 3-6 months to prevent decay and maintain rankings." },
        ],
      },
      {
        icon: Target,
        iconColor: "text-editorial-gold",
        title: "Content Strategy",
        bullets: [
          { bold: "Topic clusters", text: "Organize content into pillar pages and supporting articles for topical authority." },
          { bold: "Content calendar", text: "Plan content production around keyword opportunities and seasonal trends." },
          { bold: "Gap analysis", text: "Regularly identify topics your competitors cover that you don't." },
        ],
      },
      {
        icon: Lightbulb,
        iconColor: "text-editorial-green",
        title: "Technical Content SEO",
        bullets: [
          { bold: "Internal linking", text: "Every page should link to and from related content to distribute authority." },
          { bold: "Avoid cannibalization", text: "Ensure only one page targets each primary keyword to avoid splitting ranking power." },
          { bold: "Content pruning", text: "Remove or consolidate underperforming pages to improve overall site quality." },
        ],
      },
    ],
    steps: [
      { step: "1", title: "Audit Existing Content", desc: "Review your content inventory. Identify high-performers, underperformers, and gaps." },
      { step: "2", title: "Fix Decay & Cannibalization", desc: "Address decaying content first, then resolve any keyword cannibalization issues." },
      { step: "3", title: "Optimize Internal Links", desc: "Ensure every page links to related content. Use the suggestions tool for ideas." },
      { step: "4", title: "Create Content Briefs", desc: "Use keyword data to create detailed briefs for new content opportunities." },
      { step: "5", title: "Produce & Publish", desc: "Write content following your briefs. Aim for comprehensive, well-structured articles." },
      { step: "6", title: "Monitor & Refresh", desc: "Track performance monthly. Refresh content showing signs of decay before it drops." },
    ],
    dos: [
      { text: "Update your highest-traffic pages at least every 6 months to prevent decay." },
      { text: "Match content format to search intent (how-to, list, comparison, etc.)." },
      { text: "Build topic clusters with a pillar page linking to supporting articles." },
      { text: "Use the content calendar to maintain a consistent publishing schedule." },
      { text: "Add unique value — original data, expert quotes, or custom visuals." },
    ],
    donts: [
      { text: "Don't publish thin content under 500 words for competitive keywords." },
      { text: "Don't target the same keyword with multiple pages (causes cannibalization)." },
      { text: "Don't ignore content decay — it's easier to refresh than recover lost rankings." },
      { text: "Don't write content without a clear target keyword and search intent." },
      { text: "Don't forget to add internal links when publishing new content." },
    ],
    metrics: [
      { label: "Content Score", desc: "Overall quality score (0-100) based on depth, readability, and optimization. Aim for 80+.", color: "text-editorial-red" },
      { label: "Organic Traffic", desc: "Monthly visitors coming to this page from organic search results.", color: "text-editorial-gold" },
      { label: "Word Count", desc: "Total words on the page. Longer, comprehensive content tends to rank better for competitive terms.", color: "text-editorial-green" },
      { label: "Decay Risk", desc: "Likelihood that a page's rankings are declining. High-risk pages need immediate attention.", color: "text-ink" },
    ],
  }), []);

  if (hasNoData) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Content Intelligence</h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">Inventory, decay detection, AI-generated briefs, and editorial calendar</p>
          </div>
          {addContentDialog}
        </div>
        <EmptyState icon={FileText} title="No Content Pages Indexed Yet" description="Run a site audit to discover your content inventory, or add content pages manually." actionLabel="Run Site Audit" actionHref="/dashboard/site-audit" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Content Intelligence</h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">Inventory, decay detection, cannibalization, internal links, calendar &amp; briefs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={isActionRunning || isPending}
            onClick={() => {
              runAction(
                {
                  title: "Running Full Content Analysis",
                  description: "Scoring pages, detecting decay & cannibalization, discovering internal links, generating briefs & calendar...",
                  steps: [
                    "Scoring content pages",
                    "Detecting content decay",
                    "Checking cannibalization",
                    "Suggesting internal links",
                    "Generating content briefs",
                    "Generating calendar entries",
                  ],
                  estimatedDuration: 90,
                },
                async () => {
                  await scoreContentPages(projectId);
                  await detectContentDecay(projectId);
                  await detectCannibalization(projectId);
                  await suggestInternalLinks(projectId);
                  await generateContentBriefs(projectId);
                  await generateCalendarEntries(projectId);
                  return { message: "Full content analysis complete" };
                }
              );
            }}
          >
            <Zap size={14} />
            Generate All
          </Button>
          {addContentDialog}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory"><FileText size={12} className="mr-1.5" />Inventory</TabsTrigger>
          <TabsTrigger value="briefs"><Lightbulb size={12} className="mr-1.5" />Briefs</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar size={12} className="mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="decay"><TrendingDown size={12} className="mr-1.5" />Decay</TabsTrigger>
          <TabsTrigger value="cannibalization"><Copy size={12} className="mr-1.5" />Cannibalization</TabsTrigger>
          <TabsTrigger value="links"><Link2 size={12} className="mr-1.5" />Internal Links</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Guide</TabsTrigger>
        </TabsList>

        {/* ── Inventory Tab ── */}
        <TabsContent value="inventory">
          {contentPages.length === 0 ? (
            <EmptyState icon={FileText} title="No Content Pages" description="No content pages have been indexed for this project yet." actionLabel="Run Site Audit" actionHref="/dashboard/site-audit" />
          ) : (
            <>
              {!hasKeywords && (
                <div className="mb-3 flex items-center gap-2 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-2.5 text-sm text-editorial-gold">
                  <Target size={14} className="shrink-0" />
                  <span>Track keywords on the <a href="/dashboard/keywords" className="font-semibold underline underline-offset-2 hover:text-editorial-gold/80">Keywords</a> page to see estimated organic traffic.</span>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader<typeof invSortKey> label="Page" sortKey="title" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} />
                    <SortableHeader<typeof invSortKey> label="Score" sortKey="content_score" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} className="w-[140px]" />
                    <SortableHeader<typeof invSortKey> label="Est. Traffic" sortKey="organic_traffic" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} />
                    <SortableHeader<typeof invSortKey> label="Words" sortKey="word_count" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} />
                    <SortableHeader<typeof invSortKey> label="Updated" sortKey="updated_at" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} />
                    <SortableHeader<typeof invSortKey> label="Status" sortKey="status" currentSort={invSortKey} currentDir={invSortDir} onSort={invToggleSort} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invSort(contentPages, (row, key) => {
                    switch (key) {
                      case "title": return row.title ?? row.url ?? "";
                      case "content_score": return row.content_score ?? null;
                      case "organic_traffic": return row.organic_traffic ?? null;
                      case "word_count": return row.word_count ?? null;
                      case "updated_at": return row.last_modified ?? row.updated_at ?? null;
                      case "status": return row.status ?? "";
                      default: return null;
                    }
                  }).map((page) => {
                    const badge = statusBadge(page.status);
                    return (
                      <TableRow key={page.id}>
                        <TableCell className="max-w-[340px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate font-sans text-sm font-semibold text-ink">{page.title ?? "Untitled"}</span>
                            <span className="truncate font-mono text-[11px] text-ink-muted">{page.url ?? "---"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px]">
                          {page.content_score != null ? (
                            <div className="flex items-center gap-2">
                              <Progress value={page.content_score} color={scoreColor(page.content_score)} size="sm" className="w-16" />
                              <span className="font-mono text-xs tabular-nums text-ink-secondary">{page.content_score}</span>
                            </div>
                          ) : <span className="text-ink-muted">---</span>}
                        </TableCell>
                        <TableCell>{page.organic_traffic != null ? <span className="flex items-center gap-1">{page.organic_traffic.toLocaleString()}{page.traffic_source === "ga4" && <span className="text-[8px] font-bold uppercase tracking-wider text-editorial-green">GA4</span>}</span> : <span className="text-ink-muted text-[11px]" title={!hasKeywords ? "Track keywords to see traffic estimates" : "No rank data yet"}>{!hasKeywords ? "No keywords" : "—"}</span>}</TableCell>
                        <TableCell>{page.word_count != null ? page.word_count.toLocaleString() : "---"}</TableCell>
                        <TableCell className="font-mono text-xs text-ink-muted">{page.last_modified ? formatDate(page.last_modified, timezone) : page.updated_at ? formatDate(page.updated_at, timezone) : "---"}</TableCell>
                        <TableCell>
                          <select
                            value={page.status ?? "published"}
                            disabled={isPending}
                            onChange={(e) => { startTransition(async () => { await updateContentPageStatus(page.id, e.target.value); }); }}
                            className={`cursor-pointer border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors focus:outline-none ${
                              page.status === "published" ? "border-editorial-green/40 bg-editorial-green/5 text-editorial-green"
                                : page.status === "needs_update" ? "border-editorial-gold/40 bg-editorial-gold/5 text-editorial-gold"
                                  : "border-rule bg-surface-card text-ink-muted"
                            }`}
                          >
                            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </TableCell>
                        <TableCell>
                          <button type="button" title="Delete content page" disabled={isPending}
                            onClick={() => { if (!confirm(`Delete "${page.title || page.url}"?`)) return; startTransition(async () => { await deleteContentPage(page.id); }); }}
                            className="rounded p-1 text-ink-muted transition-colors hover:bg-editorial-red/10 hover:text-editorial-red disabled:opacity-40">
                            <Trash2 size={14} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="mt-3 text-[11px] text-ink-muted">Showing {contentPages.length} pages</p>
            </>
          )}
        </TabsContent>

        {/* ── Decay Detection Tab ── */}
        <TabsContent value="decay">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Detect pages losing traffic or relevance over time.</p>
            <Button variant="outline" size="sm" onClick={handleDetectDecay} disabled={isActionRunning}>
              <TrendingDown size={14} className="mr-1.5" />Run Decay Analysis
            </Button>
          </div>
          {decayPages.length === 0 ? (
            <EmptyState icon={TrendingDown} title="No Decay Detected" description="Run decay analysis to identify pages that may need refreshing." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader<typeof decaySortKey> label="Page" sortKey="title" currentSort={decaySortKey} currentDir={decaySortDir} onSort={decayToggleSort} />
                  <SortableHeader<typeof decaySortKey> label="Risk Level" sortKey="decay_risk" currentSort={decaySortKey} currentDir={decaySortDir} onSort={decayToggleSort} />
                  <SortableHeader<typeof decaySortKey> label="Est. Traffic" sortKey="organic_traffic" currentSort={decaySortKey} currentDir={decaySortDir} onSort={decayToggleSort} />
                  <SortableHeader<typeof decaySortKey> label="Last Updated" sortKey="updated_at" currentSort={decaySortKey} currentDir={decaySortDir} onSort={decayToggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {decaySort(decayPages, (row, key) => {
                  const riskOrder: Record<string, number> = { high: 3, medium: 2, low: 1, none: 0 };
                  switch (key) {
                    case "title": return row.title ?? row.url ?? "";
                    case "decay_risk": return riskOrder[row.decay_risk ?? "none"] ?? 0;
                    case "organic_traffic": return row.organic_traffic ?? null;
                    case "updated_at": return row.last_modified ?? row.updated_at ?? null;
                    default: return null;
                  }
                }).map((page) => {
                  const db = decayBadge(page.decay_risk);
                  return (
                    <TableRow key={page.id}>
                      <TableCell className="max-w-[340px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate font-sans text-sm font-semibold text-ink">{page.title ?? "Untitled"}</span>
                          <span className="truncate font-mono text-[11px] text-ink-muted">{page.url ?? "---"}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={db.variant}>{db.label}</Badge></TableCell>
                      <TableCell>{page.organic_traffic != null ? <span className="flex items-center gap-1">{page.organic_traffic.toLocaleString()}{page.traffic_source === "ga4" && <span className="text-[8px] font-bold uppercase tracking-wider text-editorial-green">GA4</span>}</span> : <span className="text-ink-muted text-[11px]" title={!hasKeywords ? "Track keywords to see traffic estimates" : "No rank data yet"}>{!hasKeywords ? "No keywords" : "—"}</span>}</TableCell>
                      <TableCell className="font-mono text-xs text-ink-muted">{page.last_modified ? formatDate(page.last_modified, timezone) : page.updated_at ? formatDate(page.updated_at, timezone) : "---"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* ── Cannibalization Tab ── */}
        <TabsContent value="cannibalization">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Detect pages competing for the same keywords.</p>
            <Button variant="outline" size="sm" onClick={handleDetectCannibalization} disabled={isActionRunning}>
              <Copy size={14} className="mr-1.5" />Detect Cannibalization
            </Button>
          </div>
          {cannibalGroups.size === 0 ? (
            <EmptyState icon={Copy} title="No Cannibalization Found" description="Run cannibalization detection to find pages competing for the same keywords." />
          ) : (
            <div className="flex flex-col gap-6">
              {Array.from(cannibalGroups.entries()).map(([group, pages]) => (
                <div key={group} className="border border-rule bg-surface-card p-4">
                  <h4 className="mb-3 font-sans text-xs font-bold uppercase tracking-[0.15em] text-editorial-red">
                    {group.replace("cannibal:", "Keyword: ")}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {pages.map((page) => (
                      <div key={page.id} className="flex items-center justify-between border-b border-rule pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="font-sans text-sm font-semibold text-ink">{page.title ?? "Untitled"}</span>
                          <span className="ml-2 font-mono text-[11px] text-ink-muted">{page.url}</span>
                        </div>
                        {page.content_score != null && <span className="font-mono text-xs text-ink-secondary">Score: {page.content_score}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Internal Links Tab ── */}
        <TabsContent value="links">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-secondary">AI-powered internal link suggestions between your content.</p>
            <Button variant="outline" size="sm" onClick={handleSuggestLinks} disabled={isActionRunning}>
              <Link2 size={14} className="mr-1.5" />Generate Suggestions
            </Button>
          </div>
          {pagesWithLinks.length === 0 ? (
            <EmptyState icon={Link2} title="No Link Suggestions Yet" description="Generate AI-powered internal link suggestions to improve your site structure." />
          ) : (
            <div className="flex flex-col gap-4">
              {pagesWithLinks.map((page) => (
                <div key={page.id} className="border border-rule bg-surface-card p-4">
                  <h4 className="mb-2 font-sans text-sm font-semibold text-ink">{page.title ?? page.url}</h4>
                  <p className="mb-3 font-mono text-[11px] text-ink-muted">{page.url}</p>
                  <div className="flex flex-col gap-2">
                    {page.suggested_internal_links!.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded bg-surface-cream/50 px-3 py-2 dark:bg-ink/10">
                        <Link2 size={12} className="shrink-0 text-editorial-green" />
                        <span className="font-sans text-sm text-ink">
                          Link to <span className="font-mono text-[11px] text-ink-muted">{link.target_url}</span>
                        </span>
                        <span className="ml-auto text-xs text-ink-secondary">anchor: &ldquo;{link.anchor_text}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <ChevronLeft size={16} />
              </button>
              <h3 className="min-w-[140px] text-center font-serif text-lg font-bold text-ink">
                {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                className="rounded p-1 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isActionRunning || isPending}
                onClick={() => {
                  runAction(
                    {
                      title: "Generating Calendar Entries",
                      description: "Creating editorial calendar entries from your content briefs...",
                      steps: ["Reading content briefs", "Planning publication dates", "Creating calendar entries"],
                      estimatedDuration: 15,
                    },
                    () => generateCalendarEntries(projectId)
                  );
                }}
              >
                <Calendar size={12} className="mr-1.5" />
                Generate Calendar
              </Button>
              {addCalendarDialog}
            </div>
          </div>
          {/* ── Month Grid ── */}
          {(() => {
            const year = calendarMonth.getFullYear();
            const month = calendarMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const todayStr = new Date().toISOString().slice(0, 10);
            const cells: (number | null)[] = [];
            for (let i = 0; i < firstDay; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);

            // Group entries by date for this month
            const entriesByDate = new Map<string, typeof calendarEntries>();
            for (const entry of calendarEntries) {
              if (!entry.target_date) continue;
              const d = entry.target_date as string;
              if (!entriesByDate.has(d)) entriesByDate.set(d, []);
              entriesByDate.get(d)!.push(entry);
            }

            const statusColor: Record<string, string> = {
              planned: "bg-ink-muted",
              in_progress: "bg-editorial-gold",
              review: "bg-blue-500",
              published: "bg-editorial-green",
              postponed: "bg-editorial-red",
            };

            return (
              <div className="mb-6 border border-rule">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 border-b border-rule bg-surface-raised">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {cells.map((day, i) => {
                    if (day === null) {
                      return <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-rule bg-surface-card/50" />;
                    }
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEntries = entriesByDate.get(dateStr) ?? [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDay;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={`relative min-h-[72px] border-b border-r border-rule p-1.5 text-left transition-colors hover:bg-surface-raised ${
                          isSelected ? "bg-editorial-red/5 ring-1 ring-inset ring-editorial-red/30" : ""
                        }`}
                      >
                        <span className={`inline-flex h-5 w-5 items-center justify-center text-[11px] font-mono ${
                          isToday ? "rounded-full bg-editorial-red text-white font-bold" : "text-ink-muted"
                        }`}>
                          {day}
                        </span>
                        {dayEntries.length > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {dayEntries.slice(0, 3).map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-center gap-1 truncate"
                                title={entry.title ?? "Untitled"}
                              >
                                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${statusColor[entry.status ?? "planned"] ?? statusColor.planned}`} />
                                <span className="truncate text-[9px] leading-tight text-ink-secondary">
                                  {entry.title ?? "Untitled"}
                                </span>
                              </div>
                            ))}
                            {dayEntries.length > 3 && (
                              <span className="text-[9px] text-ink-muted">+{dayEntries.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 border-t border-rule px-3 py-2">
                  {CALENDAR_STATUS_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${statusColor[opt.value] ?? statusColor.planned}`} />
                      <span className="text-[10px] text-ink-muted">{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Table View ── */}
          {selectedDay && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-ink-muted">
                Showing entries for <span className="font-mono font-bold text-ink">{selectedDay}</span>
              </span>
              <button type="button" onClick={() => setSelectedDay(null)} className="text-[10px] font-bold uppercase tracking-widest text-editorial-red hover:text-editorial-red/80">
                Clear filter
              </button>
            </div>
          )}
          {(() => {
            const filtered = selectedDay
              ? calendarEntries.filter((e) => e.target_date === selectedDay)
              : calendarEntries;

            if (filtered.length === 0 && calendarEntries.length === 0) {
              return <EmptyState icon={Calendar} title="Empty Editorial Calendar" description="Generate entries from your content briefs or add them manually." />;
            }
            if (filtered.length === 0 && selectedDay) {
              return <p className="py-6 text-center text-sm text-ink-muted">No entries scheduled for this date.</p>;
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader<typeof calSortKey> label="Title" sortKey="title" currentSort={calSortKey} currentDir={calSortDir} onSort={calToggleSort} />
                    <SortableHeader<typeof calSortKey> label="Target Keyword" sortKey="target_keyword" currentSort={calSortKey} currentDir={calSortDir} onSort={calToggleSort} />
                    <SortableHeader<typeof calSortKey> label="Date" sortKey="target_date" currentSort={calSortKey} currentDir={calSortDir} onSort={calToggleSort} />
                    <SortableHeader<typeof calSortKey> label="Status" sortKey="status" currentSort={calSortKey} currentDir={calSortDir} onSort={calToggleSort} />
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calSort(filtered, (row, key) => {
                    switch (key) {
                      case "title": return row.title ?? "";
                      case "target_keyword": return row.target_keyword ?? "";
                      case "target_date": return row.target_date ?? "";
                      case "status": return row.status ?? "";
                      default: return null;
                    }
                  }).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-sans text-sm font-semibold text-ink">{entry.title ?? "Untitled"}</TableCell>
                      <TableCell className="font-mono text-xs text-ink-secondary">{entry.target_keyword ?? "---"}</TableCell>
                      <TableCell className="font-mono text-xs text-ink-muted">{entry.target_date ?? "---"}</TableCell>
                      <TableCell>
                        <select
                          value={entry.status ?? "planned"}
                          disabled={isPending}
                          onChange={(e) => { startTransition(async () => { await updateCalendarEntryStatus(entry.id, e.target.value); }); }}
                          className={`cursor-pointer border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors focus:outline-none ${
                            entry.status === "published" ? "border-editorial-green/40 bg-editorial-green/5 text-editorial-green"
                              : entry.status === "in_progress" ? "border-editorial-gold/40 bg-editorial-gold/5 text-editorial-gold"
                                : "border-rule bg-surface-card text-ink-muted"
                          }`}
                        >
                          {CALENDAR_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-ink-muted">{entry.notes ?? "---"}</TableCell>
                      <TableCell>
                        <button type="button" title="Delete entry" disabled={isPending}
                          onClick={() => { if (!confirm(`Delete "${entry.title}"?`)) return; startTransition(async () => { await deleteCalendarEntry(entry.id); }); }}
                          className="rounded p-1 text-ink-muted transition-colors hover:bg-editorial-red/10 hover:text-editorial-red disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </TabsContent>

        {/* ── Briefs Tab ── */}
        <TabsContent value="briefs">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-sans text-sm text-ink-secondary">AI-generated content briefs based on your tracked keywords.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isActionRunning}
              onClick={() => {
                runAction(
                  {
                    title: "Generating Content Briefs",
                    description: "Creating AI-powered content recommendations from your keywords...",
                    steps: ["Analyzing keyword gaps", "Researching content topics", "Building brief outlines", "Generating recommendations", "Finalizing briefs"],
                    estimatedDuration: 20,
                  },
                  () => generateContentBriefs(projectId)
                );
              }}
            >
              <Lightbulb size={12} className="mr-1.5" />
              Generate Briefs
            </Button>
          </div>
          {contentBriefs.length === 0 ? (
            <EmptyState icon={Lightbulb} title="No Content Briefs" description="Click 'Generate Briefs' to create AI-powered content recommendations from your tracked keywords." />
          ) : (
            <div className="flex flex-col gap-0">
              {contentBriefs.map((brief, i) => {
                const isExpanded = expandedBriefId === brief.id;
                const titleSuggestions = (brief as Record<string, unknown>).title_suggestions as string[] | undefined;
                const outline = (brief as Record<string, unknown>).outline as string[] | undefined;
                const serpIntent = (brief as Record<string, unknown>).serp_intent as string | undefined;
                const targetWordCount = ((brief as Record<string, unknown>).target_word_count as number | null) ?? brief.word_target;
                return (
                  <div key={brief.id} className={`${i < contentBriefs.length - 1 ? "border-b border-rule" : ""}`}>
                    <div className="flex items-start gap-4 py-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-[15px] font-bold text-ink">{brief.target_keyword ?? brief.topic ?? "Untitled Brief"}</h4>
                          {brief.status === "generating" && <Badge variant="info">Generating</Badge>}
                          {brief.status === "draft" && <Badge variant="muted">Draft</Badge>}
                          {brief.status === "ready" && <Badge variant="success">Ready</Badge>}
                          {brief.status === "in_progress" && <Badge variant="warning">In Progress</Badge>}
                          {brief.status === "published" && <Badge variant="success">Published</Badge>}
                          {brief.status === "archived" && <Badge variant="muted">Archived</Badge>}
                        </div>
                        <div className="mt-2 flex items-center gap-4 flex-wrap">
                          {brief.target_keyword && <span className="flex items-center gap-1 text-[11px] text-ink-secondary"><Target size={10} /><span className="font-mono">{brief.target_keyword}</span></span>}
                          {brief.estimated_traffic != null && <span className="font-mono text-[11px] text-ink-secondary">Est. {brief.estimated_traffic.toLocaleString()}/mo</span>}
                          {brief.difficulty != null && <span className="font-mono text-[11px] text-ink-secondary">Difficulty: {brief.difficulty}</span>}
                          {targetWordCount != null && <span className="font-mono text-[11px] text-ink-secondary">Target: {targetWordCount.toLocaleString()} words</span>}
                          {serpIntent && <span className="font-mono text-[11px] text-ink-secondary capitalize">Intent: {serpIntent}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExpandedBriefId(isExpanded ? null : brief.id)}>
                          <Pencil size={12} />{isExpanded ? "Close" : "Edit"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setExpandedBriefId(isExpanded ? null : brief.id)}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="mb-4 border border-rule bg-surface-raised p-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          {/* Title Suggestions */}
                          {titleSuggestions && titleSuggestions.length > 0 && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title Suggestions</span>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {titleSuggestions.map((title, ti) => (
                                  <li key={ti} className="flex items-start gap-2 text-[12px] text-ink-secondary">
                                    <span className="shrink-0 font-bold text-editorial-red">{ti + 1}.</span>
                                    {title}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Outline */}
                          {outline && Array.isArray(outline) && outline.length > 0 && (
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Content Outline</span>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {outline.map((section, si) => (
                                  <li key={si} className="flex items-start gap-2 text-[12px] text-ink-secondary">
                                    <span className="shrink-0 font-bold text-editorial-gold">H{si + 1}.</span>
                                    {typeof section === "string" ? section : String(section)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Status + Actions */}
                        <div className="mt-4 flex items-center gap-3 border-t border-rule pt-4">
                          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Status</span>
                          <select
                            value={brief.status ?? "draft"}
                            onChange={(e) => {
                              startTransition(async () => {
                                await updateContentBrief(brief.id, { status: e.target.value });
                              });
                            }}
                            className="border border-rule bg-surface-card px-2 py-1 font-sans text-[12px] text-ink focus:border-editorial-red focus:outline-none"
                          >
                            <option value="draft">Draft</option>
                            <option value="in_progress">In Progress</option>
                            <option value="published">Published</option>
                            <option value="archived">Archived</option>
                          </select>
                          <div className="flex-1" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!confirm(`Delete brief "${brief.target_keyword ?? brief.topic}"?`)) return;
                              startTransition(async () => {
                                await deleteContentBrief(brief.id);
                                setExpandedBriefId(null);
                              });
                            }}
                            disabled={isPending}
                            className="text-editorial-red hover:bg-editorial-red/10"
                          >
                            <Trash2 size={12} />Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsTab
            recommendations={recommendations}
            itemLabel="page"
            emptyMessage="Add content pages to generate personalized content optimization recommendations."
          />
        </TabsContent>

        <TabsContent value="strategy">
          <StrategyGuideTab content={strategyContent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
