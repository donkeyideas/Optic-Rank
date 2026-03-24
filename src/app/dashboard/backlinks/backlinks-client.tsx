"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Shield,
  ShieldOff,
  Unlink,
  Calendar,
  Mail,
  FileText,
  Ban,
  Radar,
  Plus,
  Target,
  BarChart3,
  Lightbulb,
  Zap,
  Eye,
  Globe,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";

import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { disavowBacklink, reclaimBacklink, discoverBacklinks, addBacklinkFromUrl } from "@/lib/actions/backlinks";
import { useActionProgress } from "@/components/shared/action-progress";
import { RecommendationsTab, StrategyGuideTab } from "@/components/shared/page-guide";
import type { Recommendation, StrategyContent } from "@/components/shared/page-guide";
import type { Backlink } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface BacklinksPageClientProps {
  projectId: string;
  backlinks: Backlink[];
  totalCount: number;
  stats: {
    total: number;
    referringDomains: number;
    dofollowPct: number;
    toxicCount: number;
    newCount: number;
    lostCount: number;
  };
}

/* ------------------------------------------------------------------
   Helper functions
   ------------------------------------------------------------------ */

function getLinkTypeBadgeVariant(type: Backlink["link_type"]) {
  switch (type) {
    case "dofollow":
      return "success";
    case "nofollow":
      return "muted";
    case "ugc":
      return "info";
    case "sponsored":
      return "warning";
    default:
      return "muted";
  }
}

function getStatusBadgeVariant(status: Backlink["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "new":
      return "info";
    case "lost":
      return "danger";
    default:
      return "muted";
  }
}

function truncateUrl(url: string, maxLength = 50): string {
  const clean = url.replace(/^https?:\/\//, "");
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength) + "...";
}

function formatBacklinkDate(isoDate: string, timezone: string): string {
  return formatDate(isoDate, timezone);
}

/* ------------------------------------------------------------------
   Backlinks Page Client Component
   ------------------------------------------------------------------ */

