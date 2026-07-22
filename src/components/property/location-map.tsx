import { MapPin, ExternalLink } from "lucide-react";

/**
 * Mini-mapa para o utilizador se situar de imediato. As mosaicos de mapas
 * reais (Google/OSM) exigem rede externa; aqui mostramos um mapa estilizado
 * e a ligação abre a localização no Google Maps (produção e telemóvel).
 */
export function LocationMap({
  parish,
  municipality,
}: {
  parish: string;
  municipality: string;
}) {
  const query = encodeURIComponent(`${parish}, ${municipality}, Portugal`);
  const href = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative h-44 w-full">
        {/* Mapa estilizado (SVG) */}
        <svg
          viewBox="0 0 400 180"
          className="size-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <rect width="400" height="180" className="fill-secondary" />
          {/* blocos */}
          <g className="fill-muted/40">
            <rect x="20" y="24" width="70" height="46" rx="4" />
            <rect x="110" y="16" width="86" height="40" rx="4" />
            <rect x="220" y="20" width="64" height="52" rx="4" />
            <rect x="308" y="30" width="72" height="44" rx="4" />
            <rect x="30" y="104" width="80" height="52" rx="4" />
            <rect x="250" y="110" width="120" height="50" rx="4" />
          </g>
          {/* estradas */}
          <g className="stroke-background" strokeWidth="7" fill="none" strokeLinecap="round">
            <path d="M0 90 H400" />
            <path d="M200 0 V180" />
            <path d="M100 0 V180" opacity="0.6" />
            <path d="M0 140 H400" opacity="0.6" />
          </g>
        </svg>

        {/* Pin central */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <span className="relative flex flex-col items-center">
            <span className="absolute -bottom-1 size-2 rounded-full bg-primary/30 blur-[2px]" />
            <MapPin className="size-8 fill-primary text-primary-foreground drop-shadow" />
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 text-primary" />
          <span className="font-medium">{parish}</span>
          <span className="text-muted-foreground">· {municipality}</span>
        </p>
        <a
          href={href}
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
