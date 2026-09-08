import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CreditLanding } from "@/components/credito/credit-landing";

export const metadata: Metadata = {
  title: "Simulador de crédito habitação",
  description:
    "Simule a prestação do seu crédito habitação em menos de 1 minuto.",
};

export default function CreditoPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <CreditLanding />
      <SiteFooter />
    </div>
  );
}
