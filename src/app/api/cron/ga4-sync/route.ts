/**
 * Cron API route for daily GA4 data sync.
 * Fetches GA4 analytics for all projects with connected GA4 properties.
 * Scheduled: daily 3 AM (vercel.json).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncGA4ForProject } from "@/lib/actions/ga4-import";

export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Find all projects with a GA4 property configured
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .not("ga4_property_id", "is", null);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ synced: 0, message: "No projects with GA4 configured" });
  }

  let synced = 0;
  const errors: string[] = [];

  for (const project of projects) {
    try {
      const ok = await syncGA4ForProject(project.id);
      if (ok) synced++;
    } catch (err) {
      errors.push(`${project.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    synced,
    total: projects.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
