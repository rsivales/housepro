import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SignatureImage } from "./signature-image";
import { signatureImageSources, signaturePropertyHref } from "@/lib/signature/media";
import { formatPrice } from "@/lib/format";
import type { Property } from "@/lib/data/types";
export function SignaturePropertyCard({ property: p, referrer }: { property: Property; referrer?: string }) {
  return <Link href={signaturePropertyHref(p, referrer)} className="group block min-w-0 overflow-hidden bg-[#eee7db] text-[#171512] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#92764a]">
    <div className="relative aspect-[4/3] overflow-hidden bg-[#172231]"><SignatureImage sources={signatureImageSources(p)} alt={p.title} sizes="(max-width: 767px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-5 pt-12 pb-4 text-xs tracking-[.15em] text-white">{p.municipality}</div></div>
    <div className="min-w-0 p-5 sm:p-6"><p className="text-[10px] tracking-[.14em] text-[#786445]">SIGNATURE · {p.reference}</p><h3 className="mt-3 font-serif text-2xl leading-tight [overflow-wrap:anywhere] sm:text-3xl">{p.signatureEditorialTitle?.trim() || p.title}</h3><div className="mt-5 flex items-end justify-between gap-4 border-t border-black/10 pt-4"><span className="text-sm">{p.signaturePriceVisible === false || p.priceVisible === false ? "Preço sob consulta" : formatPrice(p)}</span><span className="inline-flex items-center gap-2 text-xs font-medium">Descobrir <ArrowUpRight className="size-4 shrink-0" /></span></div></div>
  </Link>;
}
