import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { internationalProjects } from "@/lib/data/international";
import { isSuperadmin } from "@/lib/data/roles";
import { currencyPartnerUrl, type CatalogRecord } from "@/lib/db/international";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import { CurrencyPartnerEditor, ProjectEditor } from "./editor";

export default async function InternationalAdminPage() {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  const [catalog, partnerUrl] = await Promise.all([
    hasServiceRole() ? createAdminClient().from("international_catalog").select("*").order("updated_at", { ascending: false }) : null,
    currencyPartnerUrl(),
  ]);
  const records = (catalog?.data ?? []) as CatalogRecord[];
  const legacy = internationalProjects.filter((project) => !records.some((record) => record.id === project.id));

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <Link href="/admin/website" className="underline">Gestão do website</Link>
          <Link href="/internacional" className="underline">Ver montra pública</Link>
        </div>
        <h1 className="mt-3 font-display text-4xl">Empreendimentos internacionais</h1>
        {!catalog || catalog.error || session.demo ? (
          <p className="mt-6" role="status">O catálogo internacional está indisponível. Verifique a ligação à base de dados e a migração do catálogo.</p>
        ) : (
          <>
            <CurrencyPartnerEditor key={partnerUrl} url={partnerUrl} />
            <div className="mt-6 space-y-3">
              <ProjectEditor key={`new-${records.length}`} />
              {records.map((record) => <ProjectEditor key={`${record.id}-${record.updated_at}`} record={record} />)}
              {legacy.map((project) => <ProjectEditor key={project.id} legacy={project} />)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
