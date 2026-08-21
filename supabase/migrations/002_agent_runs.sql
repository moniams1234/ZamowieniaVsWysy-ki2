create table if not exists public.agent_runs(
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question text not null,
  router_model text not null,
  selected_model text not null,
  tier text not null check(tier in('economy','balanced','advanced')),
  risk text not null check(risk in('low','medium','high')),
  reason text,
  tools jsonb not null default '[]'::jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);
alter table public.agent_runs enable row level security;
create policy own_agent_runs on public.agent_runs for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
