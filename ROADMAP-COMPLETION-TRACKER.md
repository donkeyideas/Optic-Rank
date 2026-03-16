# Roadmap Completion Tracker

> Audit performed: 2026-03-16
> Last updated: 2026-03-16 (3 quick wins completed)
> Status of each roadmap item after thorough codebase verification.

---

## 1. Google Search Console Integration

**Roadmap Status:** IN PROGRESS
**Actual Status:** ADMIN DONE / USER NOT DONE (~50%)

### What's Done
- Full GSC API client (`src/lib/google/search-console.ts`) with 7 functions: overview, top queries, top pages, daily data, devices, countries, site discovery
- Google Auth library with service account support (`src/lib/google/auth.ts`)
- Admin `/admin/search-ai` page displays all GSC data with charts and tables
- `projects` table has `gsc_property_url` column

### What's Missing (User Side)
- [ ] **User-facing GSC connection page** — No UI for users to connect their own GSC property
- [ ] **OAuth flow for users** — Currently service-account only (admin), users can't authorize their own GSC access
- [ ] **Keyword import from GSC** — Users can't auto-import keywords from their GSC data
- [ ] **GSC metrics in user dashboard** — No CTR, impressions, clicks data shown to users
- [ ] **GSC data storage** — Data is fetched real-time from Google API but not persisted/cached in DB
- [ ] **Settings UI** — No place for users to configure their GSC property URL

### Key Files
- `src/lib/google/search-console.ts` — API wrapper (complete)
- `src/lib/google/auth.ts` — Auth (service account only)
- `src/app/admin/search-ai/` — Admin page (complete)

### Priority: MEDIUM
Users would need individual OAuth to make this fully work. Could defer to post-launch.

---

## 2. Custom Report Builder

**Roadmap Status:** PLANNED
**Actual Status:** PARTIALLY DONE (~45%)

### What's Done
- 5 pre-built report templates (Full, Executive, Keywords, Backlinks, Audit)
- PDF generation with `@react-pdf/renderer` and editorial design system
- On-demand PDF download works (base64 browser download)
- Scheduled reports UI — create, toggle, delete with frequency selection
- `scheduled_reports` DB table with full scheduling schema
- Cron job infrastructure (`/api/cron/send-reports`)
- 6 PDF section components (keywords, backlinks, audit, competitors, executive, AI insights)

### What's Missing
- [ ] **Email delivery** — Cron generates PDFs but does NOT email them (no email provider integrated)
- [ ] **Drag-and-drop builder** — Only fixed templates, no custom section ordering
- [ ] **White-label branding** — Hard-coded "RankPulse AI" branding, no custom logo/colors
- [ ] **Custom section selection** — Can't pick individual sections within a template
- [ ] **Preview mode** — No PDF preview before download
- [ ] **Organization logo in reports** — `organizations.logo_url` exists in DB but not used in PDFs

### Key Files
- `src/app/dashboard/reports/reports-client.tsx` — UI
- `src/lib/pdf/generate-report.ts` — PDF generation
- `src/lib/pdf/editorial-template.tsx` — PDF styling
- `src/lib/pdf/sections/*.tsx` — 6 section components
- `src/lib/actions/reports.ts` — Server actions
- `src/app/api/cron/send-reports/route.ts` — Cron

### Priority: HIGH
Email delivery is the critical missing piece. Drag-and-drop is nice-to-have.

---

## 3. Slack & Teams Notifications

**Roadmap Status:** PLANNED
**Actual Status:** SLACK + TEAMS DONE (~80%) ✅ UPDATED

### What's Done
- **Slack** webhook integration fully implemented (`src/lib/integrations/slack.ts`)
- **Microsoft Teams** webhook integration with Adaptive Cards (`src/lib/integrations/teams.ts`) ✅ NEW
- Slack message formatting with Block Kit (5 message types)
- Teams message formatting with Adaptive Cards (5 message types) ✅ NEW
- Settings UI for Slack + Teams webhook URLs with save/test buttons ✅ NEW
- Custom webhook system (Zapier/n8n/Make compatible)
- `webhook_endpoints` table with HMAC-SHA256 signing
- `webhook_deliveries` table for delivery logging
- 4-channel notification dispatch: in-app + Slack + Teams + custom webhooks ✅ UPDATED
- 5 supported events: rank_changed, audit_completed, prediction_generated, backlink_new, backlink_lost
- Backlink notifications wired to discovery and new/lost detection ✅ NEW

