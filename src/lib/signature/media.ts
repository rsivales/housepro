import type { Property } from "@/lib/data/types";
export function signatureImageSources(p: Pick<Property, "signatureHeroUrl" | "image" | "gallery">): string[] {
  return [...new Set([p.signatureHeroUrl, p.image, ...(p.gallery ?? [])]
    .filter((src): src is string => typeof src === "string")
    .map(src => src.trim()).filter(src => /^https?:\/\//.test(src) || /^\/(?!\/)/.test(src)))];
}
export function signaturePropertyHref(p: Pick<Property, "id" | "slug">, ref?: string) {
  return `/signature/${encodeURIComponent(p.slug?.trim() || p.id)}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
}
