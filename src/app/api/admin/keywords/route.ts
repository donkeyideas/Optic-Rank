import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/keywords — Add keywords from admin dashboard
 * Requires admin/superadmin system_role.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("system_role")
      .eq("id", user.id)
      .single();

    if (
      profile?.system_role !== "superadmin" &&
      profile?.system_role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { project_id, keywords } = body as {
      project_id: string;
      keywords: { keyword: string; search_engine?: string; device?: string; location?: string }[];
    };

    if (!project_id || !keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: "project_id and keywords[] are required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const { data: project } = await admin
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Insert keywords
    const rows = keywords.map((kw) => ({
      project_id,
      keyword: kw.keyword.trim().toLowerCase(),
      search_engine: kw.search_engine ?? "google",
      device: kw.device ?? "desktop",
      location: kw.location ?? "US",
      is_active: true,
    }));

    const { data: inserted, error } = await admin
      .from("keywords")
      .upsert(rows, {
        onConflict: "project_id,keyword,search_engine,device,location",
        ignoreDuplicates: true,
      })
      .select("id, keyword");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      inserted: inserted?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
