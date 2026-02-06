-- Migration: Add preferred_language column to user_profiles
-- Run this in Supabase SQL Editor

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';

-- Add is_dream column to entries table
ALTER TABLE entries
ADD COLUMN IF NOT EXISTS is_dream BOOLEAN DEFAULT FALSE;
