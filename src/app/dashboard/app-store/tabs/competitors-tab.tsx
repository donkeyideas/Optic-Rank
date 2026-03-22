"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Sparkles,
  Loader2,
  Zap,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AiMarkdown } from "@/components/shared/ai-markdown";
import {
  addCompetitorApp,
  removeCompetitorApp,
  refreshCompetitors,
  discoverCompetitors,
  searchCompetitorApps,
  analyzeCompetitorGap,
} from "@/lib/actions/app-store-competitors";
import type { AppStoreListing } from "@/types";
import type { AppStoreCompetitor } from "@/lib/dal/app-store";

interface CompetitorsTabProps {
  listings: AppStoreListing[];
  competitors: AppStoreCompetitor[];
}

export function CompetitorsTab({ listings, competitors }: CompetitorsTabProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null }>>([]);
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<string | null>(null);
  const [discoveredApps, setDiscoveredApps] = useState<Array<{ app_id: string; app_name: string; icon_url: string | null; rating: number | null; store: string }>>([]);

  function handleSearch() {
    if (!searchQuery.trim()) return;
    const listing = listings.find((l) => l.id === selectedListing);
    if (!listing) return;
    setActionId("search");
    startTransition(async () => {
      const result = await searchCompetitorApps(listing.store as "apple" | "google", searchQuery);
      if ("results" in result) {
        setSearchResults(result.results);
        if (result.results.length === 0) toast("No apps found for that search query.");
      } else {
        toast(result.error, "error");
      }
      setActionId(null);
    });
  }

  function handleAddCompetitor(appId: string, store: "apple" | "google") {
    setActionId(appId);
    startTransition(async () => {
      const result = await addCompetitorApp(selectedListing, appId, store);
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        setSearchResults((prev) => prev.filter((r) => r.app_id !== appId));
        setDiscoveredApps((prev) => prev.filter((r) => r.app_id !== appId));
        toast("Competitor added", "success");
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleRemove(competitorId: string) {
    setActionId(competitorId);
    startTransition(async () => {
      const result = await removeCompetitorApp(competitorId);
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleRefreshAll() {
    if (!selectedListing) return;
    setActionId("refresh-all");
    startTransition(async () => {
      const result = await refreshCompetitors(selectedListing);
      if ("error" in result) {
        toast(result.error, "error");
      } else {
        toast("Competitors refreshed", "success");
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleDiscover() {
    if (!selectedListing) return;
    setActionId("discover");
    startTransition(async () => {
      try {
        const result = await discoverCompetitors(selectedListing);
        if ("discovered" in result) {
          setDiscoveredApps(result.discovered);
          if (result.discovered.length === 0) toast("No similar apps found. Try adding competitors manually.");
        } else {
          toast(result.error, "error");
        }
      } catch (err) {
        toast(`Discovery failed: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
      setActionId(null);
    });
  }

  function handleGapAnalysis() {
    if (!selectedListing) return;
    setActionId("gap");
    startTransition(async () => {
      const result = await analyzeCompetitorGap(selectedListing);
      if ("analysis" in result) {
        setGapAnalysis(result.analysis);
      } else {
        toast(result.error, "error");
      }
      setActionId(null);
    });
  }

  const selectedListingData = listings.find((l) => l.id === selectedListing);
  const listingCompetitors = competitors.filter((c) => c.listing_id === selectedListing);

  if (listings.length === 0) {
    return <EmptyState icon={Users} title="No Apps to Compare" description="Add an app listing first, then track competitors." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* App Selector + Actions */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <select
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
          className="h-9 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.app_name} ({l.store === "apple" ? "iOS" : "Android"})</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus size={12} /> Add Competitor
        </Button>
        <Button variant="outline" size="sm" onClick={handleDiscover} disabled={actionId === "discover"}>
          {actionId === "discover" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Auto-Discover
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={actionId === "refresh-all"}>
          {actionId === "refresh-all" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Refresh All
        </Button>
      </div>

      {/* Discovered Apps Alert */}
      {discoveredApps.length > 0 && (
        <div className="border border-editorial-green/30 bg-editorial-green/5 px-4 py-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">
            {discoveredApps.length} Potential Competitors Found
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {discoveredApps.slice(0, 5).map((app) => (
              <div key={app.app_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {app.icon_url && <img src={app.icon_url} alt={app.app_name} referrerPolicy="no-referrer" className="h-6 w-6 rounded border border-rule" />}
                  <span className="text-sm text-ink">{app.app_name}</span>
                  {app.rating && <span className="font-mono text-xs text-ink-muted">{app.rating.toFixed(1)}★</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCompetitor(app.app_id, app.store as "apple" | "google")}
                  disabled={actionId === app.app_id}
                >
                  {actionId === app.app_id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  Track
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {listingCompetitors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Competitors Tracked"
          description="Add competitors manually or use Auto-Discover to find similar apps."
          actionLabel="Auto-Discover Competitors"
          onAction={handleDiscover}
        />
      ) : (
        <>
          <ColumnHeader title="Competitor Intelligence" subtitle={`${listingCompetitors.length} competitors tracked for ${selectedListingData?.app_name ?? "your app"}`} />

          {/* Your App vs Competitors Comparison */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Your App Card */}
            {selectedListingData && (
              <div className="border-2 border-editorial-green bg-surface-card p-4">
                <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">Your App</div>
                <div className="flex items-center gap-2">
                  {selectedListingData.icon_url && <img src={selectedListingData.icon_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded border border-rule" />}
                  <h4 className="font-serif text-[14px] font-bold text-ink">{selectedListingData.app_name}</h4>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="block font-mono text-sm font-bold text-ink">{selectedListingData.rating?.toFixed(1) ?? "—"}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Rating</span>
                  </div>
                  <div>
                    <span className="block font-mono text-sm font-bold text-ink">{selectedListingData.reviews_count?.toLocaleString() ?? "—"}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Reviews</span>
                  </div>
                  <div>
                    <span className="block font-mono text-sm font-bold text-ink">
                      {selectedListingData.store === "apple"
                        ? (selectedListingData.current_version ? `v${selectedListingData.current_version}` : "—")
                        : (selectedListingData.downloads_estimate?.toLocaleString() ?? "—")}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">
                      {selectedListingData.store === "apple" ? "Version" : "Downloads"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-sm font-bold text-ink">{selectedListingData.visibility_score ?? "—"}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Visibility</span>
                  </div>
                </div>
              </div>
            )}

            {/* Competitor Cards */}
            {listingCompetitors.map((comp) => {
              const ratingDiff = selectedListingData?.rating != null && comp.competitor_rating != null
                ? (selectedListingData.rating - comp.competitor_rating)
                : null;

              return (
                <div key={comp.id} className="border border-rule bg-surface-card p-4 transition-colors hover:border-rule-dark">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {comp.competitor_icon_url && <img src={comp.competitor_icon_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded border border-rule" />}
                      <div>
                        <h4 className="font-serif text-[13px] font-bold text-ink">{comp.competitor_name}</h4>
                        <span className="text-[10px] text-ink-muted">{comp.competitor_version ? `v${comp.competitor_version}` : ""}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(comp.id)}
                      disabled={actionId === comp.id}
                      className="p-1 text-ink-muted transition-colors hover:text-editorial-red"
                    >
                      {actionId === comp.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="block font-mono text-sm font-bold text-ink">{comp.competitor_rating?.toFixed(1) ?? "—"}</span>
                      {ratingDiff != null && (
                        <span className={`text-[9px] font-bold ${ratingDiff > 0 ? "text-editorial-green" : ratingDiff < 0 ? "text-editorial-red" : "text-ink-muted"}`}>
                          {ratingDiff > 0 ? `You +${ratingDiff.toFixed(1)}` : ratingDiff < 0 ? `You ${ratingDiff.toFixed(1)}` : "Tied"}
                        </span>
                      )}
                      <span className="block text-[8px] font-bold uppercase tracking-wider text-ink-muted">Rating</span>
                    </div>
                    <div>
                      <span className="block font-mono text-sm font-bold text-ink">{comp.competitor_reviews_count?.toLocaleString() ?? "—"}</span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Reviews</span>
                    </div>
                    <div>
                      <span className="block font-mono text-sm font-bold text-ink">
                        {selectedListingData?.store === "apple"
                          ? (comp.competitor_version ? `v${comp.competitor_version}` : "—")
                          : (comp.competitor_downloads?.toLocaleString() ?? "—")}
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">
                        {selectedListingData?.store === "apple" ? "Version" : "Downloads"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gap Analysis */}
          <div className="border-t border-rule pt-4">
            <div className="flex items-center justify-between">
              <ColumnHeader title="Keyword Gap Analysis" subtitle="AI-powered competitive keyword intelligence" />
              <Button variant="primary" size="sm" onClick={handleGapAnalysis} disabled={actionId === "gap"}>
                {actionId === "gap" ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                Analyze Gap
              </Button>
            </div>
            {gapAnalysis && (
              <div className="mt-3 border border-rule bg-surface-raised px-5 py-4">
                <AiMarkdown content={gapAnalysis} className="font-sans text-[12px] leading-relaxed" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Competitor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor App</DialogTitle>
            <DialogDescription>
              Search for a competitor app or enter its ID directly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by app name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-10 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
              />
              <Button variant="primary" size="md" onClick={handleSearch} disabled={actionId === "search"}>
                {actionId === "search" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-rule">
                {searchResults.map((app) => (
                  <div key={app.app_id} className="flex items-center justify-between border-b border-rule px-3 py-2 last:border-b-0 hover:bg-surface-raised">
                    <div className="flex items-center gap-2">
                      {app.icon_url && <img src={app.icon_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded border border-rule" />}
                      <div>
                        <span className="text-sm font-semibold text-ink">{app.app_name}</span>
                        {app.developer && <span className="block text-[10px] text-ink-muted">{app.developer}</span>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddCompetitor(app.app_id, selectedListingData?.store as "apple" | "google" ?? "google")}
                      disabled={actionId === app.app_id}
                    >
                      {actionId === app.app_id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-rule pt-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Or enter App ID directly</span>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const appId = fd.get("app_id") as string;
                  if (appId) handleAddCompetitor(appId, selectedListingData?.store as "apple" | "google" ?? "google");
                }}
              >
                <input
                  name="app_id"
                  type="text"
                  placeholder="com.example.app or Apple ID"
                  className="h-9 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                />
                <Button type="submit" variant="primary" size="sm">Add</Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
