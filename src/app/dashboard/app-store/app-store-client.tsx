"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Smartphone,
  Search,
  Users,
  MessageSquare,
  Target,
  TrendingUp,
  Globe,
  GitBranch,
  Eye,
  Plus,
  Zap,
  Shield,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  Star,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { AppSelectorStrip } from "@/components/app-store/app-selector-strip";
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
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";
import { RecommendationsTab, StrategyGuideTab } from "@/components/shared/page-guide";
import type { Recommendation, StrategyContent } from "@/components/shared/page-guide";
import { addAppListing, deleteAppListing } from "@/lib/actions/app-store";
import { runAsoFullSync } from "@/lib/actions/app-store-generate";

import { OverviewTab } from "./tabs/overview-tab";
import { KeywordsTab } from "./tabs/keywords-tab";
import { CompetitorsTab } from "./tabs/competitors-tab";
import { ReviewsTab } from "./tabs/reviews-tab";
import { OptimizerTab } from "./tabs/optimizer-tab";
import { StoreIntelTab } from "./tabs/store-intel-tab";
import { LocalizationTab } from "./tabs/localization-tab";
import { UpdateImpactTab } from "./tabs/update-impact-tab";
import { VisibilityTab } from "./tabs/visibility-tab";

import type { AppStoreListing, ComparisonTimeRange } from "@/types";
import type {
  AppStoreRanking,
  AppReview,
  AppStoreCompetitor,
  AppStoreSnapshot,
  AppStoreVersion,
  KeywordHistoryPoint,
  ReviewTopic,
  AppStoreLocalization,
  VisibilityHistoryPoint,
} from "@/lib/dal/app-store";
import { PeriodComparisonBar } from "@/components/editorial/period-comparison-bar";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AppStoreClientProps {
  listings: AppStoreListing[];
  rankings: AppStoreRanking[];
  reviews: AppReview[];
  competitors: AppStoreCompetitor[];
  snapshots: AppStoreSnapshot[];
  versions: AppStoreVersion[];
  keywordHistory: KeywordHistoryPoint[];
  topics: ReviewTopic[];
  localizations: AppStoreLocalization[];
  visibilityHistory: VisibilityHistoryPoint[];
  projectId: string;
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
}

/* ------------------------------------------------------------------
   App Store Client Component
   ------------------------------------------------------------------ */

