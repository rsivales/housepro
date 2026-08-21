import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

/**
 * Recrutamento — "CARREIRAS". Fundo Deep Navy, texto à esquerda e fotografia
 * de equipa autêntica à direita (carregada no admin; fallback Deep Navy).
 */
export function RecruitmentCTA({ image }: { image?: string }) {
  return (
    <section aria-labelledby="careers-title" style={{ background: "var(--hp-navy)" }}>
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2">
        <div className="text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Carreiras</p>
          <h2 id="careers-title" className="mt-2 font-display text-2xl leading-tight text-white sm:text-3xl">
            O teu próximo capítulo pode começar connosco.
          </h2>
          <p className="mt-3 max-w-md text-white/75">
            Tecnologia, formação e uma equipa que cresce contigo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/carreiras" className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold">
              Conhecer a carreira <ArrowRight className="size-4" />
            </Link>
            <Link href="/carreiras#oportunidades" className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              Ver oportunidades
            </Link>
          </div>
        </div>

        <div className="relative order-first aspect-[16/10] overflow-hidden rounded-2xl lg:order-none">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Equipa HousePro" className="absolute inset-0 size-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 grid place-items-center" style={{ background: "linear-gradient(135deg, #2b5476 0%, #0B1F3A 75%)" }} aria-hidden>
              <Users className="size-16 text-white/25" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
