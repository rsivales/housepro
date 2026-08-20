import Link from "next/link";
import { Home, Tag, Gauge, Calculator, ArrowRight } from "lucide-react";

/**
 * "Comece pelo que precisa" — 4 ações compactas orientadas à conversão.
 * Grelha 2×2 em mobile, 4 colunas em desktop. Ligações a funcionalidades reais.
 */
const ACTIONS = [
  { icon: Home, label: "Comprar", note: "Encontrar a casa certa", href: "/imoveis?operacao=comprar" },
  { icon: Tag, label: "Vender", note: "Plano de venda com apoio", href: "/vender" },
  { icon: Gauge, label: "Avaliar imóvel", note: "Saber quanto vale", href: "/vender#avaliacao" },
  { icon: Calculator, label: "Simular crédito", note: "Estimar a prestação", href: "/credito" },
];

export function NeedSelector() {
  return (
    <section aria-labelledby="need-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <h2 id="need-title" className="font-display text-2xl sm:text-3xl">
        Comece pelo que precisa
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
        Quatro caminhos simples para o próximo passo.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group flex flex-col justify-between gap-6 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
          >
            <span className="grid size-11 place-items-center rounded-xl" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}>
              <a.icon className="size-5" />
            </span>
            <span>
              <span className="block font-display text-base leading-tight sm:text-lg">{a.label}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                {a.note}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
