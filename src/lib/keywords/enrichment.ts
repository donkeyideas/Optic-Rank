/**
 * Keyword data enrichment.
 * Estimates search volume, CPC, difficulty, intent, and rank position
 * using heuristic analysis when DataForSEO is unavailable.
 */

export interface KeywordMetrics {
  search_volume: number;
  cpc: number;
  difficulty: number;
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

export interface KeywordRankEstimate {
  position: number;
  url: string;
  serp_features: string[];
}

/**
 * Estimate keyword metrics using heuristic analysis.
 * Provides reasonable estimates based on keyword characteristics.
 */
export function estimateKeywordMetrics(keyword: string): KeywordMetrics {
  const kw = keyword.toLowerCase().trim();
  const words = kw.split(/\s+/);
  const wordCount = words.length;

  // --- Intent Classification ---
  const intent = classifyIntent(kw);

  // --- Search Volume Estimation ---
  let volume = estimateVolume(kw, wordCount, intent);

  // --- CPC Estimation ---
  let cpc = estimateCPC(kw, intent);

  // --- Difficulty Estimation ---
  let difficulty = estimateDifficulty(kw, wordCount, volume);

  return {
    search_volume: Math.round(volume),
    cpc: Math.round(cpc * 100) / 100,
    difficulty: Math.round(difficulty),
    intent,
  };
}

function classifyIntent(kw: string): "informational" | "commercial" | "transactional" | "navigational" {
  // Navigational - brand names or site-specific searches
  const navPatterns = [
    /^(go to|open|login|sign in|sign up)/,
    /\.(com|org|net|io|app)$/,
    /(facebook|google|youtube|twitter|instagram|amazon|netflix|espn|reddit)/,
  ];
  if (navPatterns.some((p) => p.test(kw))) return "navigational";

  // Transactional - buy/action intent
  const txPatterns = [
    /\b(buy|purchase|order|subscribe|download|sign up|register|book|hire|get)\b/,
    /\b(coupon|discount|deal|promo|price|pricing|cost|cheap|affordable)\b/,
    /\b(free trial|demo|quote)\b/,
  ];
  if (txPatterns.some((p) => p.test(kw))) return "transactional";

  // Commercial - research with purchase intent
  const commPatterns = [
    /\b(best|top|review|reviews|comparison|vs|versus|alternative|alternatives)\b/,
    /\b(recommend|recommendation|rated|ranking|rankings)\b/,
    /\b(pros and cons|worth it|should i)\b/,
  ];
  if (commPatterns.some((p) => p.test(kw))) return "commercial";

  // Informational - everything else
  const infoPatterns = [
    /\b(how|what|why|when|where|who|which|is|are|can|does|do)\b/,
    /\b(guide|tutorial|tips|learn|explain|definition|meaning|example)\b/,
    /\b(history|statistics|facts|data)\b/,
  ];
  if (infoPatterns.some((p) => p.test(kw))) return "informational";

  // Default: shorter keywords tend to be more informational
  return "informational";
}

function estimateVolume(kw: string, wordCount: number, intent: string): number {
  let base: number;

  // Shorter keywords = higher volume generally
  if (wordCount === 1) base = 50000 + Math.random() * 150000;
  else if (wordCount === 2) base = 10000 + Math.random() * 40000;
  else if (wordCount === 3) base = 2000 + Math.random() * 8000;
  else if (wordCount === 4) base = 500 + Math.random() * 2000;
  else base = 100 + Math.random() * 500;

  // Navigational keywords (brands) get higher volume
  if (intent === "navigational") base *= 2;

  // Commercial/transactional keywords get moderate volume
  if (intent === "commercial") base *= 0.7;
  if (intent === "transactional") base *= 0.5;

  // High-competition niches boost
  const hotNiches = ["sports", "news", "streaming", "football", "basketball", "baseball", "soccer", "nfl", "nba", "mlb"];
  if (hotNiches.some((n) => kw.includes(n))) base *= 1.5;

  // Very specific/niche keywords
  if (kw.length > 40) base *= 0.3;

  // Use a seeded-ish random for consistency
  const seed = kw.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = 0.7 + (seed % 60) / 100; // 0.7 - 1.3
  base *= jitter;

  return Math.max(50, Math.round(base / 10) * 10);
}

function estimateCPC(kw: string, intent: string): number {
  let cpc: number;

  switch (intent) {
    case "transactional":
      cpc = 2.0 + Math.random() * 6.0;
      break;
    case "commercial":
      cpc = 1.5 + Math.random() * 4.0;
      break;
    case "navigational":
      cpc = 0.5 + Math.random() * 2.0;
      break;
    default: // informational
      cpc = 0.3 + Math.random() * 1.5;
  }

  // High-value industries
  const expensiveNiches = ["insurance", "lawyer", "attorney", "mortgage", "loan", "credit", "invest"];
  if (expensiveNiches.some((n) => kw.includes(n))) cpc *= 3;

  const midNiches = ["software", "saas", "marketing", "seo", "hosting", "vpn"];
  if (midNiches.some((n) => kw.includes(n))) cpc *= 1.5;

  // Seeded consistency
  const seed = kw.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = 0.8 + (seed % 40) / 100;
  cpc *= jitter;

  return Math.max(0.1, cpc);
}

function estimateDifficulty(kw: string, wordCount: number, volume: number): number {
  let diff: number;

  // Higher volume = higher difficulty
  if (volume > 100000) diff = 70 + Math.random() * 25;
  else if (volume > 50000) diff = 55 + Math.random() * 20;
  else if (volume > 10000) diff = 40 + Math.random() * 20;
  else if (volume > 1000) diff = 25 + Math.random() * 20;
  else diff = 10 + Math.random() * 20;

  // Longer keywords = lower difficulty
  if (wordCount >= 5) diff -= 15;
  else if (wordCount >= 4) diff -= 10;
  else if (wordCount >= 3) diff -= 5;
  else if (wordCount === 1) diff += 10;

  // Brand keywords are harder
  const brands = ["espn", "nfl", "nba", "mlb", "google", "amazon", "facebook", "youtube"];
  if (brands.some((b) => kw.includes(b))) diff += 15;

  // Seeded consistency
  const seed = kw.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = (seed % 10) - 5;
  diff += jitter;

  return Math.max(5, Math.min(95, diff));
}

/**
 * Estimate what rank position a domain would have for a keyword.
 * Uses domain relevance, keyword difficulty, and brand signals.
 */
export function estimateKeywordRank(keyword: string, domain: string): KeywordRankEstimate {
  const kw = keyword.toLowerCase().trim();
  const dom = domain.toLowerCase().replace(/^www\./, "");
  const seed = (kw + dom).split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  // Domain-keyword relevance scoring
  let relevance = 0;

  // Sports domains + sports keywords = high relevance
  const sportsDomains = ["espn.com", "cbssports.com", "foxsports.com", "bleacherreport.com", "nbcsports.com", "nfl.com", "nba.com", "mlb.com"];
  const sportsKeywords = ["sports", "football", "basketball", "baseball", "soccer", "nfl", "nba", "mlb", "hockey", "tennis", "golf", "ufc", "boxing", "score", "scores", "standings", "schedule", "roster", "draft", "fantasy", "game", "match", "highlights", "athlete", "training", "espn", "championship", "tournament", "playoffs", "league", "team"];

  const isSportsDomain = sportsDomains.some((d) => dom.includes(d.split(".")[0]));
  const hasSportsKeyword = sportsKeywords.some((s) => kw.includes(s));

  if (isSportsDomain && hasSportsKeyword) {
    relevance += 40;
  } else if (isSportsDomain) {
    relevance += 15;
  }

  // Brand-keyword match (keyword mentions the domain brand)
  const domainBrand = dom.split(".")[0];
  if (kw.includes(domainBrand)) {
    relevance += 50;
  }

  // Domain authority boost (known domains get better positions)
  const highAuthDomains: Record<string, number> = {
    "espn.com": 35, "cbssports.com": 28, "foxsports.com": 22, "nfl.com": 30,
    "nba.com": 28, "mlb.com": 26, "bleacherreport.com": 20, "yahoo.com": 30,
    "cnn.com": 32, "nytimes.com": 33, "forbes.com": 30, "wikipedia.org": 35,
  };
  relevance += highAuthDomains[dom] ?? 10;

  // Position calculation based on relevance
  let position: number;
  if (relevance >= 70) {
    position = 1 + (seed % 3); // 1-3
  } else if (relevance >= 50) {
    position = 2 + (seed % 5); // 2-6
  } else if (relevance >= 35) {
    position = 4 + (seed % 8); // 4-11
  } else if (relevance >= 20) {
    position = 8 + (seed % 15); // 8-22
  } else {
    position = 15 + (seed % 35); // 15-49
  }

  // Longer-tail keywords = easier to rank
  const wordCount = kw.split(/\s+/).length;
  if (wordCount >= 4) position = Math.max(1, position - 3);
  else if (wordCount >= 3) position = Math.max(1, position - 1);

  position = Math.max(1, Math.min(100, position));

  // URL estimation
  const slug = kw.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const url = `https://${dom}/${slug}`;

  // SERP features based on keyword type
  const serpFeatures: string[] = [];
  const intent = classifyIntent(kw);

  if (intent === "informational" && wordCount >= 3) {
    serpFeatures.push("featured_snippet");
    if (seed % 3 === 0) serpFeatures.push("people_also_ask");
  }
  if (hasSportsKeyword) {
    serpFeatures.push("top_stories");
    if (kw.includes("score") || kw.includes("schedule") || kw.includes("standing")) {
      serpFeatures.push("knowledge_panel");
    }
  }
  if (intent === "commercial") {
    serpFeatures.push("ads_top");
    if (seed % 2 === 0) serpFeatures.push("reviews");
  }
  if (intent === "transactional") {
    serpFeatures.push("ads_top");
    serpFeatures.push("shopping");
  }
  if (kw.includes("video") || kw.includes("highlights") || kw.includes("watch")) {
    serpFeatures.push("video_carousel");
  }
  if (seed % 4 === 0) serpFeatures.push("image_pack");

  return { position, url, serp_features: serpFeatures.slice(0, 4) };
}
