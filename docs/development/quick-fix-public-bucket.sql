-- QUICK FIX: Make bucket public temporarily to test if files exist
-- Run this in Supabase SQL Editor

UPDATE storage.buckets 
SET public = true 
WHERE id = 'task-submissions';

-- This will make all files publicly accessible for testing
-- You can revert later with: UPDATE storage.buckets SET public = false WHERE id = 'task-submissions';