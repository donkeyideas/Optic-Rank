-- User notes / notepad — synced across devices
create table if not exists public.user_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_notes enable row level security;

create policy "Users can read own notes"
  on public.user_notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on public.user_notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.user_notes for update
  using (auth.uid() = user_id);
