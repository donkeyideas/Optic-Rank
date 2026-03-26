import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoreBadge } from "@/components/app-store/store-badge";

/** Minimal listing shape used by the dashboard dispatch view */
interface DispatchListing {
  id: string;
  app_name: string;
  store: "apple" | "google";
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate?: number | null;
  aso_score: number | null;
  icon_url?: string | null;
}

interface ReviewSentiment {
  listingId: string;
  positive: number;
  negative: number;
  total: number;
}

interface AppStoreDispatchProps {
  listings: DispatchListing[];
  reviewSentiment: ReviewSentiment[];
}

function formatCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function StoreIcon({ store }: { store: "apple" | "google" }) {
  return (
    <span
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded-full",
        store === "apple"
          ? "bg-black text-white"
          : "bg-[#01875f] text-white"
      )}
    >
      <StoreBadge store={store} size="xs" />
    </span>
  );
}

export function AppStoreDispatch({
  listings,
  reviewSentiment,
}: AppStoreDispatchProps) {
  const displayListings = listings.slice(0, 3);

  return (
    <div>
      {/* App Listing Rows */}
      {displayListings.map((listing, i) => {
        const sentiment = reviewSentiment.find(
          (s) => s.listingId === listing.id
        );
        return (
          <div
            key={listing.id}
            className={cn(
              "flex items-start gap-3 py-3",
              i < displayListings.length - 1 && "border-b border-rule-light"
            )}
          >
            {/* App Icon */}
            {listing.icon_url ? (
              <img
                src={listing.icon_url}
                alt={listing.app_name}
                className="h-10 w-10 shrink-0 rounded-lg border border-rule"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule bg-surface-raised">
                <StoreIcon store={listing.store} />
              </div>
            )}

            {/* App Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <StoreIcon store={listing.store} />
                <span className="truncate font-sans text-[13px] font-bold text-ink">
                  {listing.app_name}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {listing.rating !== null && (
                  <span className="inline-flex items-center gap-1">
                    <Star
                      size={10}
                      className="fill-editorial-gold text-editorial-gold"
                    />
                    <span className="font-mono text-[11px] font-semibold text-ink">
                      {listing.rating.toFixed(1)}
                    </span>
                  </span>
                )}

                {listing.reviews_count !== null && listing.reviews_count > 0 && (
                  <span className="font-mono text-[10px] text-ink-muted">
                    {formatCount(listing.reviews_count)} reviews
                  </span>
                )}

                {listing.downloads_estimate != null &&
                  listing.downloads_estimate > 0 && (
                    <span className="font-mono text-[10px] text-ink-muted">
                      {formatCount(listing.downloads_estimate)} downloads
                    </span>
                  )}

                {sentiment && sentiment.total > 0 && (
                  <span
                    className={cn(
                      "font-mono text-[10px] font-semibold",
                      sentiment.positive > sentiment.negative
                        ? "text-editorial-green"
                        : sentiment.negative > sentiment.positive
                          ? "text-editorial-red"
                          : "text-ink-muted"
                    )}
                  >
                    {Math.round((sentiment.positive / sentiment.total) * 100)}%
                    positive
                  </span>
                )}
              </div>
            </div>

            {/* ASO Score badge */}
            <div className="shrink-0 text-right">
              <span className="block font-serif text-[20px] font-bold leading-none text-ink">
                {listing.aso_score ?? "—"}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                ASO
              </span>
            </div>
          </div>
        );
      })}

      {listings.length > 3 && (
        <p className="mt-1 text-[10px] text-ink-muted">
          +{listings.length - 3} more app
          {listings.length - 3 !== 1 ? "s" : ""} tracked
        </p>
      )}

    </div>
  );
}
