# Optic Rank — Project Scope & Progress Tracker

> AI-Powered SEO Intelligence Platform combining Moz, Semrush, Ahrefs, SE Ranking, SpyFu, Mangools, Majestic, Similarweb + ASO tools into one unified platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, RSC, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4, CSS custom properties, dark/light theme |
| Database | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Deployment | Vercel |
| Design | Editorial/Newspaper (Playfair Display, IBM Plex Sans/Mono) |
| Charts | Recharts |
| State | Zustand (client) + RSC (server) |
| External APIs | DataForSEO, Google PageSpeed, Gemini AI, Majestic (planned), ScrapingBee (planned) |

---

## Core Rules

1. **NO hardcoded/mock data** — every page queries real Supabase tables
2. **Server + Client split** — server components fetch data, pass as props to client components
3. **DAL pattern** — all queries in `src/lib/dal/`, all mutations in `src/lib/actions/`
4. **Admin uses service role** — bypasses RLS for platform-wide queries
5. **Graceful API fallbacks** — missing API keys show "Connect [Service]" empty states, never crash
6. **Auto-data-collection** — creating a project should automatically start populating data

---

## Database (30+ tables)

**Identity:** organizations, profiles, organization_invites, billing_events, usage_tracking, api_keys
**Projects:** projects (website | ios_app | android_app | both)
**Keywords:** keywords, keyword_ranks, keyword_clusters
**Backlinks:** backlinks, backlink_snapshots
**Site Audit:** site_audits, audit_pages, audit_issues
**Competitors:** competitors, competitor_snapshots
**Content:** content_pages, content_briefs
**App Store:** app_store_listings, app_store_rankings, app_reviews
**AI:** ai_insights, ai_visibility_checks, rank_predictions
**System:** notifications, scheduled_reports, job_queue, audit_log
**Platform:** platform_api_configs, api_call_log

---

## Phase 1: Foundation ✅ COMPLETE

