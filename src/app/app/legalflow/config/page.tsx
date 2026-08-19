import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getLawyerConfig } from "@/lib/db/repo";
import { LawyerConfigEditor } from "@/components/legal/lawyer-config";

export const metadata: Metadata = { title: "LegalFlow — configuração do advogado" };

export default async function LawyerConfigPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const isLawyer =
    session.demo ||
    session.agent.roleKey === "advogado" ||
    session.agent.roleKey === "admin" ||
    session.agent.roleKey === "superadmin" ||
    session.agent.role === "admin";
  if (!isLawyer) redirect("/app");

  const config = await getLawyerConfig();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/app/legalflow" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> LegalFlow
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <Scale className="size-7 text-primary" /> Configuração
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Define os serviços que ofereces, os honorários, os prazos e os métodos de
          pagamento. O consultor vê estas condições ao pedir.
          {session.demo && " Em demo, as alterações não são guardadas."}
        </p>

        <div className="mt-6">
          <LawyerConfigEditor initial={config} />
        </div>
      </div>
    </div>
  );
}
