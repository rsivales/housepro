import { cache } from "react";

import { currencyPartnerKey, internationalProjects, type InternationalProject } from "@/lib/data/international";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export interface InternationalDocument {
  path: string;
  name: string;
  kind: string;
}

export interface InternationalCommercial {
  agency?: string;
  contact?: string;
  email?: string;
  agreementReference?: string;
  agreementExpires?: string;
  commission?: string;
  commissionTerms?: string;
  internalNotes?: string;
  documents?: InternationalDocument[];
}

export interface CatalogRecord {
  id: string;
  project: InternationalProject;
  commercial: InternationalCommercial;
  published: boolean;
  featured: boolean;
  updated_at: string;
}

export const publicInternationalProjects = cache(async (): Promise<InternationalProject[]> => {
  if (!hasServiceRole()) return internationalProjects;
  const { data, error } = await createAdminClient().from("international_catalog")
    .select("id, project, published, featured, updated_at")
    .order("updated_at", { ascending: false }).order("id");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return internationalProjects;
    console.error("Não foi possível ler o catálogo internacional", error.code);
    return [];
  }

  const managed = new Set(data.map((row) => row.id));
  return [
    ...data.filter((row) => row.published).map((row) => ({ ...row.project as InternationalProject, featured: row.featured })),
    ...internationalProjects.filter((project) => !managed.has(project.id)),
  ];
});

export async function currencyPartnerUrl(): Promise<string> {
  if (!hasServiceRole()) return "";
  const { data } = await createAdminClient().from("site_settings").select("value").eq("key", currencyPartnerKey).maybeSingle();
  return typeof data?.value === "string" ? httpsUrl(data.value) : "";
}

export function httpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
