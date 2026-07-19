/**
 * Generates refined architectural placeholder images (SVG) for property
 * cards until real photos are wired up from Supabase Storage.
 * Each image is an editorial duotone "villa at dusk/day" composition.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "properties");
mkdirSync(outDir, { recursive: true });

// Curated palettes: [skyTop, skyBottom, house, houseShade, roof, window, ground]
const palettes = {
  "sage-day": ["#dfe7de", "#c4d2c2", "#f4f1ea", "#e4ddcf", "#8a9a86", "#f6d98a", "#b7c4b2"],
  "terracotta-dusk": ["#f2d8c2", "#e7b998", "#f6efe6", "#e8d6c4", "#b96f4c", "#ffd88a", "#d9b79d"],
  "dusty-blue": ["#dbe3ea", "#b9c8d6", "#f3f4f5", "#dde2e6", "#5f7285", "#f7d98d", "#aebccb"],
  "warm-sand": ["#f0e7d6", "#e2d2b3", "#faf6ee", "#ece1cc", "#a98d5f", "#ffe0a0", "#d8c8a8"],
  "twilight": ["#cdd0e0", "#a7a9c6", "#eceaf1", "#d7d3e0", "#6a6a8c", "#ffd27a", "#b6b4cc"],
  "olive": ["#e5e6d6", "#cdd0b4", "#f4f3ea", "#e2e0cf", "#7c8452", "#f6dd90", "#c3c6a6"],
};

function svg([skyTop, skyBottom, house, houseShade, roof, win, ground]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${skyTop}"/>
      <stop offset="1" stop-color="${skyBottom}"/>
    </linearGradient>
    <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ground}"/>
      <stop offset="1" stop-color="${houseShade}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#sky)"/>
  <circle cx="935" cy="205" r="78" fill="${win}" opacity="0.55"/>
  <path d="M0 690 Q 300 640 600 672 T 1200 656 V900 H0 Z" fill="url(#grd)" opacity="0.9"/>
  <!-- main villa -->
  <rect x="250" y="430" width="470" height="300" fill="${house}"/>
  <rect x="250" y="430" width="470" height="300" fill="#000" opacity="0.02"/>
  <polygon points="230,432 485,300 740,432" fill="${roof}"/>
  <!-- side wing -->
  <rect x="700" y="510" width="250" height="220" fill="${houseShade}"/>
  <polygon points="686,512 825,420 964,512" fill="${roof}" opacity="0.92"/>
  <!-- windows glow -->
  <g fill="${win}">
    <rect x="300" y="486" width="70" height="92" rx="4"/>
    <rect x="405" y="486" width="70" height="92" rx="4"/>
    <rect x="510" y="486" width="70" height="92" rx="4"/>
    <rect x="740" y="556" width="58" height="76" rx="4"/>
    <rect x="828" y="556" width="58" height="76" rx="4"/>
  </g>
  <!-- door -->
  <rect x="605" y="628" width="66" height="102" rx="3" fill="${roof}"/>
  <!-- slim trees -->
  <g fill="${roof}" opacity="0.8">
    <rect x="168" y="560" width="12" height="170"/>
    <ellipse cx="174" cy="548" rx="46" ry="60"/>
    <rect x="1030" y="576" width="11" height="154"/>
    <ellipse cx="1035" cy="566" rx="38" ry="52"/>
  </g>
</svg>`;
}

for (const [name, palette] of Object.entries(palettes)) {
  writeFileSync(join(outDir, `${name}.svg`), svg(palette));
  console.log("wrote", `${name}.svg`);
}
console.log("done");
