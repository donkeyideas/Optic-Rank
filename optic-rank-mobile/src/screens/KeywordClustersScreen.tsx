import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { supabase } from "../lib/supabase";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";

import { useActiveProject } from "../hooks/useProjects";
import NoProjectGuard from "../components/shared/NoProjectGuard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeywordCluster {
  id: string;
  project_id: string;
  name: string;
  topic: string | null;
  keywords: string[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KeywordClustersScreen() {
  const { colors } = useTheme();

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const {
    data: clusters,
    isLoading: clustersLoading,
    refetch: refetchClusters,
    isRefetching: isRefetchingClusters,
  } = useQuery<KeywordCluster[]>({
    queryKey: ["keywordClusters", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("keyword_clusters")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data as KeywordCluster[];
    },
    enabled: !!projectId,
  });

  // Track which clusters are expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // --- Refresh ---
  const handleRefresh = useCallback(() => {
    refetchClusters();
  }, [refetchClusters]);

  // --- Loading ---
  if (projectLoading || (clustersLoading && !clusters)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Keyword Clusters" />;

  const clusterList = clusters ?? [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingClusters}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>
            Keyword Clusters
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            {clusterList.length} semantic cluster{clusterList.length !== 1 ? "s" : ""} found
          </Text>
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Cluster List                                                     */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Keyword Clusters" />

          {clusterList.length === 0 ? (
            <EmptyState
              title="No Clusters"
              message="Keyword clusters will appear here once semantic analysis has been performed on your tracked keywords."
            />
          ) : (
            clusterList.map((cluster) => {
              const isExpanded = expandedIds.has(cluster.id);
              const keywordCount = cluster.keywords?.length ?? 0;
              const displayKeywords = isExpanded
                ? cluster.keywords ?? []
                : (cluster.keywords ?? []).slice(0, 3);

              return (
                <Card key={cluster.id} variant="sm">
                  {/* Cluster header */}
                  <TouchableOpacity
                    onPress={() => toggleExpand(cluster.id)}
                    activeOpacity={0.7}
                    style={styles.clusterHeader}
                  >
                    <View style={styles.clusterTitleRow}>
                      <Text
                        style={[styles.clusterName, { color: colors.ink }]}
                        numberOfLines={1}
                      >
                        {cluster.name}
                      </Text>
                      <Badge
                        label={`${keywordCount} kw${keywordCount !== 1 ? "s" : ""}`}
                        variant="outline"
                      />
                    </View>

                    {cluster.topic && (
                      <Text
                        style={[styles.clusterTopic, { color: colors.inkSecondary }]}
                        numberOfLines={1}
                      >
                        Topic: {cluster.topic}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Keywords list */}
                  {keywordCount > 0 && (
                    <View style={styles.keywordList}>
                      {displayKeywords.map((kw, index) => (
                        <View
                          key={`${cluster.id}-kw-${index}`}
                          style={[
                            styles.keywordItem,
                            { borderLeftColor: colors.border },
                          ]}
                        >
                          <Text
                            style={[styles.keywordBullet, { color: colors.red }]}
                          >
                            {"\u2022"}
                          </Text>
                          <Text
                            style={[styles.keywordText, { color: colors.ink }]}
                            numberOfLines={1}
                          >
                            {kw}
                          </Text>
                        </View>
                      ))}

                      {/* Expand/collapse toggle */}
                      {keywordCount > 3 && (
                        <TouchableOpacity
                          onPress={() => toggleExpand(cluster.id)}
                          activeOpacity={0.7}
                          style={styles.expandToggle}
                        >
                          <Text
                            style={[styles.expandText, { color: colors.red }]}
                          >
                            {isExpanded
                              ? "Show less"
                              : `Show all ${keywordCount} keywords`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
  },

  // Cluster card
  clusterHeader: {
    marginBottom: 8,
  },
  clusterTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  clusterName: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    flex: 1,
  },
  clusterTopic: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },

  // Keyword list
  keywordList: {
    marginTop: 4,
  },
  keywordItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingLeft: 4,
    gap: 6,
  },
  keywordBullet: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  keywordText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    flex: 1,
  },

  // Expand toggle
  expandToggle: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  expandText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  bottomSpacer: {
    height: 100,
  },
});
