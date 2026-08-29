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
  privacy = "approx",
}: {
  parish: string;
  municipality: string;
  lat?: number;
  lng?: number;
  privacy?: Privacy;
}) {
  return (
    <section aria-labelledby="loc-heading">
      <h2 id="loc-heading" className="font-display text-2xl text-[var(--hp-navy)]">
        Localização
      </h2>
      <div className="mt-2 h-0.5 w-12 rounded bg-[var(--hp-red)]" />

      <div className="mt-4">
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
            lat={privacy === "exact" ? lat : undefined}
            lng={privacy === "exact" ? lng : undefined}
            approximate={privacy !== "exact"}
            onOpen={() => track("pdp_map_open")}
          />
        )}
      </div>
    </section>
  );
}
