-- Pendulum User Profiles Schema
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- Create the user_profiles table for custom seeds
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT,
  what_you_do TEXT,
  current_focus TEXT,
  influences TEXT,
  communication_style TEXT DEFAULT 'warm',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries by user
CREATE INDEX user_profiles_user_id_idx ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create the morning_echoes table
CREATE TABLE morning_echoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE NOT NULL,
  echo_text TEXT NOT NULL,
  shown BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX morning_echoes_user_id_idx ON morning_echoes(user_id);
CREATE INDEX morning_echoes_shown_idx ON morning_echoes(shown);

-- Enable Row Level Security
ALTER TABLE morning_echoes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own echoes" ON morning_echoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own echoes" ON morning_echoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own echoes" ON morning_echoes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create the weekly_syntheses table
CREATE TABLE weekly_syntheses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  synthesis_text TEXT NOT NULL,
  entries_count INTEGER,
  week_start TIMESTAMP WITH TIME ZONE,
  week_end TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX weekly_syntheses_user_id_idx ON weekly_syntheses(user_id);
CREATE INDEX weekly_syntheses_created_at_idx ON weekly_syntheses(created_at);

-- Enable Row Level Security
ALTER TABLE weekly_syntheses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own syntheses" ON weekly_syntheses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own syntheses" ON weekly_syntheses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own syntheses" ON weekly_syntheses
  FOR UPDATE
  USING (auth.uid() = user_id);
