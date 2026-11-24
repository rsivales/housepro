import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BedDouble, Expand, MapPin, MoveUpRight, Play, Ruler, Scan, Trees } from "lucide-react";

import { AGENCY_INDEPENDENCE_NOTICE } from "@/lib/brand-disclaimer";
import { isCompleted } from "@/lib/data/completion";
import { getSignaturePropertyBySlug } from "@/lib/db/repo";
import { formatArea, publicPriceLabel } from "@/lib/format";
import { getSignatureCollection } from "@/lib/signature/collections";
import { signatureImageSources, signaturePropertyHref } from "@/lib/signature/media";
import { PdpView } from "@/components/property/pdp-view";
import { CompletionLabel } from "@/components/property/completion-label";
import { FavoriteButton } from "@/components/property/favorite-button";
import { HeroShareButton } from "@/components/property/hero-share-button";
import { SignatureGallery } from "@/components/signature/signature-gallery";
import { SignatureImage } from "@/components/signature/signature-image";
import { SignatureLeadForm } from "@/components/signature/signature-lead-form";
import { SignatureLogo } from "@/components/signature/signature-logo";
import { SignatureMenu } from "@/components/signature/signature-menu";

export const dynamic = "force-dynamic";
const siteUrl = "https://housepro.pt";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getSignaturePropertyBySlug((await params).slug);
  return p ? { title: `${p.signatureEditorialTitle?.trim() || p.title} — HousePro Signature`, description: p.seoDescription || p.shortDescription || undefined, alternates: { canonical: `${siteUrl}${signaturePropertyHref(p)}` } } : { title: "Signature" };
}

