import * as React from "react";

/**
 * Símbolo Helix — três pás organizadas como uma hélice, cada uma com a ponta
 * subtilmente bifurcada (evoca a cauda da andorinha), aerodinâmicas e com
 * sensação de rotação. Geometria simples, legível em tamanho pequeno.
 * Usa `currentColor` para servir positivo (navy) e negativo (branco).
 */
export function HelixMark({
  size = 28,
  className,
  title = "Helix",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      {/* Uma pá, replicada a 0/120/240° — ponta com pequena fenda (andorinha). */}
      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          transform={`rotate(${deg} 24 24)`}
          d="M24 23.2 C19.6 18.6 18.4 11.2 21.4 5.2 L24 8.2 L26.6 5.2 C29.6 11.2 28.4 18.6 24 23.2 Z"
        />
      ))}
      {/* Núcleo — dá coesão e a leitura de rotação. */}
      <circle cx="24" cy="24" r="3.1" />
    </svg>
  );
}

/** Lockup completo: símbolo + "HELIX" + "by HousePro". */
export function HelixLogo({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <HelixMark size={size} className="hx-red" />
      <div className="leading-none">
        <p className="text-[1.35rem] font-extrabold tracking-tight" style={{ color: "var(--hx-navy)" }}>
          HELIX
        </p>
        <p className="text-[0.7rem] font-medium" style={{ color: "var(--hx-text-2)" }}>
          by HousePro
        </p>
      </div>
    </div>
  );
}
