import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";

const PROJECT_COLUMNS =
  "id, organization_id, name, type, domain, url, app_store_id, play_store_id, target_countries, target_languages, search_engines, is_active, authority_score, health_score, last_crawl_at, last_rank_check, created_at";

/**
 * Fetch all projects for the current user's organization.
 * RLS scopes results to the user's org automatically.
 * Mirrors web DAL projects.ts → getProjects().
 */
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_COLUMNS)
        .order("created_at", { ascending: false });

      if (error || !data) return [];

      return data as Project[];
    },
  });
}

/**
 * Fetch the first active project (is_active = true).
 * Mirrors web DAL projects.ts → getActiveProject().
 */
export function useActiveProject() {
  return useQuery<Project | null>({
    queryKey: ["activeProject"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_COLUMNS)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error || !data) return null;

      return data as Project;
    },
  });
}

/**
 * Mutation to switch the active project.
 * Deactivates all projects in the org, then activates the selected one.
 */
export function useSwitchProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Get the user's org_id from their profile to scope the update
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) throw new Error("No organization found");

      // Deactivate all projects in the org
      const { error: deactivateError } = await supabase
        .from("projects")
        .update({ is_active: false })
        .eq("organization_id", profile.organization_id);

      if (deactivateError) throw deactivateError;

      // Activate the selected project
      const { error: activateError } = await supabase
        .from("projects")
        .update({ is_active: true })
        .eq("id", projectId);

      if (activateError) throw activateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activeProject"] });
    },
  });
}

/**
 * Mutation to create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      project: Omit<Project, "id" | "created_at" | "authority_score" | "health_score" | "last_crawl_at" | "last_rank_check">
    ) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(project)
        .select(PROJECT_COLUMNS)
        .single();

      if (error) throw error;

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activeProject"] });
    },
  });
}
