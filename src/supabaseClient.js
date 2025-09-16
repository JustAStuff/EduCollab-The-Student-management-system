import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nwfaaiixizernafxdddm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFhaWl4aXplcm5hZnhkZGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzkyNTQsImV4cCI6MjA3MDkxNTI1NH0.wC27F3OgC4ZMOa4BEImoVkS-2W12bN4aCK4jOZtbU48";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);