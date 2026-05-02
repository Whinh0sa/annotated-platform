-- 1. USERS TABLE (The Core Nodes)
-- Links directly to Supabase Auth
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ANNOTATIONS TABLE (The Media Payloads)
CREATE TABLE public.annotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT NOT NULL, -- The original URL (X, YouTube, etc.)
  media_url TEXT, -- The Supabase Storage URL for our 240p WASM clip
  commentary TEXT, -- The user's text or audio transcript
  media_type TEXT CHECK (media_type IN ('video', 'audio', 'text')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FOLLOWS TABLE (The Directed Edges)
-- Maps the social graph for the feed
CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- 4. CLAIMS TABLE (Bounty Requirement)
-- Handles the "File a Claim" fair-use disputes
CREATE TABLE public.claims (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  annotation_id UUID REFERENCES public.annotations(id) ON DELETE CASCADE NOT NULL,
  claimant_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- The Indexing Strategy
-- ==========================================

-- O(log N): Rapidly loads a specific user's profile page.
CREATE INDEX idx_annotations_user_id ON public.annotations(user_id);

-- O(log N): Ensures the global community feed sorts chronologically without scanning the entire table.
CREATE INDEX idx_annotations_created_at ON public.annotations(created_at DESC);

-- O(1) lookup: Instantly identifies who is following whom to construct the personalized timeline.
CREATE INDEX idx_follows_following_id ON public.follows(following_id);
