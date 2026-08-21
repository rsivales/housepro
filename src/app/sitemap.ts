import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

/** Sitemap das páginas públicas principais. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;
  const routes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/avaliacao-imovel", priority: 0.9 },
    { path: "/imoveis", priority: 0.8 },
    { path: "/vender", priority: 0.7 },
    { path: "/investir", priority: 0.7 },
    { path: "/ferramentas", priority: 0.6 },
    { path: "/credito", priority: 0.6 },
    { path: "/noticias", priority: 0.6 },
    { path: "/carreiras", priority: 0.5 },
    { path: "/historias-reais", priority: 0.5 },
    { path: "/privacidade", priority: 0.3 },
  ];
  const now = new Date();
  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));
}