export function BacklinksPageClient({
  projectId,
  backlinks,
  totalCount,
  stats,
}: BacklinksPageClientProps) {
  const timezone = useTimezone();
  const [searchQuery, setSearchQuery] = useState("");
  const [linkTypeFilter, setLinkTypeFilter] = useState<
    "all" | Backlink["link_type"]
  >("all");
  const [sortBy, setSortBy] = useState<"da" | "first_seen" | "trust_flow">(
    "first_seen"
  );
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [addUrlValue, setAddUrlValue] = useState("");
  const [addUrlError, setAddUrlError] = useState<string | null>(null);

  function handleDisavow(id: string) {
    setActionError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await disavowBacklink(id);
      if ("error" in result) {
        setActionError(result.error);
      }
      setPendingId(null);
    });
  }

  function handleReclaim(id: string) {
    setActionError(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await reclaimBacklink(id);
      if ("error" in result) {
        setActionError(result.error);
      }
      setPendingId(null);
    });
  }

  function handleDiscover() {
    setActionError(null);
    runAction(
      {
        title: "Discovering Backlinks",
        description: "Crawling the web to find sites linking to you...",
        steps: ["Crawling target URLs", "Extracting link data", "Analyzing link quality", "Scoring domain authority", "Compiling results"],
        estimatedDuration: 30,
      },
      () => discoverBacklinks(projectId)
    );
  }

  function handleAddUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrlValue.trim()) return;
    setAddUrlError(null);
    startTransition(async () => {
      const result = await addBacklinkFromUrl(projectId, addUrlValue.trim());
      if ("error" in result) {
        setAddUrlError(result.error);
      } else {
        setShowAddUrl(false);
        setAddUrlValue("");
      }
    });
  }

  function handleExportDisavow() {
    // Generate a disavow file from all toxic backlinks
    const lines = toxicBacklinks.map(
      (bl) => `domain:${bl.source_domain}`
    );
    const content = `# Disavow file generated by RankPulse AI\n# Date: ${new Date().toISOString()}\n# Toxic backlinks: ${toxicBacklinks.length}\n\n${lines.join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "disavow.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Client-side filtering of server-fetched data
  const filteredBacklinks = backlinks
    .filter((bl) => {
      const matchesSearch =
        bl.source_domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bl.anchor_text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        linkTypeFilter === "all" || bl.link_type === linkTypeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "da")
        return (b.domain_authority ?? 0) - (a.domain_authority ?? 0);
      if (sortBy === "trust_flow")
        return (b.trust_flow ?? 0) - (a.trust_flow ?? 0);
      return (
        new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime()
      );
    });

  const newBacklinks = backlinks.filter((bl) => bl.status === "new");
  const lostBacklinks = backlinks.filter((bl) => bl.status === "lost");
  const toxicBacklinks = backlinks.filter((bl) => bl.is_toxic);

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Toxic backlinks to disavow
    if (stats.toxicCount > 0) {
      recs.push({
        id: "toxic-disavow",
        priority: "high",
        category: "Toxic Links",
        icon: ShieldOff,
        item: `${stats.toxicCount} Toxic Backlinks`,
        action: "Review and disavow toxic backlinks to protect your site from Google penalties. Export the disavow file and submit to Google Search Console.",
        where: "Go to the 'Toxic' tab, review each link, then click 'Export Disavow File'.",
        estimatedImpact: "Removing toxic links can prevent ranking drops of 10-30% that come with manual or algorithmic penalties.",
        details: "Focus on links with high CF/TF ratio (spam signals). Not all 'toxic' links need disavowing — only those clearly manipulative.",
      });
    }

    // Lost backlinks to reclaim
    if (stats.lostCount > 0) {
      recs.push({
        id: "reclaim-lost",
        priority: "high",
        category: "Link Reclamation",
        icon: Unlink,
        item: `${stats.lostCount} Lost Backlinks`,
        action: "Reach out to site owners to reclaim lost backlinks. Many lost links are due to page moves or accidental removal.",
        where: "Go to the 'Lost' tab and click 'Reclaim' on high-value links.",
        estimatedImpact: "Reclaiming just 20-30% of lost high-DA links can recover significant ranking power.",
        details: "Prioritize lost links from high-authority domains. Send a polite email explaining the broken link and suggesting your updated URL.",
      });
    }

    // Low dofollow percentage
    if (stats.dofollowPct < 60) {
      recs.push({
        id: "dofollow-ratio",
        priority: "medium",
        category: "Link Quality",
        icon: Shield,
        item: `Dofollow Rate: ${stats.dofollowPct}%`,
        action: "Your dofollow link ratio is below average. Focus on earning editorial dofollow links through content marketing and outreach.",
        where: "Prioritize guest posting, digital PR, and creating linkable assets (studies, tools, infographics).",
        estimatedImpact: "Increasing dofollow links by 20% can improve rankings for competitive keywords.",
        details: "A healthy backlink profile typically has 60-80% dofollow links. Focus on quality over quantity.",
      });
    }

    // Low referring domains relative to total backlinks
    if (stats.referringDomains > 0 && stats.total / stats.referringDomains > 10) {
      recs.push({
        id: "domain-diversity",
        priority: "medium",
        category: "Link Diversity",
        icon: Globe,
        item: "Low Domain Diversity",
        action: `You have ${stats.total.toLocaleString()} backlinks from only ${stats.referringDomains.toLocaleString()} domains. Diversify your link sources for a more natural profile.`,
        where: "Target new referring domains through outreach to industry blogs, news sites, and resource pages.",
        estimatedImpact: "Google values links from diverse domains more than multiple links from the same domain.",
        details: "Each new referring domain is more valuable than additional links from existing referrers. Aim for breadth.",
      });
    }

    // New backlinks — verify quality
    if (stats.newCount > 5) {
      recs.push({
        id: "verify-new",
        priority: "low",
        category: "Link Monitoring",
        icon: Eye,
        item: `${stats.newCount} New Backlinks`,
        action: "Review newly discovered backlinks for quality. Flag any suspicious or spammy links for potential disavow.",
        where: "Check the 'New' tab to review recent acquisitions.",
        estimatedImpact: "Early detection of spammy links prevents future penalty risk.",
        details: "Monitor new links weekly. Look for patterns like sudden spikes from low-quality domains, which may indicate negative SEO.",
      });
    }

    // General — need more backlinks
    if (stats.total < 100) {
      recs.push({
        id: "build-links",
        priority: "high",
        category: "Link Building",
        icon: TrendingUp,
        item: "Backlink Profile Needs Growth",
        action: "Your site has fewer than 100 backlinks. Implement a consistent link-building strategy to improve domain authority.",
        where: "Start with creating linkable assets, then do outreach to industry publications and resource pages.",
        estimatedImpact: "Growing from <100 to 500+ quality backlinks can double or triple organic traffic within 6-12 months.",
        details: "Focus on quality: one link from a DA 60+ site is worth more than 100 links from DA 10 sites.",
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [backlinks, stats]);

  const strategyContent: StrategyContent = useMemo(() => ({
    title: "Backlink Strategy Guide",
    intro: "Backlinks remain one of the strongest ranking factors in SEO. This guide helps you build a healthy, diverse backlink profile while protecting your site from harmful links.",
    cards: [
      {
        icon: TrendingUp,
        iconColor: "text-editorial-red",
        title: "Link Building",
        bullets: [
          { bold: "Create linkable assets", text: "Original research, tools, infographics, and comprehensive guides naturally attract backlinks." },
          { bold: "Guest posting", text: "Write high-quality articles for industry publications with contextual backlinks." },
          { bold: "Digital PR", text: "Get coverage from news sites and blogs through newsworthy content and expert commentary." },
        ],
      },
      {
        icon: Shield,
        iconColor: "text-editorial-gold",
        title: "Link Quality",
        bullets: [
          { bold: "Domain authority matters", text: "One link from a DA 70+ site outweighs dozens from DA 10 sites." },
          { bold: "Relevance is key", text: "Links from sites in your industry carry more weight than random links." },
          { bold: "Natural anchor text", text: "Vary your anchor text — avoid over-optimizing with exact-match keywords." },
        ],
      },
      {
        icon: AlertTriangle,
        iconColor: "text-editorial-green",
        title: "Link Protection",
        bullets: [
          { bold: "Monitor new links", text: "Review new backlinks weekly to catch spammy links early." },
          { bold: "Disavow toxic links", text: "Submit a disavow file to Google for clearly manipulative backlinks." },
          { bold: "Reclaim lost links", text: "Reach out to recover valuable links that have been removed or broken." },
        ],
      },
    ],
    steps: [
      { step: "1", title: "Audit Current Profile", desc: "Review your existing backlinks. Identify high-value links, toxic links, and gaps." },
      { step: "2", title: "Disavow Toxic Links", desc: "Export and submit a disavow file for clearly spammy or manipulative backlinks." },
      { step: "3", title: "Reclaim Lost Links", desc: "Contact site owners about recently lost backlinks — many can be recovered." },
      { step: "4", title: "Analyze Competitors", desc: "Find where competitors get their links. Target the same sources." },
      { step: "5", title: "Create Linkable Assets", desc: "Publish original research, tools, or comprehensive guides that naturally earn links." },
      { step: "6", title: "Outreach & Monitor", desc: "Reach out to prospects weekly. Monitor your profile monthly for new opportunities and risks." },
    ],
    dos: [
      { text: "Earn links through genuinely valuable content that people want to reference." },
      { text: "Diversify your link sources — aim for many different referring domains." },
      { text: "Monitor your backlink profile weekly for new toxic or lost links." },
      { text: "Prioritize links from high-authority, relevant sites in your industry." },
      { text: "Use varied, natural anchor text in your backlink strategy." },
    ],
    donts: [
      { text: "Don't buy backlinks from link farms or PBNs — Google penalizes this heavily." },
      { text: "Don't over-optimize anchor text with exact-match keywords." },
      { text: "Don't ignore toxic backlinks — they can trigger manual penalties." },
      { text: "Don't focus only on quantity — a few high-quality links beat hundreds of low-quality ones." },
      { text: "Don't let lost backlinks go unnoticed — set up regular monitoring." },
    ],
    metrics: [
      { label: "Total Backlinks", desc: "The total number of inbound links pointing to your site from external sources.", color: "text-editorial-red" },
      { label: "Referring Domains", desc: "Unique domains linking to you. More important than total link count for SEO.", color: "text-editorial-gold" },
      { label: "Dofollow %", desc: "Percentage of links passing ranking authority. A healthy profile has 60-80% dofollow.", color: "text-editorial-green" },
      { label: "Toxic Links", desc: "Potentially harmful backlinks that could trigger Google penalties. Should be disavowed.", color: "text-ink" },
    ],
  }), []);

  const headlineStats = [
    {
      label: "Total Backlinks",
      value: stats.total.toLocaleString(),
      delta: stats.total > 0 ? "Monitored" : "None yet",
      direction: stats.total > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Referring Domains",
      value: stats.referringDomains.toLocaleString(),
      delta:
        stats.referringDomains > 0 ? "Unique domains" : "None yet",
      direction:
        stats.referringDomains > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Dofollow %",
      value: `${stats.dofollowPct}%`,
      delta: stats.total > 0 ? "Of total links" : "No data",
      direction: "neutral" as const,
    },
    {
      label: "Toxic Links",
      value: String(stats.toxicCount),
      delta:
        stats.total > 0
          ? `${((stats.toxicCount / Math.max(stats.total, 1)) * 100).toFixed(1)}% of total`
          : "None detected",
      direction: stats.toxicCount > 0 ? ("down" as const) : ("neutral" as const),
    },
    {
      label: "New This Period",
      value: String(stats.newCount),
      delta: stats.newCount > 0 ? "Recently discovered" : "None new",
      direction: stats.newCount > 0 ? ("up" as const) : ("neutral" as const),
    },
  ];

  // Add URL dialog (shared between empty and full states)
  const addUrlDialog = (
    <Dialog open={showAddUrl} onOpenChange={setShowAddUrl}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Backlink URL</DialogTitle>
          <DialogDescription>
            Enter the URL of a page that links to your site. We&apos;ll crawl it and verify the backlink.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddUrl} className="flex flex-col gap-4 p-5">
          <Input
            placeholder="https://example.com/page-linking-to-you"
            value={addUrlValue}
            onChange={(e) => setAddUrlValue(e.target.value)}
            required
          />
          {addUrlError && (
            <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
              {addUrlError}
            </div>
          )}
          <DialogFooter className="border-t-0 px-0 pb-0">
            <Button type="button" variant="secondary" size="md" onClick={() => setShowAddUrl(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={isPending}>
              Crawl &amp; Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  // True empty state: no backlinks at all
  if (backlinks.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col gap-6">
        <HeadlineBar stats={headlineStats} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-rule pb-3">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              Backlink Intelligence
            </h1>
            <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
              Monitor, Analyze &amp; Build Your Link Profile
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddUrl(true)}>
              <Plus size={14} /> Add URL
            </Button>
            <Button variant="primary" size="sm" onClick={handleDiscover} disabled={isActionRunning || isPending}>
              <Radar size={14} />
              Discover Backlinks
            </Button>
          </div>
        </div>

        {actionError && (
          <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-2 text-sm text-editorial-red">
            {actionError}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
            <h2 className="font-serif text-xl font-bold text-ink">
              No Backlinks Discovered Yet
            </h2>
            <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
              Click &quot;Discover Backlinks&quot; to crawl the web and find sites linking to you.
              <br />
              You can also manually add URLs of pages you know link to your site.
            </p>
          </div>
        </div>

        {addUrlDialog}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats Bar */}
      <HeadlineBar stats={headlineStats} />

      {actionError && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-rule pb-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            Backlink Intelligence
          </h1>
          <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
            Monitor, Analyze &amp; Build Your Link Profile
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddUrl(true)}>
            <Plus size={14} /> Add URL
          </Button>
          <Button variant="primary" size="sm" onClick={handleDiscover} disabled={isActionRunning || isPending}>
            <Radar size={14} />
            Discover Backlinks
          </Button>
        </div>
      </div>

      {addUrlDialog}

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Backlinks</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
          <TabsTrigger value="toxic">Toxic</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Guide</TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB: All Backlinks
            ============================================================ */}
        <TabsContent value="all">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center border-b border-rule pb-4">
            <Input
              placeholder="Search by domain or anchor text..."
              prefixIcon={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-full sm:w-auto sm:flex-1 sm:min-w-[260px]"
            />

            {/* Link Type Filter */}
            <div className="flex items-center border border-rule overflow-x-auto scrollbar-none">
              {(
                ["all", "dofollow", "nofollow", "ugc", "sponsored"] as const
              ).map((type, idx) => (
                <button
                  key={type}
                  onClick={() => setLinkTypeFilter(type)}
                  className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                    idx > 0 ? "border-l border-rule" : ""
                  } ${
                    linkTypeFilter === type
                      ? "bg-ink text-surface-cream"
                      : "bg-surface-card text-ink-muted hover:text-ink"
                  }`}
                >
                  {type === "all" ? "All Types" : type}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center border border-rule">
              <span className="bg-surface-raised px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                Sort
              </span>
              {(["first_seen", "da", "trust_flow"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`border-l border-rule px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                    sortBy === s
                      ? "bg-ink text-surface-cream"
                      : "bg-surface-card text-ink-muted hover:text-ink"
                  }`}
                >
                  {s === "first_seen" ? "Newest" : s === "da" ? "DA" : "Trust"}
                </button>
              ))}
            </div>
          </div>

          {/* Backlinks Table */}
          {filteredBacklinks.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Source URL</TableHead>
                    <TableHead className="min-w-[140px]">
                      Target Page
                    </TableHead>
                    <TableHead className="min-w-[160px]">
                      Anchor Text
                    </TableHead>
                    <TableHead className="w-[60px]">DA</TableHead>
                    <TableHead className="w-[60px]">TF</TableHead>
                    <TableHead className="w-[60px]">CF</TableHead>
                    <TableHead className="w-[100px]">Link Type</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[100px]">First Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBacklinks.map((bl) => (
                    <TableRow key={bl.id}>
                      {/* Source URL */}
                      <TableCell className="font-sans">
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={bl.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink transition-colors hover:text-editorial-red"
                          >
                            {truncateUrl(bl.source_url, 40)}
                            <ExternalLink
                              size={11}
                              className="shrink-0 text-ink-muted"
                            />
                          </a>
                          <span className="text-[10px] text-ink-muted">
                            {bl.source_domain}
                          </span>
                        </div>
                      </TableCell>

                      {/* Target Page */}
                      <TableCell className="font-sans text-[13px] text-ink-secondary">
                        {bl.target_url}
                      </TableCell>

                      {/* Anchor Text */}
                      <TableCell className="font-sans text-[13px] text-ink">
                        {bl.anchor_text}
                      </TableCell>

                      {/* DA */}
                      <TableCell>
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            (bl.domain_authority ?? 0) >= 80
                              ? "text-editorial-green"
                              : (bl.domain_authority ?? 0) >= 50
                                ? "text-ink"
                                : "text-editorial-red"
                          }`}
                        >
                          {bl.domain_authority ?? "\u2014"}
                        </span>
                      </TableCell>

                      {/* Trust Flow */}
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums text-ink-secondary">
                          {bl.trust_flow ?? "\u2014"}
                        </span>
                      </TableCell>

                      {/* Citation Flow */}
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums text-ink-secondary">
                          {bl.citation_flow ?? "\u2014"}
                        </span>
                      </TableCell>

                      {/* Link Type */}
                      <TableCell className="font-sans">
                        <Badge variant={getLinkTypeBadgeVariant(bl.link_type)}>
                          {bl.link_type}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="font-sans">
                        <Badge variant={getStatusBadgeVariant(bl.status)}>
                          {bl.status}
                        </Badge>
                      </TableCell>

                      {/* First Seen */}
                      <TableCell className="font-sans text-[12px] text-ink-secondary">
                        {formatBacklinkDate(bl.first_seen, timezone)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Table Footer */}
              <div className="flex items-center justify-between border-t border-rule pt-3">
                <span className="text-[11px] font-semibold text-ink-muted">
                  Showing {filteredBacklinks.length} of {totalCount} backlinks
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <span className="font-mono text-xs tabular-nums text-ink-secondary">
                    Page 1 of {Math.max(1, Math.ceil(totalCount / 50))}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={totalCount <= 50}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
              <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                No backlinks match your search or filter.
              </span>
            </div>
          )}
        </TabsContent>

        {/* ============================================================
            TAB: New Backlinks
            ============================================================ */}
        <TabsContent value="new">
          <div className="flex flex-col gap-5">
            <ColumnHeader
              title="Recently Discovered"
              subtitle="New Backlinks Found in the Last 30 Days"
            />

            {newBacklinks.length > 0 ? (
              <div className="flex flex-col gap-0">
                {newBacklinks.map((bl) => (
                  <div
                    key={bl.id}
                    className="flex items-start gap-4 border-b border-rule px-1 py-4 last:border-b-0"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-green/10">
                      <TrendingUp size={16} className="text-editorial-green" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={bl.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-bold text-ink transition-colors hover:text-editorial-red"
                        >
                          {bl.source_domain}
                          <ExternalLink
                            size={11}
                            className="ml-1 inline-block text-ink-muted"
                          />
                        </a>
                        <Badge variant={getLinkTypeBadgeVariant(bl.link_type)}>
                          {bl.link_type}
                        </Badge>
                        {bl.domain_authority !== null && (
                          <span className="font-mono text-xs tabular-nums text-ink-secondary">
                            DA {bl.domain_authority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-ink-secondary">
                        Links to{" "}
                        <span className="font-semibold text-ink">
                          {bl.target_url}
                        </span>{" "}
                        with anchor text &ldquo;
                        <span className="italic">{bl.anchor_text}</span>&rdquo;
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                        <Calendar size={10} />
                        First seen {formatBacklinkDate(bl.first_seen, timezone)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  No new backlinks discovered recently.
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Lost Backlinks
            ============================================================ */}
        <TabsContent value="lost">
          <div className="flex flex-col gap-5">
            <ColumnHeader
              title="Recently Lost"
              subtitle="Backlinks No Longer Detected"
            />

            {lostBacklinks.length > 0 ? (
              <div className="flex flex-col gap-0">
                {lostBacklinks.map((bl) => (
                  <div
                    key={bl.id}
                    className="flex items-start gap-4 border-b border-rule px-1 py-4 last:border-b-0"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-editorial-red/10">
                      <Unlink size={16} className="text-editorial-red" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={bl.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] font-bold text-ink transition-colors hover:text-editorial-red"
                        >
                          {bl.source_domain}
                          <ExternalLink
                            size={11}
                            className="ml-1 inline-block text-ink-muted"
                          />
                        </a>
                        <Badge variant="danger">Lost</Badge>
                        {bl.domain_authority !== null && (
                          <span className="font-mono text-xs tabular-nums text-ink-secondary">
                            DA {bl.domain_authority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[12px] text-ink-secondary">
                        Was linking to{" "}
                        <span className="font-semibold text-ink">
                          {bl.target_url}
                        </span>{" "}
                        with anchor text &ldquo;
                        <span className="italic">{bl.anchor_text}</span>&rdquo;
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                        <Calendar size={10} />
                        Last seen {formatBacklinkDate(bl.last_seen, timezone)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReclaim(bl.id)}
                        disabled={isPending && pendingId === bl.id}
                      >
                        <Mail size={12} />
                        {isPending && pendingId === bl.id ? "..." : "Reclaim"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  No lost backlinks detected recently.
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Toxic Backlinks
            ============================================================ */}
        <TabsContent value="toxic">
          <div className="flex flex-col gap-5">
            <ColumnHeader
              title="Toxic Link Audit"
              subtitle="Potentially Harmful Backlinks"
            />

            {toxicBacklinks.length > 0 ? (
              <>
                {/* Warning Banner */}
                <div className="flex items-start gap-3 border border-editorial-red/30 bg-editorial-red/5 p-4">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-editorial-red"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      {toxicBacklinks.length} toxic backlinks detected
                    </p>
                    <p className="mt-1 text-[12px] text-ink-secondary">
                      These links originate from low-quality or spammy domains
                      and may negatively impact your search rankings. Review and
                      consider adding them to your Google disavow file.
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        Source Domain
                      </TableHead>
                      <TableHead className="min-w-[140px]">
                        Anchor Text
                      </TableHead>
                      <TableHead className="w-[60px]">DA</TableHead>
                      <TableHead className="w-[60px]">TF</TableHead>
                      <TableHead className="w-[60px]">CF</TableHead>
                      <TableHead className="w-[100px]">Risk Level</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toxicBacklinks.map((bl) => {
                      const tf = bl.trust_flow ?? 0;
                      const cf = bl.citation_flow ?? 0;
                      const cfTfRatio = tf > 0 ? cf / tf : 10;
                      const riskLevel =
                        cfTfRatio > 5
                          ? "High"
                          : cfTfRatio > 2
                            ? "Medium"
                            : "Low";

                      return (
                        <TableRow key={bl.id}>
                          <TableCell className="font-sans">
                            <div className="flex items-center gap-2">
                              <ShieldOff
                                size={14}
                                className="shrink-0 text-editorial-red"
                              />
                              <div className="flex flex-col gap-0.5">
                                <a
                                  href={bl.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[13px] font-semibold text-ink transition-colors hover:text-editorial-red"
                                >
                                  {bl.source_domain}
                                  <ExternalLink
                                    size={11}
                                    className="ml-1 inline-block text-ink-muted"
                                  />
                                </a>
                                <span className="text-[10px] text-ink-muted">
                                  {truncateUrl(bl.source_url, 45)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-sans text-[13px] text-ink">
                            {bl.anchor_text}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm font-bold tabular-nums text-editorial-red">
                              {bl.domain_authority ?? "\u2014"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm tabular-nums text-ink-secondary">
                              {bl.trust_flow ?? "\u2014"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm tabular-nums text-ink-secondary">
                              {bl.citation_flow ?? "\u2014"}
                            </span>
                          </TableCell>
                          <TableCell className="font-sans">
                            <Badge
                              variant={
                                riskLevel === "High"
                                  ? "danger"
                                  : riskLevel === "Medium"
                                    ? "warning"
                                    : "muted"
                              }
                            >
                              {riskLevel} Risk
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-editorial-red/30 text-editorial-red hover:bg-editorial-red/5"
                              onClick={() => handleDisavow(bl.id)}
                              disabled={isPending && pendingId === bl.id}
                            >
                              <Ban size={12} />
                              {isPending && pendingId === bl.id ? "..." : "Disavow"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Export Disavow File */}
                <div className="flex items-center justify-between border-t border-rule pt-4">
                  <p className="text-[12px] text-ink-secondary">
                    Select links above to include in your disavow file, or
                    export all toxic links at once.
                  </p>
                  <Button variant="secondary" size="sm" onClick={handleExportDisavow}>
                    <FileText size={14} />
                    Export Disavow File
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                <div className="flex flex-col items-center gap-2">
                  <Shield size={24} className="text-editorial-green" />
                  <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                    No toxic backlinks detected.
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Recommendations
            ============================================================ */}
        <TabsContent value="recommendations">
          <RecommendationsTab
            recommendations={recommendations}
            itemLabel="link"
            emptyMessage="Add backlinks to generate personalized link-building recommendations."
          />
        </TabsContent>

        {/* ============================================================
            TAB: Strategy Guide
            ============================================================ */}
        <TabsContent value="strategy">
          <StrategyGuideTab content={strategyContent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
