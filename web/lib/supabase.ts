import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Null-safe Supabase client. Returns null when env vars are absent so every
 * call site can do an early-exit guard rather than throw at runtime.
 *
 * Use `supabase` for Server Component / API-route data fetching.
 * Use `supabaseClient` in client components (identical instance — the name
 * makes the usage intent clear and avoids mixing contexts by mistake).
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Browser-safe alias — same instance, explicit name for client components. */
export const supabaseClient = supabase;
