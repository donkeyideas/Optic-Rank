import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

interface FilterPillsProps {
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function FilterPills({
  filters,
  activeFilter,
  onFilterChange,
}: FilterPillsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((filter) => {
        const isActive = filter === activeFilter;
        return (
          <TouchableOpacity
            key={filter}
            onPress={() => onFilterChange(filter)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              isActive
                ? { backgroundColor: colors.ink }
                : {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: isActive ? colors.surface : colors.inkSecondary },
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    borderRadius: 0,
  },
  pillText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sansSemiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
