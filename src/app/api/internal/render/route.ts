/**
 * Internal render API — JS renders pages using self-hosted headless Chrome.
 *
 * POST /api/internal/render
 * Body: { urls: string[], options?: BrowserRenderOptions }
 * Returns: { results: BrowserRenderResult[] }
 *
 * Authenticated via X-Internal-Secret header.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  renderPages,
  closeBrowser,
  type BrowserRenderOptions,
} from "@/lib/crawl/browser-renderer";

export const maxDuration = 55;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { urls, options } = body as {
      urls: string[];
      options?: BrowserRenderOptions;
    };

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
    }

    // Cap at 5 URLs per request to stay within timeout
    const cappedUrls = urls.slice(0, 5);
    const results = await renderPages(cappedUrls, options);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[render-api] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rendering failed" },
      { status: 500 }
    );
  } finally {
    await closeBrowser();
  }
}
