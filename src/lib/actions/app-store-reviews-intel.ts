"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Extract topics from reviews using AI.
 * Categorizes: feature_request, bug, praise, complaint, competitor_mention
 */
export async function extractReviewTopics(
  listingId: string
): Promise<{ error: string } | { success: true; topicsCount: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: reviews } = await supabase
    .from("app_store_reviews")
    .select("id, title, text, sentiment, rating")
    .eq("listing_id", listingId)
    .order("review_date", { ascending: false })
    .limit(100);

  if (!reviews?.length) return { error: "No reviews to analyze." };

  const reviewTexts = reviews.map((r) =>
    `[${r.rating}★ | ${r.sentiment}] ${r.title ?? ""} — ${r.text ?? ""}`
  ).join("\n---\n");

  const prompt = `Analyze these app reviews and extract the main topics/themes. For each topic, classify it into one of these categories:
- feature_request: users asking for new features
- bug: users reporting bugs or issues
- praise: positive feedback about specific features
- complaint: general dissatisfaction
- competitor_mention: mentions of competing apps

Reviews:
${reviewTexts.slice(0, 3000)}

Return ONLY a JSON array of objects with this structure:
[{"topic": "Dark mode", "category": "feature_request", "mention_count": 5, "sentiment_avg": 2.5}, ...]

Extract up to 15 topics. Be specific (not generic like "good app").`;

  const result = await aiChat(prompt, { temperature: 0.5, maxTokens: 1000 });

  let topics: Array<{ topic: string; category: string; mention_count: number; sentiment_avg: number }> = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) topics = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  // Heuristic fallback
  if (topics.length === 0) {
    const wordFreq: Record<string, number> = {};
    for (const r of reviews) {
      const words = ((r.text as string) ?? "").toLowerCase().split(/\W+/);
      for (const w of words) {
        if (w.length > 3) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
      }
    }
    const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    topics = topWords.map(([word, count]) => ({
      topic: word,
      category: "complaint",
      mention_count: count,
      sentiment_avg: 3,
    }));
  }

  // Upsert topics
  for (const t of topics) {
    const validCategories = ["feature_request", "bug", "praise", "complaint", "competitor_mention"];
    const category = validCategories.includes(t.category) ? t.category : "complaint";

    await supabase.from("app_store_review_topics").upsert({
      listing_id: listingId,
      topic: t.topic,
      category,
      mention_count: t.mention_count ?? 1,
      sentiment_avg: t.sentiment_avg ?? 3,
      last_seen: new Date().toISOString(),
    }, { onConflict: "listing_id,topic" });
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, topicsCount: topics.length };
}

/**
 * Bulk generate AI replies for multiple reviews.
 */
export async function bulkGenerateReplies(
  listingId: string,
  reviewIds: string[],
  template?: string
): Promise<{ error: string } | { success: true; repliesGenerated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name")
    .eq("id", listingId)
    .single();

  const appName = (listing?.app_name as string) ?? "our app";

  const { data: reviews } = await supabase
    .from("app_store_reviews")
    .select("id, rating, title, text, sentiment")
    .in("id", reviewIds);

  if (!reviews?.length) return { error: "No reviews found." };

  let generated = 0;
  for (const review of reviews) {
    const reviewText = (review.text as string) ?? "";
    const reviewTitle = (review.title as string) ?? "";

    // Skip reviews with no text — use template fallback
    if (!reviewText.trim() && !reviewTitle.trim()) {
      const reply = (review.rating as number) >= 4
        ? `Thank you for your review! We're glad you're enjoying ${appName}.`
        : `Thank you for your feedback. We're working to improve your experience with ${appName}.`;
      await supabase.from("app_store_reviews").update({ ai_reply: reply }).eq("id", review.id);
      generated++;
      continue;
    }

    const templateNote = template ? `\nUse this template style: "${template}"` : "";
    const prompt = `Write a professional reply to this ${review.sentiment ?? "neutral"} app review (${review.rating}/5) for "${appName}".
Review: "${reviewTitle} — ${reviewText}"${templateNote}
Keep it concise (2-3 sentences). Return ONLY the reply text.`;

    const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 200 });
    const reply = result?.text ?? ((review.rating as number) >= 4
      ? `Thank you for your review! We're glad you're enjoying ${appName}.`
      : `Thank you for your feedback. We're working to improve your experience.`);

    await supabase.from("app_store_reviews").update({ ai_reply: reply }).eq("id", review.id);
    generated++;
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, repliesGenerated: generated };
}
