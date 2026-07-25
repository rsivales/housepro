/** Coração "low-poly" 3D — facetas com sombreado para dar volume. */
export function Heart3D({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="hp-heart3d"
          x1="4"
          y1="5"
          x2="20"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF7A93" />
          <stop offset="1" stopColor="#D9123F" />
        </linearGradient>
      </defs>
      {/* corpo */}
      <path
        d="M12 21C12 21 3 13.5 3 8.5A4.5 4.5 0 0 1 12 6A4.5 4.5 0 0 1 21 8.5C21 13.5 12 21 12 21Z"
        fill="url(#hp-heart3d)"
      />
      {/* facetas (luz à esquerda, sombra à direita) */}
      <path d="M12 6 12 21 3 10Z" fill="#ffffff" fillOpacity="0.14" />
      <path d="M12 6 21 10 12 21Z" fill="#000000" fillOpacity="0.16" />
      <path d="M12 6 7 7.6 4.4 10.6Z" fill="#ffffff" fillOpacity="0.20" />
      <path d="M12 10 16 13 12 16.5 8.5 13Z" fill="#ffffff" fillOpacity="0.08" />
      <path d="M12 21 16 13 21 10 18.5 15Z" fill="#000000" fillOpacity="0.10" />
    </svg>
  );
}
