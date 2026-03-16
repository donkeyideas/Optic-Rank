import { Masthead } from "@/components/editorial/masthead";
import { PaperHeader } from "@/components/editorial/paper-header";
import { PaperNav } from "@/components/editorial/paper-nav";
import { BottomBar } from "@/components/editorial/bottom-bar";
import { ProjectSelector } from "@/components/shared/project-selector";
import { GenerateAllButton } from "@/components/shared/generate-all-button";
import { createClient } from "@/lib/supabase/server";

const dashboardNavItems = [
  { href: "/dashboard",               label: "Dashboard" },
  { href: "/dashboard/keywords",      label: "Keywords" },
  { href: "/dashboard/competitors",   label: "Competitors" },
  { href: "/dashboard/content",       label: "Content" },
  { href: "/dashboard/backlinks",     label: "Backlinks" },
  { href: "/dashboard/site-audit",    label: "Site Audit" },
  { href: "/dashboard/app-store",     label: "App Store" },
  { href: "/dashboard/advanced-ai",   label: "Advanced AI", matchPaths: ["/dashboard/ai-visibility", "/dashboard/predictions", "/dashboard/entities", "/dashboard/ai-briefs", "/dashboard/ai-insights"] },
  { href: "/dashboard/optimization",  label: "Optimization", matchPaths: ["/dashboard/search-ai"] },
  { href: "/dashboard/reports",       label: "Reports" },
  { href: "/dashboard/settings",      label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch user's projects for the selector
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let projects: { id: string; name: string; domain: string | null; is_active: boolean }[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id) {
      const { data } = await supabase
        .from("projects")
        .select("id, name, domain, is_active")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: true });

      projects = data ?? [];
    }
  }

  const activeProject = projects.find((p) => p.is_active) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-cream">
      <Masthead
        showLogout
        leftSlot={projects.length > 0 ? <ProjectSelector projects={projects} /> : undefined}
        actions={activeProject ? <GenerateAllButton projectId={activeProject.id} /> : undefined}
      />

      <PaperHeader
        dateLine={`${today} — Weekly Edition`}
        title="Optic Rank"
        accentText="Pulse"
        tagline="AI-Powered SEO Intelligence · Competitive Analysis · Revenue Attribution"
      />

      <PaperNav items={dashboardNavItems} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>

      <BottomBar
        leftText="Optic Rank — Intelligence Report"
        rightText="Pro Plan — Last sync: just now"
      />
    </div>
  );
}
