"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Search, Users, FileText, Link2, Shield,
  Lightbulb, Brain, BarChart3, Smartphone, Share2, FileBarChart,
  ChevronDown, BookOpen, CalendarCheck,
} from "lucide-react";

const CONSULT_URL = "https://calendar.app.google/KnxHbsHZiUEA1HZ77";

interface SOPSection {
  id: string;
  icon: React.ElementType;
  tab: string;
  title: string;
  overview: string;
  whatItDoes: string[];
  expectations: string[];
  results: string[];
  actionSteps: string[];
  proTips?: string[];
}

const SOP_SECTIONS: SOPSection[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    tab: "Dashboard",
    title: "Dashboard — Your Intelligence Headquarters",
    overview:
      "The Dashboard is your daily command center. It provides a high-level snapshot of your entire SEO performance, surfacing the most important metrics, trends, and alerts so you can make decisions fast.",
    whatItDoes: [
      "Displays your overall SEO Health Score based on technical health, keyword performance, and authority signals.",
      "Shows a headline bar with your most critical KPIs: total tracked keywords, average position, estimated organic traffic, and domain authority.",
      "Surfaces AI-generated stories highlighting significant changes in your rankings, competitors, or content performance.",
      "Provides a volume navigator to review historical snapshots of your data week by week.",
      "Visualizes keyword position distribution, traffic opportunity treemaps, and rank vs. volume scatter plots.",
    ],
    expectations: [
      "Data refreshes automatically every 24 hours via scheduled syncs.",
      "The Health Score may take 24–48 hours to populate after your first crawl and rank check.",
      "AI stories are generated from patterns detected across your keyword and competitor data.",
    ],
    results: [
      "Quickly identify whether your SEO is trending up or down without diving into individual reports.",
      "Spot sudden ranking drops, competitor movements, or technical issues at a glance.",
      "Prioritize your daily SEO tasks based on the most impactful changes.",
    ],
    actionSteps: [
      "Check the Dashboard at least once per day to stay informed on major changes.",
      "Click on any AI story to navigate to the detailed view for deeper analysis.",
      "Use the Volume Navigator to compare performance across different time periods.",
      "Monitor the Health Score trend — if it drops below 70, investigate Site Audit and Keywords tabs immediately.",
    ],
    proTips: [
      "The Dashboard is most valuable when you have at least 2 weeks of historical data.",
      "Pin the Dashboard as your browser homepage for quick morning check-ins.",
    ],
  },
  {
    id: "keywords",
    icon: Search,
    tab: "Keywords",
    title: "Keywords — Track & Analyze Your Rankings",
    overview:
      "The Keywords tab is where you manage and monitor every keyword you're tracking. It shows real-time rank positions, search volume, difficulty scores, and historical rank trends for each keyword.",
    whatItDoes: [
      "Lists all your tracked keywords with current Google rank position, previous position, and position change.",
      "Shows search volume, keyword difficulty (KD), and estimated traffic for each keyword.",
      "Provides rank history charts showing position changes over the last 30, 60, or 90 days.",
      "Supports filtering by rank range (Top 3, Top 10, Top 20, etc.), tag, and search intent.",
      "Allows bulk actions: add keywords, delete keywords, tag keywords, and export data.",
    ],
    expectations: [
      "Rank positions are checked daily. New keywords may take up to 24 hours to show their first rank.",
      "Search volume and difficulty data comes from third-party APIs and updates monthly.",
      "You can track up to your plan's keyword limit. Upgrade to increase the cap.",
    ],
    results: [
      "Understand exactly where you rank for every target keyword.",
      "Identify keywords trending upward (opportunities to push into the top 3) and those declining (requiring intervention).",
      "Discover keywords you rank for that you weren't even targeting (hidden opportunities).",
    ],
    actionSteps: [
      "Add your most important target keywords first — focus on commercial intent and high-volume terms.",
      "Review rank changes daily. Any keyword that dropped 5+ positions in a day deserves immediate investigation.",
      "Tag keywords by category (branded, non-branded, product, informational) to segment performance.",
      "Use the 'Add Keywords' button to continuously expand your tracking as you create new content.",
      "Export keyword data monthly for reporting to stakeholders or clients.",
    ],
    proTips: [
      "Focus on keywords in positions 4–10 first — these are your quickest wins for page 1 dominance.",
      "Keywords with high volume but low difficulty are your best growth opportunities.",
    ],
  },
  {
    id: "competitors",
    icon: Users,
    tab: "Competitors",
    title: "Competitors — Know Your Rivals",
    overview:
      "The Competitors tab lets you track and benchmark against your SEO competitors. See who ranks for the same keywords, compare authority metrics, and identify gaps in your strategy.",
    whatItDoes: [
      "Tracks competitor domains and their rankings for your shared keywords.",
      "Shows domain authority (DA), total backlinks, and organic traffic estimates for each competitor.",
      "Identifies keyword overlap — which keywords you both rank for, and who ranks higher.",
      "Highlights keyword gaps — keywords your competitors rank for that you don't track or rank for yet.",
      "Provides side-by-side comparison charts for rank distribution and authority metrics.",
    ],
    expectations: [
      "Add at least 3–5 competitors for meaningful comparison. The system may auto-suggest competitors based on your keywords.",
      "Competitor data refreshes on the same schedule as your keyword data (daily).",
      "New competitor data may take 24–48 hours to fully populate.",
    ],
    results: [
      "Understand who your true SEO competitors are (they may not be who you think).",
      "Discover content and keyword strategies your competitors are using that you're missing.",
      "Track whether you're gaining or losing ground against each competitor over time.",
    ],
    actionSteps: [
      "Add your top 3–5 competitors. Include both direct business competitors and SEO competitors (sites ranking for your keywords).",
      "Review the keyword gap report weekly — these are ready-made content opportunities.",
      "Monitor competitor authority metrics. If a competitor's DA is climbing, investigate their backlink strategy.",
      "Use competitor content analysis to inform your own content calendar.",
    ],
  },
  {
    id: "content",
    icon: FileText,
    tab: "Content",
    title: "Content — Manage & Optimize Your Pages",
    overview:
      "The Content tab helps you manage, audit, and optimize the individual pages on your site. It connects your pages to keywords, shows performance metrics, and provides AI-driven optimization recommendations.",
    whatItDoes: [
      "Lists all crawled pages on your site with their title, URL, word count, and status.",
      "Shows which keywords each page ranks for and their positions.",
      "Provides content quality scores based on on-page SEO factors.",
      "Surfaces AI recommendations for improving title tags, meta descriptions, headings, and content structure.",
      "Tracks content freshness — when each page was last updated.",
    ],
    expectations: [
      "Pages are discovered during site crawls. Run your first crawl from the Site Audit tab.",
      "Content recommendations are generated by AI and may take a few minutes to process.",
      "Content scores update after each crawl cycle.",
    ],
    results: [
      "Identify underperforming pages that need optimization.",
      "Find pages with keyword cannibalization (multiple pages competing for the same keyword).",
      "Prioritize content updates based on potential traffic impact.",
    ],
    actionSteps: [
      "Review the content quality scores. Any page scoring below 60 needs immediate attention.",
      "Check for keyword cannibalization — if two pages target the same keyword, consolidate or differentiate them.",
      "Apply AI recommendations to your highest-traffic pages first for maximum impact.",
      "Set a schedule to refresh content on pages that haven't been updated in 6+ months.",
    ],
  },
  {
    id: "backlinks",
    icon: Link2,
    tab: "Backlinks",
    title: "Backlinks — Monitor Your Link Profile",
    overview:
      "The Backlinks tab tracks your inbound link profile. Backlinks are one of the most important ranking factors — this tab helps you understand your link authority and find new link building opportunities.",
    whatItDoes: [
      "Shows total backlink count, referring domains, and domain authority.",
      "Lists individual backlinks with source URL, anchor text, link type (dofollow/nofollow), and DA of the linking site.",
      "Tracks new and lost backlinks over time so you can spot trends.",
      "Identifies toxic or spammy backlinks that could harm your rankings.",
      "Compares your backlink profile against competitors.",
    ],
    expectations: [
      "Backlink data is sourced from third-party link databases and updates weekly.",
      "New backlinks can take 1–2 weeks to appear after they're published.",
      "The complete backlink profile may take several days to fully index on first setup.",
    ],
    results: [
      "Understand the strength and quality of your link profile.",
      "Identify high-authority sites linking to you for relationship building.",
      "Spot toxic links early and disavow them before they impact your rankings.",
    ],
    actionSteps: [
      "Review new backlinks weekly. Reach out to thank sites that link to you — it builds relationships.",
      "Monitor lost backlinks. If an important link disappears, contact the webmaster to restore it.",
      "Compare your backlink count and DA against competitors to set link building targets.",
      "If toxic backlinks are detected, create a disavow file and submit it to Google Search Console.",
    ],
  },
  {
    id: "site-audit",
    icon: Shield,
    tab: "Site Audit",
    title: "Site Audit — Technical SEO Health Check",
    overview:
      "The Site Audit tab crawls your website and identifies technical SEO issues that could be hurting your rankings. It checks for broken links, missing meta tags, slow pages, duplicate content, and more.",
    whatItDoes: [
      "Crawls your website and scans every page for 50+ technical SEO factors.",
      "Categorizes issues by severity: Critical, Warning, and Notice.",
      "Provides Core Web Vitals (CWV) scores: LCP, FID/INP, and CLS for each page.",
      "Checks for broken links (404s), redirect chains, missing alt text, thin content, and canonical issues.",
      "Generates an overall site health percentage score.",
    ],
    expectations: [
      "The first crawl may take 5–30 minutes depending on site size (up to your plan's page limit).",
      "Crawls run automatically on a weekly schedule after the initial crawl.",
      "Some issues may be false positives — use your judgment based on site context.",
    ],
    results: [
      "A clear prioritized list of technical issues to fix, ordered by impact.",
      "Core Web Vitals data to identify slow pages hurting user experience and rankings.",
      "A health score trend showing whether your technical SEO is improving over time.",
    ],
    actionSteps: [
      "Run your first site audit immediately after setting up your project.",
      "Fix Critical issues first — these have the highest impact on rankings.",
      "Address broken links and redirect chains as a quick win.",
      "Monitor Core Web Vitals. Pages with LCP > 2.5s or CLS > 0.1 need performance optimization.",
      "Re-run the audit after making fixes to verify improvements.",
    ],
    proTips: [
      "Schedule a weekly 30-minute 'Technical SEO Fix' session to steadily resolve issues.",
      "Focus on fixing issues affecting your highest-traffic pages first.",
    ],
  },
  {
    id: "insights",
    icon: Lightbulb,
    tab: "Insights",
    title: "Insights — AI-Powered Recommendations",
    overview:
      "The Insights tab surfaces actionable, AI-generated recommendations based on your keyword data, content performance, competitor analysis, and technical audit results. These are prioritized suggestions to improve your SEO.",
    whatItDoes: [
      "Generates prioritized recommendations across keywords, content, technical SEO, and link building.",
      "Categorizes insights by impact level (High, Medium, Low) and effort required.",
      "Provides specific, actionable instructions — not vague suggestions.",
      "Updates recommendations as your data changes (new rankings, new crawl results, etc.).",
      "Tracks which recommendations you've acted on.",
    ],
    expectations: [
      "Insights are generated automatically and update with each data refresh.",
      "The quality of insights improves as more historical data is collected (2+ weeks ideal).",
      "Not every recommendation will apply to your situation — use your domain expertise to prioritize.",
    ],
    results: [
      "A ready-made action plan prioritized by impact.",
      "Discover opportunities you might have missed in manual analysis.",
      "Save hours of analysis time with AI-driven pattern detection.",
    ],
    actionSteps: [
      "Review the Insights tab at least twice per week.",
      "Focus on High Impact recommendations first.",
      "Mark recommendations as 'done' after you implement them to track progress.",
      "Use insights to inform your weekly content and SEO task list.",
    ],
  },
  {
    id: "command-center",
    icon: Brain,
    tab: "Command Center",
    title: "Command Center — Advanced AI Intelligence",
    overview:
      "The Command Center is your advanced AI suite. It includes Intelligence Briefs, LLM Visibility tracking, Rank Predictions, Entity analysis, and AI-generated content briefs. This is where Optic Rank's AI does its deepest analysis.",
    whatItDoes: [
      "Intelligence Briefs: Comprehensive AI-written reports analyzing your entire SEO position.",
      "AI Visibility: Tracks whether AI assistants (ChatGPT, Gemini, Perplexity) mention your brand.",
      "Predictions: Forecasts where your keywords will rank in 7 days based on trend analysis.",
      "Entities: Shows named entities Google associates with your site and content.",
      "AI Briefs: Generates content briefs for new articles based on keyword and competitor research.",
    ],
    expectations: [
      "Intelligence Briefs take 1–3 minutes to generate. They analyze your full dataset.",
      "AI Visibility checks run on a scheduled basis. Results may vary between AI models.",
      "Predictions are probabilistic — they show likely direction, not guaranteed outcomes.",
    ],
    results: [
      "Deep, data-driven analysis that would take hours to compile manually.",
      "Early warning on AI visibility — are chatbots recommending your competitors instead of you?",
      "Predictive intelligence to proactively address ranking changes before they happen.",
      "Ready-to-use content briefs that align with your keyword strategy.",
    ],
    actionSteps: [
      "Generate an Intelligence Brief bi-weekly to get a comprehensive view of your SEO trajectory.",
      "Check AI Visibility monthly. If competitors appear in AI responses and you don't, prioritize authority building.",
      "Review Predictions weekly. If a keyword is predicted to drop, investigate and take preventive action.",
      "Use AI Briefs when planning new content — they ensure your content targets the right keywords with the right structure.",
    ],
  },
  {
    id: "seo-analytics",
    icon: BarChart3,
    tab: "SEO & Analytics",
    title: "SEO & Analytics — Deep Performance Data",
    overview:
      "The SEO & Analytics tab provides detailed search analytics and optimization tools. It connects your Search Console data with rank tracking to give you a complete picture of your organic search performance.",
    whatItDoes: [
      "Displays click-through rates (CTR), impressions, clicks, and average position from Google Search Console.",
      "Provides page-level optimization scores with specific improvement suggestions.",
      "Shows organic traffic trends over time with source attribution.",
      "Identifies pages with high impressions but low CTR (title/meta description optimization opportunities).",
      "Tracks SERP feature appearances (featured snippets, knowledge panels, etc.).",
    ],
    expectations: [
      "Google Search Console data has a 2–3 day delay. This is a Google limitation.",
      "Optimization scores require at least one completed site crawl.",
      "Traffic estimates are approximations based on keyword positions and search volumes.",
    ],
    results: [
      "Identify CTR optimization opportunities — pages ranking well but not getting clicks.",
      "Track true organic traffic growth over time.",
      "Understand which pages drive the most organic revenue.",
    ],
    actionSteps: [
      "Focus on pages with high impressions but below-average CTR. Rewrite their title tags and meta descriptions.",
      "Monitor organic traffic trends weekly. Any sudden drops need immediate investigation.",
      "Use optimization scores to prioritize on-page improvements.",
    ],
  },
  {
    id: "app-store",
    icon: Smartphone,
    tab: "App Store",
    title: "App Store — ASO & App Intelligence",
    overview:
      "The App Store tab is for App Store Optimization (ASO). If you have mobile apps, track their rankings, reviews, ratings, and keyword visibility across the Apple App Store and Google Play Store.",
    whatItDoes: [
      "Tracks your app's keyword rankings in the App Store and Play Store.",
      "Monitors app ratings, reviews, and review sentiment over time.",
      "Provides ASO scores and optimization recommendations for your app listings.",
      "Tracks competitor apps and their rankings.",
      "Monitors app store keyword visibility and category rankings.",
    ],
    expectations: [
      "App data syncs daily from the app stores.",
      "ASO scores are calculated based on listing completeness, keyword usage, and review quality.",
      "Review sentiment analysis uses AI to categorize reviews as positive, negative, or neutral.",
    ],
    results: [
      "Understand your app's visibility in app store search results.",
      "Track how your ratings and reviews trend over time.",
      "Identify ASO improvements to increase app downloads.",
    ],
    actionSteps: [
      "Add your iOS and/or Android app listings.",
      "Add ASO keywords to track your app's search visibility.",
      "Monitor reviews weekly. Respond to negative reviews promptly.",
      "Run the ASO optimizer to generate improved app title, subtitle, and description suggestions.",
      "Add competitor apps to benchmark your performance.",
    ],
  },
  {
    id: "social-intel",
    icon: Share2,
    tab: "Social Intel",
    title: "Social Intelligence — Brand & Social Monitoring",
    overview:
      "The Social Intelligence tab monitors your brand mentions, social media signals, and online reputation. It tracks how your brand is being discussed across the web and social platforms.",
    whatItDoes: [
      "Monitors brand mentions across social media and the web.",
      "Tracks social engagement metrics (shares, likes, comments) for your content.",
      "Provides sentiment analysis on brand mentions.",
      "Identifies trending topics and conversations relevant to your industry.",
      "Tracks social signals that may correlate with SEO performance.",
    ],
    expectations: [
      "Social data refreshes daily from monitored sources.",
      "Sentiment analysis uses AI and may occasionally miscategorize tone.",
      "Historical social data begins accumulating from the day you set up tracking.",
    ],
    results: [
      "Understand how your brand is perceived online.",
      "Identify PR opportunities or reputation risks early.",
      "Correlate social activity with SEO performance changes.",
    ],
    actionSteps: [
      "Set up brand name monitoring for your company, product names, and key personnel.",
      "Review sentiment trends weekly. Address negative mentions proactively.",
      "Identify high-engagement content topics to inform your content strategy.",
      "Use social signals data alongside keyword data to understand content resonance.",
    ],
  },
  {
    id: "reports",
    icon: FileBarChart,
    tab: "Reports",
    title: "Reports — Professional SEO Reports",
    overview:
      "The Reports tab lets you generate professional, branded SEO reports for stakeholders, clients, or internal teams. Reports compile data from all tabs into a clean, shareable format.",
    whatItDoes: [
      "Generates comprehensive SEO reports with charts, tables, and analysis.",
      "Customizable sections — choose which data to include (rankings, traffic, audit, competitors).",
      "Supports PDF export for sharing with clients or stakeholders.",
      "Provides executive summaries with key takeaways.",
      "Tracks report history so you can compare performance across reporting periods.",
    ],
    expectations: [
      "Reports pull live data at the time of generation.",
      "PDF generation may take 30–60 seconds for large reports.",
      "Reports are most useful after at least 30 days of data collection.",
    ],
    results: [
      "Professional reports that demonstrate SEO value to stakeholders.",
      "Consistent reporting format for tracking progress over time.",
      "Time savings — no more manually compiling data from multiple tools.",
    ],
    actionSteps: [
      "Generate your first report after 2 weeks of data collection.",
      "Set up a monthly reporting schedule for stakeholders.",
      "Customize report sections based on your audience — executives want summaries, SEO teams want details.",
      "Use report comparisons to show progress month-over-month.",
    ],
  },
];

