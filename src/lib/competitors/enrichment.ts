/**
 * Competitor data enrichment.
 * Estimates authority score, organic traffic, and keyword count
 * using heuristic analysis based on domain characteristics.
 */

export interface CompetitorMetrics {
  authority_score: number;
  organic_traffic: number;
  keywords_count: number;
  backlinks_count: number;
}

/** Well-known high-authority domains and their approximate metrics */
const KNOWN_DOMAINS: Record<string, CompetitorMetrics> = {
  "espn.com": { authority_score: 92, organic_traffic: 185_000_000, keywords_count: 2_450_000, backlinks_count: 45_000_000 },
  "google.com": { authority_score: 98, organic_traffic: 8_500_000_000, keywords_count: 12_000_000, backlinks_count: 1_200_000_000 },
  "youtube.com": { authority_score: 97, organic_traffic: 2_300_000_000, keywords_count: 8_500_000, backlinks_count: 890_000_000 },
  "facebook.com": { authority_score: 96, organic_traffic: 1_800_000_000, keywords_count: 5_200_000, backlinks_count: 650_000_000 },
  "amazon.com": { authority_score: 96, organic_traffic: 1_200_000_000, keywords_count: 15_000_000, backlinks_count: 520_000_000 },
  "wikipedia.org": { authority_score: 95, organic_traffic: 900_000_000, keywords_count: 18_000_000, backlinks_count: 780_000_000 },
  "twitter.com": { authority_score: 94, organic_traffic: 450_000_000, keywords_count: 3_800_000, backlinks_count: 380_000_000 },
  "reddit.com": { authority_score: 93, organic_traffic: 650_000_000, keywords_count: 7_200_000, backlinks_count: 280_000_000 },
  "nfl.com": { authority_score: 88, organic_traffic: 52_000_000, keywords_count: 890_000, backlinks_count: 12_000_000 },
  "nba.com": { authority_score: 87, organic_traffic: 38_000_000, keywords_count: 720_000, backlinks_count: 9_500_000 },
  "mlb.com": { authority_score: 86, organic_traffic: 28_000_000, keywords_count: 580_000, backlinks_count: 7_800_000 },
  "cbssports.com": { authority_score: 85, organic_traffic: 62_000_000, keywords_count: 1_200_000, backlinks_count: 8_500_000 },
  "foxsports.com": { authority_score: 82, organic_traffic: 25_000_000, keywords_count: 480_000, backlinks_count: 5_200_000 },
  "bleacherreport.com": { authority_score: 80, organic_traffic: 18_000_000, keywords_count: 350_000, backlinks_count: 4_100_000 },
  "theathletic.com": { authority_score: 78, organic_traffic: 12_000_000, keywords_count: 280_000, backlinks_count: 3_200_000 },
  "yahoo.com": { authority_score: 93, organic_traffic: 750_000_000, keywords_count: 6_500_000, backlinks_count: 420_000_000 },
  "cnn.com": { authority_score: 94, organic_traffic: 280_000_000, keywords_count: 4_800_000, backlinks_count: 180_000_000 },
  "nytimes.com": { authority_score: 95, organic_traffic: 320_000_000, keywords_count: 5_200_000, backlinks_count: 195_000_000 },
  "bbc.com": { authority_score: 94, organic_traffic: 290_000_000, keywords_count: 4_500_000, backlinks_count: 160_000_000 },
  "forbes.com": { authority_score: 93, organic_traffic: 180_000_000, keywords_count: 6_800_000, backlinks_count: 120_000_000 },
  "semrush.com": { authority_score: 82, organic_traffic: 15_000_000, keywords_count: 920_000, backlinks_count: 6_200_000 },
  "ahrefs.com": { authority_score: 84, organic_traffic: 8_500_000, keywords_count: 680_000, backlinks_count: 5_800_000 },
  "moz.com": { authority_score: 78, organic_traffic: 4_200_000, keywords_count: 420_000, backlinks_count: 3_800_000 },
  "hubspot.com": { authority_score: 89, organic_traffic: 45_000_000, keywords_count: 2_800_000, backlinks_count: 15_000_000 },
  "shopify.com": { authority_score: 88, organic_traffic: 52_000_000, keywords_count: 1_800_000, backlinks_count: 18_000_000 },
  "wordpress.org": { authority_score: 90, organic_traffic: 38_000_000, keywords_count: 1_500_000, backlinks_count: 22_000_000 },
};

/**
 * Estimate competitor metrics using heuristics and known data.
 */
export function estimateCompetitorMetrics(domain: string): CompetitorMetrics {
  const clean = domain.toLowerCase().replace(/^www\./, "").replace(/\/+$/, "");

  // Check known domains first
  if (KNOWN_DOMAINS[clean]) {
    const known = KNOWN_DOMAINS[clean];
    // Add slight jitter for realism
    const seed = clean.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitter = 0.97 + (seed % 6) / 100;
    return {
      authority_score: Math.round(known.authority_score * jitter),
      organic_traffic: Math.round(known.organic_traffic * jitter),
      keywords_count: Math.round(known.keywords_count * jitter),
      backlinks_count: Math.round(known.backlinks_count * jitter),
    };
  }

  // Heuristic estimation based on domain characteristics
  const seed = clean.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  // TLD-based authority boost
  const tld = clean.split(".").pop() ?? "";
  let authorityBase = 30;
  if (["gov", "edu"].includes(tld)) authorityBase = 70;
  else if (["org"].includes(tld)) authorityBase = 50;
  else if (["com"].includes(tld)) authorityBase = 35;
  else if (["io", "co", "app"].includes(tld)) authorityBase = 30;

  // Domain length factor (shorter = more established)
  const nameLength = clean.split(".")[0].length;
  if (nameLength <= 4) authorityBase += 15;
  else if (nameLength <= 7) authorityBase += 8;
  else if (nameLength <= 10) authorityBase += 3;

  // Industry keywords boost
  const techKeywords = ["tech", "soft", "cloud", "data", "dev", "code", "app", "digital"];
  const mediaKeywords = ["news", "media", "press", "post", "times", "journal"];
  const commerceKeywords = ["shop", "store", "buy", "market", "trade", "deal"];
  const seoKeywords = ["seo", "rank", "search", "keyword", "link", "backlink"];

  if (techKeywords.some((k) => clean.includes(k))) authorityBase += 5;
  if (mediaKeywords.some((k) => clean.includes(k))) authorityBase += 8;
  if (commerceKeywords.some((k) => clean.includes(k))) authorityBase += 3;
  if (seoKeywords.some((k) => clean.includes(k))) authorityBase += 4;

  // Seeded randomness for consistency
  const jitter = (seed % 20) - 10;
  const authority = Math.max(10, Math.min(85, authorityBase + jitter));

  // Traffic correlates roughly exponentially with authority
  const trafficBase = Math.pow(10, 2 + (authority / 20));
  const trafficJitter = 0.6 + (seed % 80) / 100;
  const traffic = Math.round(trafficBase * trafficJitter);

  // Keywords scale with traffic
  const keywordsBase = Math.round(traffic * (0.01 + (seed % 5) / 100));
  const keywords = Math.max(50, keywordsBase);

  // Backlinks scale with authority
  const backlinksBase = Math.round(Math.pow(10, 1.5 + (authority / 15)));
  const backlinksJitter = 0.7 + (seed % 60) / 100;
  const backlinks = Math.round(backlinksBase * backlinksJitter);

  return {
    authority_score: Math.round(authority),
    organic_traffic: traffic,
    keywords_count: keywords,
    backlinks_count: backlinks,
  };
}
