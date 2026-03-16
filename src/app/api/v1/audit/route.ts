import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, requireScope, corsHeaders, handleOptions, type ApiAuth } from "@/lib/api/v1/middleware";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: Request) {
  const auth = await validateApiKey(request);
  if ("error" in auth) return auth.error;

  const scopeErr = requireScope(auth as ApiAuth, "audit:read");
  if (scopeErr) return scopeErr;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  if (!projectId) {
    return NextResponse.json({ error: "project_id is required." }, { status: 400, headers: corsHeaders() });
  }

  const supabase = createAdminClient();

  const { data: proj } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("organization_id", (auth as ApiAuth).orgId)
    .single();

  if (!proj) {
    return NextResponse.json({ error: "Project not found." }, { status: 404, headers: corsHeaders() });
  }

  // Get latest audit
  const { data: audit, error: auditError } = await supabase
    .from("site_audits")
    .select("id, health_score, pages_scanned, passed_checks, issues_count, performance_score, seo_score, accessibility_score, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (auditError) {
    return NextResponse.json({ data: null, issues: [] }, { headers: corsHeaders() });
  }

  // Get issues for this audit
  const { data: issues } = await supabase
    .from("audit_issues")
    .select("id, title, issue_type, severity, category, affected_pages, recommendation")
    .eq("project_id", projectId)
    .order("severity", { ascending: true })
    .limit(50);

  return NextResponse.json(
    { data: audit, issues: issues ?? [] },
    { headers: corsHeaders() }
  );
}
