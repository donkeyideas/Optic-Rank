"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Reply,
  Star,
  Apple,
  Smartphone,
  Loader2,
  Sparkles,
  Tag,
  CheckSquare,
  Square,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { AppSelectorStrip } from "@/components/app-store/app-selector-strip";
import { useActionProgress } from "@/components/shared/action-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AsoSentimentPieChart, AsoRatingDistributionChart } from "@/components/charts/aso-sentiment-chart";
import { generateReviewReply } from "@/lib/actions/app-store";
import { extractReviewTopics, bulkGenerateReplies } from "@/lib/actions/app-store-reviews-intel";
import type { AppStoreListing } from "@/types";
import type { AppReview, ReviewTopic } from "@/lib/dal/app-store";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface ReviewsTabProps {
  listings: AppStoreListing[];
  reviews: AppReview[];
  topics: ReviewTopic[];
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

function renderStars(rating: number) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={11} className={star <= Math.round(rating) ? "fill-editorial-gold text-editorial-gold" : "text-rule"} />
      ))}
    </span>
  );
}

const TOPIC_COLORS: Record<string, string> = {
  feature_request: "text-editorial-gold",
  bug: "text-editorial-red",
  praise: "text-editorial-green",
  complaint: "text-editorial-red",
  competitor_mention: "text-ink-muted",
};

const TOPIC_LABELS: Record<string, string> = {
  feature_request: "Feature Request",
  bug: "Bug Report",
  praise: "Praise",
  complaint: "Complaint",
  competitor_mention: "Competitor Mention",
};

