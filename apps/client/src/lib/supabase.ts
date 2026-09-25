import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Browser-side Supabase client, used only for Realtime subscriptions
 * (job progress and live leaderboards). All writes go through the API.
 *
 * Returns null when the keys are absent so callers can fall back to polling
 * rather than crashing.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } },
      })
    : null;

export const realtimeAvailable = supabase !== null;
