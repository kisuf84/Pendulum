-- Pendulum Database Migration v2
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- Create user profiles table for custom seeds
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT,
  context TEXT, -- What they do, their work
  intentions TEXT, -- What they're working toward
  influences TEXT, -- Books, ideas that shaped them
  voice_preference TEXT DEFAULT 'warm', -- warm, direct, poetic, minimal
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user profiles
CREATE INDEX user_profiles_user_id_idx ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create morning echoes table
CREATE TABLE morning_echoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  echo_text TEXT NOT NULL,
  shown BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for morning echoes
CREATE INDEX morning_echoes_user_id_idx ON morning_echoes(user_id);
CREATE INDEX morning_echoes_shown_idx ON morning_echoes(shown);

-- Enable Row Level Security
ALTER TABLE morning_echoes ENABLE ROW LEVEL SECURITY;

-- Policies for morning echoes
CREATE POLICY "Users can view own echoes" ON morning_echoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own echoes" ON morning_echoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own echoes" ON morning_echoes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
