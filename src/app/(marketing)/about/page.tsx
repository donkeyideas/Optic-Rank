import type { Metadata } from "next";
import { JsonLd, OG_IMAGES, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: { absolute: "About Optic Rank — AI SEO Intelligence Platform" },
  description:
    "Learn about Optic Rank's mission to democratize SEO intelligence with AI-powered tools. Meet the team building the future of search visibility.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Optic Rank — AI SEO Intelligence Platform",
    description:
      "Our mission: make world-class SEO intelligence accessible to every team.",
    images: OG_IMAGES,
  },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "About", path: "/about" }])}
      />
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <header className="mb-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-editorial-red">
            About Us
          </p>
          <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-ink">
            Building the Future of Search Intelligence
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
            Optic Rank was founded on a simple belief: every team deserves
            access to world-class SEO intelligence, powered by AI.
          </p>
        </header>

        {/* Mission */}
        <section className="mb-16">
          <div className="border-l-4 border-editorial-red pl-6">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Our Mission
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Search is evolving faster than ever. With AI-powered engines like
              ChatGPT, Perplexity, and Google&apos;s SGE reshaping how people find
              information, brands need a new approach to visibility. We&apos;re building
              the platform that tracks, analyzes, and optimizes your presence across
              every surface where people search.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Traditional SEO tools were built for a single channel: Google rankings.
              But today, your customers discover brands through ChatGPT recommendations,
              Perplexity research summaries, Gemini overviews, Google SGE snapshots,
              and classic organic results — often in the same session. Optic Rank is the
              first unified search intelligence platform that monitors your visibility
              across all of these surfaces in one dashboard, giving you a complete
              picture of how and where your brand appears in the modern search landscape.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            What We Stand For
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Data-Driven",
                description:
                  "Every recommendation is backed by real data, not guesswork. We believe in transparent metrics and actionable insights. Our platform pulls live data from search engines, AI models, and backlink indexes so you can make decisions based on what is actually happening — not assumptions or outdated reports.",
              },
              {
                title: "Innovation First",
                description:
                  "We track what others don't — AI citations, answer engine visibility, and generative search presence alongside traditional SEO. As new AI models and search surfaces emerge, we integrate them into the platform within weeks, ensuring you are never blind to where your audience is moving next.",
              },
              {
                title: "Accessible to All",
                description:
                  "Enterprise-grade intelligence shouldn't require an enterprise budget. Our tools are designed for teams of every size. From solo founders running their first site to marketing departments managing hundreds of domains, every plan includes the same core analytics engine with no artificial feature gates.",
              },
            ].map((value) => (
              <div
                key={value.title}
                className="border border-rule p-6"
              >
                <h3 className="font-serif text-lg font-bold text-ink">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Four Pillars */}
        <section className="mb-16 border-y border-rule py-12">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            The Four Pillars
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "SEO",
                full: "Search Engine Optimization",
                description: "Traditional keyword tracking, rankings, and site audits.",
              },
              {
                label: "AEO",
                full: "Answer Engine Optimization",
                description: "Visibility in AI-generated answers and featured snippets.",
              },
              {
                label: "GEO",
                full: "Generative Engine Optimization",
                description: "Presence in ChatGPT, Perplexity, Gemini, and more.",
              },
              {
                label: "CRO",
                full: "Conversion Rate Optimization",
                description: "Turn visibility into revenue with data-driven optimization.",
              },
            ].map((pillar) => (
              <div key={pillar.label} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-ink font-serif text-xl font-bold text-ink">
                  {pillar.label}
                </div>
                <h3 className="mt-3 text-xs font-bold uppercase tracking-widest text-ink-muted">
                  {pillar.full}
                </h3>
                <p className="mt-2 text-sm text-ink-secondary">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Our Journey
          </h2>
          <div className="space-y-6">
            {[
              {
                date: "Q4 2025",
                title: "The Idea",
                description:
                  "Recognized the gap in SEO tools that don't account for AI-powered search engines.",
              },
              {
                date: "Q1 2026",
                title: "Platform Launch",
                description:
                  "Launched Optic Rank with keyword tracking, site audits, and AI visibility monitoring.",
              },
              {
                date: "Q2 2026",
                title: "What's Next",
                description:
                  "Expanding integrations, multi-language support, and custom reporting for agencies. Our roadmap includes full multi-language keyword tracking for over 30 languages, white-label dashboards so agencies can deliver branded reports to their clients, and a public REST API that lets developers build custom workflows on top of Optic Rank data.",
              },
            ].map((event) => (
              <div
                key={event.date}
                className="flex gap-6 border-l-2 border-rule pl-6"
              >
                <div className="shrink-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-editorial-red">
                    {event.date}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What Makes Optic Rank Different */}
        <section className="mb-16">
          <div className="border-l-4 border-editorial-red pl-6">
            <h2 className="font-serif text-2xl font-bold text-ink">
              What Makes Optic Rank Different
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Most SEO platforms were built in an era when Google&apos;s ten blue links
              were the only game in town. They bolt on new features as afterthoughts,
              leaving teams to stitch together separate dashboards for rank tracking,
              content auditing, backlink monitoring, and conversion analysis. Optic Rank
              was designed from the ground up to unify SEO, AEO, GEO, and CRO into a
              single, cohesive platform — so every optimization decision is informed by
              the full picture of your search presence, not just one slice of it.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              What truly sets us apart is AI engine citation tracking. While other tools
              stop at Google rankings, Optic Rank monitors whether ChatGPT, Perplexity,
              Gemini, and other generative AI models are mentioning, recommending, or
              linking to your brand. We surface exactly which prompts trigger your brand
              citations, which competitors appear alongside you, and how your AI
              visibility trends over time — data that simply does not exist in any other
              platform on the market today.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Finally, we believe data should tell a story, not just fill a spreadsheet.
              Optic Rank presents every insight in editorial-style reports that read like
              executive briefings: clear narratives, contextual benchmarks, and
              prioritized action items. Whether you are reporting to a client or
              presenting to your C-suite, the data speaks for itself — no interpretation
              required.
            </p>
          </div>
        </section>

        {/* Our Technology */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Our Technology
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "AI-Powered Analysis",
                description:
                  "Our artificial intelligence engine continuously analyzes your keyword rankings, content performance, backlink profile, and competitor movements. It identifies patterns that human analysts would miss, surfacing opportunities and threats before they impact your traffic. Every recommendation is generated by models trained on millions of ranking signals across traditional and AI-powered search engines.",
              },
              {
                title: "Real-Time Monitoring",
                description:
                  "Optic Rank performs daily rank checks across Google, Bing, and AI search surfaces, delivering instant alerts the moment a significant change is detected. Live dashboards update throughout the day so your team always operates on current data — not yesterday's snapshot. From sudden ranking drops to competitor surges, you will know about it within hours, not weeks.",
              },
              {
                title: "Editorial Intelligence",
                description:
                  "Raw data is only useful if you can act on it. Our editorial intelligence layer transforms complex datasets into concise, narrative-driven briefs that any stakeholder can understand. Instead of exporting CSV files and building pivot tables, you receive prioritized insights written in plain language, complete with benchmarks, trend context, and clear next steps.",
              },
            ].map((tech) => (
              <div
                key={tech.title}
                className="border border-rule p-6"
              >
                <h3 className="font-serif text-lg font-bold text-ink">
                  {tech.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Who We Serve */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Who We Serve
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "SEO Agencies",
                description:
                  "Manage dozens — or hundreds — of client campaigns from a single dashboard with multi-client management, cross-project benchmarking, and white-label reports you can brand as your own. Optic Rank helps agencies scale their operations without scaling their headcount by automating the data gathering and reporting that used to consume hours of analyst time every week.",
              },
              {
                title: "In-House Marketing Teams",
                description:
                  "Track your brand's visibility across every search surface and generate stakeholder-ready reports in minutes, not days. Whether you need a weekly performance snapshot for your VP of Marketing or a quarterly board deck, Optic Rank packages the data into polished, presentation-grade briefs that demonstrate clear ROI from your SEO and content investments.",
              },
              {
                title: "Freelance SEO Consultants",
                description:
                  "Prove your impact to clients with transparent before-and-after performance data. Optic Rank gives independent consultants the same caliber of analytics that enterprise teams rely on, making it easy to demonstrate ranking improvements, traffic gains, and AI citation growth from the moment you begin an engagement through every milestone thereafter.",
              },
              {
                title: "E-Commerce Brands",
                description:
                  "Optimize product pages for both traditional search engines and AI shopping recommendations with specialized e-commerce analytics. Track category-level visibility, monitor competitor product rankings, measure conversion rates from organic and AI-driven traffic, and identify which product pages need content improvements to capture more qualified buyers.",
              },
            ].map((audience) => (
              <div
                key={audience.title}
                className="border border-rule p-6"
              >
                <h3 className="font-serif text-lg font-bold text-ink">
                  {audience.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="mb-16">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-rule">
            {[
              {
                question: "What does Optic Rank do?",
                answer:
                  "Optic Rank is a unified search intelligence platform that tracks your brand's visibility across traditional search engines like Google and Bing, as well as AI-powered search surfaces including ChatGPT, Perplexity, and Gemini. It combines keyword rank tracking, site auditing, backlink analysis, AI citation monitoring, and conversion optimization into a single dashboard, giving marketing teams and agencies a complete view of their search presence.",
              },
              {
                question: "How is Optic Rank different from other SEO tools?",
                answer:
                  "Unlike traditional SEO platforms that focus exclusively on Google rankings, Optic Rank was built from the ground up to monitor both classic search engines and generative AI models. We unify SEO, AEO, GEO, and CRO in one platform, track AI engine citations that other tools ignore entirely, and present all data in editorial-style reports that are ready to share with clients and stakeholders without additional formatting or interpretation.",
              },
              {
                question: "Does Optic Rank track AI search engines?",
                answer:
                  "Yes. Optic Rank monitors whether AI models like ChatGPT, Perplexity, Gemini, and Google's SGE are citing, recommending, or linking to your brand. We track which queries trigger your brand mentions, how your AI visibility compares to competitors, and how citation trends change over time. This is one of our core differentiators — most SEO tools have no AI search tracking capabilities at all.",
              },
              {
                question: "Is there a free trial?",
                answer:
                  "Absolutely. Optic Rank offers a free trial that gives you full access to the platform so you can explore keyword tracking, site audits, AI citation monitoring, and editorial reporting before committing to a paid plan. No credit card is required to start. Simply sign up and connect your first domain to begin seeing data within minutes.",
              },
            ].map((faq) => (
              <div key={faq.question} className="py-6">
                <h3 className="font-serif text-lg font-bold text-ink">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="border-2 border-ink p-10">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Ready to Get Started?
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              Join thousands of teams using Optic Rank to dominate search.
            </p>
            <a
              href="/signup"
              className="mt-6 inline-flex h-11 items-center justify-center bg-editorial-red px-8 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90"
            >
              Start Free Trial
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
