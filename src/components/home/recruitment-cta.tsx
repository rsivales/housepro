import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

/**
 * Recrutamento — "CARREIRAS". Convite a juntar-se à equipa. Ligações à
 * landing real /carreiras. Fotografia de equipa autêntica (via admin).
 */
export function RecruitmentCTA() {
  return (
    <section aria-labelledby="careers-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="grid items-stretch gap-0 lg:grid-cols-2">
          {/* Imagem de equipa (fallback Deep Navy até carregar foto no admin) */}
          <div
            className="min-h-[220px]"
            style={{ background: "linear-gradient(135deg, #244765 0%, #0B1F3A 75%)" }}
            aria-hidden
          >
            <div className="flex h-full items-center justify-center p-8">
              <Users className="size-16 text-white/25" />
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <p className="hp-eyebrow">Carreiras</p>
            <h2 id="careers-title" className="mt-2 font-display text-2xl leading-tight sm:text-3xl">
              O teu próximo capítulo pode começar connosco.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tecnologia, formação e uma equipa que cresce contigo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/carreiras"
                className="hp-btn-red inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold"
              >
                Conhecer a carreira <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/carreiras#oportunidades"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors hover:bg-secondary"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                Ver oportunidades
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