### What's Missing
- [x] ~~**Microsoft Teams integration**~~ — ✅ DONE (2026-03-16)
- [ ] **Email notifications** — No email channel (no Sendgrid/Resend integration)
- [ ] **Per-user notification preferences** — No granular user-level settings for which events to receive
- [x] ~~**Notification triggers for backlinks**~~ — ✅ DONE (2026-03-16)

### Key Files
- `src/lib/integrations/slack.ts` — Slack client
- `src/lib/integrations/teams.ts` — Teams client ✅ NEW
- `src/lib/notifications/dispatch.ts` — Multi-channel dispatch (Slack + Teams + webhooks)
- `src/lib/webhooks/dispatch.ts` — Webhook delivery
- `src/lib/actions/integrations.ts` — Server actions (Slack + Teams save/test)
- `src/app/dashboard/settings/integrations-tab.tsx` — Settings UI

### Priority: MEDIUM
Slack + Teams both work. Email notifications remain the main gap.

---

## 4. Multi-Language SERP Tracking

**Roadmap Status:** PLANNED
**Actual Status:** BACKEND READY / FRONTEND NOT DONE (~35%) ✅ UPDATED

### What's Done
- `keywords` table has `location` column (TEXT, default 'US')
- Unique constraint includes location: `(project_id, keyword, search_engine, device, location)`
- DataForSEO `checkSERP()` accepts `location` and `language` parameters
- `getKeywordSuggestions()` also accepts location/language
- Keywords dashboard shows location per keyword in the table
- Projects have `target_countries[]` and `target_languages[]` arrays
- Rank check cron now passes `kw.location` to `checkSERP()` ✅ FIXED (2026-03-16)

### What's Missing
- [ ] **Keyword creation UI** — No location/language input field when adding keywords
- [ ] **All keyword creation paths hard-code "US"** — `addKeywords()`, `generateKeywordsAI()`, `importKeywordsCSV()` all set `location: "US"`
- [x] ~~**Rank check cron doesn't pass location**~~ — ✅ FIXED (2026-03-16)
- [ ] **No language column on keywords table** — Language is only at project level, not per-keyword
- [ ] **No location/language filters** — Dashboard toolbar has no filters for location or language
- [ ] **Collect function hard-codes US** — `src/lib/actions/collect.ts` always uses "US"

### Key Files
- `src/lib/actions/keywords.ts` — Lines 108, 224, 287 (hard-coded "US")
- `src/app/api/cron/rank-check/route.ts` — Now passes `kw.location` ✅
- `src/lib/api/dataforseo.ts` — Lines 114-162 (supports location/language)
- `src/app/dashboard/keywords/keywords-client.tsx` — No location input in form

### Remaining Fix Plan
1. Add `language` column to `keywords` table (migration)
2. Update keyword creation UI with location/language dropdowns (use project defaults)
3. Update `addKeywords()`, `generateKeywordsAI()`, `importKeywordsCSV()` to accept location/language
4. Add location/language filter to keywords dashboard toolbar

### Priority: HIGH
The backend fully supports it — just needs UI wiring.

---

## 5. AI Content Brief Generator

**Roadmap Status:** IN PROGRESS
**Actual Status:** FULLY DONE (100%)

### What's Done
- Full AI brief generation from 8 data sources (keywords, backlinks, audit, competitors, insights, entities, predictions, project)
- DeepSeek as primary AI provider with fallback chain (OpenAI -> Anthropic -> Gemini)
- 10-section structured output (executive, keywords, rankings, backlinks, visibility, technical, competitors, predictions, entities, actions)
- Brief history with sidebar navigation
- Brief type support: daily, weekly, monthly, on-demand
- Data snapshots stored for historical reference
- Database schema with RLS policies
- Full DAL with getBriefs(), getLatestBrief(), getBriefById()

