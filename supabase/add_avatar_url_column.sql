-- Migration: add avatar_url column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Optional: create an index if you plan to query by avatar_url (not usually necessary)
-- CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles USING btree (avatar_url);
