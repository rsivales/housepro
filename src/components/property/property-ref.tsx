"use client";

import * as React from "react";
import Link from "next/link";
import { BedDouble, Bath, Maximize2, MapPin, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { propertyById } from "@/lib/data/mock";
import { formatArea, formatPrice } from "@/lib/format";

/**
 * Menção a um imóvel com link ativo e pré-visualização (hover no desktop,
 * toque no telemóvel) — para rever/relembrar rapidamente de que se trata.
 * Usar em qualquer sítio onde se refira um imóvel (leads, referências,
 * negócios, portais, admin).
 */
export function PropertyRef({
  propertyId,
  label,
  referrerId,
  className,
}: {
  propertyId?: string;
  /** Texto do link (por defeito a referência). */
  label?: string;
  referrerId?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const p = propertyId ? propertyById(propertyId) : undefined;
  const href = p ? `/imovel/${p.id}${referrerId ? `?ref=${referrerId}` : ""}` : undefined;
  const text = label ?? p?.reference ?? "Imóvel";

  if (!p || !href) return <span className={className}>{text}</span>;

  return (
    <span className="group relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "font-medium text-primary underline decoration-dotted underline-offset-2 hover:opacity-80",
          className
        )}
      >
        {text}
      </button>

      <span
        className={cn(
          "absolute left-0 top-full z-30 mt-1 block w-64 overflow-hidden rounded-xl border bg-card text-left shadow-lg transition-opacity",
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt="" className="h-28 w-full object-cover" />
        <span className="block p-3">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{formatPrice(p)}</span>
            <span className="text-xs text-muted-foreground">Ref. {p.reference}</span>
          </span>
          <span className="mt-1 block truncate text-sm font-medium">{p.title}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {p.parish}, {p.municipality}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.typology && <span className="font-medium text-foreground">{p.typology}</span>}
            <span className="flex items-center gap-1"><BedDouble className="size-3" /> {p.beds}</span>
            <span className="flex items-center gap-1"><Bath className="size-3" /> {p.baths}</span>
            <span className="flex items-center gap-1"><Maximize2 className="size-3" /> {formatArea(p.area)}</span>
          </span>
          <Link
            href={href}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Abrir imóvel <ExternalLink className="size-3" />
          </Link>
        </span>
      </span>
    </span>
  );
}
