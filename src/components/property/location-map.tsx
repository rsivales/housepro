"use client";

import * as React from "react";
import { MapPin, ExternalLink } from "lucide-react";

/**
 * Mini-mapa. Por defeito mostra uma pré-visualização estilizada (rápida e sem
 * pedidos externos); ao clicar carrega o mapa interativo real (OpenStreetMap,
 * sem chave). A ligação "Ver no mapa" abre o Google Maps. Padrão
 * "click-to-load" — leve, privado e correto em produção.
 */
export function LocationMap({
  parish,
  municipality,
  lat,
  lng,
}: {
  parish: string;
  municipality: string;
  lat?: number;
  lng?: number;
}) {
  const [live, setLive] = React.useState(false);
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const query = encodeURIComponent(`${parish}, ${municipality}, Portugal`);
  const gmaps = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  // OpenStreetMap embed (sem chave). Com coordenadas usa uma bbox à volta do
  // ponto + marcador; sem coordenadas centra por pesquisa.
  const d = 0.01;
  const osm = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng! - d}%2C${lat! - d}%2C${lng! + d}%2C${lat! + d}&layer=mapnik&marker=${lat}%2C${lng}`
    : `https://www.openstreetmap.org/export/embed.html?query=${query}&layer=mapnik`;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative h-56 w-full">
        {live ? (
          <iframe
            title={`Mapa de ${parish}, ${municipality}`}
            src={osm}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLive(true)}
            className="group relative block size-full"
            aria-label="Carregar mapa interativo"
          >
            {/* Pré-visualização estilizada */}
            <svg viewBox="0 0 400 224" className="size-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <rect width="400" height="224" className="fill-secondary" />
              <g className="fill-muted/40">
                <rect x="20" y="24" width="70" height="46" rx="4" />
                <rect x="110" y="16" width="86" height="40" rx="4" />
                <rect x="220" y="20" width="64" height="52" rx="4" />
                <rect x="308" y="30" width="72" height="44" rx="4" />
                <rect x="30" y="132" width="80" height="52" rx="4" />
                <rect x="250" y="140" width="120" height="50" rx="4" />
              </g>
              <g className="stroke-background" strokeWidth="7" fill="none" strokeLinecap="round">
                <path d="M0 112 H400" />
                <path d="M200 0 V224" />
                <path d="M100 0 V224" opacity="0.6" />
                <path d="M0 176 H400" opacity="0.6" />
              </g>
            </svg>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <MapPin className="size-8 fill-primary text-primary-foreground drop-shadow" />
            </span>
            <span className="absolute inset-0 grid place-items-center transition-colors group-hover:bg-background/10">
              <span className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur transition-transform group-hover:scale-105">
                Carregar mapa interativo
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate font-medium">{parish}</span>
          <span className="shrink-0 text-muted-foreground">· {municipality}</span>
        </p>
        <a
          href={gmaps}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver no mapa <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
