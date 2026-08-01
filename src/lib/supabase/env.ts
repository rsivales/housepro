/**
 * Reads and validates the Supabase environment variables.
 * Aceita o nome clássico (NEXT_PUBLIC_SUPABASE_ANON_KEY) e o novo formato do
 * Supabase (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, chave "publishable").
 */
function readAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = readAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY (ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    );
  }

  return { url, anonKey };
}

/** Whether Supabase is configured — lets pages degrade gracefully when it isn't. */
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && readAnonKey());
}
