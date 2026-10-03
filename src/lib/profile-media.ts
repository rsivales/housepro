/** A published image must be an immutable object in our managed Storage. */
export function isProfileMediaUrl(value: unknown, ownerId?: string): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value);
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://invalid.local");
    const prefix = `/storage/v1/object/public/consultant-media/${ownerId ? `${ownerId}/` : ""}`;
    return url.protocol === "https:" && url.origin === base.origin && url.pathname.startsWith(prefix) && !url.search && !url.hash && /\.(webp|png|jpe?g)$/i.test(url.pathname);
  } catch { return false; }
}
