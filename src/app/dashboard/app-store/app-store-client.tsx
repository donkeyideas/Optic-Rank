"use client";

import { useState, useTransition } from "react";
import {
  Smartphone,
  Search,
  Users,
  MessageSquare,
  Target,
  TrendingUp,
  Globe,
  GitBranch,
  Plus,
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
import { EmptyState } from "@/components/shared/empty-state";
import { addAppListing, deleteAppListing } from "@/lib/actions/app-store";

import { OverviewTab } from "./tabs/overview-tab";
import { KeywordsTab } from "./tabs/keywords-tab";
import { CompetitorsTab } from "./tabs/competitors-tab";
import { ReviewsTab } from "./tabs/reviews-tab";
import { OptimizerTab } from "./tabs/optimizer-tab";
import { StoreIntelTab } from "./tabs/store-intel-tab";
import { LocalizationTab } from "./tabs/localization-tab";
import { UpdateImpactTab } from "./tabs/update-impact-tab";

import type { AppStoreListing } from "@/types";
import type {
  AppStoreRanking,
  AppReview,
  AppStoreCompetitor,
  AppStoreSnapshot,
  AppStoreVersion,
  KeywordHistoryPoint,
  ReviewTopic,
  AppStoreLocalization,
} from "@/lib/dal/app-store";

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
  projectId: string;
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
  projectId,
}: AppStoreClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddListing, setShowAddListing] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
    setDeleteTarget(null);
    startTransition(async () => {
      await deleteAppListing(id);
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

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">App Store Optimization</h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            {listings.length} app{listings.length !== 1 ? "s" : ""} tracked · {competitors.length} competitors · {reviews.length} reviews
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddListing(true)}>
          <Plus size={14} /> Add App
        </Button>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-2 text-sm ${statusMsg.startsWith("Error") ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red" : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"}`}>
          {statusMsg}
          <button onClick={() => setStatusMsg(null)} className="ml-2 text-xs underline">dismiss</button>
        </div>
      )}

      {/* 8 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Smartphone size={12} className="mr-1.5" /> Overview
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
            <TrendingUp size={12} className="mr-1.5" /> Store Intel
          </TabsTrigger>
          <TabsTrigger value="localization">
            <Globe size={12} className="mr-1.5" /> Localization
          </TabsTrigger>
          <TabsTrigger value="update-impact">
            <GitBranch size={12} className="mr-1.5" /> Update Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" forceMount>
          <OverviewTab
            listings={listings}
            rankings={rankings}
            snapshots={snapshots}
            competitors={competitors}
            onDelete={(id, name) => setDeleteTarget({ id, name })}
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
      </Tabs>

      {renderAddDialog()}

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all tracked keywords, reviews, competitors, and rankings for this app. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button type="button" variant="danger" size="md" onClick={confirmDelete} loading={isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
