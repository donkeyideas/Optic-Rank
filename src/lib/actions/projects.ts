"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { collectProjectData } from "@/lib/actions/collect";
import { checkPlanLimit } from "@/lib/stripe/plan-gate";

/**
 * Create a new project. If the user has no organization yet, create one first.
 */
export async function createProject(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "You must be signed in to create a project." };

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const domain = formData.get("domain") as string | null;
  const url = formData.get("url") as string | null;

  if (!name || !type) return { error: "Project name and type are required." };

  const supabase = createAdminClient();

  // Get the user's profile to find their org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  let orgId = profile?.organization_id;

  // If no organization, create one with 14-day trial
  if (!orgId) {
    const slug = `org-${Date.now().toString(36)}`;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: `${name} Organization`,
        slug,
        plan: "free",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select("id")
      .single();

    if (orgError || !org) {
      return { error: orgError?.message ?? "Failed to create organization." };
    }

    orgId = org.id;

    // Link the profile to the new org
    await supabase
      .from("profiles")
      .update({ organization_id: orgId, role: "owner" })
      .eq("id", user.id);
  }

  // Check plan limit for projects
  const planCheck = await checkPlanLimit(orgId, "projects");
  if (!planCheck.allowed) {
    return {
      error: `Project limit reached (${planCheck.current}/${planCheck.limit} on ${planCheck.plan} plan). Upgrade your plan to add more projects.`,
    };
  }

  // Deactivate all existing projects so the new one becomes active
  await supabase
    .from("projects")
    .update({ is_active: false })
    .eq("organization_id", orgId);

  const { data: newProject, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: orgId,
      is_active: true,
      name,
      type,
      domain: domain || null,
      url: url || null,
      app_store_id: (formData.get("app_store_id") as string) || null,
      play_store_id: (formData.get("play_store_id") as string) || null,
      target_countries: formData.get("target_countries")
        ? (formData.get("target_countries") as string).split(",").map((c) => c.trim())
        : ["US"],
      target_languages: formData.get("target_languages")
        ? (formData.get("target_languages") as string).split(",").map((l) => l.trim())
        : ["en"],
      search_engines: formData.get("search_engines")
        ? (formData.get("search_engines") as string).split(",").map((e) => e.trim())
        : ["google"],
    })
    .select("id")
    .single();

  if (projectError || !newProject) {
    return { error: projectError?.message ?? "Failed to create project." };
  }

  // Auto-collect data for the new project (keywords, PageSpeed, traffic)
  try {
    await collectProjectData(newProject.id);
  } catch (err) {
    // Don't fail project creation if data collection errors out
    console.error("[createProject] Data collection error:", err);
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Update an existing project.
 */
export async function updateProject(
  id: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};

  const name = formData.get("name") as string | null;
  if (name) updates.name = name;

  const domain = formData.get("domain") as string | null;
  if (domain !== null) updates.domain = domain || null;

  const url = formData.get("url") as string | null;
  if (url !== null) updates.url = url || null;

  const isActive = formData.get("is_active");
  if (isActive !== null) updates.is_active = isActive === "true";

  const targetCountries = formData.get("target_countries") as string | null;
  if (targetCountries) {
    updates.target_countries = targetCountries.split(",").map((c) => c.trim());
  }

  const targetLanguages = formData.get("target_languages") as string | null;
  if (targetLanguages) {
    updates.target_languages = targetLanguages.split(",").map((l) => l.trim());
  }

  const searchEngines = formData.get("search_engines") as string | null;
  if (searchEngines) {
    updates.search_engines = searchEngines.split(",").map((e) => e.trim());
  }

  if (Object.keys(updates).length === 0) return { error: "No fields to update." };

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Switch the active project for the user's organization.
 * Sets the given project to is_active=true and all others to is_active=false.
 */
export async function switchProject(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get the user's org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  // Deactivate all projects in the org
  await supabase
    .from("projects")
    .update({ is_active: false })
    .eq("organization_id", profile.organization_id);

  // Activate the selected project
  const { error } = await supabase
    .from("projects")
    .update({ is_active: true })
    .eq("id", projectId)
    .eq("organization_id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Delete a project by ID.
 */
export async function deleteProject(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
