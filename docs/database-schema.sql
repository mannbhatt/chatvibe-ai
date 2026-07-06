-- ============================================================
-- ChatVibe AI — Database Schema (Supabase / Postgres)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- USERS
-- Supabase Auth already provides auth.users; this table extends it
-- with app-specific profile/state data (1:1 via id).
-- ------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text unique,
  auth_provider text check (auth_provider in ('apple','google','email')),

  -- premium status
  is_premium boolean not null default false,
  premium_expires_at timestamptz,

  -- usage limits (free tier: 10/day)
  generations_today int not null default 0,
  generations_reset_at timestamptz not null default now(),

  -- streaks
  daily_streak_count int not null default 0,
  last_active_date date,

  -- preferences
  theme text not null default 'light' check (theme in ('light','dark')),
  language text not null default 'en',
  notifications_enabled boolean not null default true,

  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- GENERATIONS
-- Every AI creation a user makes, across all 6 features.
-- ------------------------------------------------------------
create table generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,

  feature_type text not null check (feature_type in (
    'chat_detective', 'roast_my_chat', 'text_to_emoji',
    'meme_generator', 'rewrite_text', 'vibe_check'
  )),

  input_type text not null check (input_type in ('chat','image','text')),
  input_data text,              -- raw pasted text/chat, or storage path for images
  style_mode text,               -- e.g. 'savage', 'gen_z', 'gujarati'

  output_data jsonb not null,    -- structured AI result (scores, captions, etc.)
  ai_model text,                 -- which model generated it, for debugging/cost tracking

  is_watermarked boolean not null default true,
  share_count int not null default 0,

  created_at timestamptz not null default now()
);

create index idx_generations_user_id on generations(user_id);
create index idx_generations_feature_type on generations(feature_type);
create index idx_generations_created_at on generations(created_at desc);

-- ------------------------------------------------------------
-- FOLDERS
-- User-created folders for organizing saved results.
-- ------------------------------------------------------------
create table folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SAVED_RESULTS
-- Bookmarked generations, optionally filed into a folder.
-- ------------------------------------------------------------
create table saved_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  generation_id uuid not null references generations(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  saved_at timestamptz not null default now(),
  unique (user_id, generation_id)
);

-- ------------------------------------------------------------
-- SUBSCRIPTIONS
-- Mirrors RevenueCat / App Store / Play Store subscription state.
-- ------------------------------------------------------------
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,

  platform text not null check (platform in ('apple','google','stripe')),
  product_id text not null,          -- e.g. 'chatvibe_premium_monthly'
  status text not null check (status in ('active','trial','cancelled','expired','grace_period')),

  started_at timestamptz not null,
  expires_at timestamptz,
  auto_renew boolean not null default true,

  revenuecat_customer_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user_id on subscriptions(user_id);

-- ------------------------------------------------------------
-- ACHIEVEMENTS (static catalog)
-- ------------------------------------------------------------
create table achievements (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,          -- e.g. 'streak_7', 'first_roast'
  title text not null,
  description text not null,
  icon text,
  criteria jsonb not null             -- e.g. {"type": "streak", "value": 7}
);

-- ------------------------------------------------------------
-- USER_ACHIEVEMENTS (join table)
-- ------------------------------------------------------------
create table user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ------------------------------------------------------------
-- DAILY_STREAKS
-- One row per user per active day, used to compute streaks/history.
-- ------------------------------------------------------------
create table daily_streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  activity_date date not null,
  generations_count int not null default 0,
  unique (user_id, activity_date)
);

create index idx_daily_streaks_user_date on daily_streaks(user_id, activity_date desc);

-- ------------------------------------------------------------
-- STYLES (extensible catalog of roast/rewrite/caption styles)
-- Lets you add new styles without shipping an app update.
-- ------------------------------------------------------------
create table styles (
  id uuid primary key default uuid_generate_v4(),
  feature_type text not null check (feature_type in (
    'roast_my_chat', 'text_to_emoji', 'meme_generator', 'rewrite_text'
  )),
  style_key text not null,            -- e.g. 'gujarati', 'savage'
  display_name text not null,
  is_premium boolean not null default false,
  sort_order int not null default 0,
  unique (feature_type, style_key)
);

-- ------------------------------------------------------------
-- MEME_TEMPLATES (optional starter templates for Meme Generator)
-- ------------------------------------------------------------
create table meme_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  image_url text not null,
  category text,
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Supabase requires explicit RLS policies — enable on every
-- user-owned table so users can only read/write their own rows.
-- ============================================================
alter table users enable row level security;
alter table generations enable row level security;
alter table folders enable row level security;
alter table saved_results enable row level security;
alter table subscriptions enable row level security;
alter table user_achievements enable row level security;
alter table daily_streaks enable row level security;

create policy "Users can view/update own row" on users
  for all using (auth.uid() = id);

create policy "Users manage own generations" on generations
  for all using (auth.uid() = user_id);

create policy "Users manage own folders" on folders
  for all using (auth.uid() = user_id);

create policy "Users manage own saved results" on saved_results
  for all using (auth.uid() = user_id);

create policy "Users view own subscriptions" on subscriptions
  for select using (auth.uid() = user_id);
  -- inserts/updates to subscriptions should go through a service-role
  -- webhook (RevenueCat), not directly from the client.

create policy "Users view own achievements" on user_achievements
  for select using (auth.uid() = user_id);

create policy "Users manage own streaks" on daily_streaks
  for all using (auth.uid() = user_id);

-- achievements, styles, meme_templates are public read-only catalogs
alter table achievements enable row level security;
alter table styles enable row level security;
alter table meme_templates enable row level security;

create policy "Public read achievements" on achievements for select using (true);
create policy "Public read styles" on styles for select using (true);
create policy "Public read meme templates" on meme_templates for select using (true);

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- Atomically check and increment daily generation limits
create or replace function increment_generation_limit(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_user record;
  v_today date := current_date;
  v_last_reset date;
begin
  -- Lock the user row for update to prevent concurrent race conditions
  select generations_today, is_premium, generations_reset_at
  into v_user
  from users
  where id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  v_last_reset := date(v_user.generations_reset_at at time zone 'utc');

  -- Reset logic if it's a new day (UTC)
  if v_today <> v_last_reset then
    update users
    set generations_today = 1,
        generations_reset_at = now()
    where id = p_user_id;
    return true;
  end if;

  -- Check limit
  if not v_user.is_premium and v_user.generations_today >= 10 then
    return false;
  end if;

  -- Increment usage
  update users
  set generations_today = generations_today + 1
  where id = p_user_id;

  return true;
end;
$$;
