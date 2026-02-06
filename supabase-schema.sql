-- Pendulum Database Schema
-- Run this in your Supabase SQL Editor

-- Create the entries table
CREATE TABLE entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_text TEXT NOT NULL,
  reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries by user
CREATE INDEX entries_user_id_idx ON entries(user_id);

-- Create an index for ordering by date
CREATE INDEX entries_created_at_idx ON entries(created_at);

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own entries
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own entries
CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own entries
CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can only delete their own entries
CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
