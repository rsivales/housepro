import { Sparkles, TrendingUp, BadgeCheck, Compass, Medal, Lightbulb, Gem, Award, Trophy, Star, Home, Crosshair, KeyRound, Building2, Landmark, Crown } from "lucide-react";
import type { ElementType } from "react";
import type { Prize } from "@/lib/data/prizes";

const ICONS: Record<string, ElementType> = { Sparkles, TrendingUp, BadgeCheck, Compass, Medal, Lightbulb, Gem, Award, Trophy, Star, Home, Crosshair, KeyRound, Building2, Landmark, Crown };

/** Emblema vetorial: nítido em qualquer dimensão, sem imagens externas. */
export function PrizeEmblem({ prize, size = 52, earned = true }: { prize?: Prize; size?: number; earned?: boolean }) {
  const Icon = ICONS[prize?.icon ?? "Sparkles"] ?? Star;
  const accent = prize?.color ?? "#a3862c";
  return (
    <span role="img" aria-label={`${prize?.name ?? "Prémio"}${earned ? "" : " — por conquistar"}`}
      className="relative inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, opacity: earned ? 1 : 0.45, filter: earned ? undefined : "grayscale(1)",
        background: "linear-gradient(145deg, #f5e6b5, #bc9444 42%, #785721 72%, #ead69d)",
        boxShadow: "inset 0 1px 1px #fff9, 0 3px 10px #071b3026" }}>
      <span className="absolute inset-[5%] rounded-full" style={{ border: "1px solid #f2deb099" }} />
      <span className="absolute inset-[10%] rounded-full" style={{ background: `radial-gradient(circle at 35% 25%, ${accent}, #0c2036 78%)`, border: "1px solid #06142688" }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none" stroke="#ead69d" strokeWidth="1.5" aria-hidden="true">
        <path d="M32 77C15 64 16 42 25 29M68 77C85 64 84 42 75 29" />
        {[0, 1, 2, 3].map((n) => <g key={n} transform={`translate(0 ${n * -9})`}><path d="M23 66q-9-2-8-9q8 0 8 9M77 66q9-2 8-9q-8 0-8 9" /></g>)}
        <path d="m50 79 2 3 4 1-4 1-2 3-2-3-4-1 4-1Z" fill="#ead69d" />
      </svg>
      <Icon aria-hidden="true" strokeWidth={1.65} className="relative" style={{ width: size * 0.38, height: size * 0.38, color: "#f5e6b5" }} />
    </span>
  );
}
