import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift, Info } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ReferralTimeline } from "@/components/referral/referral-timeline";
import { demoTrackedReferrals } from "@/lib/data/referrals";

export const metadata: Metadata = {
  title: "As minhas indicações",
  description:
    "Acompanhe as indicações que fez à HousePro: consultor atribuído, fase do processo e a sua recompensa.",
};

export default function IndicacoesPage() {
  const items = demoTrackedReferrals;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Gift className="size-4" /> Programa de indicações
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">As minhas indicações</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Veja a que consultor foi atribuída cada indicação e siga o processo,
          passo a passo, até à sua recompensa.
        </p>

        <div className="mt-8 space-y-6">
          {items.map((tr) => (
            <ReferralTimeline key={tr.id} tr={tr} />
          ))}
        </div>

        <div className="mt-8 flex items-start gap-2.5 rounded-xl border bg-secondary/40 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            É notificado por email/SMS a cada avanço. A recompensa é paga quando a
            escritura se concretiza, sobre a comissão do negócio.
          </p>
        </div>

        <div className="mt-6">
          <Link
            href="/indicar"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            Fazer nova indicação <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
