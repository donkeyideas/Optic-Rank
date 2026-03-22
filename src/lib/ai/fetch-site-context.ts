/**
 * Fetches a website's meta information to provide context for AI generation.
 * Used by keyword generation, competitor discovery, etc.
 */

interface SiteContext {
  title: string;
  description: string;
  industry: string;
  /** Key headings and content extracted from the page for better AI context */
  businessSummary: string;
}

/**
 * Fetch the homepage title, meta description, and key page content
 * to understand what the site does.
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

    // Extract H1 headings for business context
    const h1Matches = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    const h1s: string[] = [];
    for (const m of h1Matches) {
      const text = m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
      if (text && text.length > 2) h1s.push(text);
    }

    // Extract H2 headings for additional context
    const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
    const h2s: string[] = [];
    for (const m of h2Matches) {
      const text = m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
      if (text && text.length > 2) h2s.push(text);
    }

    // Extract navigation links for understanding site structure
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    const navLinks: string[] = [];
    if (navMatch) {
      const linkMatches = navMatch[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi);
      for (const m of linkMatches) {
        const text = m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
        if (text && text.length > 1 && text.length < 40) navLinks.push(text);
      }
    }

    // Build a business summary from all extracted content
    const summaryParts: string[] = [];
    if (h1s.length > 0) summaryParts.push(`Main headings: ${h1s.slice(0, 3).join(", ")}`);
    if (h2s.length > 0) summaryParts.push(`Section headings: ${h2s.slice(0, 6).join(", ")}`);
    if (navLinks.length > 0) summaryParts.push(`Navigation: ${[...new Set(navLinks)].slice(0, 10).join(", ")}`);
    if (metaKeywords) summaryParts.push(`Keywords: ${metaKeywords}`);
    const businessSummary = summaryParts.join("\n");

    // Try to detect industry from content
    const fullDesc = description || ogDescription;
    const allText = `${title} ${fullDesc} ${metaKeywords} ${h1s.join(" ")} ${h2s.join(" ")}`;
    const industry = detectIndustry(allText, domain);

    return {
      title: title.slice(0, 200),
      description: (fullDesc || `Website at ${domain}`).slice(0, 500),
      industry,
      businessSummary: businessSummary.slice(0, 1000),
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
    businessSummary: "",
  };
}

function detectIndustry(text: string, domain: string): string {
  const combined = `${text} ${domain}`.toLowerCase();

  const industryPatterns: [string, string[]][] = [
    ["insurance", ["insurance", "warranty", "coverage", "claims", "underwriting", "indemnity", "policyholder", "deductible", "premium", "insure", "extended warranty", "home warranty", "auto warranty", "protection plan"]],
    ["fintech", ["fintech", "invest", "trading", "finance", "banking", "payment", "crypto", "stock", "portfolio", "wealth", "money", "fund", "loan", "credit", "debit", "neobank", "micro-invest"]],
    ["ecommerce", ["shop", "store", "buy", "cart", "commerce", "retail", "product", "marketplace", "checkout", "order"]],
    ["saas", ["saas", "software", "platform", "dashboard", "analytics", "tool", "automation", "workflow", "crm", "erp"]],
    ["healthcare", ["health", "medical", "clinic", "doctor", "patient", "wellness", "pharma", "therapy", "hospital", "dental"]],
    ["education", ["learn", "course", "education", "tutorial", "training", "school", "university", "academy", "online class", "certification"]],
    ["marketing", ["seo", "marketing", "ads", "advertising", "content marketing", "social media marketing", "brand", "campaign", "email marketing"]],
    ["legal", ["lawyer", "attorney", "law firm", "legal", "litigation", "court", "paralegal", "counsel"]],
    ["real-estate", ["real estate", "property", "home", "house", "rent", "mortgage", "listing", "realtor", "realty"]],
    ["automotive", ["car", "auto", "vehicle", "dealership", "automotive", "truck", "motor", "repair shop", "mechanic"]],
    ["travel", ["travel", "hotel", "flight", "booking", "vacation", "tour", "destination", "resort", "airline"]],
    ["food", ["food", "restaurant", "recipe", "meal", "delivery", "kitchen", "cook", "catering", "grocery"]],
    ["fitness", ["fitness", "gym", "workout", "exercise", "training", "sport", "yoga", "personal trainer"]],
    ["construction", ["construction", "contractor", "builder", "roofing", "plumbing", "hvac", "remodel", "renovation"]],
    ["consulting", ["consulting", "consultant", "advisory", "strategy", "management consulting"]],
    ["logistics", ["shipping", "logistics", "freight", "supply chain", "warehouse", "distribution", "courier"]],
    ["media", ["news", "media", "magazine", "publishing", "journalism", "editorial", "broadcast"]],
    ["technology", ["tech", "ai", "machine learning", "cloud", "data", "developer", "api", "code", "cybersecurity"]],
  ];

  for (const [industry, patterns] of industryPatterns) {
    if (patterns.some((p) => combined.includes(p))) {
      return industry;
    }
  }

  return "general";
}
