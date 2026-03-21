"use client";

import { useState, useTransition } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";
import {
  FileText,
  Lightbulb,
  ExternalLink,
  Plus,
  ChevronRight,
  Target,
  Pencil,
  Trash2,
  TrendingDown,
  Copy,
  Link2,
  Calendar,
  Loader2,
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
import {
  addContentPage,
  deleteContentPage,
  updateContentPageStatus,
  detectContentDecay,
  detectCannibalization,
  suggestInternalLinks,
  addCalendarEntry,
  updateCalendarEntryStatus,
  deleteCalendarEntry,
  generateContentBriefs,
  generateCalendarEntries,
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
  const [decayMsg, setDecayMsg] = useState<string | null>(null);
  const [cannibalMsg, setCannibalMsg] = useState<string | null>(null);
  const [linksMsg, setLinksMsg] = useState<string | null>(null);
  const [briefsMsg, setBriefsMsg] = useState<string | null>(null);
  const [isRunningDecay, setIsRunningDecay] = useState(false);
  const [isRunningCannibal, setIsRunningCannibal] = useState(false);
  const [isRunningLinks, setIsRunningLinks] = useState(false);
  const [isRunningBriefs, setIsRunningBriefs] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [calendarGenMsg, setCalendarGenMsg] = useState<string | null>(null);

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

  async function handleDetectDecay() {
    setIsRunningDecay(true);
    setDecayMsg(null);
    const result = await detectContentDecay(projectId);
    if ("error" in result) setDecayMsg(`Error: ${result.error}`);
    else setDecayMsg(`Analysis complete — ${result.atRisk} page(s) at risk of decay.`);
    setIsRunningDecay(false);
  }

  async function handleDetectCannibalization() {
    setIsRunningCannibal(true);
    setCannibalMsg(null);
    const result = await detectCannibalization(projectId);
    if ("error" in result) setCannibalMsg(`Error: ${result.error}`);
    else setCannibalMsg(`Found ${result.groups} cannibalization group(s).`);
    setIsRunningCannibal(false);
  }

  async function handleSuggestLinks() {
    setIsRunningLinks(true);
    setLinksMsg(null);
    const result = await suggestInternalLinks(projectId);
    if ("error" in result) setLinksMsg(`Error: ${result.error}`);
    else setLinksMsg(`Generated ${result.suggestions} internal link suggestion(s).`);
    setIsRunningLinks(false);
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
        {addContentDialog}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory"><FileText size={12} className="mr-1.5" />Inventory</TabsTrigger>
          <TabsTrigger value="decay"><TrendingDown size={12} className="mr-1.5" />Decay</TabsTrigger>
          <TabsTrigger value="cannibalization"><Copy size={12} className="mr-1.5" />Cannibalization</TabsTrigger>
          <TabsTrigger value="links"><Link2 size={12} className="mr-1.5" />Internal Links</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar size={12} className="mr-1.5" />Calendar</TabsTrigger>
          <TabsTrigger value="briefs"><Lightbulb size={12} className="mr-1.5" />Briefs</TabsTrigger>
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
                    <TableHead>Page</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Est. Traffic</TableHead>
                    <TableHead>Words</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contentPages.map((page) => {
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
                        <TableCell>{page.organic_traffic != null ? page.organic_traffic.toLocaleString() : <span className="text-ink-muted text-[11px]" title={!hasKeywords ? "Track keywords to see traffic estimates" : "No rank data yet"}>{!hasKeywords ? "No keywords" : "—"}</span>}</TableCell>
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
            <Button variant="outline" size="sm" onClick={handleDetectDecay} disabled={isRunningDecay}>
              {isRunningDecay ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Analyzing...</> : <><TrendingDown size={14} className="mr-1.5" />Run Decay Analysis</>}
            </Button>
          </div>
          {decayMsg && <div className="mb-4 border border-rule bg-surface-card px-4 py-3 text-sm text-ink">{decayMsg}</div>}
          {decayPages.length === 0 ? (
            <EmptyState icon={TrendingDown} title="No Decay Detected" description="Run decay analysis to identify pages that may need refreshing." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Est. Traffic</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decayPages.map((page) => {
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
                      <TableCell>{page.organic_traffic != null ? page.organic_traffic.toLocaleString() : <span className="text-ink-muted text-[11px]" title={!hasKeywords ? "Track keywords to see traffic estimates" : "No rank data yet"}>{!hasKeywords ? "No keywords" : "—"}</span>}</TableCell>
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
            <Button variant="outline" size="sm" onClick={handleDetectCannibalization} disabled={isRunningCannibal}>
              {isRunningCannibal ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Analyzing...</> : <><Copy size={14} className="mr-1.5" />Detect Cannibalization</>}
            </Button>
          </div>
          {cannibalMsg && <div className="mb-4 border border-rule bg-surface-card px-4 py-3 text-sm text-ink">{cannibalMsg}</div>}
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
            <Button variant="outline" size="sm" onClick={handleSuggestLinks} disabled={isRunningLinks}>
              {isRunningLinks ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Generating...</> : <><Link2 size={14} className="mr-1.5" />Generate Suggestions</>}
            </Button>
          </div>
          {linksMsg && <div className="mb-4 border border-rule bg-surface-card px-4 py-3 text-sm text-ink">{linksMsg}</div>}
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
            <p className="text-sm text-ink-secondary">Plan and schedule your content pipeline.</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isGeneratingCalendar || isPending}
                onClick={() => {
                  setIsGeneratingCalendar(true);
                  setCalendarGenMsg(null);
                  startTransition(async () => {
                    const r = await generateCalendarEntries(projectId);
                    setCalendarGenMsg("error" in r ? r.error : `Generated ${r.generated} calendar entries from your content briefs.`);
                    setIsGeneratingCalendar(false);
                  });
                }}
              >
                {isGeneratingCalendar ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Calendar size={12} className="mr-1.5" />}
                Generate Calendar
              </Button>
              {addCalendarDialog}
            </div>
          </div>
          {calendarGenMsg && <div className="mb-3 border border-rule bg-surface-raised px-3 py-2 text-[12px] text-ink-secondary">{calendarGenMsg}</div>}
          {calendarEntries.length === 0 ? (
            <EmptyState icon={Calendar} title="Empty Editorial Calendar" description="Generate entries from your content briefs or add them manually." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Target Keyword</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendarEntries.map((entry) => (
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
          )}
        </TabsContent>

        {/* ── Briefs Tab ── */}
        <TabsContent value="briefs">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-sans text-sm text-ink-secondary">AI-generated content briefs based on your tracked keywords.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={isRunningBriefs}
              onClick={() => {
                setIsRunningBriefs(true);
                setBriefsMsg(null);
                startTransition(async () => {
                  const r = await generateContentBriefs(projectId);
                  setBriefsMsg("error" in r ? `Error: ${r.error}` : `Generated ${r.generated} brief(s).`);
                  setIsRunningBriefs(false);
                });
              }}
            >
              {isRunningBriefs ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Lightbulb size={12} className="mr-1.5" />}
              Generate Briefs
            </Button>
          </div>
          {briefsMsg && <div className="mb-3 border border-rule bg-surface-raised px-3 py-2 text-[12px] text-ink-secondary">{briefsMsg}</div>}
          {contentBriefs.length === 0 && !briefsMsg ? (
            <EmptyState icon={Lightbulb} title="No Content Briefs" description="Click 'Generate Briefs' to create AI-powered content recommendations from your tracked keywords." />
          ) : contentBriefs.length === 0 ? null : (
            <div className="flex flex-col gap-0">
              {contentBriefs.map((brief, i) => (
                <div key={brief.id} className={`flex items-start gap-4 py-4 ${i < contentBriefs.length - 1 ? "border-b border-rule" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-[15px] font-bold text-ink">{brief.target_keyword ?? brief.topic ?? "Untitled Brief"}</h4>
                      {brief.status === "generating" && <Badge variant="info">Generating</Badge>}
                      {brief.status === "draft" && <Badge variant="muted">Draft</Badge>}
                      {brief.status === "ready" && <Badge variant="success">Ready</Badge>}
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      {brief.target_keyword && <span className="flex items-center gap-1 text-[11px] text-ink-secondary"><Target size={10} /><span className="font-mono">{brief.target_keyword}</span></span>}
                      {brief.estimated_traffic != null && <span className="font-mono text-[11px] text-ink-secondary">Est. {brief.estimated_traffic.toLocaleString()}/mo</span>}
                      {brief.difficulty != null && <span className="font-mono text-[11px] text-ink-secondary">Difficulty: {brief.difficulty}</span>}
                      {brief.word_target != null && <span className="font-mono text-[11px] text-ink-secondary">Target: {brief.word_target.toLocaleString()} words</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><Pencil size={12} />Edit</Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ChevronRight size={14} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
