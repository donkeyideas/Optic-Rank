import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Button from "../ui/Button";

interface TrialBannerProps {
  trialEndsAt: string | null;
  onUpgrade: () => void;
}

export default function TrialBanner({
  trialEndsAt,
  onUpgrade,
}: TrialBannerProps) {
  const { colors } = useTheme();

  const state = useMemo(() => {
    if (!trialEndsAt) return null;

    const end = new Date(trialEndsAt).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return { expired: true, days: 0, hours: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { expired: false, days, hours };
  }, [trialEndsAt]);

  if (!state) return null;

  if (state.expired) {
    return (
      <View style={[styles.container, styles.expiredContainer]}>
        <View style={styles.left}>
          <Text style={styles.expiredText}>
            Your free trial has expired
          </Text>
        </View>
        <View style={styles.right}>
          <Button
            title="Upgrade Now"
            onPress={onUpgrade}
            variant="sm-red"
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.text}>
          Trial: {state.days}d {state.hours}h remaining
        </Text>
      </View>
      <View style={styles.right}>
        <Button
          title="Upgrade"
          onPress={onUpgrade}
          variant="sm-red"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(184,134,11,0.1)",
    borderWidth: 1,
    borderColor: "#b8860b",
    borderRadius: 0,
    padding: 12,
    marginBottom: 12,
  },
  expiredContainer: {
    backgroundColor: "rgba(192,57,43,0.1)",
    borderColor: "#c0392b",
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  text: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: "#b8860b",
  },
  expiredText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: "#c0392b",
  },
  right: {
    width: "auto",
  },
  button: {
    width: "auto",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});
