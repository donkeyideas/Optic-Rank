import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/typography";

export interface ChartSlide {
  label: string;
  chart: React.ReactNode;
}

interface ChartCarouselProps {
  slides: ChartSlide[];
}

export default function ChartCarousel({ slides }: ChartCarouselProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);

  if (slides.length === 0) return null;

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Navigation header */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={prev}
          style={[styles.arrowBtn, { borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={14} color={colors.ink} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.ink }]}>
          {slides[index].label}
        </Text>

        <TouchableOpacity
          onPress={next}
          style={[styles.arrowBtn, { borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={14} color={colors.ink} />
        </TouchableOpacity>

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setIndex(i)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <View
                style={[
                  styles.dot,
                  i === index
                    ? { width: 8, backgroundColor: "#c0392b" }
                    : { width: 4, backgroundColor: colors.inkMuted + "50" },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active chart */}
      <View style={styles.chartArea}>
        {slides[index].chart}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
  },
  dot: {
    height: 4,
  },
  chartArea: {
    minHeight: 120,
    overflow: "hidden",
  },
});
