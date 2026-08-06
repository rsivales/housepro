import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { processById } from "@/lib/data/legalflow";
import { LegalWorkspace } from "@/components/legal/legal-workspace";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = processById(id);
  return { title: p ? `${p.ref} — LegalFlow` : "LegalFlow" };
}

export default async function LegalProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/entrar");
  const proc = processById(id);
  if (!proc) notFound();

  const role = session.agent.roleKey ?? "agente";
  // Quem constrói/edita o documento: advogado, coordenação, direção, admin, super admin.
  const canEditDoc = ["advogado", "coordenador", "diretor", "admin", "superadmin"].includes(role);
  const canManageChecklist = canEditDoc || role === "agente" || role === "agente_ami";

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/app/legalflow" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> LegalFlow
        </Link>

        <LegalWorkspace
          process={proc}
          actorName={session.agent.name}
          canEditDoc={canEditDoc}
          canManageChecklist={canManageChecklist}
        />
      </div>
    </div>
  );
}
