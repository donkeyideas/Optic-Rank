import * as cheerio from "cheerio";

/* ── Meta Tag Analysis ───────────────────────────────────────── */

export interface MetaTagAnalysis {
  url: string;
  title: { value: string; length: number; status: "good" | "warning" | "error" };
  description: { value: string; length: number; status: "good" | "warning" | "error" };
  canonical: string | null;
  robots: string | null;
  h1: { count: number; values: string[] };
  wordCount: number;
  ogTags: {
    title: string | null;
    description: string | null;
    image: string | null;
    type: string | null;
  };
  twitterCard: {
    card: string | null;
    title: string | null;
    description: string | null;
    image: string | null;
  };
  schemaTypes: string[];
  issues: string[];
  score: number;
}

export function analyzeMetaTags(html: string, url: string): MetaTagAnalysis {
  const $ = cheerio.load(html);
  const issues: string[] = [];
  let score = 100;

  // Title
  const titleText = $("title").text().trim();
  const titleLen = titleText.length;
  let titleStatus: "good" | "warning" | "error" = "good";
  if (!titleText) {
    titleStatus = "error";
    issues.push("Missing title tag");
    score -= 20;
  } else if (titleLen < 30) {
    titleStatus = "warning";
    issues.push("Title tag is too short (under 30 characters)");
    score -= 5;
  } else if (titleLen > 60) {
    titleStatus = "warning";
    issues.push("Title tag is too long (over 60 characters)");
    score -= 5;
  }

  // Description
  const descText = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const descLen = descText.length;
  let descStatus: "good" | "warning" | "error" = "good";
  if (!descText) {
    descStatus = "error";
    issues.push("Missing meta description");
    score -= 15;
  } else if (descLen < 70) {
    descStatus = "warning";
    issues.push("Meta description is too short (under 70 characters)");
    score -= 5;
  } else if (descLen > 160) {
    descStatus = "warning";
    issues.push("Meta description is too long (over 160 characters)");
    score -= 5;
  }

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") ?? null;
  if (!canonical) {
    issues.push("Missing canonical URL");
    score -= 5;
  }

  // Robots
  const robots = $('meta[name="robots"]').attr("content") ?? null;

  // H1
  const h1Values: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $("h1").each((_: any, el: any) => { h1Values.push($(el).text().trim()); });
  if (h1Values.length === 0) {
    issues.push("Missing H1 tag");
    score -= 10;
  } else if (h1Values.length > 1) {
    issues.push(`Multiple H1 tags found (${h1Values.length})`);
    score -= 5;
  }

  // Word count
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    issues.push("Low word count (under 300 words)");
    score -= 10;
  }

  // Open Graph
  const ogTags = {
    title: $('meta[property="og:title"]').attr("content") ?? null,
    description: $('meta[property="og:description"]').attr("content") ?? null,
    image: $('meta[property="og:image"]').attr("content") ?? null,
    type: $('meta[property="og:type"]').attr("content") ?? null,
  };
  if (!ogTags.title) {
    issues.push("Missing og:title");
    score -= 5;
  }
  if (!ogTags.image) {
    issues.push("Missing og:image");
    score -= 5;
  }

  // Twitter Card
  const twitterCard = {
    card: $('meta[name="twitter:card"]').attr("content") ?? null,
    title: $('meta[name="twitter:title"]').attr("content") ?? null,
    description: $('meta[name="twitter:description"]').attr("content") ?? null,
    image: $('meta[name="twitter:image"]').attr("content") ?? null,
  };

  // Schema / JSON-LD
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "{}");
      if (data["@type"]) schemaTypes.push(data["@type"]);
      if (Array.isArray(data["@graph"])) {
        for (const item of data["@graph"]) {
          if (item["@type"]) schemaTypes.push(item["@type"]);
        }
      }
    } catch {
      // Skip invalid JSON-LD
    }
  });
  if (schemaTypes.length === 0) {
    issues.push("No structured data (JSON-LD) found");
    score -= 10;
  }

  return {
    url,
    title: { value: titleText, length: titleLen, status: titleStatus },
    description: { value: descText, length: descLen, status: descStatus },
    canonical,
    robots,
    h1: { count: h1Values.length, values: h1Values.slice(0, 3) },
    wordCount,
    ogTags,
    twitterCard,
    schemaTypes,
    issues,
    score: Math.max(0, score),
  };
}

/* ── Keyword Density ─────────────────────────────────────────── */

export interface DensityResult {
  phrase: string;
  count: number;
  density: number;
}

const STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there",
  "their", "what", "so", "up", "out", "if", "about", "who", "get",
  "which", "go", "me", "when", "make", "can", "like", "no", "just",
  "him", "know", "take", "people", "into", "year", "your", "some",
  "them", "than", "then", "now", "look", "only", "come", "its",
  "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want",
  "because", "any", "these", "give", "day", "most", "us", "is",
  "was", "are", "been", "has", "had", "were", "did", "does", "am",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function getNGrams(words: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

export function calculateKeywordDensity(text: string): {
  wordCount: number;
  unigrams: DensityResult[];
  bigrams: DensityResult[];
  trigrams: DensityResult[];
} {
  const words = tokenize(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  function countAndSort(phrases: string[], top: number): DensityResult[] {
    const counts = new Map<string, number>();
    for (const phrase of phrases) {
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([phrase, count]) => ({
        phrase,
        count,
        density: Math.round((count / wordCount) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top);
  }

  return {
    wordCount,
    unigrams: countAndSort(words, 20),
    bigrams: countAndSort(getNGrams(words, 2), 15),
    trigrams: countAndSort(getNGrams(words, 3), 10),
  };
}

export function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, aside").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
