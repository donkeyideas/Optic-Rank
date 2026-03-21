import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "keywords:read");
  if (scopeErr) return scopeErr;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = createAdminClient();

  // Verify project belongs to org
  let query = supabase
    .from("keywords")
    .select("id, keyword, current_position, previous_position, search_volume, difficulty, device, location, updated_at", { count: "exact" });

  if (projectId) {
    // Verify ownership
    const { data: proj } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("organization_id", (auth as ApiAuth).orgId)
      .single();

    if (!proj) {
      return NextResponse.json({ error: "Project not found." }, { status: 404, headers: corsHeaders() });
    }
    query = query.eq("project_id", projectId);
  } else {
    // Filter to org's projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", (auth as ApiAuth).orgId);

    const projectIds = (projects ?? []).map((p) => p.id);
    if (projectIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 }, { headers: corsHeaders() });
    }
    query = query.in("project_id", projectIds);
  }

  const { data, count, error } = await query
    .order("current_position", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders() });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0 }, { headers: corsHeaders() });
}