export function ReviewsTab({ listings, reviews, topics }: ReviewsTabProps) {
  const timezone = useTimezone();
  const { runAction, isRunning: isActionRunning } = useActionProgress();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<string>("all");

  // Filter reviews
  let filteredReviews = reviews;
  if (sentimentFilter !== "all") filteredReviews = filteredReviews.filter((r) => r.sentiment === sentimentFilter);
  if (ratingFilter != null) filteredReviews = filteredReviews.filter((r) => r.rating === ratingFilter);
  if (selectedListing !== "all") filteredReviews = filteredReviews.filter((r) => r.listing_id === selectedListing);

  // Sentiment stats
  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const neutral = reviews.filter((r) => r.sentiment === "neutral").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;

  // Rating distribution
  const ratingDist = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));

  // Response rate
  const repliedCount = reviews.filter((r) => r.ai_reply != null).length;
  const responseRate = reviews.length > 0 ? Math.round((repliedCount / reviews.length) * 100) : 0;

  function handleReply(reviewId: string) {
    setActionId(reviewId);
    startTransition(async () => {
      const result = await generateReviewReply(reviewId);
      if ("reply" in result) setReplyText((prev) => ({ ...prev, [reviewId]: result.reply }));
      setActionId(null);
    });
  }

  function handleExtractTopics(listingId: string) {
    runAction(
      {
        title: "Extracting Review Topics",
        description: "AI is analyzing reviews to identify common themes...",
        steps: ["Reading reviews", "Analyzing sentiment", "Identifying topics", "Categorizing themes"],
        estimatedDuration: 20,
      },
      async () => {
        await extractReviewTopics(listingId);
        router.refresh();
        return { message: "Topics extracted successfully" };
      }
    );
  }

  function handleBulkReply() {
    if (selectedReviews.size === 0) return;
    const listingId = reviews.find((r) => selectedReviews.has(r.id))?.listing_id;
    if (!listingId) return;
    runAction(
      {
        title: "Generating Review Replies",
        description: `Generating AI replies for ${selectedReviews.size} review${selectedReviews.size !== 1 ? "s" : ""}...`,
        steps: ["Analyzing reviews", "Crafting personalized replies", "Saving responses"],
        estimatedDuration: 10 * selectedReviews.size,
      },
      async () => {
        await bulkGenerateReplies(listingId, Array.from(selectedReviews));
        setSelectedReviews(new Set());
        router.refresh();
        return { message: `Generated ${selectedReviews.size} replies` };
      }
    );
  }

  function toggleReviewSelection(id: string) {
    setSelectedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (reviews.length === 0) {
    return <EmptyState icon={MessageSquare} title="No Reviews Yet" description="Reviews will appear here once they are fetched from the app stores." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Analytics Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Sentiment Pie */}
        <div className="border border-rule bg-surface-card p-4 md:col-span-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Sentiment Breakdown</span>
          <div className="mt-2">
            <AsoSentimentPieChart positive={positive} neutral={neutral} negative={negative} height={120} />
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="border border-rule bg-surface-card p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Rating Distribution</span>
          <div className="mt-2">
            <AsoRatingDistributionChart data={ratingDist} height={120} />
          </div>
        </div>

        {/* Response Rate + Stats */}
        <div className="flex flex-col gap-3 border border-rule bg-surface-card p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Review Stats</span>
          <div>
            <span className="block font-mono text-2xl font-bold text-ink">{reviews.length}</span>
            <span className="text-[10px] text-ink-muted">Total Reviews</span>
          </div>
          <div>
            <span className="block font-mono text-2xl font-bold text-editorial-green">{responseRate}%</span>
            <span className="text-[10px] text-ink-muted">Response Rate ({repliedCount}/{reviews.length})</span>
          </div>
          <div>
            <span className="block font-mono text-lg font-bold text-ink">
              {reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"}
            </span>
            <span className="text-[10px] text-ink-muted">Avg Rating</span>
          </div>
        </div>
      </div>

      {/* Topic Intelligence */}
      {(topics.length > 0 || listings.length > 0) && (
        <div className="border border-rule bg-surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Topic Intelligence</span>
            {listings.map((l) => (
              <Button
                key={l.id}
                variant="outline"
                size="sm"
                onClick={() => handleExtractTopics(l.id)}
                disabled={isActionRunning}
              >
                {isActionRunning ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                Extract Topics {listings.length > 1 ? `(${l.app_name})` : ""}
              </Button>
            ))}
          </div>
          {topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setTopicFilter(topicFilter === topic.topic ? null : topic.topic)}
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 transition-colors ${
                    topicFilter === topic.topic
                      ? "border-editorial-red bg-editorial-red/5"
                      : "border-rule hover:border-rule-dark"
                  }`}
                >
                  <Tag size={10} className={TOPIC_COLORS[topic.category] ?? "text-ink-muted"} />
                  <span className="text-[11px] font-semibold text-ink">{topic.topic}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{topic.mention_count}</span>
                  <Badge variant="muted">{TOPIC_LABELS[topic.category] ?? topic.category}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters + Bulk Actions */}
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <AppSelectorStrip listings={listings} selected={selectedListing} onSelect={setSelectedListing} showAll />
          {["all", "positive", "neutral", "negative"].map((s) => (
            <button
              key={s}
              onClick={() => setSentimentFilter(s as typeof sentimentFilter)}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sentimentFilter === s ? "bg-ink text-surface-card" : "text-ink-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
          {[1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              onClick={() => setRatingFilter(ratingFilter === r ? null : r)}
              className={`px-1.5 py-1 text-[10px] font-bold ${ratingFilter === r ? "bg-ink text-surface-card" : "text-ink-muted hover:text-ink"}`}
            >
              {r}★
            </button>
          ))}
        </div>
        {selectedReviews.size > 0 && (
          <Button variant="primary" size="sm" onClick={handleBulkReply} disabled={isActionRunning}>
            {isActionRunning ? <Loader2 size={12} className="animate-spin" /> : <Reply size={12} />}
            Bulk Reply ({selectedReviews.size})
          </Button>
        )}
      </div>

      <ColumnHeader title="Review Feed" subtitle={`${filteredReviews.length} reviews`} />

      {/* Review List */}
      <div className="flex flex-col gap-0">
        {filteredReviews.map((review, i) => {
          const sentiment = sentimentBadge(review.sentiment ?? "neutral");
          const existingReply = review.ai_reply || replyText[review.id];

          return (
            <div key={review.id} className={`flex items-start gap-3 py-4 ${i < filteredReviews.length - 1 ? "border-b border-rule" : ""}`}>
              <button
                onClick={() => toggleReviewSelection(review.id)}
                className="mt-0.5 text-ink-muted hover:text-ink"
              >
                {selectedReviews.has(review.id) ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
              <div className="flex flex-col items-center gap-1 pt-0.5">
                {review.store === "apple" ? <Apple size={14} className="text-ink" /> : <Smartphone size={14} className="text-editorial-green" />}
                {renderStars(review.rating)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif text-[13px] font-bold text-ink">{review.title ?? "No Title"}</h4>
                  <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                </div>
                <p className="mt-1 font-sans text-[12px] leading-relaxed text-ink-secondary">{review.text ?? ""}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-ink-muted">
                  <span>{review.author ?? "Anonymous"}</span>
                  <span>&middot;</span>
                  <span>{review.review_date ? formatDate(review.review_date, timezone) : ""}</span>
                </div>
                {existingReply && (
                  <div className="mt-2 border-l-2 border-editorial-green/40 bg-editorial-green/5 px-3 py-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-editorial-green">AI Reply</span>
                    <p className="mt-0.5 font-sans text-[11px] text-ink-secondary">{existingReply}</p>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleReply(review.id)} disabled={actionId === review.id}>
                {actionId === review.id ? <Loader2 size={11} className="animate-spin" /> : <Reply size={11} />}
                Reply
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
