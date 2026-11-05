"use client";

import { MapPin } from "lucide-react";

import { track } from "@/lib/analytics";
import { LocationMap } from "@/components/property/location-map";

type Privacy = "exact" | "approx" | "locality" | "hidden";

/**
 * Secção de localização respeitando a privacidade do imóvel. Nunca revela
 * coordenadas/morada exata quando a configuração é aproximada, só localidade
 * ou oculta. O mapa interativo carrega apenas após interação.
 */
export function PropertyLocation({
  parish,
  municipality,
  lat,
  lng,
  streetName,
  streetNumber,
  postalCode,
  privacy = "approx",
}: {
  parish: string;
  municipality: string;
  lat?: number;
  lng?: number;
  streetName?: string;
  streetNumber?: string;
  postalCode?: string;
  privacy?: Privacy;
}) {
  return (
    <section aria-labelledby="loc-heading">
      <h2 id="loc-heading" className="font-display text-2xl text-[var(--hp-navy)]">
        Localização
      </h2>
      <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />

      <div className="mt-4">
        {privacy === "exact" && streetName && (
          <address className="mb-3 rounded-2xl border bg-white px-5 py-4 not-italic">
            <p className="font-medium text-[var(--hp-navy)]">{[streetName, streetNumber].filter(Boolean).join(", ")}</p>
            <p className="mt-1 text-sm text-[var(--hp-text-2)]">{[postalCode, parish, municipality].filter(Boolean).join(" · ")}</p>
          </address>
        )}
        {privacy === "hidden" ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4">
            <MapPin className="size-5 shrink-0 text-[var(--hp-red)]" />
            <p className="text-sm text-[var(--hp-text-2)]">
              <span className="font-medium text-[var(--hp-navy)]">{municipality}</span> — a
              localização exata é partilhada com o consultor mediante contacto.
            </p>
          </div>
        ) : (
          <LocationMap
            parish={privacy === "locality" ? municipality : parish}
            municipality={municipality}
            exactAddress={privacy === "exact"}
            // Passamos sempre as coordenadas (quando existem) para o mapa poder
            // centrar-se. A privacidade controla o zoom e o marcador: em modo
            // aproximado mostramos a zona sem apontar a morada exata.
            lat={lat}
            lng={lng}
            approximate={privacy !== "exact"}
            onOpen={() => track("pdp_map_open")}
          />
        )}
      </div>
    </section>
  );
}
