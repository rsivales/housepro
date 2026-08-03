import Link from "next/link";
import { ArrowRight, MapPin, TrendingUp } from "lucide-react";

import { FadeIn } from "@/components/motion/fade-in";
import type { ConcelhoProcura } from "@/lib/data/concelhos";

/** Gradiente de fallback quando o concelho não tem foto (curada/imóvel). */
const TINTS = [
  "from-primary/70 to-primary/30",
  "from-gold/60 to-primary/40",
  "from-slate-700/70 to-slate-500/40",
];

/**
 * Secção "Concelhos mais procurados" — 3 (ou N) zonas em destaque, cada uma
 * com foto e link para a montra filtrada. Usada na homepage (marca global) e
 * na montra de agência (âmbito da agência), passando `scopeLabel`.
 */
export function TopConcelhos({
  concelhos,
  scopeLabel,
}: {
  concelhos: ConcelhoProcura[];
  scopeLabel?: string;
}) {
  if (concelhos.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              <TrendingUp className="size-4" />
              {scopeLabel ?? "Onde há mais procura"}
            </p>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl">
              Concelhos mais procurados
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">
            Ordenados pela procura dos clientes
          </span>
        </div>
      </FadeIn>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {concelhos.map((c, i) => (
          <FadeIn key={c.name} delay={i * 0.08}>
            <Link
              href={c.href}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border shadow-sm sm:aspect-[3/4]"
            >
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.image}
                  alt={`Imóveis em ${c.name}`}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${TINTS[i % TINTS.length]}`}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur">
                <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {i + 1}
                </span>
                mais procurado
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="inline-flex items-center gap-1.5 text-xs text-white/80">
                  <MapPin className="size-3.5" />
                  {c.district ?? "Portugal"}
                </p>
                <h3 className="mt-1 font-display text-2xl leading-tight drop-shadow">
                  {c.name}
                </h3>
                <p className="mt-1 flex items-center justify-between text-sm text-white/85">
                  <span>
                    {c.count} {c.count === 1 ? "imóvel" : "imóveis"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium opacity-0 transition-opacity group-hover:opacity-100">
                    Ver <ArrowRight className="size-4" />
                  </span>
                </p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
