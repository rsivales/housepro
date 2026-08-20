"use client";

import * as React from "react";

/**
 * <img> resiliente: se a fonte falhar (link partido, ficheiro em falta),
 * troca imediatamente para o fallback — nunca fica uma imagem quebrada nem
 * um <img> sem src válido. Usa `key` na src para reavaliar quando muda.
 */
export function SafeImage({
  src,
  fallback,
  alt,
  className,
  style,
  loading = "lazy",
  fetchPriority,
}: {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}) {
  const [current, setCurrent] = React.useState(src || fallback);

  React.useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      fetchPriority={fetchPriority}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
