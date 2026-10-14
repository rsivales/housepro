export function safeAuthNext(value: string | null, fallback = "/app"): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  const url = new URL(value, "https://housepro.invalid");
  if (!["/app", "/admin", "/cliente", "/entrar/nova-password"].some(root => url.pathname === root || url.pathname.startsWith(root + "/"))) return fallback;
  return url.pathname + url.search;
}

/** Only a successfully verified server response can redirect the login form. */
export function verifiedProfessionalDestination(ok: boolean, body: unknown): string | null {
  if (!ok || typeof body !== "object" || body === null) return null;
  const data = body as { professional?: boolean; destination?: string };
  return data.professional === true && data.destination === "/app" ? "/app" : null;
}