- [x] Next.js project scaffold, Tailwind config, editorial design tokens
- [x] Dark/light theme toggle (CSS class strategy + Zustand + localStorage)
- [x] All UI primitives (Button, Card, Input, Table, Badge, Dialog, Tabs)
- [x] All editorial components (Masthead, PaperHeader, PaperNav, BottomBar, NewspaperGrid, HeadlineBar, AIStory, ColumnHeader, HealthScore)
- [x] Supabase setup — migrations, RLS policies, auth
- [x] Auth flow — signup, login, forgot-password, OAuth (Google/GitHub), email callback
- [x] Admin account (info@donkeyideas.com, superadmin)
- [x] Admin role check — only superadmin/admin can access /admin/*
- [x] Admin redirects to /admin on login, regular users to /dashboard
- [x] Sign out button on both dashboards
- [x] Project creation flow (dialog in Settings > Projects)
- [x] Marketing pages — homepage, pricing, features

---

## Phase 2: Core Web SEO ✅ COMPLETE

### Routes (28)

**Marketing (static):** `/`, `/pricing`, `/features`
**Auth:** `/login`, `/signup`, `/forgot-password`, `/auth/callback`
**Dashboard (10):** `/dashboard`, `/keywords`, `/backlinks`, `/site-audit`, `/competitors`, `/content`, `/ai-insights`, `/app-store`, `/reports`, `/settings`
**Admin (7):** `/admin`, `/users`, `/orgs`, `/billing`, `/health`, `/analytics`, `/api`
**API (1):** `/api/cron/rank-check`

### Auto-Data-Collection Pipeline
- [x] On project creation: auto-fetch keyword suggestions for domain (DataForSEO) — wired, needs API key
- [x] On project creation: auto-run PageSpeed audit (Google PageSpeed API) ✅ WORKING
- [x] On project creation: auto-fetch traffic estimates (DataForSEO) — wired, needs API key
- [x] Graceful fallback when API keys missing (APIKeyMissingError pattern)
- [x] Admin client for all server actions (bypasses RLS)
- [x] Shared audit processing utility (audit-utils.ts)
- [x] Project selector in Masthead (multi-project switching via switchProject action)
- [x] Chart components directory with Recharts wrappers
- [x] Active tab highlighting on PaperNav (usePathname detection)

### Keywords Module
- [x] Add Keywords dialog (functional, calls addKeywords server action)
- [x] Search + device filter (functional)
- [x] CSV import UI + action (Upload button, file picker, importKeywordsCSV)
- [x] Pagination (Previous/Next buttons, wired to client state)
- [x] Delete keyword per row (Trash2 icon, confirm dialog, deleteKeyword action)
- [x] Keyword rank history chart (expandable Recharts LineChart per row, getKeywordRankHistory action)
- [x] AI keyword generation (Gemini API with heuristic fallback, generateKeywordsAI action)
- [x] Daily rank check cron job (`/api/cron/rank-check` — DataForSEO integration, batch processing)
- [x] SERP feature detection display (badges per keyword row — Featured, PAA, Local, Video, etc.)
- [ ] Keyword suggestions from DataForSEO (wired, needs API key)

### Site Audit Module
- [x] Severity + category filters (functional)
- [x] Issue recommendation expand (functional)
- [x] "Run New Audit" button → triggers PageSpeed API audit
- [x] Full score computation (health, SEO, performance, accessibility, content)
- [x] Core Web Vitals display (LCP, CLS, FCP, TTFB, TBT, Speed Index)
- [x] Audit issue generation with proper rule_ids
- [x] Audit history navigation (History tab)
- [ ] Crawl engine (ScrapingBee + Cheerio for multi-page crawls) — needs API key
- [ ] 50+ audit checks — partial (PageSpeed-based checks working)

### Backlinks Module
- [x] Search, link type filter, sort (functional)
- [x] "Reclaim" button action (reclaimBacklink server action)
- [x] "Disavow" button action (disavowBacklink server action)
- [x] "Export Disavow File" action
- [x] Toxic link detection (heuristic scoring — spam TLDs, DA, keywords, anchor text)
- [x] New/lost link detection (7-day new, 30-day lost detection via timestamps)
- [ ] Majestic/Moz API integration — needs API key

### Competitors Module
- [x] "Add Competitor" dialog + server action (functional)
- [x] Remove competitor button (Trash2 icon, confirm, removeCompetitor action)
- [x] AI competitor discovery (Gemini API, generateCompetitorsAI action)
- [x] Side-by-side comparison cards (authority, traffic, keywords, backlinks per competitor)
- [x] Domain authority distribution bar chart
- [ ] Auto-discovery from SERP data — needs DataForSEO key
- [ ] Keyword/content gap analysis — future enhancement

### Content Module
- [x] "New Content" dialog + action (addContentPage server action)
- [x] Delete content page button (Trash2 icon, confirm, deleteContentPage action)
- [x] Content scoring algorithm (heuristic — title quality, word count, URL structure, keyword match)
- [ ] Content decay detection — rule-based logic exists in AI insights engine
- [ ] Brief editing — future enhancement

### AI Insights Module
- [x] Wire dismiss button to dismissInsight action
- [x] AI insight generation engine (rule-based + Gemini AI enhancement)
- [x] Priority scoring (0-100 based on data signals)
- [x] Revenue impact estimation (traffic × conversion rate × value)
- [x] "Generate Insights" button on AI Insights page
- [x] 8 insight types: rising/falling keywords, top-3 opportunities, toxic backlinks, new links, health drops, content decay, getting started

### Admin Module
- [x] Admin overview with stats (users, orgs, projects, jobs)
- [x] Users management with email enrichment from auth.users
- [x] Organizations management with member/project counts
- [x] Billing overview
- [x] System health (job queue status)
- [x] Usage analytics
- [x] **API Management** — provider cards with masked keys, save/test buttons, usage stats, call history log
- [x] API call logging utility (fire-and-forget logAPICall + withAPILogging wrapper)
- [x] Platform API configs DB table (8 pre-seeded providers)

---

## Phase 3: ASO + Content (Future)

- [ ] Apple Search Ads + Play Store integrations
- [ ] App keyword tracking
- [ ] Store listing optimizer
- [ ] Review monitoring + AI sentiment
- [ ] Cross-platform unified view
- [ ] AI content brief generator
- [ ] Entity extraction
- [ ] AI writing assistant

---

## Phase 4: Advanced AI ✅ COMPLETE

### Routes (4 new)
**Dashboard:** `/ai-visibility`, `/predictions`, `/entities`, `/ai-briefs`

### LLM Visibility Tracker
- [x] DeepSeek added as 5th LLM provider (OpenAI, Anthropic, Gemini, Perplexity, DeepSeek)
- [x] Visibility check engine — queries all 5 LLMs per keyword, analyzes brand mentions
- [x] Visibility scoring (0-100) based on mention, citation, position in response
- [x] Dashboard page with per-keyword × per-LLM status matrix (green/yellow/red indicators)
- [x] Expandable response excerpts per LLM
- [x] Provider breakdown sidebar, legend, search/filter
- [x] "Run Visibility Check" action with batch processing (3 keywords at a time)

### Predictive SEO Engine
- [x] Statistical prediction algorithm (linear regression + weighted moving average)
- [x] Feature engineering: velocity_7d, velocity_30d, volatility, search_volume, difficulty, serp_features, R²
- [x] Confidence scoring based on data density + trend consistency
- [x] Direction classification: improving / declining / stable
- [x] AI-generated narratives per keyword via DeepSeek
- [x] Prediction accuracy backfill (compare predictions vs actuals)
- [x] Dashboard page with table, filters (Opportunities/Risks/All), sort controls
- [x] Prediction chart (horizontal bar chart showing position changes)

### Entity SEO & Knowledge Graph
- [x] `entities` + `entity_mentions` tables (migration 00007)
- [x] RLS policies (org-scoped via project)
- [x] AI entity extraction from keywords and content pages via DeepSeek
- [x] 9 entity types: person, organization, product, place, concept, technology, event, brand, other
- [x] Entity gap analysis vs competitors
- [x] Entity coverage per content page
- [x] Dashboard page with entity cards, type filters, gap recommendations
- [x] Entity coverage bar chart

### AI Intelligence Brief Engine
- [x] `ai_briefs` table (migration 00008)
- [x] Comprehensive brief generator — aggregates ALL project data (keywords, ranks, backlinks, audit, competitors, visibility, predictions, entities, insights)
- [x] 10-section structured briefs via DeepSeek (summary, keywords, rankings, backlinks, visibility, technical, competitors, predictions, entities, actions)
- [x] Brief type selector (daily/weekly/monthly/on_demand)
- [x] Dashboard page with newspaper-style article layout
- [x] Brief history sidebar with delete support

---

## Phase 5: Enterprise + Polish ✅

- [x] Stripe billing, plan gating, usage metering
- [x] Report builder + PDF export
- [x] Public REST API + webhooks
- [x] Slack/Zapier/WordPress integrations
- [x] Performance optimization, security audit, E2E tests

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| Root layout | `src/app/layout.tsx` |
| Dashboard layout | `src/app/dashboard/layout.tsx` |
| Admin layout | `src/app/admin/layout.tsx` |
| Supabase server client | `src/lib/supabase/server.ts` |
| Supabase admin client | `src/lib/supabase/admin.ts` |
| DAL modules | `src/lib/dal/*.ts` |
| Server actions | `src/lib/actions/*.ts` |
| API wrappers | `src/lib/api/*.ts` |
| AI modules | `src/lib/ai/*.ts` |
| UI components | `src/components/ui/*.tsx` |
| Editorial components | `src/components/editorial/*.tsx` |
| Design tokens | `src/app/globals.css` |
| DB migrations | `supabase/migrations/*.sql` |
| Cron jobs | `src/app/api/cron/*/route.ts` |

---

## Accounts

- **Admin:** info@donkeyideas.com (superadmin, Donkey Ideas org, business plan)
- **Supabase:** https://rkwrrvizkoipctdqsoby.supabase.co
