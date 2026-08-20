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
    href: "/ferramentas",
  },
  {
    icon: Calculator,
    title: "Simular prestação",
    desc: "Saiba a prestação mensal do seu crédito à habitação.",
    href: "/credito",
  },
  {
    icon: Gauge,
    title: "Quanto vale a minha casa?",
    desc: "Peça uma avaliação gratuita e sem compromisso.",
    href: "/vender#avaliacao",
  },
];

export function UsefulTools() {
  return (
    <section
      aria-labelledby="tools-title"
      style={{ background: "var(--hp-navy)", color: "#fff" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Ferramentas úteis</p>
          <h2 id="tools-title" className="mt-1 font-display text-2xl text-white sm:text-3xl">
            Decida com mais confiança
          </h2>
          <p className="mt-2 text-sm text-white/70">Resultados indicativos · gratuitos</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group flex items-center gap-3.5 rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:bg-white/10"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                <t.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base leading-tight text-white">{t.title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-white/65">
                  Abrir <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
