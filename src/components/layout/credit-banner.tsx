import Link from "next/link";
import { Calculator, ArrowRight } from "lucide-react";

/**
 * Thin attention bar promoting the mortgage simulator. Sits above the hero.
 */
export function CreditBanner() {
  return (
    <Link
      href="/credito"
      className="group block bg-gradient-to-r from-primary to-primary/85 text-primary-foreground"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm sm:px-6">
        <Calculator className="hidden size-4 shrink-0 sm:block" />
        <span>
          <span className="font-semibold">Simule o seu crédito habitação</span> em
          menos de 1 minuto — sem compromisso.
        </span>
        <span className="inline-flex items-center gap-1 font-medium underline-offset-4 group-hover:underline">
          Simular <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