function SOPSectionCard({ section }: { section: SOPSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="border border-rule bg-surface-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-raised"
      >
        <Icon size={20} className="shrink-0 text-editorial-red" />
        <div className="flex-1 min-w-0">
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            {section.tab}
          </span>
          <h3 className="font-serif text-lg font-bold text-ink leading-tight">
            {section.title}
          </h3>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-ink-muted transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="border-t border-rule px-5 py-5 space-y-5">
          {/* Overview */}
          <div>
            <p className="font-serif text-sm italic text-ink-secondary leading-relaxed">
              {section.overview}
            </p>
          </div>

          {/* What It Does */}
          <div>
            <h4 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-editorial-red">
              What It Does
            </h4>
            <ul className="space-y-1.5">
              {section.whatItDoes.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-editorial-red" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Expectations */}
          <div>
            <h4 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-editorial-gold">
              What to Expect
            </h4>
            <ul className="space-y-1.5">
              {section.expectations.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-editorial-gold" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Results */}
          <div>
            <h4 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-editorial-green">
              Results You&apos;ll Get
            </h4>
            <ul className="space-y-1.5">
              {section.results.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-editorial-green" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Steps */}
          <div>
            <h4 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-ink">
              Action Steps
            </h4>
            <ol className="space-y-1.5 list-none">
              {section.actionSteps.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-secondary">
                  <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface-cream">
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Pro Tips */}
          {section.proTips && section.proTips.length > 0 && (
            <div className="border-t border-rule pt-4">
              <h4 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Pro Tips
              </h4>
              <ul className="space-y-1.5">
                {section.proTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-muted italic">
                    <span className="shrink-0">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SOPContent() {
  return (
    <div
      className="space-y-3"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Quick start banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-editorial-gold/30 bg-editorial-gold/5 px-5 py-4">
        <BookOpen size={20} className="shrink-0 text-editorial-gold" />
        <div className="flex-1">
          <h2 className="font-serif text-base font-bold text-ink">How to Use This Guide</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Click on any section below to expand it. Each section covers what the tab does, what to expect, the results you&apos;ll get, and step-by-step action items. Work through them in order for the best results.
          </p>
        </div>
        <a
          href={CONSULT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 border border-editorial-green/40 bg-editorial-green/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-editorial-green transition-colors hover:bg-editorial-green/20"
        >
          <CalendarCheck size={14} />
          Book Free Consult
        </a>
      </div>

      {/* SOP Sections */}
      {SOP_SECTIONS.map((section) => (
        <SOPSectionCard key={section.id} section={section} />
      ))}

      {/* Bottom CTA */}
      <div className="border-t-4 border-double border-rule-dark pt-6 pb-2 text-center">
        <p className="font-serif text-lg font-bold text-ink">
          Need Help Getting Started?
        </p>
        <p className="mt-1 text-sm text-ink-secondary">
          Book a free consultation and we&apos;ll walk you through your specific setup.
        </p>
        <a
          href={CONSULT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 bg-editorial-red px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90"
        >
          <CalendarCheck size={16} />
          Schedule Free Consultation
        </a>
      </div>
    </div>
  );
}
