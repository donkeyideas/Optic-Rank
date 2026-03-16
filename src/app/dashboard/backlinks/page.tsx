import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BacklinksPageClient } from "./backlinks-client";

/* ------------------------------------------------------------------
   Empty State Components
   ------------------------------------------------------------------ */

function NoOrgState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Organization Required
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          You need to create an organization before viewing backlink data.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Set Up Organization
      </Link>
    </div>
  );
}

function NoProjectState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          No Active Project
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          Create a project to start monitoring your backlink profile.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Create Your First Project
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------
   Backlinks Page (Server Wrapper)
   ------------------------------------------------------------------ */

export default async function BacklinksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return <NoOrgState />;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!project) {
    return <NoProjectState />;
  }

  // ------------------------------------------------------------------
  // Fetch REAL backlink data
  // ------------------------------------------------------------------

  // All backlinks (paginated, ordered by first_seen desc)
  const { data: backlinks, count: allCount } = await supabase
    .from("backlinks")
    .select("*", { count: "exact" })
    .eq("project_id", project.id)
    .order("first_seen", { ascending: false })
    .limit(50);

  // Stats counts
  const { count: totalCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id);

  const { count: toxicCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id)
    .eq("is_toxic", true);

  const { count: newCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id)
    .eq("status", "new");

  const { count: lostCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id)
    .eq("status", "lost");

  const { count: dofollowCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id)
    .eq("link_type", "dofollow");

  // Compute dofollow percentage
  const total = totalCount ?? 0;
  const dofollow = dofollowCount ?? 0;
  const dofollowPct = total > 0 ? Math.round((dofollow / total) * 100) : 0;

  // Unique referring domains: get distinct source_domain count
  // We can approximate by getting all source_domains and counting unique
  const { data: domainData } = await supabase
    .from("backlinks")
    .select("source_domain")
    .eq("project_id", project.id);

  const referringDomains = domainData
    ? new Set(domainData.map((d) => d.source_domain)).size
    : 0;

  return (
    <BacklinksPageClient
      projectId={project.id}
      backlinks={backlinks ?? []}
      totalCount={allCount ?? 0}
      stats={{
        total: total,
        referringDomains,
        dofollowPct,
        toxicCount: toxicCount ?? 0,
        newCount: newCount ?? 0,
        lostCount: lostCount ?? 0,
      }}
    />
  );
}
