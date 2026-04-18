import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { Masthead } from "@/components/editorial/masthead";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
import { PaperHeader } from "@/components/editorial/paper-header";
import { PaperNav } from "@/components/editorial/paper-nav";
import { BottomBar } from "@/components/editorial/bottom-bar";
import { ProjectSelector } from "@/components/shared/project-selector";

import { TrialBanner } from "@/components/shared/trial-banner";
import { TrialHeaderIndicator } from "@/components/shared/trial-header-indicator";
import { PushToolbarAction } from "@/components/shared/push-toolbar-action";
import { WhatsNextToolbarAction } from "@/components/shared/whats-next-toolbar-action";
import { Notepad } from "@/components/shared/notepad";
import { TimezoneProvider } from "@/lib/context/timezone-context";
import { formatDateLine } from "@/lib/utils/format-date";
import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/dal/admin";
import { MobileAppBanner } from "@/components/shared/mobile-app-banner";

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
        {/* Use <a> tags (hard navigation) so the server layout re-renders
            with the new x-pathname header, bypassing the lockout on /settings */}
        <a
          href="/dashboard/settings?tab=billing"
          className="inline-flex items-center gap-2 bg-editorial-red px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90"
        >
          Upgrade Now
        </a>
        <a
          href="/pricing"
          className="inline-flex items-center gap-2 border border-rule px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-card"
        >
          View Plans
        </a>
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
  { href: "/dashboard/recommendations", label: "Insights" },
  { href: "/dashboard/advanced-ai",   label: "Command Center", matchPaths: ["/dashboard/ai-visibility", "/dashboard/predictions", "/dashboard/entities", "/dashboard/ai-briefs", "/dashboard/ai-insights"] },
  { href: "/dashboard/search-ai",     label: "SEO & Analytics", matchPaths: ["/dashboard/optimization"] },
  { href: "/dashboard/app-store",     label: "App Store" },
  { href: "/dashboard/social-intelligence", label: "Social Intel" },
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

  let projects: { id: string; name: string; domain: string | null; is_active: boolean; last_crawl_at: string | null; last_rank_check: string | null }[] = [];
  let trialEndsAt: string | null = null;
  let subscriptionStatus: string | null = null;
  let plan: string | null = null;
  let userTimezone = "UTC";
  let isCompAccount = false;

  // Fetch mobile app links from global content
  const globalSections = await getSiteContent("global");
  const mobileAppRow = globalSections.find((s: { section: string }) => s.section === "mobile_app");
  const mobileApp = mobileAppRow?.content as {
    enabled?: boolean;
    headline?: string;
    description?: string;
    app_store_url?: string;
    app_store_enabled?: boolean;
    google_play_url?: string;
    google_play_enabled?: boolean;
  } | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, timezone, comp_account")
      .eq("id", user.id)
      .single();

    userTimezone = profile?.timezone || "UTC";
    isCompAccount = profile?.comp_account === true;

    if (profile?.organization_id) {
      const [projectsRes, orgRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, domain, is_active, last_crawl_at, last_rank_check")
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
    !isCompAccount &&
    subscriptionStatus === "trialing" &&
    trialEndsAt &&
    new Date(trialEndsAt) < new Date();

  // Allow settings page through lockout so users can upgrade
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const isSettingsPage = pathname.includes("/settings");

  // Lock out all pages except settings when trial expired on free plan (comp accounts never locked)
  const showLockout = !isCompAccount && isTrialExpired && plan === "free" && !isSettingsPage;

  const today = formatDateLine(new Date(), userTimezone);
  const activeProject = projects.find((p) => p.is_active) ?? null;

  // Compute last sync timestamp from most recent crawl or rank check
  let lastSyncText = "Never";
  if (activeProject) {
    const timestamps = [activeProject.last_crawl_at, activeProject.last_rank_check].filter(Boolean) as string[];
    if (timestamps.length > 0) {
      const latest = new Date(Math.max(...timestamps.map((t) => new Date(t).getTime())));
      const diffMs = Date.now() - latest.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) lastSyncText = "just now";
      else if (diffMins < 60) lastSyncText = `${diffMins}m ago`;
      else if (diffHours < 24) lastSyncText = `${diffHours}h ago`;
      else lastSyncText = `${diffDays}d ago`;
    }
  }

  return (
    <TimezoneProvider timezone={userTimezone}>
      <div className="flex min-h-screen flex-col bg-surface-cream">
        <Masthead
          showLogout
          leftSlot={
            <div className="flex items-center gap-2">
              {projects.length > 0 && <ProjectSelector projects={projects} />}
              {!isCompAccount && subscriptionStatus === "trialing" && trialEndsAt && (
                <TrialHeaderIndicator trialEndsAt={trialEndsAt} isExpired={!!isTrialExpired} />
              )}
            </div>
          }
          actions={<><WhatsNextToolbarAction /><PushToolbarAction /></>}
        />

        <PaperHeader
          dateLine={`${today} — Weekly Edition`}
          title="Optic Rank"
          accentText="Pulse"
          tagline="AI-Powered SEO Intelligence · Competitive Analysis · Revenue Attribution"
        />

        <PaperNav items={dashboardNavItems} />

        {/* Mobile app banner */}
        {mobileApp?.enabled && (mobileApp.app_store_enabled || mobileApp.google_play_enabled) && (
          <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 md:px-6 lg:px-8">
            <MobileAppBanner
              headline={mobileApp.headline}
              description={mobileApp.description}
              appStoreUrl={mobileApp.app_store_enabled ? mobileApp.app_store_url : undefined}
              googlePlayUrl={mobileApp.google_play_enabled ? mobileApp.google_play_url : undefined}
              variant="dashboard"
            />
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Suspense>
            {showLockout ? <TrialExpiredLockout /> : children}
          </Suspense>
        </main>

        <BottomBar
          leftText="Optic Rank — Intelligence Report"
          rightText={`${isCompAccount ? "Unlimited" : (plan ?? "free").charAt(0).toUpperCase() + (plan ?? "free").slice(1)} Plan — Last sync: ${lastSyncText}`}
        />

        <Notepad />
      </div>
    </TimezoneProvider>
  );
}
