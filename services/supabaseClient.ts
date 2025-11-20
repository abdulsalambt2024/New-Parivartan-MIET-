
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://naijawgqqxluaqeuefjx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5haWphd2dxcXhsdWFxZXVlZmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODIyNjIsImV4cCI6MjA3OTA1ODI2Mn0.L1mo21kPjKv9HaisIWwQJQ-g2g9C_1XogHSoHvKbvjg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
=== SUPABASE SQL SCHEMA SETUP ===

Run this in your Supabase SQL Editor to create the necessary tables.
IMPORTANT: If RLS (Row Level Security) is enabled, you must add policies to allow access.
For this demo, you can disable RLS on tables or add a permissive policy:

-- Disable RLS (Simplest for prototyping)
alter table profiles disable row level security;
alter table posts disable row level security;
alter table comments disable row level security;
alter table events disable row level security;
alter table tasks disable row level security;
alter table campaigns disable row level security;
alter table slides disable row level security;
alter table attendance_sessions disable row level security;
alter table chat_messages disable row level security;
alter table system_config disable row level security;
alter table notifications disable row level security;
alter table feedback disable row level security;
alter table suggestions disable row level security;

-- Tables Definition

-- Profiles Table
create table if not exists profiles (
  id text primary key,
  email text,
  name text,
  role text,
  avatar text,
  bio text,
  location text,
  social jsonb,
  verified boolean default false,
  two_factor_enabled boolean default false,
  two_factor_secret text,
  notification_preferences jsonb,
  badges jsonb,
  created_at timestamptz default now()
);

-- Posts Table
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id),
  type text,
  content text,
  image text,
  likes_count int default 0,
  created_at timestamptz default now()
);

-- Comments Table
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id text references profiles(id),
  content text,
  created_at timestamptz default now()
);

-- Events Table
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text,
  description text,
  date text,
  location text,
  image text,
  created_at timestamptz default now()
);

-- Tasks Table
create table if not exists tasks (
  id text primary key,
  title text,
  description text,
  assigned_to text references profiles(id),
  status text,
  due_date text,
  created_at timestamptz default now()
);

-- Campaigns Table
create table if not exists campaigns (
  id text primary key,
  title text,
  description text,
  target_amount numeric,
  raised_amount numeric,
  upi_id text,
  image text,
  created_at timestamptz default now()
);

-- Slides Table
create table if not exists slides (
  id text primary key,
  title text,
  description text,
  image text,
  created_at timestamptz default now()
);

-- Attendance Sessions
create table if not exists attendance_sessions (
  date text primary key,
  village_name text,
  entries jsonb,
  marked_by text,
  submitted boolean default false,
  created_at timestamptz default now()
);

-- Chat Messages
create table if not exists chat_messages (
  id text primary key,
  chat_id text,
  sender_id text references profiles(id),
  text text,
  image text,
  created_at timestamptz default now()
);

-- Config
create table if not exists system_config (
  key text primary key,
  value jsonb
);

-- Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id),
  type text,
  content text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Feedback
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  rating int,
  comment text,
  created_at timestamptz default now()
);

-- Suggestions
create table if not exists suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id text,
  title text,
  description text,
  category text,
  created_at timestamptz default now()
);

*/
