import Link from "next/link";
import { ShieldCheck, BadgeCheck, Trophy, Star, ArrowRight } from "lucide-react";

/**
 * "Confiança reconhecida" — apenas distinções REAIS e verificáveis.
 *
 * IMPORTANTE (constrangimento explícito, confirmado pelo cliente): a HousePro
 * ainda NÃO tem o selo DECO PROteste. Por isso NÃO é aqui apresentado — nem
 * selo, nem nome como certificação, nem placeholder, nem logótipo, nem
 * sugestão de atribuição/avaliação em curso. Selos futuros só entram após
 * aprovação/autorização oficial, ficheiro, validade e link de verificação,
 * com ativação manual no admin.
 *
 * O número AMI é gerido no admin (Dados legais da agência) — aqui usa-se o
 * mesmo marcador do restante site até ser preenchido.
 */
const ITEMS = [
  { icon: ShieldCheck, title: "AMI", note: "Mediador imobiliário licenciado" },
  { icon: BadgeCheck, title: "Qualidade", note: "Processos auditados e documentados" },
  { icon: Trophy, title: "Prémios", note: "Reconhecimento do setor" },
  { icon: Star, title: "Avaliações", note: "Testemunhos reais e verificados" },
];

export function TrustBadges() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="text-center">
        <h2 id="trust-title" className="font-display text-2xl sm:text-3xl">Confiança reconhecida</h2>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 text-center shadow-sm">
            <span className="grid size-11 place-items-center rounded-full" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}>
              <it.icon className="size-5" />
            </span>
            <span className="font-display text-base">{it.title}</span>
            <span className="text-xs text-muted-foreground">{it.note}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-center">
        <Link href="/privacidade" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] transition-opacity hover:opacity-70">
          Ver certificações <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
