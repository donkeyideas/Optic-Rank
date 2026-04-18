import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import type { ProductSubscription } from "react-native-iap";

interface PlanCardProps {
  plan: {
    name: string;
    plan_key: string;
    price_monthly: number;
    apple_product_id?: string | null;
    max_projects: number;
    max_keywords: number;
    max_users: number;
    features: Record<string, unknown> | null;
  };
  isCurrent: boolean;
  currentPrice?: number;
  iapProduct?: ProductSubscription;
  purchasing?: boolean;
  onSelect: () => void;
  onPurchaseIAP?: () => void;
}

export default function PlanCard({
  plan,
  isCurrent,
  currentPrice = 0,
  iapProduct,
  purchasing,
  onSelect,
  onPurchaseIAP,
}: PlanCardProps) {
  const { colors } = useTheme();

  const isPopular = plan.plan_key === "pro";
  const isCheaper = plan.price_monthly < currentPrice;

  // Build feature list from the features JSON (already includes projects/keywords)
  const featureList: string[] = [];

  if (plan.features && typeof plan.features === "object") {
    const entries = Array.isArray(plan.features)
      ? plan.features
      : Object.values(plan.features);
    for (const value of entries) {
      if (typeof value === "string") {
        featureList.push(value);
      }
    }
  }

  // Add team members if not already in features
  if (!featureList.some((f) => /team member/i.test(f))) {
    featureList.unshift(
      `${plan.max_users} team member${plan.max_users !== 1 ? "s" : ""}`
    );
  }

  // Price display — use App Store localized price on iOS when available
  const displayPrice =
    Platform.OS === "ios" && iapProduct?.displayPrice
      ? iapProduct.displayPrice
      : `$${plan.price_monthly}`;

  // CTA config
  let ctaTitle = "Upgrade";
  let ctaVariant: "primary" | "outline" | "red" = "red";
  let ctaDisabled = false;

  if (isCurrent) {
    ctaTitle = "Current Plan";
    ctaVariant = "outline";
    ctaDisabled = true;
  } else if (purchasing) {
    ctaTitle = "Processing...";
    ctaDisabled = true;
  } else if (isCheaper) {
    ctaTitle = "Downgrade";
    ctaVariant = "outline";
  }

  const handlePress = () => {
    if (Platform.OS === "ios" && onPurchaseIAP && plan.apple_product_id) {
      onPurchaseIAP();
    } else {
      onSelect();
    }
  };

  return (
    <Card
      variant={isCurrent ? "highlighted" : "default"}
      style={isCurrent ? { borderWidth: 2, borderColor: colors.red } : undefined}
    >
      {isPopular && !isCurrent && (
        <View style={styles.popularBadge}>
          <Badge label="POPULAR" variant="red" />
        </View>
      )}

      <Text style={[styles.planName, { color: colors.ink }]}>
        {plan.name}
      </Text>

      <View style={styles.priceRow}>
        <Text style={[styles.priceAmount, { color: colors.ink }]}>
          {displayPrice}
        </Text>
        <Text style={[styles.pricePeriod, { color: colors.inkMuted }]}>
          /mo
        </Text>
      </View>

      <View style={styles.featureList}>
        {featureList.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={[styles.featureCheck, { color: colors.green }]}>
              {"\u2713"}
            </Text>
            <Text style={[styles.featureText, { color: colors.inkSecondary }]}>
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <Button
        title={ctaTitle}
        variant={ctaVariant}
        disabled={ctaDisabled}
        onPress={handlePress}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  popularBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },

  planName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: "700",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    marginBottom: 16,
  },
  priceAmount: {
    fontFamily: fonts.mono,
    fontSize: 28,
    fontWeight: "700",
  },
  pricePeriod: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginLeft: 2,
  },

  featureList: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  featureCheck: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  featureText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    flex: 1,
  },
});
