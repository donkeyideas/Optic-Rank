import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";

const PROJECT_COLUMNS =
  "id, organization_id, name, type, domain, url, app_store_id, play_store_id, target_countries, target_languages, search_engines, is_active, authority_score, health_score, last_crawl_at, last_rank_check, created_at";

/**
 * Get all projects for the current user's organization.
 * RLS scopes results to the user's org automatically.
 */
export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as Project[];
}

/**
 * Get the first active project for the current user's organization.
 * Useful as a default project selection.
 */
export async function getActiveProject(): Promise<Project | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;

  return data as Project;
}

/**
 * Get a single project by its ID.
 * RLS ensures the user can only access projects in their org.
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return data as Project;
}
