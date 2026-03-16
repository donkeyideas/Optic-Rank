/**
 * Content scoring algorithm.
 * Heuristic-based scoring for content pages based on available metadata.
 * Returns scores 0-100 for content quality, readability, and freshness.
 */

interface ContentInput {
  url: string | null;
  title: string | null;
  wordCount: number | null;
  primaryKeyword: string | null;
}

interface ContentScores {
  contentScore: number;
  readabilityScore: number;
  freshnessScore: number;
}

export function scoreContent(input: ContentInput): ContentScores {
  let contentScore = 50; // base score
  let readabilityScore = 50;
  let freshnessScore = 50;

  // --- Content Score ---

  // Title quality
  if (input.title) {
    const titleLen = input.title.length;
    if (titleLen >= 30 && titleLen <= 60) contentScore += 15; // ideal length
    else if (titleLen >= 20 && titleLen <= 70) contentScore += 8;
    else contentScore -= 5;

    // Title contains primary keyword
    if (input.primaryKeyword && input.title.toLowerCase().includes(input.primaryKeyword.toLowerCase())) {
      contentScore += 10;
    }
  } else {
    contentScore -= 15; // no title is bad
  }

  // Word count scoring
  if (input.wordCount) {
    if (input.wordCount >= 1500 && input.wordCount <= 3000) {
      contentScore += 15; // ideal long-form
    } else if (input.wordCount >= 800 && input.wordCount <= 5000) {
      contentScore += 10;
    } else if (input.wordCount >= 300) {
      contentScore += 5;
    } else {
      contentScore -= 10; // thin content
    }
  } else {
    contentScore -= 5;
  }

  // URL quality
  if (input.url) {
    const path = new URL(input.url).pathname;
    if (path.length < 80) contentScore += 5; // short URLs rank better
    if (!path.includes("?")) contentScore += 3; // clean URLs
    if (input.primaryKeyword) {
      const slug = path.toLowerCase().replace(/[^a-z0-9]/g, " ");
      const kwWords = input.primaryKeyword.toLowerCase().split(" ");
      const matchCount = kwWords.filter((w) => slug.includes(w)).length;
      if (matchCount > 0) contentScore += Math.min(10, matchCount * 4);
    }
  }

  // --- Readability Score ---

  if (input.wordCount) {
    // Longer content with structure tends to be more readable
    if (input.wordCount >= 600 && input.wordCount <= 2500) readabilityScore += 15;
    else if (input.wordCount >= 300) readabilityScore += 8;
    else readabilityScore -= 10;
  }

  if (input.title) {
    // Titles that are clear and concise score higher
    const titleWords = input.title.split(/\s+/).length;
    if (titleWords >= 4 && titleWords <= 12) readabilityScore += 10;
    else if (titleWords >= 3 && titleWords <= 15) readabilityScore += 5;
  }

  // --- Freshness Score ---
  // Without last_modified data, we use a base score
  // This will be enhanced when we can check actual page dates
  freshnessScore = 60;

  // Clamp all scores to 0-100
  contentScore = Math.max(0, Math.min(100, contentScore));
  readabilityScore = Math.max(0, Math.min(100, readabilityScore));
  freshnessScore = Math.max(0, Math.min(100, freshnessScore));

  return { contentScore, readabilityScore, freshnessScore };
}
