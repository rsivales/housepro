"use client";
import Image from "next/image";
import { useState } from "react";
/** Real property photographs only. Retry another saved photograph on failure. */
export function SignatureImage({ sources, alt, className, sizes, priority = false, fill = true, width, height }: { sources: string[]; alt: string; className?: string; sizes?: string; priority?: boolean; fill?: boolean; width?: number; height?: number }) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = sources.find(src => !failed.includes(src));
  if (!source) return <div role="img" aria-label={`${alt} — fotografia indisponível`} className={`${fill ? "absolute inset-0" : "aspect-video w-full"} flex items-center justify-center bg-[#172231] p-6 text-center text-sm text-white/75`}>Fotografia disponível mediante contacto</div>;
  return <Image src={source} alt={alt} unoptimized fill={fill} width={fill ? undefined : width} height={fill ? undefined : height} sizes={sizes} priority={priority} className={className} onError={() => setFailed(current => [...current, source])} />;
}
