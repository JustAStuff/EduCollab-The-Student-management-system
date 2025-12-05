import { createClient } from '@supabase/supabase-js';

// Use environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://nwfaaiixizernafxdddm.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZmFhaWl4aXplcm5hZnhkZGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMzkyNTQsImV4cCI6MjA3MDkxNTI1NH0.wC27F3OgC4ZMOa4BEImoVkS-2W12bN4aCK4jOZtbU48";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        headers: {
            'X-Client-Info': 'educollab-web'
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        // Add heartbeat and timeout settings for better connection stability
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: function (tries) {
            return Math.min(tries * 1000, 10000);
        }
    }
});