### Nothing Missing
This feature is production-ready.

### Key Files
- `src/app/dashboard/ai-briefs/` — Page + client
- `src/lib/ai/generate-brief.ts` — Core generation logic
- `src/lib/actions/briefs.ts` — Server actions
- `src/lib/dal/briefs.ts` — Data access

---

## 6. Site Audit Scheduler

**Roadmap Status:** COMPLETED
**Actual Status:** AUDIT DONE / SCHEDULER NOT DONE (~70%)

### What's Done
- Full site audit system with crawling, analysis, and scoring
- Health score, SEO score, performance score, accessibility score, content score
- Issues tracking with categories and severity
- Manual "Run New Audit" button works
- Audit history display
- Issues detail view with recommendations

### What's Missing
- [ ] **No scheduling support in DB** — `site_audits` table has no `schedule`, `next_run_at`, or frequency columns
- [ ] **No scheduling UI** — Users can only manually trigger audits
- [ ] **No cron job for audits** — Only rank-check and send-reports crons exist
- [ ] **No diff reports** — Can't compare two audits side-by-side to see what changed

### Fix Plan (follow `scheduled_reports` pattern)
1. Add `scheduled_audits` table with: project_id, schedule (daily/weekly/monthly), next_run_at, last_run_at, is_active
2. Create `/api/cron/site-audit` endpoint
3. Add scheduling UI to site audit page (frequency picker, toggle)
4. Add `getNextRunDate()` logic (reuse from reports)

### Key Files
- `src/app/dashboard/site-audit/site-audit-client.tsx` — UI
- `src/lib/actions/site-audit.ts` — Manual trigger
- `supabase/migrations/00001_initial_schema.sql` — Schema (no scheduling)

### Priority: MEDIUM
The audit itself works. Scheduling is a convenience feature.

---

## 7. Backlink Monitoring Alerts

**Roadmap Status:** COMPLETED
**Actual Status:** MONITORING + ALERTS DONE (~85%) ✅ UPDATED

### What's Done
- Full backlink system: discovery, crawling, storage
- New/lost link detection (`detectNewLostLinks()`)
- Toxic link detection with proprietary scoring algorithm
- Quality scoring: DA, TF, CF with heuristic calculations
- Disavow file export for Google Search Console
- 4-tab UI: All, New, Lost, Toxic
- Backlink snapshots for historical tracking
- API endpoint: GET `/api/v1/backlinks`
- AI insights integration (generates insights for toxic/new backlinks)
- Notifications triggered on backlink discovery (`backlink.new`) ✅ WIRED (2026-03-16)
- Notifications triggered on new/lost detection (`backlink.new`, `backlink.lost`) ✅ WIRED (2026-03-16)
- Alerts sent to in-app + Slack + Teams + custom webhooks ✅ WIRED (2026-03-16)

### What's Missing
- [x] ~~**Notifications NOT triggered**~~ — ✅ DONE (2026-03-16)
- [ ] **No periodic monitoring cron** — Backlink discovery is on-demand only (user must click)
- [ ] **No scheduled re-checking** — Lost links detected by timestamp heuristic, not by re-crawling
- [ ] **No email alerts** — Email channel not yet integrated (Sendgrid/Resend needed)

### Remaining Fix Plan
1. Create `/api/cron/backlink-check` to periodically re-crawl known backlinks
2. Wire email channel when email provider is integrated

### Key Files
- `src/lib/actions/backlinks.ts` — Discovery + detection (notifications now wired) ✅
- `src/lib/notifications/dispatch.ts` — 4-channel dispatch (in-app + Slack + Teams + webhooks)
- `src/lib/backlinks/crawler.ts` — Crawling + scoring

### Priority: LOW
Core monitoring and alerts now work. Periodic cron is a nice-to-have.

---

