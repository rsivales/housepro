import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ClientReferralForm } from "@/components/referral/client-referral-form";

export const metadata: Metadata = {
  title: "Indicar um amigo · Ganhe com a sua recomendação",
  description:
    "Conhece alguém que quer comprar ou vender? Indique-o à HousePro e receba no mínimo 10% quando o negócio se concretizar.",
};

export default function IndicarPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-primary">Programa de indicações</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Indique e ganhe</h1>
        <p className="mt-3 text-muted-foreground">
          Conhece alguém a comprar ou a vender casa? Partilhe connosco. A indicação é
          encaminhada automaticamente para a agência HousePro da zona e, quando o negócio
          fechar, recebe no mínimo <span className="font-medium text-foreground">10%</span> —
          de forma transparente, em percentagem.
        </p>

        <div className="mt-8">
          <ClientReferralForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
