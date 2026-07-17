import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client for use in Client Components / the browser.
 * Safe to call on every render — createBrowserClient memoizes internally.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
