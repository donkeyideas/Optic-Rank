import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/typography";

interface AreaChartProps {
  data: number[];
  color: string;
  width: number;
  height?: number;
  /** Show formatted Y-axis min/max and X-axis labels */
  showLabels?: boolean;
  /** Format function for Y-axis values */
  formatValue?: (n: number) => string;
  /** Label for the left edge of the X-axis */
  xMinLabel?: string;
  /** Label for the right edge of the X-axis */
  xMaxLabel?: string;
}

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

export default function AreaChart({
  data,
  color,
  width,
  height = 140,
  showLabels = false,
  formatValue = defaultFormat,
  xMinLabel = "30d ago",
  xMaxLabel = "Today",
}: AreaChartProps) {
  const { colors } = useTheme();

  if (data.length < 2) {
    return (
      <View
        style={[
          styles.container,
          { width, height, borderColor: colors.border },
        ]}
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Reserve space for labels if enabled
  const yLabelWidth = showLabels ? 40 : 0;
  const xLabelHeight = showLabels ? 18 : 0;
  const svgWidth = width - yLabelWidth;
  const svgHeight = height - xLabelHeight;

  const padding = 4;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  // Build data points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  // Create smooth line path using cubic bezier curves
  let linePath = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const cpx1 = current.x + (next.x - current.x) / 3;
    const cpy1 = current.y;
    const cpx2 = next.x - (next.x - current.x) / 3;
    const cpy2 = next.y;
    linePath += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${next.x},${next.y}`;
  }

  // Create fill path (close the area below the line)
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const fillPath =
    linePath +
    ` L ${lastPoint.x},${svgHeight - padding}` +
    ` L ${firstPoint.x},${svgHeight - padding}` +
    " Z";

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={[styles.container, { width, height, borderColor: colors.border }]}>
      <View style={styles.chartRow}>
        {showLabels && (
          <View style={[styles.yAxis, { width: yLabelWidth, height: svgHeight }]}>
            <Text style={[styles.yLabel, { color: colors.inkMuted }]}>
              {formatValue(max)}
            </Text>
            <Text style={[styles.yLabel, { color: colors.inkMuted }]}>
              {formatValue(min)}
            </Text>
          </View>
        )}
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.2} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill={`url(#${gradientId})`} />
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      </View>
      {showLabels && (
        <View style={[styles.xAxis, { marginLeft: yLabelWidth }]}>
          <Text style={[styles.xLabel, { color: colors.inkMuted }]}>
            {xMinLabel}
          </Text>
          <Text style={[styles.xLabel, { color: colors.inkMuted }]}>
            {xMaxLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: "row",
  },
  yAxis: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
    paddingVertical: 4,
  },
  yLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  xLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
  },
});
