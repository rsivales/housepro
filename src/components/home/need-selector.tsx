import Link from "next/link";
import { Home, Tag, Gauge, Euro } from "lucide-react";

/**
 * "Comece pelo que precisa" — 4 ações compactas horizontais (ícone à esquerda,
 * texto à direita). Grelha 2×2. Ligações a funcionalidades reais.
 */
const ACTIONS = [
  { icon: Home, label: "Comprar", href: "/imoveis?operacao=comprar" },
  { icon: Tag, label: "Vender", href: "/vender" },
  { icon: Gauge, label: "Avaliar imóvel", href: "/vender#avaliacao" },
  { icon: Euro, label: "Simular crédito", href: "/credito" },
];

export function NeedSelector() {
  return (
    <section aria-label="Comece pelo que precisa" className="mx-auto max-w-4xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:px-5 sm:py-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}>
              <a.icon className="size-5" />
            </span>
            <span className="font-display text-base sm:text-lg">{a.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
