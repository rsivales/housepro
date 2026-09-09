import type { Metadata } from "next";

import { CreditLanding } from "@/components/credito/credit-landing";

export const metadata: Metadata = {
  title: "Simulador de crédito habitação",
  description:
    "Simule a prestação do seu crédito habitação em menos de 1 minuto.",
};

export default function CreditoPage() {
  return <CreditLanding />;
}
