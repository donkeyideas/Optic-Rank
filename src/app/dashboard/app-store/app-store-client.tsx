"use client";

import { useState, useTransition } from "react";
import {
  Star,
  MessageSquare,
  Smartphone,
  Apple,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Reply,
  Plus,
  Trash2,
  Search,
  Sparkles,
  BarChart3,
  Target,
  Loader2,
  RefreshCw,
  Download,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addAppListing,
  deleteAppListing,
  refreshAppListing,
  generateReviewReply,
  analyzeAppListing,
  generateAppKeywords,
} from "@/lib/actions/app-store";
import type { AppStoreListing } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AppStoreClientProps {
  listings: AppStoreListing[];
  rankings: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  projectId: string;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function renderStars(rating: number) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={
            star <= Math.round(rating)
              ? "fill-editorial-gold text-editorial-gold"
              : "text-rule"
          }
        />
      ))}
    </span>
  );
}

function sentimentBadge(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return { variant: "success" as const, icon: <ThumbsUp size={9} />, label: "Positive" };
    case "neutral":
      return { variant: "warning" as const, icon: <Meh size={9} />, label: "Neutral" };
    case "negative":
      return { variant: "danger" as const, icon: <ThumbsDown size={9} />, label: "Negative" };
    default:
      return { variant: "muted" as const, icon: null, label: sentiment ?? "Unknown" };
  }
}

/* ------------------------------------------------------------------
   App Store Client Component
   ------------------------------------------------------------------ */

