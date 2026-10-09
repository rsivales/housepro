import { BadgeCheck } from "lucide-react";
import { earnedPrizes, type Prize } from "@/lib/data/prizes";
import { PrizeEmblem } from "@/components/premios/prize-emblem";

function Badge({ prize, size = 44 }: { prize: Prize; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center" style={{ width: size + 26 }}>
      {prize.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={prize.image}
          alt={prize.name}
          className="rounded-xl border object-cover"
          style={{ width: size, height: size, borderColor: "#c9a13b55" }}
        />
      ) : (
        <PrizeEmblem prize={prize} size={size} />
      )}
      <span className="text-[11px] font-medium leading-tight">{prize.name}</span>
    </div>
  );
}

/**
 * Vitrine de conquistas do consultor — prova social pública: valida a
 * competência do agente para o cliente e promove a marca/agência ao mesmo tempo.
 */
export function PrizeShowcase({
  faturacao = 0,
  angariacao = 0,
  max = 6,
  art = {},
}: {
  faturacao?: number;
  angariacao?: number;
  max?: number;
  /** Artes globais (nome→URL), do Supabase. */
  art?: Record<string, string>;
}) {
  const badges = [
    ...earnedPrizes(faturacao, "faturacao"),
    ...earnedPrizes(angariacao, "angariacao"),
  ].map((p) => (art[p.artKey ?? p.name] ? { ...p, image: art[p.artKey ?? p.name] } : p));
  if (badges.length === 0) return null;
  // Mostra os mais altos de cada trilha (fim das listas), até `max`.
  const shown = badges.slice(-max);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Conquistas · validado pela HousePro
        </h2>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {shown.map((p) => (
          <Badge key={`${p.name}-${p.threshold}`} prize={p} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Distinções conquistadas pela produção e angariação — prova do compromisso e resultados deste consultor.
      </p>
    </div>
  );
}
