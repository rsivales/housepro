import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Handshake } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { listDeals } from "@/lib/db/deals";
import { DealsBoard } from "@/components/app/deals-board";

export const metadata: Metadata = { title: "Negócios" };

export default async function NegociosPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const deals = await listDeals(session.agent.id, isStaff(session.agent));

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Área profissional
        </Link>
        <h1 className="mt-3 flex items-center gap-2 font-display text-3xl">
          <Handshake className="size-7 text-primary" /> Negócios
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Acompanhe o processo de cada negócio. Ao avançar a fase, o <strong>estado do imóvel muda
          automaticamente</strong>: Reserva → Reservado · CPCV → CPCV · Escritura/Concluído → Vendido.
        </p>

        <div className="mt-6">
          <DealsBoard initial={deals} />
        </div>
      </div>
    </div>
  );
}
