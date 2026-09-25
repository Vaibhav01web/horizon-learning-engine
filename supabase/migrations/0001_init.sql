-- Zero-Prompt Adaptive Learning Engine — core schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";
create extension if not exists "vector";

/* ---------------------------------------------------------------------------
 * Study packs & sources
 * ------------------------------------------------------------------------- */

create table if not exists public.study_packs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  title       text not null default 'Untitled study pack',
  subject     text,
  status      text not null default 'processing'
              check (status in ('processing', 'ready', 'failed')),
  is_public   boolean not null default false,
  cloned_from uuid references public.study_packs (id) on delete set null,
  pdf_url     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists study_packs_user_idx on public.study_packs (user_id, created_at desc);
create index if not exists study_packs_public_idx on public.study_packs (is_public, created_at desc);

create table if not exists public.sources (
  id           uuid primary key default gen_random_uuid(),
  pack_id      uuid not null references public.study_packs (id) on delete cascade,
  kind         text not null check (kind in ('text', 'pdf', 'docx', 'image', 'youtube')),
  file_name    text,
  storage_path text,
  external_url text,
  raw_text     text,
  char_count   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists sources_pack_idx on public.sources (pack_id);

/* ---------------------------------------------------------------------------
 * Parsed content + embeddings (RAG)
 * ------------------------------------------------------------------------- */

create table if not exists public.content_blocks (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.study_packs (id) on delete cascade,
  kind       text not null check (kind in ('definition', 'formula', 'chronology', 'topic', 'chunk')),
  heading    text,
  body       text not null,
  topic      text,
  importance text check (importance in ('high', 'medium', 'low')),
  position   integer not null default 0,
  embedding  vector(1024),
  created_at timestamptz not null default now()
);
create index if not exists content_blocks_pack_idx on public.content_blocks (pack_id, position);
create index if not exists content_blocks_topic_idx on public.content_blocks (pack_id, topic);
create index if not exists content_blocks_embedding_idx
  on public.content_blocks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Semantic retrieval used by the Doubt-Buster chatbot.
create or replace function public.match_content_blocks(
  p_pack_id   uuid,
  p_embedding vector(1024),
  p_limit     integer default 8
)
returns table (
  id         uuid,
  kind       text,
  heading    text,
  body       text,
  topic      text,
  similarity float
)
language sql
stable
as $$
  select cb.id,
         cb.kind,
         cb.heading,
         cb.body,
         cb.topic,
         1 - (cb.embedding <=> p_embedding) as similarity
  from public.content_blocks cb
  where cb.pack_id = p_pack_id
    and cb.embedding is not null
  order by cb.embedding <=> p_embedding
  limit p_limit;
$$;

/* ---------------------------------------------------------------------------
 * Generated study assets
 * ------------------------------------------------------------------------- */

create table if not exists public.summaries (
  id                 uuid primary key default gen_random_uuid(),
  pack_id            uuid not null unique references public.study_packs (id) on delete cascade,
  executive_overview text not null,
  bullet_breakdown   jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

create table if not exists public.mindmaps (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null unique references public.study_packs (id) on delete cascade,
  nodes      jsonb not null default '[]'::jsonb,
  edges      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.study_packs (id) on delete cascade,
  block_id   uuid references public.content_blocks (id) on delete set null,
  front      text not null,
  back       text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  topic      text,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists flashcards_pack_idx on public.flashcards (pack_id, position);

create table if not exists public.mcqs (
  id            uuid primary key default gen_random_uuid(),
  pack_id       uuid not null references public.study_packs (id) on delete cascade,
  question      text not null,
  options       jsonb not null,
  correct_index integer not null,
  explanation   text not null,
  topic         text,
  difficulty    text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists mcqs_pack_idx on public.mcqs (pack_id, position);

create table if not exists public.memes (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.study_packs (id) on delete cascade,
  template   text not null,
  captions   jsonb not null default '[]'::jsonb,
  image_url  text,
  topic      text,
  created_at timestamptz not null default now()
);
create index if not exists memes_pack_idx on public.memes (pack_id);

create table if not exists public.resources (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid not null references public.study_packs (id) on delete cascade,
  topic      text not null,
  title      text not null,
  url        text not null,
  source     text not null,
  kind       text not null default 'article' check (kind in ('video', 'course', 'paper', 'article')),
  thumbnail  text,
  relevance  real not null default 0,
  created_at timestamptz not null default now(),
  unique (pack_id, url)
);
create index if not exists resources_pack_idx on public.resources (pack_id, relevance desc);

/* ---------------------------------------------------------------------------
 * Multiplayer battles
 * ------------------------------------------------------------------------- */

create table if not exists public.quiz_sessions (
  id           uuid primary key default gen_random_uuid(),
  pack_id      uuid not null references public.study_packs (id) on delete cascade,
  host_user_id uuid references auth.users (id) on delete set null,
  code         text not null unique,
  status       text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  question_ids jsonb not null default '[]'::jsonb,
  started_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists quiz_sessions_code_idx on public.quiz_sessions (code);

create table if not exists public.quiz_participants (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.quiz_sessions (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  display_name  text not null,
  is_host       boolean not null default false,
  score         integer not null default 0,
  correct_count integer not null default 0,
  answered_count integer not null default 0,
  joined_at     timestamptz not null default now()
);
create index if not exists quiz_participants_session_idx
  on public.quiz_participants (session_id, score desc);

create table if not exists public.quiz_scores (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.quiz_sessions (id) on delete cascade,
  participant_id uuid not null references public.quiz_participants (id) on delete cascade,
  mcq_id         uuid not null references public.mcqs (id) on delete cascade,
  selected_index integer not null,
  is_correct     boolean not null,
  time_ms        integer not null default 0,
  points         integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (participant_id, mcq_id)
);

/* ---------------------------------------------------------------------------
 * Community
 * ------------------------------------------------------------------------- */

create table if not exists public.community_packs (
  id           uuid primary key default gen_random_uuid(),
  pack_id      uuid not null unique references public.study_packs (id) on delete cascade,
  author_id    uuid references auth.users (id) on delete set null,
  author_name  text not null default 'Anonymous',
  description  text,
  tags         jsonb not null default '[]'::jsonb,
  upvote_count integer not null default 0,
  clone_count  integer not null default 0,
  published_at timestamptz not null default now()
);
create index if not exists community_packs_rank_idx
  on public.community_packs (upvote_count desc, published_at desc);

create table if not exists public.upvotes (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.community_packs (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete cascade,
  voter_key    text not null,
  created_at   timestamptz not null default now(),
  unique (community_id, voter_key)
);

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.community_packs (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  author       text not null default 'Anonymous',
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists comments_community_idx on public.comments (community_id, created_at desc);

/* ---------------------------------------------------------------------------
 * Retention: spaced repetition, weak points, alerts
 * ------------------------------------------------------------------------- */

create table if not exists public.flashcard_reviews (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid not null references public.flashcards (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete cascade,
  reviewer_key  text not null,
  box           integer not null default 1 check (box between 1 and 5),
  ease_factor   real not null default 2.5,
  interval_days integer not null default 1,
  repetitions   integer not null default 0,
  last_reviewed timestamptz not null default now(),
  next_review   timestamptz not null default now(),
  unique (card_id, reviewer_key)
);
create index if not exists flashcard_reviews_due_idx
  on public.flashcard_reviews (reviewer_key, next_review);

create table if not exists public.user_weak_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  owner_key   text not null,
  pack_id     uuid not null references public.study_packs (id) on delete cascade,
  topic       text not null,
  correct     integer not null default 0,
  total       integer not null default 0,
  accuracy    real not null default 0,
  updated_at  timestamptz not null default now(),
  unique (owner_key, pack_id, topic)
);
create index if not exists weak_points_owner_idx on public.user_weak_points (owner_key, accuracy);

create table if not exists public.revision_alerts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  owner_key       text not null unique,
  phone_number    text not null,
  whatsapp_opt_in boolean not null default false,
  last_alert_sent timestamptz,
  next_alert_at   timestamptz,
  created_at      timestamptz not null default now()
);

/* ---------------------------------------------------------------------------
 * Background jobs
 * ------------------------------------------------------------------------- */

create table if not exists public.jobs (
  id         uuid primary key default gen_random_uuid(),
  pack_id    uuid references public.study_packs (id) on delete cascade,
  type       text not null default 'generate_suite',
  status     text not null default 'pending'
             check (status in ('pending', 'processing', 'parsed', 'completed', 'failed')),
  stage      text,
  progress   integer not null default 0,
  payload    jsonb not null default '{}'::jsonb,
  result     jsonb,
  error      text,
  attempts   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on public.jobs (status, created_at);
create index if not exists jobs_pack_idx on public.jobs (pack_id);

-- Atomically claim the oldest pending job so concurrent workers never collide.
create or replace function public.claim_next_job()
returns setof public.jobs
language plpgsql
as $$
begin
  return query
  update public.jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      updated_at = now()
  where j.id = (
    select id
    from public.jobs
    where status = 'pending'
    order by created_at
    for update skip locked
    limit 1
  )
  returning j.*;
end;
$$;

/* ---------------------------------------------------------------------------
 * Realtime
 * ------------------------------------------------------------------------- */

-- Adding a table that is already published raises duplicate_object, which would
-- abort a re-run of this file.
do $$
declare
  t text;
begin
  foreach t in array array['jobs', 'quiz_participants', 'quiz_sessions', 'study_packs']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;

/* ---------------------------------------------------------------------------
 * Row Level Security
 *
 * The service-role key used by the Next.js API bypasses RLS entirely; these
 * policies constrain what the browser's anon/authenticated key may read.
 * ------------------------------------------------------------------------- */

alter table public.study_packs       enable row level security;
alter table public.sources           enable row level security;
alter table public.content_blocks    enable row level security;
alter table public.summaries         enable row level security;
alter table public.mindmaps          enable row level security;
alter table public.flashcards        enable row level security;
alter table public.mcqs              enable row level security;
alter table public.memes             enable row level security;
alter table public.resources         enable row level security;
alter table public.quiz_sessions     enable row level security;
alter table public.quiz_participants enable row level security;
alter table public.quiz_scores       enable row level security;
alter table public.community_packs   enable row level security;
alter table public.upvotes           enable row level security;
alter table public.comments          enable row level security;
alter table public.flashcard_reviews enable row level security;
alter table public.user_weak_points  enable row level security;
alter table public.revision_alerts   enable row level security;
alter table public.jobs              enable row level security;

-- A pack is visible to its owner, to anyone if published, and to anonymous
-- creators (user_id is null) — the hackathon demo allows guest packs.
drop policy if exists "packs readable" on public.study_packs;
create policy "packs readable" on public.study_packs
  for select using (is_public or user_id is null or user_id = auth.uid());

-- Child rows inherit the parent pack's visibility.
do $$
declare
  t text;
begin
  foreach t in array array[
    'sources', 'content_blocks', 'summaries', 'mindmaps',
    'flashcards', 'mcqs', 'memes', 'resources'
  ]
  loop
    execute format('drop policy if exists "%1$s readable via pack" on public.%1$I', t);
    execute format($f$
      create policy "%1$s readable via pack" on public.%1$I
        for select using (
          exists (
            select 1 from public.study_packs p
            where p.id = %1$I.pack_id
              and (p.is_public or p.user_id is null or p.user_id = auth.uid())
          )
        );
    $f$, t);
  end loop;
end
$$;

-- Battles are joinable by link, so sessions and live scores are world-readable.
drop policy if exists "sessions readable" on public.quiz_sessions;
create policy "sessions readable"     on public.quiz_sessions     for select using (true);
drop policy if exists "participants readable" on public.quiz_participants;
create policy "participants readable" on public.quiz_participants for select using (true);
drop policy if exists "scores readable" on public.quiz_scores;
create policy "scores readable"       on public.quiz_scores       for select using (true);

drop policy if exists "community readable" on public.community_packs;
create policy "community readable" on public.community_packs for select using (true);
drop policy if exists "comments readable" on public.comments;
create policy "comments readable"  on public.comments        for select using (true);
drop policy if exists "upvotes readable" on public.upvotes;
create policy "upvotes readable"   on public.upvotes         for select using (true);

-- Job status drives the processing screen; the row exposes no user content.
drop policy if exists "jobs readable" on public.jobs;
create policy "jobs readable" on public.jobs for select using (true);

-- Personal retention data stays private to its owner.
drop policy if exists "reviews own" on public.flashcard_reviews;
create policy "reviews own"      on public.flashcard_reviews for select using (user_id = auth.uid());
drop policy if exists "weak points own" on public.user_weak_points;
create policy "weak points own"  on public.user_weak_points  for select using (user_id = auth.uid());
drop policy if exists "alerts own" on public.revision_alerts;
create policy "alerts own"       on public.revision_alerts   for select using (user_id = auth.uid());

/* ---------------------------------------------------------------------------
 * Storage buckets
 * ------------------------------------------------------------------------- */

insert into storage.buckets (id, name, public)
values ('raw-uploads', 'raw-uploads', false),
       ('generated-pdfs', 'generated-pdfs', true),
       ('memes', 'memes', true)
on conflict (id) do nothing;

drop policy if exists "public read generated pdfs" on storage.objects;
create policy "public read generated pdfs" on storage.objects
  for select using (bucket_id = 'generated-pdfs');

drop policy if exists "public read memes" on storage.objects;
create policy "public read memes" on storage.objects
  for select using (bucket_id = 'memes');
