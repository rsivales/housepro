import type { Contact } from "@/lib/data/contacts";
import type { Lead } from "@/lib/data/leads";
import type { Property } from "@/lib/data/types";
import type { Campaign } from "@/lib/data/meta";

/**
 * Pesquisa universal — procura transversal a contactos, leads, imóveis e
 * campanhas. Função pura sobre dados já carregados, para ser testável e
 * reutilizável (a API decide o âmbito por permissões). Sem silos.
 */

export type SearchKind = "contact" | "lead" | "property" | "campaign";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchData {
  contacts?: Contact[];
  leads?: Lead[];
  properties?: Property[];
  campaigns?: Campaign[];
}

const norm = (s: unknown): string => String(s ?? "").toLowerCase();

export function universalSearch(query: string, data: SearchData): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const c of data.contacts ?? []) {
    const hay = [c.name, c.phone, c.email, c.zone].map(norm).join(" ");
    if (hay.includes(q)) {
      hits.push({
        kind: "contact",
        id: c.id,
        title: c.name,
        subtitle: [c.phone, c.zone].filter(Boolean).join(" · ") || undefined,
        href: `/app/contactos/${c.id}`,
      });
    }
  }

  for (const l of data.leads ?? []) {
    const hay = [l.name, l.contact, l.email, l.zone, l.propertyRef].map(norm).join(" ");
    if (hay.includes(q)) {
      hits.push({
        kind: "lead",
        id: l.id,
        title: l.name,
        subtitle: [l.zone, l.propertyRef].filter(Boolean).join(" · ") || undefined,
        href: l.pipeline ? "/app/meta/pipeline" : "/app/meta/inbox",
      });
    }
  }

  for (const p of data.properties ?? []) {
    const hay = [p.reference, p.title, p.municipality, p.parish, p.typology].map(norm).join(" ");
    if (hay.includes(q)) {
      hits.push({
        kind: "property",
        id: p.id,
        title: `${p.reference} · ${p.title}`,
        subtitle: [p.typology, p.municipality].filter(Boolean).join(" · ") || undefined,
        href: `/imovel/${p.id}`,
      });
    }
  }

  for (const c of data.campaigns ?? []) {
    const hay = [c.name, c.objective, c.ownerName].map(norm).join(" ");
    if (hay.includes(q)) {
      hits.push({
        kind: "campaign",
        id: c.id,
        title: c.name,
        subtitle: c.ownerName,
        href: "/app/meta/campanhas",
      });
    }
  }

  return hits;
}

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  contact: "Contacto",
  lead: "Lead",
  property: "Imóvel",
  campaign: "Campanha",
};
