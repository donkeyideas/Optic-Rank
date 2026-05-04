import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { calculateKeywordDensity, extractTextFromHTML } from "@/lib/tools/text-analysis";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const limited = rateLimit(`tools:density:${ip}`, { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { url, text } = body as { url?: string; text?: string };

    if (!url && !text) {
      return NextResponse.json(
        { error: "Provide either a URL or text to analyze" },
        { status: 400 }
      );
    }

    let contentText: string;

    if (url) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpticRankBot/1.0; +https://opticrank.com/bot)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL (HTTP ${response.status})` },
          { status: 422 }
        );
      }

      const html = await response.text();
      contentText = extractTextFromHTML(html);
    } else {
      contentText = text!;
    }

    if (contentText.length < 10) {
      return NextResponse.json(
        { error: "Not enough content to analyze" },
        { status: 422 }
      );
    }

    const analysis = calculateKeywordDensity(contentText);

    return NextResponse.json({ data: analysis });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out (10s limit)" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to analyze content" }, { status: 500 });
  }
}
