import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal/admin";
import {
  getPlatformSeoOverview,
  getCmsPagesSeoAudit,
  getTechnicalSeoChecks,
  getContentAnalysis,
  getKeywordsByIntent,
  getKeywordPositionDistribution,
  getPlatformGeoPresence,
  generateSeoRecommendations,
  getAeoOverview,
  getAeoScores,
  getAdminGeoScores,
  getCroAbTests,
  getAdminProjects,
} from "@/lib/dal/search-ai";
import { SearchAIAdminClient } from "./search-ai-client";

export default async function AdminSearchAIPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  // Fetch all projects for the filter dropdown + all data in parallel
  const [
    projects,
    overview,
    cmsPages,
    technicalChecks,
    contentAnalysis,
    keywordsByIntent,
    positionDistribution,
    geoPresence,
    recommendations,
    aeoOverview,
    aeoScores,
    geoScores,
    croAbTests,
  ] = await Promise.all([
    getAdminProjects(),
    getPlatformSeoOverview(),
    getCmsPagesSeoAudit(),
    getTechnicalSeoChecks(),
    getContentAnalysis(),
    getKeywordsByIntent(),
    getKeywordPositionDistribution(),
    getPlatformGeoPresence(),
    generateSeoRecommendations(),
    getAeoOverview(),
    getAeoScores(),
    getAdminGeoScores(),
    getCroAbTests(),
  ]);

  return (
    <SearchAIAdminClient
      projects={projects}
      overview={overview}
      cmsPages={cmsPages}
      technicalChecks={technicalChecks}
      contentAnalysis={contentAnalysis}
      keywordsByIntent={keywordsByIntent}
      positionDistribution={positionDistribution}
      geoPresence={geoPresence}
      recommendations={recommendations}
      aeoOverview={aeoOverview}
      aeoScores={aeoScores}
      geoScores={geoScores}
      croAbTests={croAbTests}
    />
  );
}
