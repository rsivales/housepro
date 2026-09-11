import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getPropertyById, listPropertyAudit } from "@/lib/db/repo";
import { isStaff } from "@/lib/data/roles";
import { demoAudit } from "@/lib/data/audit";
import { draftFromProperty } from "@/lib/imovel/model";
import { PropertyForm } from "@/components/property/property-form";

export const metadata: Metadata = { title: "Editar imóvel" };

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/entrar");

  const property = await getPropertyById(id);
  if (!property) notFound();

  const a = session.agent;
  const owner = property.agentId === a.id || (property.coAgentIds ?? []).includes(a.id);
  const canEdit = owner || isStaff(a);

  if (!canEdit) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <Link href={`/imovel/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> Ver ficha do imóvel
          </Link>
          <h1 className="mt-4 font-display text-3xl">Editar imóvel</h1>
          <p className="mt-1 text-sm text-muted-foreground">{property.reference} · {property.title}</p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-card p-5">
            <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Sem permissão para editar</p>
              <p className="text-sm text-muted-foreground">
                Só o angariador, a coordenação/direção, a administração ou o Super Admin
                podem editar este imóvel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const real = await listPropertyAudit(id);
  const audit = real.length ? real : demoAudit(id);

  return (
    <PropertyForm
      mode="edit"
      propertyId={id}
      initial={draftFromProperty(property)}
      initialPhotos={property.gallery ?? (property.image ? [property.image] : [])}
      audit={audit}
      demo={session.demo}
    />
  );
}
