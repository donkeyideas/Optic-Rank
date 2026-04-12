"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";
import { CWV_THRESHOLDS } from "@/lib/app-store/cwv-thresholds";
import type { AppStoreCwv } from "@/lib/dal/app-store";

type MetricKey = "performance_score" | "lcp_ms" | "fcp_ms" | "cls" | "inp_ms" | "ttfb_ms";

const METRIC_OPTIONS: { key: MetricKey; label: string; unit: string; domain?: [number, number] }[] = [
  { key: "performance_score", label: "Perf Score", unit: "/100", domain: [0, 100] },
  { key: "lcp_ms", label: "LCP", unit: "ms" },
  { key: "fcp_ms", label: "FCP", unit: "ms" },
  { key: "cls", label: "CLS", unit: "" },
  { key: "inp_ms", label: "INP", unit: "ms" },
  { key: "ttfb_ms", label: "TTFB", unit: "ms" },
];

interface AsoCwvTrendChartProps {
  data: AppStoreCwv[];
  height?: number;
}

export function AsoCwvTrendChart({ data, height = 200 }: AsoCwvTrendChartProps) {
  const timezone = useTimezone();
  const [metric, setMetric] = useState<MetricKey>("performance_score");

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-rule"
        style={{ height }}
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          Run more tests to see trends
        </span>
      </div>
    );
  }

  const opt = METRIC_OPTIONS.find((o) => o.key === metric)!;
  const threshold = CWV_THRESHOLDS[metric];

  const formatted = data.map((d) => ({
    date: formatShortDate(d.tested_at, timezone),
    value: d[metric] as number | null,
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1">
        {METRIC_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => setMetric(o.key)}
            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
              metric === o.key
                ? "bg-ink text-surface"
                : "bg-surface-card text-ink-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={formatted}
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
          />
          <YAxis
            domain={opt.domain ?? ["auto", "auto"]}
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 11,
            }}
            formatter={(value) => [
              typeof value === "number"
                ? metric === "cls"
                  ? value.toFixed(3)
                  : metric === "performance_score"
                    ? `${value}${opt.unit}`
                    : `${Math.round(value)}${opt.unit}`
                : "—",
              opt.label,
            ]}
          />
          {/* Threshold reference lines */}
          {threshold && (
            <>
              <ReferenceLine
                y={threshold.good}
                stroke="var(--color-editorial-green, #27ae60)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <ReferenceLine
                y={threshold.needsWork}
                stroke="var(--color-editorial-red, #c0392b)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            </>
          )}
          {metric === "performance_score" && (
            <>
              <ReferenceLine
                y={90}
                stroke="var(--color-editorial-green, #27ae60)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <ReferenceLine
                y={50}
                stroke="var(--color-editorial-red, #c0392b)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            </>
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-editorial-red, #c0392b)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-editorial-red, #c0392b)" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
