import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * CTA final — "O próximo passo começa aqui." Barra Deep Navy compacta (como na
 * arte aprovada): mensagem à esquerda, ação à direita. O botão encaminha para
 * o fluxo de contacto, onde a lead é registada com origem/página para
 * atribuição ao consultor.
 */
export function FinalContactCTA() {
  return (
    <section id="contacto" aria-labelledby="final-title" className="scroll-mt-20" style={{ background: "var(--hp-navy)" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center">
        <div className="text-white">
          <h2 id="final-title" className="font-display text-2xl leading-tight text-white sm:text-3xl">
            O próximo passo começa aqui.
          </h2>
          <p className="mt-2 max-w-lg text-sm text-white/75 sm:text-base">
            Fale com alguém que conhece o mercado e escuta o que procura.
          </p>
        </div>
        <Link
          href="/vender#contacto"
          className="hp-btn-red inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg"
        >
          Falar com um consultor <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
