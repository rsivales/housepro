import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listLeadForms, listCampaigns, getFieldMapping } from "@/lib/db/repo";
import type { FieldMapping } from "@/lib/data/meta";
import { CAMPAIGN_TYPE_LABEL } from "@/lib/data/meta";
import { FieldMapper } from "@/components/meta/field-mapper";

export const metadata: Metadata = { title: "Formulários & mapeamento — Meta CRM" };

export default async function FormulariosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const [forms, campaigns] = await Promise.all([listLeadForms(), listCampaigns()]);

  // Mapeamentos atuais por formulário.
  const mappingEntries = await Promise.all(
    forms.map(async (f) => [f.id, await getFieldMapping(f.id)] as const)
  );
  const mappings: Record<string, FieldMapping> = {};
  for (const [id, m] of mappingEntries) if (m) mappings[id] = m;

  const campaignName = (id?: string) =>
    campaigns.find((c) => c.id === id)?.name;
  const campaignType = (id?: string) => {
    const c = campaigns.find((x) => x.id === id);
    return c ? CAMPAIGN_TYPE_LABEL[c.type] : undefined;
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app/meta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Meta CRM
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <FileText className="size-7 text-primary" /> Formulários & mapeamento
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Liga cada pergunta do formulário Meta a um campo da lead. Assim as leads
          chegam já normalizadas ao pipeline, seja qual for o formulário.
          {session.demo && " Em demo, o mapeamento não é guardado."}
        </p>

        {/* Contexto: que campanha usa cada formulário */}
        {forms.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {forms.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground"
              >
                <FileText className="size-3" /> {f.name}
                {campaignName(f.campaignId) && (
                  <>
                    {" · "}
                    {campaignType(f.campaignId)}
                  </>
                )}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6">
          <FieldMapper forms={forms} mappings={mappings} />
        </div>
      </div>
    </div>
  );
}
