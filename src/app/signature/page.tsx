import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AGENCY_INDEPENDENCE_NOTICE } from "@/lib/brand-disclaimer";
import { ArrowRight, Search } from "lucide-react";
import { SignatureLeadForm } from "@/components/signature/signature-lead-form";
import { SignatureTrack } from "@/components/signature/signature-track";
import { SignatureLogo } from "@/components/signature/signature-logo";
import { SignaturePropertyCard } from "@/components/signature/signature-property-card";
import { SignatureMenu } from "@/components/signature/signature-menu";
import { SIGNATURE_COLLECTIONS, getSignatureCollection } from "@/lib/signature/collections";
import { redirect } from "next/navigation";
import { listSignatureProperties } from "@/lib/db/repo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://housepro-chi.vercel.app";
export const metadata: Metadata = { title: "HousePro Signature — Uma coleção rara", description: "Uma seleção privada das propriedades mais extraordinárias de Portugal.", alternates: { canonical: `${siteUrl}/signature` } };
export const dynamic = "force-dynamic";

export default async function SignaturePage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const legacyTheme = getSignatureCollection((await searchParams).tema);
  if (legacyTheme) redirect(`/signature/colecoes/${legacyTheme.slug}`);
  const signatureProperties = await listSignatureProperties();
  const hasCollection = signatureProperties.length > 0;
  return <div className="min-h-dvh overflow-x-hidden bg-[#f4f0e8] text-[#171512]"><SignatureTrack /><main>
    <header className="bg-[#0d1725] text-[#f7f3eb]">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <Link href="/" aria-label="HousePro Signature"><SignatureLogo className="text-[#e8d3a3]" /></Link>
        <nav aria-label="Navegação Signature" className="hidden items-center gap-7 text-sm text-white/85 lg:flex">
          <a href="#colecao">Coleção</a><a href="#inspiracao">Destinos</a><Link href="/vender">Vender</Link><a href="#construcao">Construção por medida</a><a href="#pedido" className="border border-white/60 px-5 py-2.5">Pedido privado</a>
        </nav>
        <SignatureMenu />
      </div>
    </header>
    <section id="colecao" className="mx-auto max-w-[1500px] pb-14 md:px-10 md:pb-24">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 px-4 pb-5 pt-7 md:px-0 md:pb-8 md:pt-12">
        <h1 className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-none">Coleção Signature</h1>
        <Link href="/signature/apresentar" className="text-sm text-[#695331] underline underline-offset-4">Apresentar um imóvel</Link>
      </div>
      {hasCollection ? (
        <div className="grid min-w-0 gap-y-6 md:grid-cols-2 md:gap-x-6 md:gap-y-10">
          {signatureProperties.map((property, index) => <SignaturePropertyCard key={property.id} property={property} featured={index === 0} />)}
        </div>
      ) : (
        <div className="px-4 md:px-0">
          <div className="grid gap-3 md:grid-cols-12">
            <EditorialCard className="md:col-span-3 md:row-span-2 md:min-h-[500px]" title="Uma curadoria em preparação" label="PORTUGAL" />
            <EditorialCard className="md:col-span-9 md:min-h-[245px]" title="Uma coleção que começa pelo lugar" label="COLEÇÃO PRIVADA" />
            <EditorialCard className="md:col-span-5" title="Arquitetura com identidade" label="EM CURADORIA" />
            <EditorialCard className="md:col-span-4" title="Horizontes sem fim" label="EM CURADORIA" />
          </div>
          <p className="mt-4 text-xs leading-5 text-black/55">As imagens são editoriais. Os imóveis só passam a ser apresentados quando forem aprovados pela curadoria Signature.</p>
        </div>
      )}
    </section>
    <section id="construcao" className="relative overflow-hidden bg-[#e7e1d6] py-14 md:py-20"><Image src="/signature/editorial-construction.webp" alt="Arquitetura e construção por medida" fill sizes="100vw" className="object-cover object-center opacity-75"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,240,232,.96)_0%,rgba(244,240,232,.76)_48%,rgba(244,240,232,.15)_100%)]"/><div className="relative mx-auto grid max-w-[1500px] gap-10 px-5 md:grid-cols-[1fr_auto] md:px-10"><div className="max-w-lg"><p className="text-[10px] font-semibold tracking-[.22em] text-[#6e6559]">CONSTRUÇÃO POR MEDIDA</p><h2 className="mt-3 font-serif text-4xl leading-[.95] sm:text-6xl">Do terreno<br/>à casa irrepetível.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-black/65">Arquitetura, construção e acompanhamento reunidos num serviço privado.</p><Link href="/signature/construcao-por-medida" className="mt-7 inline-flex min-h-12 items-center gap-3 border border-[#9c7e48] px-5 text-xs font-semibold text-[#695331]">Criar o meu projeto <ArrowRight className="size-4" /></Link></div><ol className="grid content-center gap-3 text-sm text-[#322b22]">{["Terreno","Projeto","Licenciamento","Construção","Interiores e entrega"].map((step,index)=><li key={step} className="flex min-w-[260px] items-center gap-5 border-b border-black/20 py-3"><span className="font-serif text-lg text-[#8f7445]">{index+1}.</span>{step}</li>)}</ol></div></section>
    <section id="inspiracao" className="mx-auto max-w-[1500px] px-5 py-16 md:px-10 md:py-24"><p className="flex items-center gap-4 text-[10px] font-semibold tracking-[.22em] text-[#6e6559]">ENCONTRE PELO QUE O INSPIRA <span className="h-px w-14 bg-[#8e7d62]" /></p><h2 className="mt-3 max-w-xl font-serif text-4xl leading-[.94] sm:text-6xl">Quatro formas de<br/>viver o extraordinário.</h2><div className="mt-9 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">{SIGNATURE_COLLECTIONS.map(theme=><Link href={`/signature/colecoes/${theme.slug}`} key={theme.slug} className="group relative min-w-[78%] snap-start overflow-hidden bg-[#182330] md:min-w-0"><Image src={theme.image} alt="" width={900} height={600} className="aspect-[1.15/1] w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"/><div className="absolute inset-x-0 bottom-0 p-5 text-white"><h3 className="font-serif text-2xl leading-none">{theme.label}</h3><span className="mt-3 inline-block text-[11px]">Descobrir <ArrowRight className="ml-1 inline size-3" /></span></div></Link>)}</div></section>
    <section id="pedido" className="relative overflow-hidden bg-[#101a26] px-5 py-14 text-[#f5eee4] md:px-10 md:py-16"><Image src="/signature/editorial-coast-hero.webp" alt="" fill sizes="100vw" className="object-cover opacity-35"/><div className="absolute inset-0 bg-[#07101b]/65"/><div className="relative mx-auto grid max-w-[1500px] items-center gap-8 lg:grid-cols-[1fr_.8fr]"><div><p className="text-[10px] font-semibold tracking-[.22em] text-[#d8ba7d]">ACESSO PRIVADO</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">Não encontrou o que procura?</h2><p className="mt-3 max-w-lg text-sm text-white/75">Partilhe connosco o seu pedido. Procuramos dentro e fora do mercado.</p></div><SignatureLeadForm kind="private" /></div></section>
  </main><footer className="bg-[#090b0e] px-5 py-8 text-[#e8d3a3] md:px-10"><div className="mx-auto flex max-w-[1500px] items-center justify-between"><Link href="/" className="font-serif text-xl tracking-[.16em]">SIGNATURE</Link><span className="text-[10px] tracking-[.15em] text-white/45">HOUSEPRO · PROPRIEDADES ÚNICAS</span></div><p className="mx-auto mt-5 max-w-[1500px] text-xs leading-relaxed text-white/55">{AGENCY_INDEPENDENCE_NOTICE}</p></footer></div>;
}

function EditorialCard({ title, label, className }: { title: string; label: string; className: string }) { return <article className={`relative min-h-[245px] overflow-hidden bg-[#172231] ${className}`}><Image src="/signature/editorial-coast-hero.webp" alt="Imagem editorial HousePro Signature" fill sizes="(max-width:768px) 85vw, 50vw" className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10"/><div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="text-[10px] tracking-[.2em] text-white/70">{label}</p><h3 className="mt-2 max-w-xs font-serif text-2xl leading-tight">{title}</h3><span className="mt-4 inline-block text-xs">Descobrir <Search className="ml-1 inline size-3" /></span></div></article>; }
