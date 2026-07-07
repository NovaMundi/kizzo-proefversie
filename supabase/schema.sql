-- Kizzo databaseschema (Fase 1 fundament).
-- Draai dit in Supabase: project -> SQL Editor -> plak -> Run.
-- Veilig opnieuw te draaien (gebruikt "if not exists" / "or replace").
--
-- Kern: een OUDER (Supabase auth-gebruiker) heeft KINDEREN; elk kind heeft
-- GESPREKKEN met BERICHTEN, INSTELLINGEN (grenzen/interesses) en dag-VERBRUIK.
-- Row Level Security zorgt dat een ouder alleen bij de eigen gezinsdata kan.

-- ── Kinderen ──────────────────────────────────────────────────────────────
create table if not exists public.children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  age         int  not null check (age between 3 and 14),
  language    text not null default 'nl' check (language in ('nl', 'en')),
  created_at  timestamptz not null default now()
);
create index if not exists children_parent_idx on public.children (parent_id);

-- ── Instellingen per kind (Kizzo Kompas: grenzen, interesses, tijd) ─────────
create table if not exists public.child_settings (
  child_id            uuid primary key references public.children (id) on delete cascade,
  daily_minutes_limit int,                       -- null = geen tijdslimiet
  interests           text[] not null default '{}',
  allowed_topics      text[] not null default '{}',  -- leeg = alles mag (behalve blocked)
  blocked_topics      text[] not null default '{}',
  updated_at          timestamptz not null default now()
);

-- ── Gesprekken ──────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  title       text,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists conversations_child_idx on public.conversations (child_id, updated_at desc);

-- ── Berichten ───────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role            text not null check (role in ('child', 'kizzo')),
  text            text not null,
  flagged         boolean not null default false,   -- door moderatie gemarkeerd (fase 3)
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- ── Dag-verbruik (voor gratis-limieten, fase 4) ─────────────────────────────
create table if not exists public.usage (
  child_id            uuid not null references public.children (id) on delete cascade,
  day                 date not null default current_date,
  conversation_count  int  not null default 0,
  message_count       int  not null default 0,
  primary key (child_id, day)
);

-- ── Row Level Security: ouder ziet/muteert alleen de eigen gezinsdata ───────
alter table public.children       enable row level security;
alter table public.child_settings enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.usage          enable row level security;

-- Helper: is het opgegeven kind van de ingelogde ouder?
create or replace function public.owns_child(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.children c
    where c.id = cid and c.parent_id = auth.uid()
  );
$$;

-- children: ouder mag alleen eigen kinderen
drop policy if exists children_own on public.children;
create policy children_own on public.children
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- child_settings / conversations / usage: via kind-eigenaarschap
drop policy if exists child_settings_own on public.child_settings;
create policy child_settings_own on public.child_settings
  for all using (public.owns_child(child_id)) with check (public.owns_child(child_id));

drop policy if exists conversations_own on public.conversations;
create policy conversations_own on public.conversations
  for all using (public.owns_child(child_id)) with check (public.owns_child(child_id));

drop policy if exists usage_own on public.usage;
create policy usage_own on public.usage
  for all using (public.owns_child(child_id)) with check (public.owns_child(child_id));

-- messages: via het gesprek -> kind -> ouder
drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages
  for all using (
    exists (
      select 1 from public.conversations cv
      where cv.id = conversation_id and public.owns_child(cv.child_id)
    )
  ) with check (
    exists (
      select 1 from public.conversations cv
      where cv.id = conversation_id and public.owns_child(cv.child_id)
    )
  );

-- Let op: de server (Vercel-functies) gebruikt de service_role-sleutel en gaat
-- langs RLS heen; de checks hierboven beschermen vooral directe client-toegang.