export default async function SignatureProperty({ params }: Props) {
  const p = await getSignaturePropertyBySlug((await params).slug);
  if (!p) notFound();

  const gallery = signatureImageSources(p);
  const title = p.signatureEditorialTitle?.trim() || p.title;
  const heroTitle = p.signatureEditorialTitle?.trim() || [p.type, p.parish || p.municipality].filter(Boolean).join(" em ");
  const location = p.locationPrivacy === "hidden" ? p.municipality : [p.parish, p.municipality].filter(Boolean).join(", ");
  const intro = (p.signatureEditorialIntro || p.shortDescription || "").trim();
  const body = (p.description || "").trim();
  const highlights = (p.signatureAttributes?.length ? p.signatureAttributes : p.amenities || []).filter(Boolean).slice(0, 8);
  const collection = getSignatureCollection(p.signatureCollection);
  const plans = (p.plans || []).filter(src => /^https?:\/\//.test(src) || /^\/(?!\/)/.test(src));
  const video = p.videoUrl && /^https?:\/\//.test(p.videoUrl) ? p.videoUrl : null;
  const tour = p.tourUrl && /^https?:\/\//.test(p.tourUrl) ? p.tourUrl : null;
  const facts = [
    p.beds ? { icon: BedDouble, label: "Quartos", value: String(p.beds) } : null,
    p.area ? { icon: Ruler, label: "Área", value: formatArea(p.area) } : null,
    p.landArea ? { icon: Trees, label: "Terreno", value: formatArea(p.landArea) } : null,
    p.baths ? { icon: Scan, label: "Casas de banho", value: String(p.baths) } : null,
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));
  const structured = { "@context": "https://schema.org", "@type": "Residence", name: title, url: `${siteUrl}${signaturePropertyHref(p)}`, image: gallery, address: { "@type": "PostalAddress", addressLocality: p.municipality, ...(p.locationPrivacy !== "hidden" && p.parish ? { addressRegion: p.parish } : {}), addressCountry: "PT" } };

  return <div className="min-h-dvh overflow-x-hidden bg-[#0d1725] text-[#f7f2e9]">
    <PdpView propertyId={p.id} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    <header className="relative z-20 bg-[#0a1422]">
      <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-5 sm:px-10">
        <Link href="/signature" aria-label="HousePro Signature — coleção"><SignatureLogo className="text-[#e8d3a3]" /></Link>
        <nav aria-label="Navegação Signature" className="hidden items-center gap-8 text-xs tracking-wide text-[#f7f2e9]/75 lg:flex"><Link href="/signature#colecao" className="hover:text-white">Coleção</Link><Link href="/signature#inspiracao" className="hover:text-white">Destinos</Link><Link href="/signature/apresentar" className="hover:text-white">Apresentar imóvel</Link><a href="#contacto" className="border border-[#c8a875]/70 px-5 py-3 text-[#f2dbaf] hover:bg-[#c8a875]/10">Pedido privado</a></nav>
        <SignatureMenu />
      </div>
    </header>
    <main>
      <SignatureGallery key={p.id} images={gallery} title={title} />
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-6 px-5 py-8 sm:px-10 sm:py-12">
        <div>
          <p className="text-xs uppercase tracking-[.18em] text-[#ead4a3]">{p.reference}</p>
          <h1 id="detalhes-imovel" tabIndex={-1} className="mt-3 max-w-4xl scroll-mt-6 font-serif text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] [text-wrap:balance]">{heroTitle}</h1>
          {location && <p className="mt-4 flex items-center gap-2 text-sm text-white/85"><MapPin className="size-4 shrink-0 text-[#d0b178]" aria-hidden="true" />{location}</p>}
        </div>
        <a href="#contacto" className="inline-flex min-h-11 items-center border border-[#d2b476] px-5 text-sm text-[#f2dbaf] hover:bg-[#c8a875]/10">Apresentação privada</a>
      </div>

      <section id="experiencia" aria-label="O essencial" className="border-y border-[#d2b476]/25 bg-[#0a1422]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-10 gap-y-5 px-5 py-6 sm:px-10 lg:py-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4"><p className="font-serif text-2xl text-[#f5eee4]">O essencial</p>{facts.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-3 border-l border-[#d2b476]/35 pl-6"><Icon className="size-5 text-[#d2b476]" aria-hidden="true" /><div><span className="block text-[10px] uppercase tracking-[.14em] text-white/55">{label}</span><span className="text-sm text-[#f5eee4]">{value}</span></div></div>)}</div>
          <div className="flex items-center gap-5"><div className="text-right"><CompletionLabel property={p} />{!isCompleted(p.status) && <p className="font-serif text-xl text-[#e8d3a3] sm:text-2xl">{p.signaturePriceVisible === false ? "Preço sob consulta" : publicPriceLabel(p)}</p>}</div><a href="#contacto" className="hidden min-h-11 items-center gap-2 bg-[#c8a875] px-5 text-xs font-semibold text-[#0a1422] transition hover:bg-[#e5c993] sm:inline-flex">Marcar apresentação <ArrowRight className="size-4" /></a></div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-10 px-5 py-16 sm:px-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] lg:gap-16 lg:py-24">
        <div className="max-w-3xl"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#d2b476]">A propriedade</p><h2 className="mt-5 font-serif text-4xl leading-[1.05] sm:text-5xl">A história está nos detalhes.</h2>{intro && !body.startsWith(intro) && <p className="mt-7 text-lg leading-8 text-[#f7f2e9]/85">{intro}</p>}{body ? <div className="mt-7 whitespace-pre-line text-base leading-8 text-[#f7f2e9]/70 [overflow-wrap:anywhere]">{body}</div> : <p className="mt-7 text-base leading-8 text-[#f7f2e9]/70">Peça uma apresentação privada para conhecer esta propriedade em detalhe.</p>}</div>
        <aside className="self-start border-t border-[#d2b476]/60 pt-6 lg:sticky lg:top-8"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#d2b476]">Ficha da propriedade</p><h2 className="mt-4 font-serif text-2xl leading-snug">{p.title}</h2><p className="mt-3 text-sm text-white/55">{location} · Ref. {p.reference}</p>{highlights.length > 0 && <div className="mt-7 flex flex-wrap gap-2">{highlights.map(item => <span key={item} className="border border-white/20 px-3 py-2 text-xs text-white/75">{item}</span>)}</div>}<div className="mt-7 flex items-center gap-3 border-t border-white/15 pt-5"><FavoriteButton propertyId={p.id} variant="icon-light" /><HeroShareButton title={title} /><span className="text-xs text-white/55">Guardar ou partilhar</span></div></aside>
      </section>

      {gallery.length > 1 && <section aria-label="Mais imagens da propriedade" className="grid gap-2 bg-[#09121f] px-2 sm:grid-cols-2">{gallery.slice(1, 3).map((src, index) => <div key={src} className="relative aspect-[4/3] min-w-0 overflow-hidden sm:aspect-[1.45/1]"><SignatureImage sources={[src]} alt={`Fotografia ${index + 2} de ${title}`} sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" /></div>)}</section>}

      {(plans.length > 0 || video || tour) && <section className="mx-auto max-w-[1500px] px-5 py-16 sm:px-10 lg:py-24"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#d2b476]">Conheça melhor</p><h2 className="mt-4 font-serif text-4xl">Veja para além das fotografias.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map((src, i) => <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="group border border-white/20 p-4"><div className="relative aspect-[4/3] bg-white"><SignatureImage sources={[src]} alt={`Planta ${i + 1} de ${title}`} sizes="(min-width: 1024px) 30vw, 80vw" className="object-contain" /></div><span className="mt-4 inline-flex items-center gap-2 text-sm text-[#e8d3a3]">Ver planta {i + 1} <Expand className="size-4" /></span></a>)}{video && <a href={video} target="_blank" rel="noopener noreferrer" className="flex min-h-44 flex-col justify-between border border-white/20 p-6 hover:border-[#d2b476]"><Play className="size-7 text-[#d2b476]" /><span className="inline-flex items-center justify-between font-serif text-2xl">Ver vídeo <MoveUpRight className="size-5" /></span></a>}{tour && <a href={tour} target="_blank" rel="noopener noreferrer" className="flex min-h-44 flex-col justify-between border border-white/20 p-6 hover:border-[#d2b476]"><Scan className="size-7 text-[#d2b476]" /><span className="inline-flex items-center justify-between font-serif text-2xl">Visita virtual <MoveUpRight className="size-5" /></span></a>}</div></section>}

      <section id="contacto" className="bg-[#f2ece1] px-5 py-16 text-[#171512] sm:px-10 lg:py-24"><div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)] lg:gap-20"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#856a39]">Acesso privado</p><h2 className="mt-5 max-w-lg font-serif text-4xl leading-[1.05] sm:text-5xl">O próximo capítulo começa com uma conversa.</h2><p className="mt-6 max-w-lg text-base leading-7 text-black/65">Peça informações, documentação disponível ou uma visita privada. A equipa responde de forma personalizada.</p>{p.agent && <div className="mt-10 flex items-center gap-4 border-t border-black/15 pt-6">{p.agent.photo ? <div className="relative size-16 shrink-0 overflow-hidden rounded-full"><SignatureImage sources={[p.agent.photo]} alt={p.agent.name} sizes="64px" className="object-cover" /></div> : <div className="grid size-16 shrink-0 place-items-center rounded-full bg-[#0d1725] font-serif text-xl text-white">{p.agent.name.slice(0, 1)}</div>}<div><p className="text-xs uppercase tracking-[.15em] text-[#856a39]">O seu consultor</p><p className="mt-1 font-serif text-xl">{p.agent.name}</p><Link href={`/consultor/${p.agent.id}#imoveis`} className="mt-1 inline-flex items-center gap-1 text-sm underline underline-offset-4">Conhecer o consultor <ArrowRight className="size-4" /></Link></div></div>}</div><div className="bg-[#101d2d] p-6 text-white sm:p-9"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#d2b476]">{isCompleted(p.status) ? "Outras oportunidades" : "Apresentação privada"}</p><h3 className="mt-4 font-serif text-3xl">Fale-nos do que procura.</h3><p className="mb-6 mt-3 text-sm leading-6 text-white/65">{isCompleted(p.status) ? "Este imóvel já foi negociado. Encontraremos outras opções para si." : "Diga-nos como prefere conhecer esta propriedade."}</p><SignatureLeadForm kind="property" propertyId={p.id} compact /></div></div></section>
      {collection && <div className="bg-[#101d2d] px-5 py-10 text-center"><Link href={`/signature/colecoes/${collection.slug}`} className="inline-flex items-center gap-3 border-b border-[#d2b476] pb-2 text-sm text-[#e8d3a3]">Explorar a coleção {collection.label.toLowerCase()} <ArrowRight className="size-4" /></Link></div>}
    </main>
    <footer className="bg-[#080e17] px-5 py-9 text-[#e8d3a3] sm:px-10"><div className="mx-auto max-w-[1500px]"><div className="flex flex-wrap items-center justify-between gap-4"><Link href="/signature"><SignatureLogo /></Link><Link href="/" className="text-xs text-white/70 hover:text-white">Voltar à HousePro <ArrowRight className="ml-1 inline size-4" /></Link></div><p className="mt-7 max-w-4xl text-xs leading-6 text-white/50">{AGENCY_INDEPENDENCE_NOTICE}</p></div></footer>
  </div>;
}
