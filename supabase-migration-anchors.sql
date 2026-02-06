-- Migration: Create anchors table
-- Run this in Supabase SQL Editor

CREATE TABLE anchors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anchor_text TEXT NOT NULL,
  source_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX anchors_user_id_idx ON anchors(user_id);
CREATE INDEX anchors_created_at_idx ON anchors(created_at);

-- Enable Row Level Security
ALTER TABLE anchors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own anchors
CREATE POLICY "Users can view own anchors" ON anchors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own anchors
CREATE POLICY "Users can insert own anchors" ON anchors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own anchors
CREATE POLICY "Users can delete own anchors" ON anchors
  FOR DELETE
  USING (auth.uid() = user_id);
