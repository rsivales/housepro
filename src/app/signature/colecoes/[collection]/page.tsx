import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { SignatureLogo } from "@/components/signature/signature-logo";
import { SignatureMenu } from "@/components/signature/signature-menu";
import { SignatureLeadForm } from "@/components/signature/signature-lead-form";
import { SignaturePropertyCard } from "@/components/signature/signature-property-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { listSignatureProperties } from "@/lib/db/repo";
import { SIGNATURE_COLLECTIONS, getSignatureCollection } from "@/lib/signature/collections";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ collection: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = getSignatureCollection((await params).collection);
  return collection ? { title: `${collection.label} — HousePro Signature`, description: collection.intro, alternates: { canonical: `https://housepro.pt/signature/colecoes/${collection.slug}` } } : { title: "Coleção Signature" };
}
export default async function SignatureCollectionPage({ params }: Props) {
  const collection = getSignatureCollection((await params).collection);
  if (!collection) notFound();
  const properties = (await listSignatureProperties()).filter(p => getSignatureCollection(p.signatureCollection)?.slug === collection.slug);
  return <div className="min-h-dvh min-w-0 bg-[#f4f0e8] text-[#171512]">
    <main>
      <section className="relative isolate min-h-[650px] overflow-hidden bg-[#101c29] text-white sm:min-h-[760px]">
        <Image src={collection.image} alt="" fill priority sizes="100vw" className="object-cover object-[65%_center]"/>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,27,.87),rgba(7,17,27,.35)_65%,rgba(7,17,27,.12))]"/>
        <header className="relative z-10 mx-auto flex max-w-[1500px] items-center justify-between px-5 py-6 md:px-10 md:py-8"><Link href="/signature" aria-label="HousePro Signature"><SignatureLogo className="text-[#e8d3a3]"/></Link><nav className="hidden items-center gap-8 text-xs text-white/80 lg:flex"><Link href="/signature">Todas as propriedades</Link><a href="#colecao">{collection.label}</a><a href="#pedido" className="border border-[#c6ab75] px-5 py-3">Pesquisa privada</a></nav><SignatureMenu/></header>
        <div className="relative mx-auto flex min-h-[520px] max-w-[1500px] items-end px-5 pb-16 md:min-h-[620px] md:px-10 md:pb-24"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-[#e5c993]">SIGNATURE · {collection.label}</p><h1 className="mt-6 max-w-xl font-serif text-5xl leading-[.98] sm:text-7xl lg:text-8xl">{collection.title}</h1><p className="mt-6 max-w-md text-base leading-7 text-white/85">{collection.intro}</p><a href="#colecao" className="mt-8 inline-flex min-h-12 items-center gap-5 border-b border-[#dec291] text-xs tracking-wide">Descobrir as propriedades <ArrowDown className="size-4"/></a></div></div>
      </section>
      <section id="inspiracao" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-2 md:py-24"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8c734c]">UMA FORMA DE VIVER</p><h2 className="mt-4 max-w-md font-serif text-4xl leading-tight sm:text-5xl">{collection.storyTitle}</h2></div><div><p className="text-base leading-8 text-black/65">{collection.story}</p><div className="mt-8 grid gap-4 border-t border-[#a48a61]/30 pt-6 sm:grid-cols-3">{collection.highlights.map((highlight, i) => <div key={highlight}><span className="font-serif text-xl text-[#9c8053]">0{i + 1}</span><p className="mt-2 text-xs leading-5">{highlight}</p></div>)}</div></div></section>
      <section id="colecao" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 md:pb-28"><div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#a48a61]/30 pt-8"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8c734c]">PROPRIEDADES SELECIONADAS</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">{collection.label}</h2></div><p className="text-xs text-black/55">{properties.length} {properties.length === 1 ? "propriedade nesta seleção" : "propriedades nesta seleção"}</p></div>{properties.length ? <div className="mt-9 grid min-w-0 gap-6 md:grid-cols-2">{properties.map(property => <SignaturePropertyCard key={property.id} property={property}/>)}</div> : <div className="mt-8 border border-[#a48a61]/30 px-6 py-12 sm:px-10"><h3 className="font-serif text-2xl">Uma seleção em preparação.</h3><p className="mt-3 max-w-lg text-sm leading-7 text-black/60">Estamos a preparar esta coleção. Partilhe connosco o que procura e acompanhamo-lo numa pesquisa privada.</p><a href="#pedido" className="mt-6 inline-flex items-center gap-3 text-sm text-[#80663c]">Iniciar a minha procura <ArrowRight className="size-4"/></a></div>}</section>
      <section id="pedido" className="bg-[#112331] px-5 py-16 text-[#f4f0e8] sm:px-8 md:py-24"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 md:gap-20"><div><p className="text-[10px] font-semibold tracking-[.22em] text-[#d1b784]">PESQUISA PRIVADA</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight sm:text-5xl">O seu próximo lugar começa numa conversa.</h2><p className="mt-5 max-w-md text-sm leading-7 text-white/65">Diga-nos o que o inspira em {collection.label.toLowerCase()}. Procuramos consigo a propriedade certa.</p></div><SignatureLeadForm kind="private" collectionLabel={collection.label}/></div></section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8c734c]">OUTRAS FORMAS DE VIVER</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{SIGNATURE_COLLECTIONS.filter(c => c.slug !== collection.slug).map(c => <Link key={c.slug} href={`/signature/colecoes/${c.slug}`} className="flex min-h-20 items-center justify-between gap-4 border border-[#a48a61]/30 p-5 font-serif text-xl transition hover:bg-white/50">{c.label}<ArrowRight className="size-4 shrink-0"/></Link>)}</div></section>
    </main><SiteFooter/>
  </div>;
}
