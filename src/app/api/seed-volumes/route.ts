import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedDemoVolumes } from "@/lib/actions/seed-volumes";

/**
 * GET /api/seed-volumes
 * Seeds demo volume data for the user's active project.
 * Only works in development or for authenticated users.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "No active project" }, { status: 400 });
  }

  const result = await seedDemoVolumes(project.id);
  return NextResponse.json(result);
}
