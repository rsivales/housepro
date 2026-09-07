import type { MetadataRoute } from "next";

import { site } from "@/lib/site";
import { listSignatureProperties } from "@/lib/db/repo";

/** Sitemap das páginas públicas principais. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const routes: { path: string; priority: number; changeFrequency?: "weekly" }[] = [
    { path: "/", priority: 1 },
    { path: "/avaliacao-imovel", priority: 0.9 },
    { path: "/imoveis", priority: 0.8 },
    { path: "/signature", priority: 0.8 },
    { path: "/signature/construcao-por-medida", priority: 0.6 },
    { path: "/investir", priority: 0.7 },
    { path: "/ferramentas", priority: 0.6 },
    { path: "/ferramentas/calculadora-mais-valias", priority: 0.8 },
    { path: "/credito", priority: 0.6 },
    { path: "/noticias", priority: 0.6 },
    { path: "/carreiras", priority: 0.5 },
    { path: "/historias-reais", priority: 0.5 },
    { path: "/privacidade", priority: 0.3 },
  ];
  const now = new Date();
  const staticEntries = routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
      changeFrequency: "weekly" as const,
    priority: r.priority,
  }));
  const signature = await listSignatureProperties();
  return [
    ...staticEntries,
    ...signature.map((property) => ({
      url: `${base}/signature/${property.slug ?? property.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
