import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SignatureLeadForm } from "@/components/signature/signature-lead-form";
import { SignatureGallery } from "@/components/signature/signature-gallery";
import { FavoriteButton } from "@/components/property/favorite-button";
import { HeroShareButton } from "@/components/property/hero-share-button";
import { getSignaturePropertyBySlug } from "@/lib/db/repo";
import { getSignatureCollection } from "@/lib/signature/collections";
import { signatureImageSources, signaturePropertyHref } from "@/lib/signature/media";
import { formatArea, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
const siteUrl = "https://housepro.pt";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getSignaturePropertyBySlug((await params).slug);
  return p ? { title: `${p.signatureEditorialTitle?.trim() || p.title} — HousePro Signature`, alternates: { canonical: `${siteUrl}${signaturePropertyHref(p)}` } } : { title: "Signature" };
}
export default async function SignatureProperty({ params }: Props) {
  const p = await getSignaturePropertyBySlug((await params).slug);
  if (!p) notFound();
  const gallery = signatureImageSources(p);
  const title = p.signatureEditorialTitle?.trim() || p.title;
  const collection = getSignatureCollection(p.signatureCollection);
  const stats = [p.beds ? `${p.beds} quartos` : null, p.baths ? `${p.baths} WC` : null, p.area ? formatArea(p.area) : null, p.landArea ? `Terreno ${formatArea(p.landArea)}` : null, p.garage ? "Garagem" : null].filter(Boolean);
  const structured = { "@context": "https://schema.org", "@type": "Residence", name: title, url: `${siteUrl}${signaturePropertyHref(p)}`, image: gallery, address: { "@type": "PostalAddress", addressLocality: p.municipality, addressRegion: p.parish, addressCountry: "PT" } };
  return <div className="min-h-dvh min-w-0 bg-[#f3efe7] text-[#171512]"><SiteHeader/><main className="min-w-0 w-full">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}/>
    <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1 px-5 py-5 text-xs text-black/60 sm:px-8" aria-label="Localização na página"><Link href="/">Início</Link><ChevronRight className="size-3"/><Link href="/signature">Signature</Link><ChevronRight className="size-3"/>{collection && <><Link href={`/signature/colecoes/${collection.slug}`}>{collection.label}</Link><ChevronRight className="size-3"/></>}<span>{p.reference}</span></nav>
    <section className="mx-auto w-full min-w-0 max-w-7xl px-5 sm:px-8">
      <div className="mb-7 flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.2em] text-[#856a39]">HOUSEPRO SIGNATURE</p><h1 className="mt-3 max-w-4xl break-words font-serif text-[clamp(1.75rem,4vw,3.5rem)] leading-[1.1] [overflow-wrap:anywhere]">{title}</h1><p className="mt-4 flex items-start gap-2 text-sm text-black/60"><MapPin className="size-4 shrink-0"/>{[p.parish, p.municipality].filter(Boolean).join(", ")}</p></div><div className="flex shrink-0 flex-col gap-2 sm:flex-row"><FavoriteButton propertyId={p.id} variant="icon"/><HeroShareButton title={title}/></div></div>
      <SignatureGallery images={gallery} title={title}/>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/15 py-6"><span className="font-serif text-2xl sm:text-3xl">{p.signaturePriceVisible === false || p.priceVisible === false ? "Preço sob consulta" : formatPrice(p)}</span><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/65">{stats.map(s => <span key={String(s)}>{s}</span>)}</div></div>
    </section>
    <section className="mx-auto grid w-full min-w-0 max-w-7xl gap-10 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:gap-16">
      <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.2em] text-[#856a39]">A PROPRIEDADE</p><h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">Uma propriedade desenhada pelo lugar.</h2>{(p.signatureEditorialIntro?.trim() || p.shortDescription?.trim()) && <p className="mt-6 text-lg leading-8 text-black/70 [overflow-wrap:anywhere]">{p.signatureEditorialIntro?.trim() || p.shortDescription}</p>}<p className="mt-8 whitespace-pre-line text-base leading-8 text-black/70 [overflow-wrap:anywhere]">{p.description || "Informação detalhada disponível mediante apresentação privada."}</p>{collection && <Link href={`/signature/colecoes/${collection.slug}`} className="mt-8 inline-flex items-center gap-3 border-b border-[#9c7e48] pb-3 text-sm text-[#856a39]">Explorar a coleção {collection.label.toLowerCase()} <ArrowRight className="size-4 shrink-0"/></Link>}</div>
      <aside className="min-w-0 self-start bg-[#112331] p-6 text-[#f3efe7] sm:p-8"><p className="text-[10px] font-semibold tracking-[.2em] text-[#d1b784]">VISITA PRIVADA</p><h2 className="mt-4 font-serif text-3xl leading-tight">O seu próximo lugar merece uma conversa.</h2><p className="mb-6 mt-4 text-sm leading-7 text-white/65">Solicite apresentação, documentação ou uma visita privada a esta propriedade.</p><SignatureLeadForm kind="property" propertyId={p.id} compact/>{p.agent && <Link href={`/consultor/${p.agent.id}#imoveis`} className="mt-7 flex min-h-11 items-center justify-between gap-3 border-t border-white/20 pt-5 text-sm text-[#e5c993]"><span>Ver mais imóveis de {p.agent.name}</span><ArrowRight className="size-4 shrink-0"/></Link>}</aside>
    </section>
  </main><SiteFooter/></div>;
}
