/**
 * Utilitários de vídeo para testemunhos.
 * Aceita links do YouTube em qualquer formato habitual e devolve o ID do vídeo.
 */
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function youTubeId(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (YT_ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const [kind, value] = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(kind ?? "")) id = value ?? null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

export function youTubePoster(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
