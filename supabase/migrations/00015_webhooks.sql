-- Webhook endpoints registered by organizations
create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  secret text, -- used for HMAC signing
  events text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_endpoints_org on webhook_endpoints(organization_id);

-- Webhook delivery log
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb,
  status_code int,
  response_body text,
  delivered_at timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_endpoint on webhook_deliveries(endpoint_id);

-- RLS
alter table webhook_endpoints enable row level security;
alter table webhook_deliveries enable row level security;

-- Policies: org members can manage their own endpoints
create policy "Org members can view webhook endpoints"
  on webhook_endpoints for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "Org members can insert webhook endpoints"
  on webhook_endpoints for insert
  with check (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "Org members can update webhook endpoints"
  on webhook_endpoints for update
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

create policy "Org members can delete webhook endpoints"
  on webhook_endpoints for delete
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- Deliveries are read-only for org members
create policy "Org members can view webhook deliveries"
  on webhook_deliveries for select
  using (
    endpoint_id in (
      select id from webhook_endpoints
      where organization_id in (
        select organization_id from profiles where id = auth.uid()
      )
    )
  );
