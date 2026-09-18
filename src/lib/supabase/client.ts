import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Supabase client for use in Client Components / the browser.
 * Safe to call on every render — createBrowserClient memoizes internally.
 *
 * `rememberMe: false` (usado no login, quando "Manter sessão iniciada" está
 * desligado) grava a sessão num cookie de sessão do navegador em vez do
 * cookie persistente de 400 dias por defeito — a sessão termina quando o
 * navegador fecha, em vez de ficar guardada.
 */
export function createClient(options?: { rememberMe?: boolean }) {
  const { url, anonKey } = getSupabaseEnv();
  if (options?.rememberMe === false) {
    return createBrowserClient(url, anonKey, { cookieOptions: { maxAge: undefined } });
  }
  return createBrowserClient(url, anonKey);
}
