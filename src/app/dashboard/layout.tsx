import Link from "next/link";
import { headers } from "next/headers";
import { Masthead } from "@/components/editorial/masthead";
import { PaperHeader } from "@/components/editorial/paper-header";
import { PaperNav } from "@/components/editorial/paper-nav";
import { BottomBar } from "@/components/editorial/bottom-bar";
import { ProjectSelector } from "@/components/shared/project-selector";
import { GenerateAllButton } from "@/components/shared/generate-all-button";
import { TrialBanner } from "@/components/shared/trial-banner";
import { TimezoneProvider } from "@/lib/context/timezone-context";
import { formatDateLine } from "@/lib/utils/format-date";
import { createClient } from "@/lib/supabase/server";

function TrialExpiredLockout() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="mx-auto mb-2 h-px w-24 bg-rule" />
      <h2 className="font-serif text-3xl font-bold text-ink">
        Your Free Trial Has Expired
      </h2>
      <p className="max-w-md text-sm text-ink-secondary">
        Your 14-day free trial has ended. Upgrade to a paid plan to continue
        using Optic Rank and access all your data.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard/settings?tab=billing"
          className="inline-flex items-center gap-2 bg-editorial-red px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90"
        >
          Upgrade Now
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 border border-rule px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-card"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}

const dashboardNavItems = [
  { href: "/dashboard",               label: "Dashboard" },
  { href: "/dashboard/keywords",      label: "Keywords" },
  { href: "/dashboard/competitors",   label: "Competitors" },
  { href: "/dashboard/content",       label: "Content" },
  { href: "/dashboard/backlinks",     label: "Backlinks" },
  { href: "/dashboard/site-audit",    label: "Site Audit" },
  { href: "/dashboard/app-store",     label: "App Store" },
  { href: "/dashboard/social-intelligence", label: "Social Intel" },
  { href: "/dashboard/advanced-ai",   label: "Advanced AI", matchPaths: ["/dashboard/ai-visibility", "/dashboard/predictions", "/dashboard/entities", "/dashboard/ai-briefs", "/dashboard/ai-insights"] },
  { href: "/dashboard/search-ai",     label: "SEO & Analytics", matchPaths: ["/dashboard/optimization"] },
  { href: "/dashboard/reports",       label: "Reports" },
  { href: "/dashboard/settings",      label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user's projects for the selector
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let projects: { id: string; name: string; domain: string | null; is_active: boolean }[] = [];
  let trialEndsAt: string | null = null;
  let subscriptionStatus: string | null = null;
  let plan: string | null = null;
  let userTimezone = "UTC";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, timezone")
      .eq("id", user.id)
      .single();

    userTimezone = profile?.timezone || "UTC";

    if (profile?.organization_id) {
      const [projectsRes, orgRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, domain, is_active")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: true }),
        supabase
          .from("organizations")
          .select("trial_ends_at, subscription_status, plan")
          .eq("id", profile.organization_id)
          .single(),
      ]);

      projects = projectsRes.data ?? [];
      trialEndsAt = orgRes.data?.trial_ends_at ?? null;
      subscriptionStatus = orgRes.data?.subscription_status ?? null;
      plan = orgRes.data?.plan ?? null;
    }
  }

  // Check if trial has expired and user hasn't subscribed
  const isTrialExpired =
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) < new Date();

  // Allow settings page through lockout so users can upgrade
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isSettingsPage = pathname.includes("/settings");

  // Lock out all pages except settings when trial expired on free plan
  const showLockout = isTrialExpired && plan === "free" && !isSettingsPage;

  const today = formatDateLine(new Date(), userTimezone);
  const activeProject = projects.find((p) => p.is_active) ?? null;

  return (
    <TimezoneProvider timezone={userTimezone}>
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

        {/* Trial banner — shown during trial or when expired */}
        {subscriptionStatus === "trialing" && trialEndsAt && (
          <TrialBanner trialEndsAt={trialEndsAt} isExpired={!!isTrialExpired} />
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 lg:px-8">
          {showLockout ? <TrialExpiredLockout /> : children}
        </main>

        <BottomBar
          leftText="Optic Rank — Intelligence Report"
          rightText={`${(plan ?? "free").charAt(0).toUpperCase() + (plan ?? "free").slice(1)} Plan — Last sync: just now`}
        />
      </div>
    </TimezoneProvider>
  );
}
