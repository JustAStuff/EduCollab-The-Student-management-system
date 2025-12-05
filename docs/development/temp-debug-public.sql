-- TEMPORARY: Make bucket public to test download
-- Run this in Supabase SQL Editor, test download, then revert

-- Make bucket temporarily public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'task-submissions';

-- After testing, revert with:
-- UPDATE storage.buckets SET public = false WHERE id = 'task-submissions';