import * as React from "react";
import Link from "next/link";
import { Users, ChevronRight, Home, Clock } from "lucide-react";

/** Resumo de leads — um único cartão, agrupado por origem. */
export function LeadSummary({
  total,
  bySource,
}: {
  total: number;
  bySource: { source: string; count: number }[];
}) {
  const TONE: Record<string, string> = {
    Idealista: "hx-chip-success",
    Meta: "hx-chip-blue",
    Website: "hx-chip-navy",
  };
  return (
    <Link href="/app/contactos" className="hx-card block p-4 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full" style={{ background: "var(--hx-surface-blue)", color: "var(--hx-blue)" }}>
          <Users className="size-5" />
        </span>
        <p className="text-lg font-bold">{total} nova{total === 1 ? "" : "s"} lead{total === 1 ? "" : "s"}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {bySource.map((s) => (
          <span key={s.source} className={`hx-chip ${TONE[s.source] ?? "hx-chip-navy"}`}>
            {s.source} <strong className="hx-tnum">{s.count}</strong>
          </span>
        ))}
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--hx-blue)" }}>
        Ver leads <ChevronRight className="size-4" />
      </span>
    </Link>
  );
}

export interface LatestProperty {
  id: string;
  image?: string;
  typology?: string;
  location: string;
  price: number;
  agentName?: string;
  when?: string;
  published?: boolean;
}

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** "Acabou de entrar" — o imóvel mais recente da agência. */
export function LatestAgencyProperty({ property }: { property: LatestProperty | null }) {
  if (!property) {
    return (
      <div className="hx-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="size-2 rounded-full" style={{ background: "var(--hx-blue)" }} /> Acabou de entrar
        </p>
        <p className="mt-3 text-sm hx-muted">Sem imóveis recentes na agência.</p>
      </div>
    );
  }
  return (
    <Link href={`/imovel/${property.id}`} className="hx-card block overflow-hidden p-4 transition-shadow hover:shadow-md">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="size-2 rounded-full" style={{ background: "var(--hx-blue)" }} /> Acabou de entrar
      </p>
      <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl">
        {property.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.image} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center" style={{ background: "linear-gradient(135deg,#0B1F3A,#244765)" }}>
            <Home className="size-8 text-white/70" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="font-semibold">
          {property.typology ? `${property.typology} · ` : ""}{property.location} · <span className="hx-tnum">{eur(property.price)}</span>
        </p>
        {property.published === false && <span className="hx-chip hx-chip-warn">Por publicar</span>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs hx-muted">
        {property.agentName && <span>{property.agentName}</span>}
        {property.when && <span className="inline-flex items-center gap-1">· <Clock className="size-3" /> {property.when}</span>}
      </div>
    </Link>
  );
}