export function AppStoreClient({
  listings,
  rankings,
  reviews,
  projectId,
}: AppStoreClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddListing, setShowAddListing] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [asoResults, setAsoResults] = useState<Record<string, { score: number; recs: string[] }>>({});

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

  function handleDelete(id: string) {
    if (!confirm("Delete this app listing?")) return;
    setActionId(id);
    startTransition(async () => {
      await deleteAppListing(id);
      setActionId(null);
    });
  }

  function handleAnalyze(listingId: string) {
    setActionId(listingId);
    setStatusMsg(null);
    startTransition(async () => {
      const result = await analyzeAppListing(listingId);
      if ("error" in result) {
        setStatusMsg(`Error: ${result.error}`);
      } else {
        setAsoResults((prev) => ({ ...prev, [listingId]: { score: result.score, recs: result.recommendations } }));
        setStatusMsg(`ASO Score: ${result.score}/100`);
      }
      setActionId(null);
    });
  }

  function handleGenerateKeywords(listingId: string) {
    setActionId(listingId);
    setStatusMsg(null);
    startTransition(async () => {
      const result = await generateAppKeywords(listingId);
      if ("error" in result) setStatusMsg(`Error: ${result.error}`);
      else setStatusMsg(`Generated ${result.keywords.length} keywords`);
      setActionId(null);
    });
  }

  function handleGenerateReply(reviewId: string) {
    setActionId(reviewId);
    startTransition(async () => {
      const result = await generateReviewReply(reviewId);
      if ("error" in result) setStatusMsg(`Error: ${result.error}`);
      else setReplyText((prev) => ({ ...prev, [reviewId]: result.reply }));
      setActionId(null);
    });
  }

  function handleRefresh(listingId: string) {
    setActionId(listingId);
    setStatusMsg(null);
    startTransition(async () => {
      const result = await refreshAppListing(listingId);
      if ("error" in result) setStatusMsg(`Error: ${result.error}`);
      else setStatusMsg("App data refreshed from store.");
      setActionId(null);
    });
  }

  const headlineStats = [
    { label: "App Listings", value: String(listings.length), delta: `${listings.filter((l) => l.store === "apple").length} iOS · ${listings.filter((l) => l.store === "google").length} Android`, direction: "neutral" as const },
    { label: "Avg Rating", value: listings.length > 0 ? (listings.reduce((s, l) => s + (l.rating ?? 0), 0) / listings.length).toFixed(1) : "—", delta: "Across all apps", direction: "neutral" as const },
    { label: "Keywords Tracked", value: String(rankings.length), delta: "App store keywords", direction: "neutral" as const },
    { label: "Reviews", value: String(reviews.length), delta: reviews.filter((r) => (r.sentiment as string) === "negative").length > 0 ? `${reviews.filter((r) => (r.sentiment as string) === "negative").length} negative` : "All good", direction: reviews.filter((r) => (r.sentiment as string) === "negative").length > 0 ? "down" as const : "up" as const },
  ];

  if (listings.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">App Store Optimization</h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Cross-platform ASO: keyword rankings, reviews, and listing optimization
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddListing(true)}>
            <Plus size={14} /> Add App
          </Button>
        </div>
        <EmptyState
          icon={Smartphone}
          title="No App Listings Connected"
          description="Add your iOS or Android app to start tracking keyword rankings, reviews, and optimize your store listing."
          actionLabel="Add App Listing"
          onAction={() => setShowAddListing(true)}
        />
        {renderAddDialog()}
      </div>
    );
  }

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

  return (
    <div className="flex flex-col gap-6">
      <HeadlineBar stats={headlineStats} />

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">App Store Optimization</h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            {listings.length} app{listings.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddListing(true)}>
          <Plus size={14} /> Add App
        </Button>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-2 text-sm ${statusMsg.startsWith("Error") ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red" : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"}`}>
          {statusMsg}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Smartphone size={12} className="mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Search size={12} className="mr-1.5" /> Keywords
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <MessageSquare size={12} className="mr-1.5" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="optimizer">
            <Target size={12} className="mr-1.5" /> Optimizer
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            {listings.map((listing) => {
              const listingRankings = rankings.filter((r) => r.listing_id === listing.id);
              const uniqueKeywords = new Set(listingRankings.map((r) => r.keyword as string));

              return (
                <div key={listing.id} className="group border border-rule bg-surface-card p-5 transition-colors hover:border-rule-dark">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {listing.icon_url ? (
                        <img src={listing.icon_url} alt={listing.app_name} className="h-12 w-12 rounded-lg border border-rule object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                          {listing.store === "apple" ? (
                            <Apple size={22} className="text-ink" />
                          ) : (
                            <Smartphone size={22} className="text-editorial-green" />
                          )}
                        </div>
                      )}
                      <div>
                        <h3 className="font-serif text-[15px] font-bold text-ink">{listing.app_name}</h3>
                        <span className="text-[11px] text-ink-muted">
                          {listing.developer ? `${listing.developer} · ` : ""}{listing.store === "apple" ? "App Store" : "Google Play"}
                          {listing.current_version ? ` · v${listing.current_version}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" title="Refresh from store" onClick={() => handleRefresh(listing.id)} disabled={actionId === listing.id} className="rounded p-1 text-ink-muted transition-colors hover:text-editorial-green">
                        {actionId === listing.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                      <button type="button" title="Delete listing" onClick={() => handleDelete(listing.id)} disabled={actionId === listing.id} className="rounded p-1 text-ink-muted transition-colors hover:text-editorial-red">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    {listing.rating != null && (
                      <div className="flex items-center gap-2">
                        {renderStars(listing.rating)}
                        <span className="font-mono text-sm font-bold tabular-nums text-ink">{listing.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="block font-mono text-lg font-bold text-ink">{listing.reviews_count?.toLocaleString() ?? "—"}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Reviews</span>
                    </div>
                    <div>
                      <span className="block font-mono text-lg font-bold text-ink">{listing.downloads_estimate?.toLocaleString() ?? "—"}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Downloads</span>
                    </div>
                    <div>
                      <span className="block font-mono text-lg font-bold text-ink">{uniqueKeywords.size}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Keywords</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGenerateKeywords(listing.id)} disabled={actionId === listing.id}>
                      {actionId === listing.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Gen Keywords
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAnalyze(listing.id)} disabled={actionId === listing.id}>
                      {actionId === listing.id ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                      ASO Score
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          {rankings.length === 0 ? (
            <EmptyState icon={Search} title="No App Keywords Tracked" description="Generate or add keywords to track your app's ranking in the app stores." />
          ) : (
            <>
              <ColumnHeader title="App Keyword Rankings" subtitle={`${rankings.length} keyword checks`} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.slice(0, 50).map((r) => {
                    const listing = listings.find((l) => l.id === r.listing_id);
                    return (
                      <TableRow key={r.id as string}>
                        <TableCell className="font-sans text-sm font-semibold text-ink">{r.keyword as string}</TableCell>
                        <TableCell>
                          {r.position != null ? (
                            <span className={`font-mono text-sm font-bold tabular-nums ${(r.position as number) <= 10 ? "text-editorial-green" : (r.position as number) <= 50 ? "text-editorial-gold" : "text-ink-secondary"}`}>
                              #{r.position as number}
                            </span>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-ink-secondary">{r.country as string}</TableCell>
                        <TableCell className="text-sm text-ink-secondary">{listing?.app_name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-ink-muted">
                          {r.checked_at ? new Date(r.checked_at as string).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          {reviews.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No Reviews Yet" description="Reviews will appear here once they are fetched from the app stores." />
          ) : (
            <>
              <ColumnHeader title="Review Feed" subtitle="Recent reviews across App Store and Google Play" />
              <div className="mt-4 flex flex-col gap-0">
                {reviews.map((review, i) => {
                  const sentiment = sentimentBadge((review.sentiment as string) ?? "neutral");
                  const store = review.store as string;
                  const rating = (review.rating as number) ?? 0;
                  const reviewId = review.id as string;
                  const existingReply = (review.ai_reply as string) || replyText[reviewId];

                  return (
                    <div key={reviewId} className={`flex items-start gap-4 py-4 ${i < reviews.length - 1 ? "border-b border-rule" : ""}`}>
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        {store === "apple" ? <Apple size={16} className="text-ink" /> : <Smartphone size={16} className="text-editorial-green" />}
                        {renderStars(rating)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-[14px] font-bold text-ink">{(review.title as string) ?? "No Title"}</h4>
                          <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                        </div>
                        <p className="mt-1 font-sans text-[13px] leading-relaxed text-ink-secondary">{(review.text as string) ?? ""}</p>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-muted">
                          <span>{(review.author as string) ?? "Anonymous"}</span>
                          <span>&middot;</span>
                          <span>{(review.review_date as string) ?? ""}</span>
                        </div>
                        {existingReply && (
                          <div className="mt-3 border-l-2 border-editorial-green/40 bg-editorial-green/5 px-3 py-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-editorial-green">AI Reply</span>
                            <p className="mt-1 font-sans text-[12px] text-ink-secondary">{existingReply}</p>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleGenerateReply(reviewId)} disabled={actionId === reviewId}>
                        {actionId === reviewId ? <Loader2 size={12} className="animate-spin" /> : <Reply size={12} />}
                        AI Reply
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* Optimizer Tab */}
        <TabsContent value="optimizer">
          <ColumnHeader title="Store Listing Optimizer" subtitle="ASO analysis and recommendations for your apps" />
          <div className="mt-4 flex flex-col gap-4">
            {listings.map((listing) => {
              const result = asoResults[listing.id];

              return (
                <div key={listing.id} className="border border-rule bg-surface-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {listing.store === "apple" ? <Apple size={18} className="text-ink" /> : <Smartphone size={18} className="text-editorial-green" />}
                      <h3 className="font-serif text-[15px] font-bold text-ink">{listing.app_name}</h3>
                      {result && (
                        <span className={`font-mono text-lg font-bold ${result.score >= 70 ? "text-editorial-green" : result.score >= 40 ? "text-editorial-gold" : "text-editorial-red"}`}>
                          {result.score}/100
                        </span>
                      )}
                    </div>
                    <Button variant="primary" size="sm" onClick={() => handleAnalyze(listing.id)} disabled={actionId === listing.id}>
                      {actionId === listing.id ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />}
                      {result ? "Re-Analyze" : "Analyze"}
                    </Button>
                  </div>
                  {result && result.recs.length > 0 && (
                    <div className="mt-4">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommendations</span>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {result.recs.map((rec, idx) => (
                          <li key={idx} className="font-sans text-[12px] leading-relaxed text-ink-secondary">&bull; {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {renderAddDialog()}
    </div>
  );
}
