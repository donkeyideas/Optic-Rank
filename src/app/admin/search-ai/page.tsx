import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal/admin";
import { crawlOwnSite } from "@/lib/crawl/self-audit";
import {
  discoverPropertyId,
  getGA4Overview,
  getGA4TopPages,
  getGA4TrafficSources,
  getGA4DailyData,
} from "@/lib/google/analytics";
import {
  discoverSiteUrl,
  getGSCOverview,
  getGSCTopQueries,
  getGSCTopPages,
  getGSCDailyData,
  getGSCDevices,
  getGSCCountries,
} from "@/lib/google/search-console";
import { SearchAIAdminClient } from "./search-ai-client";

export const dynamic = "force-dynamic";

export default async function AdminSearchAIPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  // 1. Self-crawl the site's own pages
  const auditResult = await crawlOwnSite();

  // 2. Try GA4 data (needs GA4_PROPERTY_ID env var)
  let ga4Overview = null;
  let ga4Pages: Awaited<ReturnType<typeof getGA4TopPages>> = [];
  let ga4Sources: Awaited<ReturnType<typeof getGA4TrafficSources>> = [];
  let ga4Daily: Awaited<ReturnType<typeof getGA4DailyData>> = [];
  let ga4PropertyId: string | null = null;

  try {
    ga4PropertyId = await discoverPropertyId();
    if (ga4PropertyId) {
      const [overview, pages, sources, daily] = await Promise.all([
        getGA4Overview(ga4PropertyId),
        getGA4TopPages(ga4PropertyId),
        getGA4TrafficSources(ga4PropertyId),
        getGA4DailyData(ga4PropertyId),
      ]);
      ga4Overview = overview;
      ga4Pages = pages;
      ga4Sources = sources;
      ga4Daily = daily;
    }
  } catch (err) {
    console.error("GA4 fetch error:", err);
  }

  // 3. Try Google Search Console data
  let gscOverview = null;
  let gscQueries: Awaited<ReturnType<typeof getGSCTopQueries>> = [];
  let gscPages: Awaited<ReturnType<typeof getGSCTopPages>> = [];
  let gscDaily: Awaited<ReturnType<typeof getGSCDailyData>> = [];
  let gscDevices: Awaited<ReturnType<typeof getGSCDevices>> = [];
  let gscCountries: Awaited<ReturnType<typeof getGSCCountries>> = [];
  let gscSiteUrl: string | null = null;

  try {
    gscSiteUrl = await discoverSiteUrl();
    if (gscSiteUrl) {
      const [overview, queries, pages, daily, devices, countries] =
        await Promise.all([
          getGSCOverview(gscSiteUrl),
          getGSCTopQueries(gscSiteUrl),
          getGSCTopPages(gscSiteUrl),
          getGSCDailyData(gscSiteUrl),
          getGSCDevices(gscSiteUrl),
          getGSCCountries(gscSiteUrl),
        ]);
      gscOverview = overview;
      gscQueries = queries;
      gscPages = pages;
      gscDaily = daily;
      gscDevices = devices;
      gscCountries = countries;
    }
  } catch (err) {
    console.error("GSC fetch error:", err);
  }

  return (
    <SearchAIAdminClient
      audit={auditResult}
      ga4={{
        propertyId: ga4PropertyId,
        overview: ga4Overview,
        pages: ga4Pages,
        sources: ga4Sources,
        daily: ga4Daily,
      }}
      gsc={{
        siteUrl: gscSiteUrl,
        overview: gscOverview,
        queries: gscQueries,
        pages: gscPages,
        daily: gscDaily,
        devices: gscDevices,
        countries: gscCountries,
      }}
    />
  );
}
