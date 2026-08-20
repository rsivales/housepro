import { ArrowRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentField } from "@/components/forms/consent-field";

/**
 * CTA final — "O próximo passo começa aqui." Fundo Deep Navy. Reutiliza o
 * formulário de contacto (Input/Label/ConsentField). Campos ocultos registam
 * a origem (página/campanha) para atribuição da lead ao consultor.
 */
export function FinalContactCTA() {
  return (
    <section id="contacto" aria-labelledby="final-title" className="scroll-mt-20" style={{ background: "var(--hp-navy)" }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div className="text-white">
          <h2 id="final-title" className="font-display text-3xl leading-tight text-white sm:text-4xl">
            O próximo passo começa aqui.
          </h2>
          <p className="mt-3 max-w-md text-white/75">
            Fale com alguém que conhece o mercado e escuta o que procura.
          </p>
        </div>

        <form className="rounded-2xl bg-card p-5 shadow-xl sm:p-6" aria-label="Falar com um consultor">
          <input type="hidden" name="origin" value="homepage" />
          <input type="hidden" name="page" value="/" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cta-nome">Nome</Label>
              <Input id="cta-nome" name="nome" placeholder="O seu nome" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cta-contacto">Contacto</Label>
              <Input id="cta-contacto" name="contacto" placeholder="Telemóvel ou email" autoComplete="tel" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cta-msg">Como podemos ajudar?</Label>
              <Input id="cta-msg" name="mensagem" placeholder="Comprar, vender, investir…" />
            </div>
          </div>
          <div className="mt-4">
            <ConsentField id="rgpd-cta" />
          </div>
          <button
            type="submit"
            className="hp-btn-red mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold"
          >
            Falar com um consultor <ArrowRight className="size-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
