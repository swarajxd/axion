-- Enable UUID generation (Supabase usually has this enabled; safe to run once)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4 (),
  clerk_user_id text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  stream text,
  standard text,
  target_exam text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index for lookups by Clerk user id (unique constraint already indexes)
-- Optional: RLS — enable after configuring Clerk JWT with Supabase (see Clerk + Supabase integration docs).
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
