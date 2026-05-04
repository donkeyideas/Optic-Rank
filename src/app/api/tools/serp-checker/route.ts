import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { estimateKeywordMetrics } from "@/lib/keywords/enrichment";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`tools:serp:${ip}`, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { keyword } = body as { keyword?: string };

    if (!keyword || typeof keyword !== "string" || keyword.trim().length < 2) {
      return NextResponse.json({ error: "Keyword is required (min 2 characters)" }, { status: 400 });
    }

    const trimmed = keyword.trim().toLowerCase();

    // Try DataForSEO first if credentials available
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (login && password) {
      try {
        const { checkSERP } = await import("@/lib/api/dataforseo");
        const result = await checkSERP(trimmed, "", {});
        return NextResponse.json({
          data: {
            keyword: trimmed,
            source: "live",
            ...result,
          },
        });
      } catch {
        // Fall through to heuristic estimation
      }
    }

    // Fallback: heuristic estimation
    const metrics = estimateKeywordMetrics(trimmed);

    return NextResponse.json({
      data: {
        keyword: trimmed,
        source: "estimated",
        search_volume: metrics.search_volume,
        cpc: metrics.cpc,
        difficulty: metrics.difficulty,
        intent: metrics.intent,
        suggestions: [
          `${trimmed} best practices`,
          `${trimmed} tools`,
          `${trimmed} guide`,
          `how to ${trimmed}`,
          `${trimmed} for beginners`,
        ],
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to check SERP" }, { status: 500 });
  }
}
