import Link from "next/link";
import { Coins, Calculator, Gauge, ArrowRight } from "lucide-react";

/**
 * "Ferramentas úteis" — decida com mais confiança. Fundo Deep Navy.
 * Cada ferramenta liga a uma página real e indexável. Resultados indicativos.
 */
const TOOLS = [
  {
    icon: Coins,
    title: "Calcular mais-valias",
    desc: "Estime o imposto sobre a venda do seu imóvel.",
    href: "/ferramentas/calculadora-mais-valias#simular",
  },
  {
    icon: Calculator,
    title: "Simular prestação",
    desc: "Saiba a prestação mensal do seu crédito à habitação.",
    href: "/ferramentas#credito",
  },
  {
    icon: Gauge,
    title: "Quanto vale a minha casa?",
    desc: "Peça uma avaliação gratuita e sem compromisso.",
    href: "/avaliacao-imovel#comecar",
  },
];

export function UsefulTools() {
  return (
    <section
      aria-labelledby="tools-title"
      style={{ background: "var(--hp-navy)", color: "#fff" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Ferramentas úteis</p>
          <h2 id="tools-title" className="mt-1 font-display text-2xl text-white sm:text-3xl">
            Decida com mais confiança
          </h2>
          <p className="mt-2 text-sm text-white/70">Resultados indicativos · gratuitos</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group flex flex-col gap-2 rounded-xl border border-white/15 bg-white/5 p-3 transition-colors hover:bg-white/10 sm:flex-row sm:items-center sm:gap-3 sm:rounded-2xl sm:p-4"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white sm:size-9">
                <t.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xs leading-tight text-white sm:text-base">{t.title}</span>
                <span className="mt-0.5 hidden items-center gap-1 text-[0.7rem] text-white/65 sm:flex">
                  Abrir <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
