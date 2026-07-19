"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BedDouble, Bath, Heart, MapPin, Maximize2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatArea, formatPrice, whatsappLink } from "@/lib/format";
import { agentById } from "@/lib/data/mock";
import type { Property } from "@/lib/data/types";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";

const statusLabel: Record<string, string> = {
  novo: "Novo",
  destaque: "Destaque",
  reduzido: "Preço reduzido",
  vendido: "Vendido",
};

function StatusBadge({ status }: { status: NonNullable<Property["status"]> }) {
  const styles: Record<string, string> = {
    novo: "bg-primary text-primary-foreground",
    destaque: "bg-gold text-gold-foreground",
    reduzido: "bg-destructive text-destructive-foreground",
    vendido: "bg-foreground text-background",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur",
        styles[status]
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

export function PropertyCard({
  property,
  className,
}: {
  property: Property;
  className?: string;
}) {
  const [favorite, setFavorite] = React.useState(false);
  const agent = agentById(property.agentId);

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-xl",
        className
      )}
    >
      {/* Media */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.image}
          alt={`${property.type} ${property.typology ?? ""} em ${property.parish}, ${property.municipality}`}
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          loading="lazy"
        />

        {/* Top row: status + favorite */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <div className="flex gap-2">
            {property.status && <StatusBadge status={property.status} />}
          </div>
          <button
            type="button"
            onClick={() => setFavorite((v) => !v)}
            aria-pressed={favorite}
            aria-label={favorite ? "Remover dos favoritos" : "Guardar nos favoritos"}
            className="grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
          >
            <Heart
              className={cn(
                "size-[18px] transition-all",
                favorite ? "fill-destructive stroke-destructive scale-110" : "stroke-current"
              )}
            />
          </button>
        </div>

        {/* Operation chip */}
        <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium capitalize text-foreground shadow-sm backdrop-blur">
          {property.operation}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold tracking-tight">
            {formatPrice(property)}
          </p>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            Ref. {property.reference}
          </span>
        </div>

        <h3 className="line-clamp-1 font-display text-lg leading-snug">
          {property.title}
        </h3>

        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">
            {property.parish}, {property.municipality}
          </span>
        </p>

        {/* Specs */}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-sm text-muted-foreground">
          {property.typology && (
            <span className="font-medium text-foreground">{property.typology}</span>
          )}
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-4" /> {property.beds}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="size-4" /> {property.baths}
          </span>
          <span className="flex items-center gap-1.5">
            <Maximize2 className="size-4" /> {formatArea(property.area)}
          </span>
        </div>

        {/* Agent + WhatsApp */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AgentAvatar agent={agent} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{agent.name}</p>
              <p className="truncate text-xs text-muted-foreground">{agent.agency}</p>
            </div>
          </div>
          <a
            href={whatsappLink(agent.whatsapp, property)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar com ${agent.name} por WhatsApp sobre ${property.reference}`}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <WhatsappIcon className="size-5" />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