## 8. API v2 with Webhooks

**Roadmap Status:** PLANNED
**Actual Status:** API v1 FULLY DONE / v2 NOT STARTED (~65%)

### What's Done (as v1)
- Full REST API v1 at `/api/v1/` with 7 endpoints (projects, keywords, backlinks, audit, visibility, entities, predictions)
- API key management with SHA256 hashing, scope-based auth, expiration
- Rate limiting: 100 req/min per key (in-memory)
- CORS headers for cross-origin requests
- Webhook system: registration, HMAC-SHA256 signed delivery, event filtering
- `webhook_endpoints` + `webhook_deliveries` tables
- UI for managing API keys and webhooks in Settings
- Integration with Zapier/n8n/Make via custom webhooks

### What's Missing (for "v2")
- [ ] **No Swagger/OpenAPI spec** — No formal API documentation
- [ ] **No public API docs page** — No `/docs` endpoint or developer portal
- [ ] **No write endpoints** — All v1 endpoints are read-only (GET)
- [ ] **No per-plan rate limits** — Same 100/min for all plans
- [ ] **No OAuth2 for third-party apps** — Only API key auth
- [ ] **No webhook retry logic** — Failed deliveries are logged but not retried
- [ ] **No API versioning header** — No `Accept: application/vnd.opticrank.v2` support

### Priority: LOW
v1 is functional and sufficient for launch. v2 is a post-launch iteration.

---

## Summary Matrix

| # | Feature | Roadmap Status | Actual % | Priority | Effort |
|---|---------|---------------|----------|----------|--------|
| 1 | GSC Integration (User) | In Progress | 50% | Medium | Large |
| 2 | Custom Report Builder | Planned | 45% | **High** | Medium |
| 3 | Slack & Teams Notifications | Planned | **80%** ✅ | Medium | Small |
| 4 | Multi-Language SERP | Planned | **35%** ✅ | **High** | Medium |
| 5 | AI Content Brief Generator | In Progress | **100%** | Done | — |
| 6 | Site Audit Scheduler | Completed | 70% | Medium | Small |
| 7 | Backlink Monitoring Alerts | Completed | **85%** ✅ | Low | Small |
| 8 | API v2 with Webhooks | Planned | 65% | Low | Large |

## Completed Quick Wins (2026-03-16)

1. ~~**Wire backlink notifications**~~ ✅ — Added `dispatchNotification()` in `discoverBacklinks()` and `detectNewLostLinks()`
2. ~~**Fix rank-check cron**~~ ✅ — Now passes `kw.location` to `checkSERP()`
3. ~~**Add Teams webhook**~~ ✅ — Full Teams integration with Adaptive Cards, save/test UI, 4-channel dispatch

## Remaining Priority Order

### High Priority (for launch readiness)
1. **Email delivery for reports** — Integrate Resend/Sendgrid, wire to cron (~4-6 hours)
2. **Multi-language keyword creation UI** — Location/language dropdowns + update actions (~4-6 hours)
3. **Site audit scheduling** — Mirror scheduled_reports pattern (~4-6 hours)

### Post-Launch
4. **User-facing GSC OAuth** — Complex OAuth flow, per-user token storage (~1-2 days)
5. **Drag-and-drop report builder** — Significant UI work (~2-3 days)
6. **API v2 with docs** — OpenAPI spec, write endpoints, developer portal (~2-3 days)
7. **Backlink periodic monitoring cron** — Auto re-crawl known backlinks (~3-4 hours)
8. **Email notification channel** — Sendgrid/Resend for notification emails (~4-6 hours)
9. **Per-user notification preferences** — Granular event subscriptions (~4-6 hours)

---

## Roadmap Items to Update

The seed data in the admin roadmap should be updated to reflect reality:
- **AI Content Brief Generator** → Change to COMPLETED
- **Site Audit Scheduler** → Change to IN PROGRESS (audit works, scheduling doesn't)
- **Backlink Monitoring Alerts** → Change to COMPLETED (alerts now wired) ✅ UPDATED
