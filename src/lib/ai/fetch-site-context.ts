/**
 * Fetches a website's meta information to provide context for AI generation.
 * Used by keyword generation, competitor discovery, etc.
 */

interface SiteContext {
  title: string;
  description: string;
  industry: string;
}

/**
 * Fetch the homepage title and meta description to understand what the site does.
 */
export async function fetchSiteContext(domain: string): Promise<SiteContext> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OpticRank/1.0; +https://opticrank.com)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!response.ok) {
      return fallbackContext(domain);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";

    // Extract meta description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
    ) || html.match(
      /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i
    );
    const description = descMatch ? descMatch[1].trim().replace(/\s+/g, " ") : "";

    // Extract og:description as fallback
    const ogDescMatch = html.match(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
    ) || html.match(
      /<meta[^>]*content=["']([\s\S]*?)["'][^>]*property=["']og:description["'][^>]*>/i
    );
    const ogDescription = ogDescMatch ? ogDescMatch[1].trim().replace(/\s+/g, " ") : "";

    // Extract keywords meta
    const keywordsMatch = html.match(
      /<meta[^>]*name=["']keywords["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
    );
    const metaKeywords = keywordsMatch ? keywordsMatch[1].trim() : "";

    // Try to detect industry from content
    const fullDesc = description || ogDescription;
    const industry = detectIndustry(title, fullDesc, metaKeywords, domain);

    return {
      title: title.slice(0, 200),
      description: (fullDesc || `Website at ${domain}`).slice(0, 500),
      industry,
    };
  } catch (err) {
    console.error(`[fetchSiteContext] Failed to fetch ${domain}:`, err);
    return fallbackContext(domain);
  }
}

function fallbackContext(domain: string): SiteContext {
  return {
    title: domain,
    description: `Website at ${domain}`,
    industry: "general",
  };
}

function detectIndustry(title: string, description: string, keywords: string, domain: string): string {
  const text = `${title} ${description} ${keywords} ${domain}`.toLowerCase();

  const industryPatterns: [string, string[]][] = [
    ["fintech", ["fintech", "invest", "trading", "finance", "banking", "payment", "crypto", "stock", "portfolio", "wealth", "money", "fund", "loan", "credit", "debit", "neobank", "micro-invest"]],
    ["ecommerce", ["shop", "store", "buy", "cart", "commerce", "retail", "product", "marketplace"]],
    ["saas", ["saas", "software", "platform", "dashboard", "analytics", "tool", "automation", "workflow"]],
    ["healthcare", ["health", "medical", "clinic", "doctor", "patient", "wellness", "pharma", "therapy"]],
    ["education", ["learn", "course", "education", "tutorial", "training", "school", "university", "academy"]],
    ["marketing", ["seo", "marketing", "ads", "advertising", "content", "social media", "brand", "campaign"]],
    ["real-estate", ["real estate", "property", "home", "house", "rent", "mortgage", "listing"]],
    ["travel", ["travel", "hotel", "flight", "booking", "vacation", "tour", "destination"]],
    ["food", ["food", "restaurant", "recipe", "meal", "delivery", "kitchen", "cook"]],
    ["fitness", ["fitness", "gym", "workout", "exercise", "training", "sport", "yoga"]],
    ["technology", ["tech", "ai", "machine learning", "cloud", "data", "developer", "api", "code"]],
  ];

  for (const [industry, patterns] of industryPatterns) {
    if (patterns.some((p) => text.includes(p))) {
      return industry;
    }
  }

  return "general";
}
