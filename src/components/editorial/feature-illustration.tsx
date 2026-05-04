import {
  Search,
  Link2,
  Shield,
  Users,
  Sparkles,
  Smartphone,
  FileText,
  Eye,
  TrendingUp,
  Share2,
  BarChart3,
  ArrowUpRight,
  Globe,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Search, Link2, Shield, Users, Sparkles, Smartphone, FileText, Eye, TrendingUp, Share2,
};

interface FeatureIllustrationProps {
  icon: string;
  featureIndex: number;
}

const STATS = [
  [
    { label: "Keywords Tracked", value: "2,847", delta: "+12%" },
    { label: "Avg. Position", value: "8.3", delta: "-2.1" },
    { label: "Visibility", value: "73%", delta: "+5%" },
  ],
  [
    { label: "Backlinks", value: "1,294", delta: "+48" },
    { label: "Referring Domains", value: "312", delta: "+7" },
    { label: "Domain Authority", value: "42", delta: "+3" },
  ],
  [
    { label: "Issues Found", value: "23", delta: "-8" },
    { label: "Health Score", value: "87%", delta: "+4%" },
    { label: "Pages Crawled", value: "1,406", delta: "" },
  ],
  [
    { label: "Competitors", value: "12", delta: "" },
    { label: "Shared Keywords", value: "438", delta: "+24" },
    { label: "Content Gap", value: "156", delta: "" },
  ],
  [
    { label: "AI Score", value: "91", delta: "+6" },
    { label: "Citations", value: "34", delta: "+11" },
    { label: "Recommendations", value: "8", delta: "" },
  ],
  [
    { label: "App Rankings", value: "#14", delta: "+3" },
    { label: "Keyword Installs", value: "2.1K", delta: "+18%" },
    { label: "Ratings", value: "4.7", delta: "+0.2" },
  ],
  [
    { label: "Content Score", value: "78", delta: "+5" },
    { label: "Readability", value: "A", delta: "" },
    { label: "Word Count", value: "2,340", delta: "" },
  ],
  [
    { label: "AI Visibility", value: "64%", delta: "+12%" },
    { label: "Sources Tracked", value: "5", delta: "" },
    { label: "Mentions", value: "127", delta: "+23" },
  ],
  [
    { label: "Traffic Trend", value: "+23%", delta: "" },
    { label: "Conversions", value: "342", delta: "+8%" },
    { label: "ROI Score", value: "4.2x", delta: "+0.6" },
  ],
  [
    { label: "Engagement", value: "12.4K", delta: "+34%" },
    { label: "Followers", value: "8.7K", delta: "+2.1K" },
    { label: "Posts Analyzed", value: "248", delta: "" },
  ],
];

export function FeatureIllustration({ icon, featureIndex }: FeatureIllustrationProps) {
  const Icon = ICON_MAP[icon] ?? Search;
  const stats = STATS[featureIndex % STATS.length];

  return (
    <div className="w-full border border-rule bg-surface-cream">
      {/* Mini header bar */}
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-editorial-red/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-editorial-gold/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-editorial-green/60" />
        </div>
        <div className="ml-2 flex items-center gap-1.5">
          <Icon size={12} strokeWidth={1.5} className="text-ink-muted" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Dashboard
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-rule">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-cream px-4 py-5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              {stat.label}
            </p>
            <p className="mt-1.5 font-serif text-2xl font-bold text-ink">
              {stat.value}
            </p>
            {stat.delta && (
              <p className={`mt-1 flex items-center justify-center gap-0.5 text-xs font-medium ${
                stat.delta.startsWith("-") ? "text-editorial-red" : "text-editorial-green"
              }`}>
                <ArrowUpRight size={10} strokeWidth={2} className={stat.delta.startsWith("-") ? "rotate-90" : ""} />
                {stat.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Mini chart placeholder */}
      <div className="border-t border-rule px-4 py-4">
        <div className="flex items-end justify-between gap-1.5 h-16">
          {[35, 42, 38, 55, 48, 62, 58, 72, 68, 78, 74, 82].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-editorial-red/20 transition-colors hover:bg-editorial-red/40"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[9px] text-ink-muted">30 days</span>
          <div className="flex items-center gap-1">
            <BarChart3 size={10} className="text-ink-muted" />
            <Globe size={10} className="text-ink-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
