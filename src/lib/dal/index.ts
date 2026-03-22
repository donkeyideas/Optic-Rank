/**
 * Data Access Layer (DAL) - All Supabase queries in one place.
 * Every dashboard page imports from here instead of querying directly.
 * All functions use the server-side Supabase client (cookies-based auth).
 */

export { getProfile, getOrganization } from "./auth";
export {
  getProjects,
  getActiveProject,
  getProjectById,
} from "./projects";
export {
  getKeywords,
  getKeywordStats,
  getKeywordRanks,
  getKeywordClusters,
} from "./keywords";
export {
  getBacklinks,
  getBacklinkStats,
  getBacklinkSnapshots,
} from "./backlinks";
export {
  getLatestAudit,
  getAuditIssues,
  getAuditPages,
  getAuditHistory,
} from "./site-audit";
export {
  getCompetitors,
  getCompetitorSnapshots,
} from "./competitors";
export {
  getContentPages,
  getContentBriefs,
} from "./content";
export {
  getAIInsights,
  getAIInsightStats,
} from "./ai-insights";
export {
  getAppStoreListings,
  getAppStoreRankings,
  getAppReviews,
} from "./app-store";
export {
  getScheduledReports,
} from "./reports";
export {
  getTeamMembers,
  getOrgInvites,
} from "./team";
export {
  getVisibilityChecks,
  getVisibilityStats,
  getVisibilityByKeyword,
  getVisibilityHistory,
} from "./ai-visibility";
export {
  getPredictions,
  getPredictionStats,
  getPredictionHistory,
} from "./predictions";
export {
  getEntities,
  getEntityStats,
  getEntityMentions,
  getEntityCoverage,
} from "./entities";
export {
  getBriefs,
  getLatestBrief,
  getBriefById,
} from "./briefs";
export {
  getRecommendations,
  getRecommendationStats,
} from "./recommendations";
export {
  getGeoStats,
  getGeoScoresByPage,
  getCitationMatrix,
  getAeoKeywordsData,
  getSchemaAuditData,
  getConversionGoals,
  getKeywordsWithRevenue,
  getCroStats,
} from "./optimization";