export function AppStoreClient({
  listings,
  rankings,
  reviews,
  competitors,
  snapshots,
  versions,
  keywordHistory,
  topics,
  localizations,
  visibilityHistory,
  projectId,
  comparisons,
}: AppStoreClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddListing, setShowAddListing] = useState(false);
  const [selectedRecsListing, setSelectedRecsListing] = useState<string>("all");
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  function handleGenerateAll() {
    runAction(
      {
        title: "Running Full ASO Sync",
        description: `Syncing all ${listings.length} app listing${listings.length !== 1 ? "s" : ""} — keywords, rankings, competitors, reviews, localization...`,
        steps: [
          "Refreshing app store data",
          "Generating & refreshing keywords",
          "Discovering competitors",
          "Running ASO analysis",
          "Extracting review topics",
          "Recording snapshots",
          "Analyzing localization opportunities",
          "Finalizing results",
        ],
        estimatedDuration: 60 * listings.length,
      },
      async () => {
        const result = await runAsoFullSync(projectId);
        if (result.error) return { error: result.error };
        return { message: `Refreshed ${result.refreshed} app${result.refreshed !== 1 ? "s" : ""} · Analyzed ${result.analyzed}` };
      }
    );
  }

  function handleAddListing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addAppListing(projectId, formData);
      if ("error" in result) setAddError(result.error);
      else { setShowAddListing(false); setStatusMsg("App listing added."); }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteAppListing(id);
      if ("error" in result) {
        setDeleteError(result.error);
      } else {
        setDeleteTarget(null);
        setStatusMsg("App listing deleted.");
      }
    });
  }

  // Headline stats
  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const avgAso = listings.length > 0
    ? Math.round(listings.reduce((s, l) => s + (l.aso_score ?? 0), 0) / listings.length)
    : 0;

  const headlineStats = [
    {
      label: "App Listings",
      value: String(listings.length),
      delta: `${listings.filter((l) => l.store === "apple").length} iOS · ${listings.filter((l) => l.store === "google").length} Android`,
      direction: "neutral" as const,
    },
    {
      label: "Avg Rating",
      value: listings.length > 0
        ? (listings.reduce((s, l) => s + (l.rating ?? 0), 0) / listings.length).toFixed(1)
        : "—",
      delta: "Across all apps",
      direction: "neutral" as const,
    },
    {
      label: "Keywords Tracked",
      value: String(new Set(rankings.map((r) => `${r.keyword}:${r.listing_id}`)).size),
      delta: "Unique keyword-app pairs",
      direction: "neutral" as const,
    },
    {
      label: "Review Sentiment",
      value: reviews.length > 0 ? `${Math.round((positive / reviews.length) * 100)}%` : "—",
      delta: `${positive} positive of ${reviews.length}`,
      direction: positive / (reviews.length || 1) >= 0.7 ? "up" as const : "down" as const,
    },
    {
      label: "Avg ASO Score",
      value: avgAso > 0 ? String(avgAso) : "—",
      delta: "Across all apps",
      direction: avgAso >= 70 ? "up" as const : avgAso >= 40 ? "neutral" as const : "down" as const,
    },
  ];

  // Org. Visibility now has its own dedicated tab — removed from headline bar

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    listings.forEach((listing) => {
      // Low ASO score
      if (listing.aso_score != null && listing.aso_score < 60) {
        recs.push({
          id: `aso-${listing.id}`,
          priority: "high",
          category: "ASO Score",
          icon: Target,
          item: listing.app_name,
          action: `ASO score is ${listing.aso_score}/100. Optimize your app title, subtitle, and keyword field to improve discoverability.`,
          where: "Go to the Optimizer tab for keyword suggestions and metadata optimization tips.",
          estimatedImpact: "Improving ASO score to 80+ can increase organic installs by 30-50%.",
          details: "Focus on including high-volume keywords in your title and subtitle. Keep descriptions compelling with clear value propositions.",
        });
      }

      // Low rating
      if (listing.rating != null && listing.rating < 4.0) {
        recs.push({
          id: `rating-${listing.id}`,
          priority: "high",
          category: "User Rating",
          icon: Star,
          item: listing.app_name,
          action: `Average rating is ${listing.rating.toFixed(1)} stars. Address negative reviews and fix reported bugs to improve your rating.`,
          where: "Check the Reviews tab for common complaints and prioritize bug fixes.",
          estimatedImpact: "Apps with 4.5+ stars get 2-3x more installs than apps rated below 4.0.",
          details: "Respond to negative reviews professionally. Show users you're actively improving the app.",
        });
      }

      // Missing store URL
      if (!listing.app_url || !listing.app_url.trim()) {
        recs.push({
          id: `store-url-${listing.id}`,
          priority: "medium",
          category: "Store Listing",
          icon: Eye,
          item: listing.app_name,
          action: "Add your store URL so we can analyze your full store listing and provide better optimization suggestions.",
          where: "Update the app listing with the correct App Store or Play Store URL.",
          estimatedImpact: "Complete listings with store URLs enable comprehensive ASO analysis.",
          details: "A complete store listing is essential for accurate keyword tracking and competitor comparison.",
        });
      }
    });

    // General recommendations
    if (listings.length > 0 && rankings.length === 0) {
      recs.push({
        id: "track-keywords",
        priority: "high",
        category: "Keyword Tracking",
        icon: Search,
        item: "No Keywords Tracked",
        action: "Add keywords to track your app's search rankings. Go to the Keywords tab to add target keywords.",
        where: "Keywords tab — add keywords you want to rank for in the app store.",
        estimatedImpact: "Keyword tracking is essential for measuring ASO improvements and finding new opportunities.",
        details: "Start with your brand keywords, then add category keywords and competitor keywords.",
      });
    }

    if (listings.length > 0 && competitors.length === 0) {
      recs.push({
        id: "track-competitors",
        priority: "medium",
        category: "Competitor Tracking",
        icon: Users,
        item: "No Competitors Tracked",
        action: "Add competitors to compare your ASO performance and discover their keyword strategies.",
        where: "Competitors tab — add apps that compete for the same users and keywords.",
        estimatedImpact: "Competitor analysis reveals keyword gaps and positioning opportunities.",
        details: "Track 3-5 direct competitors and 1-2 category leaders for best insights.",
      });
    }

    if (reviews.length > 0) {
      const negativeReviews = reviews.filter(r => r.rating != null && r.rating <= 2);
      if (negativeReviews.length > 3) {
        recs.push({
          id: "negative-reviews",
          priority: "medium",
          category: "Review Management",
          icon: MessageSquare,
          item: `${negativeReviews.length} Negative Reviews`,
          action: "Respond to negative reviews to show engagement and address user concerns. This can improve ratings and conversion.",
          where: "Reviews tab — sort by lowest rating and respond to each.",
          estimatedImpact: "Responding to reviews can increase conversion rate by 10-15% and improve your average rating.",
          details: "Be professional and helpful in responses. Offer solutions and show that you're actively improving the app.",
        });
      }
    }

    if (listings.length === 0) {
      recs.push({
        id: "add-listing",
        priority: "high",
        category: "Setup",
        icon: Smartphone,
        item: "Add Your First App",
        action: "Add an app listing to start tracking keywords, rankings, reviews, and competitors.",
        where: "Click 'Add App Listing' at the top of this page.",
        estimatedImpact: "App Store Optimization can increase organic installs by 30-100% when done correctly.",
        details: "You'll need the app name, bundle ID, and store URL. Both iOS App Store and Google Play Store are supported.",
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [listings, rankings, competitors, reviews]);

  const strategyContent: StrategyContent = useMemo(() => ({
    title: "App Store Optimization (ASO) Strategy Guide",
    intro: "ASO is the process of improving your app's visibility and conversion rate in app stores. Like SEO for websites, ASO helps users discover your app through organic search.",
    cards: [
      {
        icon: Search,
        iconColor: "text-editorial-red",
        title: "Keyword Optimization",
        bullets: [
          { bold: "Title keywords", text: "Include your most important keywords in the app title (30 chars iOS, 50 chars Android)." },
          { bold: "Subtitle/Short description", text: "Add secondary keywords in the subtitle field for additional ranking signals." },
          { bold: "Keyword field (iOS)", text: "Use all 100 characters. No spaces after commas. Include misspellings and synonyms." },
        ],
      },
      {
        icon: Eye,
        iconColor: "text-editorial-gold",
        title: "Conversion Optimization",
        bullets: [
          { bold: "Screenshots", text: "First 2-3 screenshots should showcase your app's core value proposition clearly." },
          { bold: "App icon", text: "Use a distinctive, recognizable icon that stands out in search results." },
          { bold: "Preview video", text: "Add a short (15-30 sec) preview video demonstrating key features." },
        ],
      },
      {
        icon: MessageSquare,
        iconColor: "text-editorial-green",
        title: "Review Management",
        bullets: [
          { bold: "Prompt for reviews", text: "Ask satisfied users for reviews at peak moments (after achievements, milestones)." },
          { bold: "Respond to feedback", text: "Reply to negative reviews professionally and show you're fixing issues." },
          { bold: "Monitor sentiment", text: "Track review topics to identify recurring issues and feature requests." },
        ],
      },
    ],
    steps: [
      { step: "1", title: "Add Your App", desc: "Add your app listing with store URL, bundle ID, and category information." },
      { step: "2", title: "Track Keywords", desc: "Add 20-30 target keywords including brand, category, and competitor keywords." },
      { step: "3", title: "Optimize Metadata", desc: "Use the Optimizer tab to improve your title, subtitle, and keyword field." },
      { step: "4", title: "Monitor Rankings", desc: "Track keyword position changes weekly. Identify trending and dropping keywords." },
      { step: "5", title: "Manage Reviews", desc: "Respond to reviews, track sentiment trends, and use feedback to improve your app." },
      { step: "6", title: "Analyze Competitors", desc: "Study competitor keywords, ratings, and update strategies for competitive insights." },
    ],
    dos: [
      { text: "Update your app regularly — stores reward consistent update cadence with better visibility." },
      { text: "A/B test screenshots and descriptions to optimize conversion rate." },
      { text: "Track keyword rankings weekly and optimize metadata monthly." },
      { text: "Localize your listing for key markets to expand reach." },
      { text: "Monitor competitor updates and keyword changes for opportunities." },
    ],
    donts: [
      { text: "Don't keyword-stuff your title — it looks spammy and can get your listing penalized." },
      { text: "Don't ignore negative reviews — they affect your rating and conversion rate." },
      { text: "Don't use the same keywords in title and keyword field (iOS) — it wastes characters." },
      { text: "Don't neglect screenshots — they're the biggest factor in conversion after your icon." },
      { text: "Don't make major metadata changes right before a holiday or launch — changes need time to index." },
    ],
    metrics: [
      { label: "ASO Score", desc: "Overall optimization quality (0-100). Measures keyword usage, metadata completeness, and best practices.", color: "text-editorial-red" },
      { label: "Visibility Score", desc: "How discoverable your app is across tracked keywords, weighted by search volume.", color: "text-editorial-gold" },
      { label: "Average Rating", desc: "Your app's star rating. Apps with 4.5+ stars convert significantly better.", color: "text-editorial-green" },
      { label: "Keyword Rankings", desc: "Your position in app store search results for tracked keywords.", color: "text-ink" },
    ],
  }), []);

  function renderAddDialog() {
    return (
      <Dialog open={showAddListing} onOpenChange={setShowAddListing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add App Store Listing</DialogTitle>
            <DialogDescription>
              Connect your iOS or Android app to track ASO performance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddListing} className="flex flex-col gap-4 p-5">
            {addError && (
              <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                {addError}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Store</label>
              <select name="store" defaultValue="apple" className="h-10 w-full border border-rule bg-surface-card px-3 text-sm text-ink focus:border-editorial-red focus:outline-none">
                <option value="apple">Apple App Store</option>
                <option value="google">Google Play Store</option>
              </select>
            </div>
            <Input name="app_name" label="App Name" placeholder="My Amazing App" required />
            <Input name="app_id" label="App/Bundle ID" placeholder="com.example.myapp" required />
            <Input name="app_url" label="Store URL (optional)" placeholder="https://apps.apple.com/app/..." />
            <Input name="category" label="Category (optional)" placeholder="Finance, Productivity, etc." />
            <DialogFooter className="border-t-0 px-0 pb-0">
              <Button type="button" variant="secondary" size="md" onClick={() => setShowAddListing(false)}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" loading={isPending}>Add App</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">App Store Optimization</h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Cross-platform ASO intelligence: keywords, reviews, competitors, and optimization
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddListing(true)}>
            <Plus size={14} /> Add App
          </Button>
        </div>
        <EmptyState
          icon={Smartphone}
          title="No App Listings Connected"
          description="Add your iOS or Android app to start tracking keyword rankings, reviews, competitors, and optimize your store listing with AI."
          actionLabel="Add App Listing"
          onAction={() => setShowAddListing(true)}
        />
        {renderAddDialog()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HeadlineBar stats={headlineStats} />

      {/* Period Comparison */}
      <PeriodComparisonBar comparisons={comparisons} />

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">App Store Optimization</h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            {listings.length} app{listings.length !== 1 ? "s" : ""} tracked · {competitors.length} competitors · {reviews.length} reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            disabled={isActionRunning}
            onClick={handleGenerateAll}
          >
            <Zap size={14} />
            Generate All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddListing(true)}>
            <Plus size={14} /> Add App
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-2 text-sm ${statusMsg.startsWith("Error") ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red" : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"}`}>
          {statusMsg}
          <button onClick={() => setStatusMsg(null)} className="ml-2 text-xs underline">dismiss</button>
        </div>
      )}

      {/* 11 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Smartphone size={12} className="mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="visibility">
            <Eye size={12} className="mr-1.5" /> Visibility
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Search size={12} className="mr-1.5" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <Users size={12} className="mr-1.5" /> Competitors
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <MessageSquare size={12} className="mr-1.5" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="optimizer">
            <Target size={12} className="mr-1.5" /> Optimizer
          </TabsTrigger>
          <TabsTrigger value="store-intel">
            <TrendingUp size={12} className="mr-1.5" /> Intel
          </TabsTrigger>
          <TabsTrigger value="localization">
            <Globe size={12} className="mr-1.5" /> Locale
          </TabsTrigger>
          <TabsTrigger value="update-impact">
            <GitBranch size={12} className="mr-1.5" /> Updates
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb size={12} className="mr-1.5" /> Recs
          </TabsTrigger>
          <TabsTrigger value="strategy">
            <BarChart3 size={12} className="mr-1.5" /> Strategy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" forceMount>
          <OverviewTab
            listings={listings}
            rankings={rankings}
            snapshots={snapshots}
            competitors={competitors}
            visibilityHistory={visibilityHistory}
            onDelete={(id, name) => setDeleteTarget({ id, name })}
            onStatusMsg={setStatusMsg}
          />
        </TabsContent>

        <TabsContent value="visibility" forceMount>
          <VisibilityTab
            listings={listings}
            rankings={rankings}
            visibilityHistory={visibilityHistory}
            onStatusMsg={setStatusMsg}
          />
        </TabsContent>

        <TabsContent value="keywords" forceMount>
          <KeywordsTab
            listings={listings}
            rankings={rankings}
            keywordHistory={keywordHistory}
          />
        </TabsContent>

        <TabsContent value="competitors" forceMount>
          <CompetitorsTab
            listings={listings}
            competitors={competitors}
          />
        </TabsContent>

        <TabsContent value="reviews" forceMount>
          <ReviewsTab
            listings={listings}
            reviews={reviews}
            topics={topics}
          />
        </TabsContent>

        <TabsContent value="optimizer" forceMount>
          <OptimizerTab listings={listings} />
        </TabsContent>

        <TabsContent value="store-intel" forceMount>
          <StoreIntelTab listings={listings} />
        </TabsContent>

        <TabsContent value="localization" forceMount>
          <LocalizationTab
            listings={listings}
            localizations={localizations}
          />
        </TabsContent>

        <TabsContent value="update-impact" forceMount>
          <UpdateImpactTab
            listings={listings}
            versions={versions}
            snapshots={snapshots}
          />
        </TabsContent>

        <TabsContent value="recommendations">
          <AppSelectorStrip listings={listings} selected={selectedRecsListing} onSelect={setSelectedRecsListing} showAll />
          <RecommendationsTab
            recommendations={
              selectedRecsListing === "all"
                ? recommendations
                : recommendations.filter((r) => {
                    const match = listings.find((l) => l.id === selectedRecsListing);
                    return match ? r.item === match.app_name : true;
                  })
            }
            itemLabel="app"
            emptyMessage="Add app listings to generate personalized ASO recommendations."
          />
        </TabsContent>

        <TabsContent value="strategy">
          <AppSelectorStrip listings={listings} selected={selectedRecsListing} onSelect={setSelectedRecsListing} showAll />
          <StrategyGuideTab content={strategyContent} />
        </TabsContent>
      </Tabs>

      {renderAddDialog()}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !isDeleting) { setDeleteTarget(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all tracked keywords, reviews, competitors, and rankings for this app. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" size="md" onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={isDeleting}>Cancel</Button>
            <Button type="button" variant="danger" size="md" onClick={confirmDelete} loading={isDeleting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
