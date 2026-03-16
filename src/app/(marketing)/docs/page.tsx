import { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — RankPulse AI",
  description: "REST API reference for programmatic access to your SEO data.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/projects",
    scope: "projects:read",
    description: "List all projects in your organization.",
    params: [],
    response: '{ "data": [{ "id": "...", "name": "...", "domain": "..." }] }',
  },
  {
    method: "GET",
    path: "/api/v1/keywords",
    scope: "keywords:read",
    description: "List keywords with rankings, volume, and difficulty.",
    params: [
      { name: "project_id", type: "string", required: false, desc: "Filter by project" },
      { name: "limit", type: "number", required: false, desc: "Max results (default 100, max 500)" },
      { name: "offset", type: "number", required: false, desc: "Pagination offset" },
    ],
    response: '{ "data": [...], "total": 150 }',
  },
  {
    method: "GET",
    path: "/api/v1/backlinks",
    scope: "backlinks:read",
    description: "List backlinks with trust flow and toxic detection.",
    params: [
      { name: "project_id", type: "string", required: true, desc: "Project ID" },
      { name: "limit", type: "number", required: false, desc: "Max results" },
      { name: "offset", type: "number", required: false, desc: "Pagination offset" },
    ],
    response: '{ "data": [...], "total": 500 }',
  },
  {
    method: "GET",
    path: "/api/v1/audit",
    scope: "audit:read",
    description: "Get the latest site audit results and issues.",
    params: [
      { name: "project_id", type: "string", required: true, desc: "Project ID" },
    ],
    response: '{ "data": { "health_score": 85, ... }, "issues": [...] }',
  },
  {
    method: "GET",
    path: "/api/v1/predictions",
    scope: "predictions:read",
    description: "Get AI-generated ranking predictions.",
    params: [
      { name: "project_id", type: "string", required: true, desc: "Project ID" },
    ],
    response: '{ "data": [{ "keyword_id": "...", "predicted_position": 5, ... }] }',
  },
  {
    method: "GET",
    path: "/api/v1/entities",
    scope: "entities:read",
    description: "Get tracked entities and knowledge panel data.",
    params: [
      { name: "project_id", type: "string", required: true, desc: "Project ID" },
    ],
    response: '{ "data": [{ "entity_name": "...", "knowledge_panel_present": true, ... }] }',
  },
  {
    method: "GET",
    path: "/api/v1/visibility",
    scope: "visibility:read",
    description: "Get AI visibility checks across search engines.",
    params: [
      { name: "project_id", type: "string", required: true, desc: "Project ID" },
    ],
    response: '{ "data": [{ "keyword": "...", "ai_engine": "chatgpt", "visibility_score": 85, ... }] }',
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Masthead */}
      <div className="border-b-[3px] border-ink pb-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-muted">
          Developer Reference
        </p>
        <h1 className="font-serif text-4xl font-bold text-ink">
          API Documentation
        </h1>
        <p className="mt-2 font-sans text-sm text-ink-secondary">
          Programmatic access to your SEO intelligence data via REST API.
        </p>
      </div>

      {/* Authentication */}
      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold text-ink border-b-2 border-ink pb-1">
          Authentication
        </h2>
        <p className="mt-4 text-sm text-ink-secondary leading-relaxed">
          All API requests require an API key sent via the <code className="bg-surface-raised px-1.5 py-0.5 font-mono text-xs">Authorization</code> header.
          Create API keys in <strong>Settings &rarr; API Keys</strong>.
        </p>
        <div className="mt-4 border border-rule bg-surface-card p-4">
          <code className="block font-mono text-xs text-ink whitespace-pre">
{`curl -H "Authorization: Bearer rp_your_api_key_here" \\
     https://your-domain.com/api/v1/projects`}
          </code>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Rate limit: 100 requests per minute per API key.
          Exceeding this returns <code className="font-mono">429 Too Many Requests</code> with a <code className="font-mono">Retry-After</code> header.
        </p>
      </section>

      {/* Endpoints */}
      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold text-ink border-b-2 border-ink pb-1">
          Endpoints
        </h2>

        {ENDPOINTS.map((ep, i) => (
          <div key={i} className="mt-8 border border-rule">
            <div className="flex items-center gap-3 border-b border-rule bg-surface-card px-4 py-3">
              <span className="inline-block bg-editorial-green/10 px-2 py-0.5 font-mono text-xs font-bold text-editorial-green">
                {ep.method}
              </span>
              <code className="font-mono text-sm text-ink">{ep.path}</code>
              <span className="ml-auto text-[10px] text-ink-muted">
                Scope: <code className="font-mono">{ep.scope}</code>
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-ink-secondary">{ep.description}</p>

              {ep.params.length > 0 && (
                <div className="mt-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-2">
                    Parameters
                  </p>
                  <div className="flex flex-col gap-1">
                    {ep.params.map((p, j) => (
                      <div key={j} className="flex items-baseline gap-2 text-xs">
                        <code className="font-mono font-bold text-ink">{p.name}</code>
                        <span className="text-ink-muted">{p.type}</span>
                        {p.required && (
                          <span className="text-[9px] text-editorial-red font-bold">required</span>
                        )}
                        <span className="text-ink-secondary">&mdash; {p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-2">
                  Response
                </p>
                <code className="block bg-surface-raised px-3 py-2 font-mono text-[11px] text-ink overflow-x-auto">
                  {ep.response}
                </code>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Webhooks */}
      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold text-ink border-b-2 border-ink pb-1">
          Webhooks
        </h2>
        <p className="mt-4 text-sm text-ink-secondary leading-relaxed">
          Register webhook endpoints in <strong>Settings &rarr; Integrations</strong> to receive
          real-time notifications for SEO events. Payloads are signed with HMAC-SHA256.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {[
            { event: "keyword.rank_changed", desc: "Keyword position changed by 3+ places" },
            { event: "audit.completed", desc: "Site audit finished processing" },
            { event: "prediction.generated", desc: "New AI ranking prediction available" },
            { event: "backlink.new", desc: "New backlink detected" },
            { event: "backlink.lost", desc: "Previously active backlink lost" },
          ].map((wh) => (
            <div key={wh.event} className="flex items-baseline gap-3 text-xs">
              <code className="font-mono font-bold text-ink">{wh.event}</code>
              <span className="text-ink-secondary">&mdash; {wh.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border border-rule bg-surface-card p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-2">
            Webhook Payload
          </p>
          <code className="block font-mono text-[11px] text-ink whitespace-pre">
{`{
  "event": "keyword.rank_changed",
  "timestamp": "2026-03-15T10:00:00Z",
  "data": {
    "keyword": "seo tools",
    "old_position": 12,
    "new_position": 5,
    "project_id": "..."
  }
}`}
          </code>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          Verify webhook signatures using the <code className="font-mono">X-Webhook-Signature</code> header:
          <code className="font-mono"> sha256=HMAC(secret, body)</code>
        </p>
      </section>

      {/* Footer */}
      <div className="mt-16 border-t border-rule pt-6 text-center text-xs text-ink-muted">
        RankPulse AI &mdash; API v1
      </div>
    </div>
  );
}
