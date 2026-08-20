"use client";

import * as React from "react";

import { SafeImage } from "@/components/home/safe-image";
import { readNewsImages } from "@/lib/data/site-content";

/**
 * Imagem de artigo com override do admin. Prioridade: imagem definida no admin
 * (localStorage) → `base` (featuredImage/imagem/fallback de categoria) →
 * `fallback` geral. Troca imediata em erro via SafeImage.
 */
export function ArticleImage({
  id,
  base,
  fallback,
  alt,
  className,
}: {
  id: string;
  base: string;
  fallback: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = React.useState(base);

  React.useEffect(() => {
    const override = readNewsImages()[id];
    if (override) setSrc(override);
  }, [id]);

  return <SafeImage src={src} fallback={fallback} alt={alt} className={className} />;
}
