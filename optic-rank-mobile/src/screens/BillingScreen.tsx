import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";

import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { APP_CONFIG } from "../lib/config";
import { openURL } from "../lib/openURL";
import { APPLE_SUBSCRIPTIONS_URL } from "../lib/iap";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import Button from "../components/ui/Button";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";

import PlanCard from "../components/billing/PlanCard";

import { useOrganization } from "../hooks/useProfile";
import { usePricingPlans, useBillingEvents, useCurrentUsage } from "../hooks/useBilling";
import { useIAPSubscription } from "../hooks/useIAPSubscription";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "$0.00";
  return `$${(amount / 100).toFixed(2)}`;
}

function formatPlanLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// Estimate next billing date (30 days from now as placeholder)
function getNextBillingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BillingScreen() {
  const { colors } = useTheme();

  // --- Data hooks ---
  const { data: org, isLoading: orgLoading } = useOrganization();
  const { data: plans, isLoading: plansLoading } = usePricingPlans();
  const { data: billingEvents } = useBillingEvents(org?.id);
  const { data: usage } = useCurrentUsage(org?.id);

  // --- IAP (iOS only) ---
  const iap = useIAPSubscription();
  const isIOS = Platform.OS === "ios";

  useEffect(() => {
    if (isIOS) {
      iap.fetchSubscriptions();
    }
  }, []);

  // Filter to only purchasable plans (exclude free and enterprise)
  const pricingPlans = (plans ?? []).filter(
    (p) => p.plan_key !== "free" && p.plan_key !== "enterprise"
  );
  const events = billingEvents ?? [];

  // Find current plan from pricing plans
  const currentPlan = pricingPlans.find((p) => p.plan_key === org?.plan);
  const currentPrice = currentPlan?.price_monthly ?? 0;

  // Manage button logic — on iOS, ALWAYS show App Store (Apple requires IAP)
  const manageTitle = isIOS
    ? "Manage in App Store"
    : "Manage in Stripe Portal";

  const handleManage = () => {
    if (isIOS) {
      openURL(APPLE_SUBSCRIPTIONS_URL);
    } else {
      openURL(APP_CONFIG.WEB_BILLING_URL);
    }
  };

  if (orgLoading || plansLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.body}>
          {/* ---------------------------------------------------------- */}
          {/* Current Plan                                                */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Current Plan" />
          <Card variant="highlighted">
            <Text style={[styles.currentPlanName, { color: colors.ink }]}>
              {formatPlanLabel(org?.plan ?? "free")} Plan
            </Text>
            <Text style={[styles.currentPlanBilling, { color: colors.inkMuted }]}>
              Billed monthly {"\u00B7"} Next: {getNextBillingDate()}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceAmount, { color: colors.ink }]}>
                ${currentPrice}
              </Text>
              <Text style={[styles.pricePeriod, { color: colors.inkMuted }]}>
                /mo
              </Text>
            </View>
            <Text style={[styles.planDetails, { color: colors.inkSecondary }]}>
              {org?.max_projects ?? 0} projects {"\u00B7"}{" "}
              {org?.max_keywords ?? 0} keywords {"\u00B7"}{" "}
              {org?.max_users ?? 0} users
            </Text>
            <Button
              title={manageTitle}
              variant="outline"
              onPress={handleManage}
              style={styles.manageButton}
            />
          </Card>

          {/* ---------------------------------------------------------- */}
          {/* Available Plans                                             */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Available Plans" style={styles.sectionSpacing} />
          {pricingPlans.length === 0 ? (
            <EmptyState
              title="No Plans Available"
              message="Pricing plans are being configured."
            />
          ) : (
            pricingPlans.map((plan) => {
              const iapProduct = iap.subscriptions.find(
                (s) => s.id === plan.apple_product_id
              );
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={plan.plan_key === org?.plan}
                  currentPrice={currentPrice}
                  iapProduct={iapProduct}
                  purchasing={iap.purchasing}
                  onSelect={() => openURL(APP_CONFIG.WEB_BILLING_URL)}
                  onPurchaseIAP={
                    plan.apple_product_id
                      ? () => iap.purchase(plan.apple_product_id!)
                      : undefined
                  }
                />
              );
            })
          )}

          {/* Restore Purchases (iOS only) */}
          {Platform.OS === "ios" && (
            <Button
              title="Restore Purchases"
              variant="outline"
              onPress={iap.restorePurchases}
              style={styles.restoreButton}
            />
          )}

          {/* ---------------------------------------------------------- */}
          {/* Usage This Period                                            */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Usage This Period" style={styles.sectionSpacing} />
          <Card>
            {usage ? (
              <>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: colors.inkSecondary }]}>Keywords Used</Text>
                  <Text style={[styles.usageValue, { color: colors.ink }]}>{usage.keywords_used ?? 0}</Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: colors.inkSecondary }]}>Pages Crawled</Text>
                  <Text style={[styles.usageValue, { color: colors.ink }]}>{usage.pages_crawled ?? 0}</Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: colors.inkSecondary }]}>API Calls</Text>
                  <Text style={[styles.usageValue, { color: colors.ink }]}>{usage.api_calls ?? 0}</Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: colors.inkSecondary }]}>AI Queries</Text>
                  <Text style={[styles.usageValue, { color: colors.ink }]}>{usage.ai_queries ?? 0}</Text>
                </View>
              </>
            ) : (
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
                No usage data available.
              </Text>
            )}
          </Card>

          {/* ---------------------------------------------------------- */}
          {/* Recent Invoices                                             */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Recent Invoices" style={styles.sectionSpacing} />
          {events.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
                No invoices yet.
              </Text>
            </Card>
          ) : (
            <Card>
              {events.map((event, index) => (
                <React.Fragment key={event.id}>
                  {index > 0 && <Divider />}
                  <View style={styles.invoiceRow}>
                    <View style={styles.invoiceLeft}>
                      <Text style={[styles.invoiceDate, { color: colors.ink }]}>
                        {formatDate(event.created_at)}
                      </Text>
                      <Text
                        style={[
                          styles.invoiceDesc,
                          { color: colors.inkMuted },
                        ]}
                        numberOfLines={1}
                      >
                        {event.description ?? event.event_type}
                      </Text>
                    </View>
                    <View style={styles.invoiceRight}>
                      <Text style={[styles.invoiceAmount, { color: colors.ink }]}>
                        {formatCurrency(event.amount)}
                      </Text>
                      <Badge
                        label={event.event_type.includes("failed") ? "Failed" : event.event_type.includes("refund") ? "Refunded" : "Paid"}
                        variant={event.event_type.includes("failed") ? "red" : event.event_type.includes("refund") ? "gold" : "green"}
                      />
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  // Current plan
  currentPlanName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: "700",
  },
  currentPlanBilling: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 12,
  },
  priceAmount: {
    fontFamily: fonts.mono,
    fontSize: 24,
    fontWeight: "700",
  },
  pricePeriod: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginLeft: 2,
  },
  planDetails: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 8,
  },
  manageButton: {
    marginTop: 16,
  },

  // Usage
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  usageLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  usageValue: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "700",
  },

  // Invoices
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  invoiceLeft: {
    flex: 1,
    marginRight: 12,
  },
  invoiceDate: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  invoiceDesc: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  invoiceAmount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "700",
  },

  // Empty
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },

  restoreButton: {
    marginTop: 12,
  },

  bottomSpacer: {
    height: 40,
  },
});
