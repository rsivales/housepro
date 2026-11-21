import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, FileText, HelpCircle, Home, Landmark, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/home/public-header";
import { PublicFooter } from "@/components/home/public-footer";
import { ImtCalculator } from "@/components/tools/imt-calculator";
import { site } from "@/lib/site";

const path = "/ferramentas/imt";
const description = "Calcule o IMT e o Imposto do Selo na compra de casa em Portugal. Simule habitação própria, segunda habitação e IMT Jovem com tabelas de 2023 a 2026. Veja exemplos e saiba obter as guias oficiais.";
export const metadata: Metadata = {
  title: "Calculadora de IMT 2026 e Imposto do Selo",
  description,
  keywords: ["calculadora IMT 2026", "simulador IMT", "imposto do selo compra casa", "IMT jovem 2026", "IMT segunda habitação", "quanto pago de IMT"],
  alternates: { canonical: path },
  openGraph: { title: "Quanto vou pagar de IMT e Imposto do Selo? | HousePro", description, url: path, type: "website", locale: "pt_PT" },
  twitter: { card: "summary", title: "Calculadora de IMT e Imposto do Selo | HousePro", description },
};
const faq = [
  { q: "O que é o IMT e quem o paga?", a: "O Imposto Municipal sobre as Transmissões Onerosas de Imóveis é devido, em regra, pelo comprador. Na aquisição de habitação, os escalões dependem da finalidade, da localização e do ano da compra." },
  { q: "O IMT incide sobre o preço ou sobre o VPT?", a: "Em regra, usa-se o maior dos dois valores: o preço da escritura ou o Valor Patrimonial Tributário (VPT). Se não souber o VPT, procure a caderneta predial. Casos especiais podem ter regras próprias." },
  { q: "Quanto é o Imposto do Selo na compra de casa?", a: "Na aquisição onerosa, a verba 1.1 é de 0,8% da base tributável. Se existir financiamento, o empréstimo pode ter um Imposto do Selo separado, que a calculadora mostra noutra linha." },
  { q: "Como funciona o IMT Jovem?", a: "A isenção pode aplicar-se à primeira aquisição de habitação própria e permanente por compradores elegíveis até aos 35 anos. Começou em 1 de agosto de 2024; os limites mudam por ano e outros requisitos têm de ser confirmados nas Finanças." },
  { q: "Quando e onde se pagam os impostos?", a: "A declaração Modelo 1 de IMT é entregue antes da escritura no Portal das Finanças. Após a submissão, são emitidas as guias. Leve os comprovativos de pagamento ou isenção para a escritura." },
  { q: "Onde encontro o IMT e Selo que paguei numa compra antiga?", a: "Consulte a escritura e as guias da aquisição. No Portal das Finanças, procure a declaração Modelo 1 de IMT em Consultar declaração e obtenha o comprovativo. Se não o encontrar, recorra ao e-balcão ou ao profissional que acompanhou a escritura." },
  { q: "Posso calcular o IMT de uma compra anterior a 2023?", a: "Esta calculadora inclui as tabelas de 2023 a 2026. Para anos anteriores ou regimes especiais, confirme o montante na liquidação original. Aplicar a tabela atual a uma compra antiga daria um resultado errado." },
  { q: "A simulação inclui escritura, registos e outros custos?", a: "Não. O total mostra IMT, Selo da aquisição e, se escolher, Selo do crédito. Emolumentos, registos e outras despesas devem ser pedidos separadamente." },
];
const taxCards = [
  { icon: Home, title: "1. IMT", text: "Depende do maior valor entre preço e VPT, da finalidade da compra, da localização e do ano. Habitação própria e segunda habitação têm escalões diferentes." },
  { icon: Landmark, title: "2. Selo da aquisição", text: "Em regra, corresponde a 0,8% da base tributável da aquisição. É apresentado separadamente do IMT." },
  { icon: FileText, title: "3. Selo do crédito", text: "Se usar financiamento, o empréstimo pode gerar outro Imposto do Selo. Ative essa parcela e indique o montante e o prazo." },
];

export default function CalculadoraImtPage() {
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: "Calculadora de IMT e Imposto do Selo HousePro", applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "pt-PT", url: `${site.url}${path}`, description, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, provider: { "@type": "Organization", name: site.brand, url: site.url } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: site.url },
      { "@type": "ListItem", position: 2, name: "Comprar casa", item: `${site.url}/imoveis` },
      { "@type": "ListItem", position: 3, name: "Calculadora de IMT", item: `${site.url}${path}` },
    ] },
  ];
  return (
    <div className="hp min-h-dvh bg-[#f5f7fa] text-[#0b1f3a]">
      <PublicHeader solid />
      <main>
        <section className="relative isolate overflow-hidden bg-[#0b1f3a] text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_22%,rgba(42,99,142,.43),transparent_36%),linear-gradient(135deg,#0b1f3a_22%,#122d4b_100%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-28 pt-14 sm:px-6 sm:pb-32 sm:pt-20 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <nav aria-label="Percurso" className="mb-8 flex flex-wrap items-center gap-2 text-xs text-white/65"><Link href="/" className="hover:text-white">Início</Link><span>/</span><Link href="/imoveis?operacao=comprar" className="hover:text-white">Comprar casa</Link><span>/</span><span className="text-white">IMT e Imposto do Selo</span></nav>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff8188]">Ferramentas HousePro · Compra de casa</p>
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.65rem]">Calculadora de IMT e <span className="text-[#ff8188]">Imposto do Selo</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">Saiba quanto pode pagar ao comprar casa. Introduza o preço, escolha a finalidade e veja os impostos discriminados, sem sair da página.</p>
              <div className="mt-8 flex flex-wrap gap-3"><a href="#calcular-imt" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#d62832] px-6 text-sm font-bold text-white shadow-lg shadow-black/20 hover:bg-[#b71d26]">Fazer a simulação <ArrowDown className="size-4" /></a><a href="#guia-imt" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">Perceber os impostos <ArrowRight className="size-4" /></a></div>
              <p className="mt-5 text-xs text-white/60">Gratuito · Tabelas de 2023 a 2026 · Sem registo</p>
            </div>
            <div className="relative hidden min-h-[330px] items-center justify-center lg:flex" aria-hidden><div className="absolute size-[320px] rounded-full border border-white/10" /><div className="absolute size-[245px] rounded-full border border-white/10" /><Image src="/brand/housepro-designer-mark.png" alt="" width={225} height={278} className="relative h-[260px] w-auto object-contain drop-shadow-[0_28px_36px_rgba(0,0,0,.22)]" /><span className="absolute bottom-2 right-0 border-t border-[#ff8188]/65 pt-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/70">HousePro · Paixão pelo que fazemos</span></div>
          </div>
        </section>
        <section id="calcular-imt" aria-labelledby="calculadora-titulo" className="relative z-10 mx-auto -mt-16 max-w-6xl scroll-mt-20 px-4 sm:px-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 text-white"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff8188]">Simulação imediata</p><h2 id="calculadora-titulo" className="mt-1 font-display text-2xl sm:text-3xl">Faça as contas à sua compra</h2></div><p className="text-sm text-white/65">Resultado atualizado à medida que preenche.</p></div>
          <ImtCalculator />
        </section>
        <section id="guia-imt" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d62832]">Guia claro</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Que impostos paga ao comprar casa?</h2><p className="mt-4 leading-relaxed text-[#596579]">O preço não é o único valor a preparar para a escritura. O IMT e o Imposto do Selo têm bases e regras diferentes; a simulação separa cada parcela.</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{taxCards.map(c=><article key={c.title} className="rounded-2xl border border-[#e5eaf1] bg-white p-6 shadow-[0_16px_40px_-32px_rgba(11,31,58,.4)]"><span className="grid size-11 place-items-center rounded-xl bg-[#eaf1f7] text-[#0b1f3a]"><c.icon className="size-5" /></span><h3 className="mt-5 font-display text-lg">{c.title}</h3><p className="mt-2 text-sm leading-relaxed text-[#596579]">{c.text}</p></article>)}</div>
          <div className="mt-6 rounded-2xl border-l-4 border-[#d62832] bg-white p-6 text-sm leading-relaxed text-[#34445a]"><strong>Exemplo para 2026:</strong> uma habitação própria no Continente comprada por 250 000 €, com VPT igual ou inferior ao preço e sem isenções especiais, resulta em cerca de <strong>7 042 € de IMT</strong> e <strong>2 000 € de Selo da aquisição</strong>. O valor final depende da liquidação oficial.</div>
        </section>
        <section className="bg-white py-16 sm:py-20"><div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[.85fr_1.15fr]"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d62832]">Antes da escritura</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Onde obter as guias e os comprovativos?</h2><p className="mt-4 text-sm leading-relaxed text-[#596579]">A simulação ajuda a preparar o orçamento. Os valores oficiais são emitidos pela Autoridade Tributária.</p></div><ol className="space-y-6">
          <li className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b1f3a] text-sm font-bold text-white">1</span><div><h3 className="font-semibold">Confirme os dados do imóvel</h3><p className="mt-1 text-sm leading-relaxed text-[#596579]">Tenha à mão o preço, a caderneta predial com o VPT e a finalidade da compra.</p></div></li>
          <li className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b1f3a] text-sm font-bold text-white">2</span><div><h3 className="font-semibold">Entregue a declaração Modelo 1 de IMT</h3><p className="mt-1 text-sm leading-relaxed text-[#596579]">No <a className="font-semibold text-[#0d3b66] underline underline-offset-2" href="https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Compra_da_casa/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">Portal das Finanças</a>, siga as instruções para entregar a declaração e emitir as guias de IMT e Selo.</p></div></li>
          <li className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0b1f3a] text-sm font-bold text-white">3</span><div><h3 className="font-semibold">Guarde os comprovativos</h3><p className="mt-1 text-sm leading-relaxed text-[#596579]">Leve os documentos de pagamento ou isenção à escritura. Para compras passadas, a AT explica como <a className="font-semibold text-[#0d3b66] underline underline-offset-2" href="https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Certidoes_e_comprovativos/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">obter o comprovativo da declaração</a>.</p></div></li>
        </ol></div></section>
        <section id="faq-imt" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#d62832]">Perguntas frequentes</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">IMT e Imposto do Selo, sem dúvidas</h2><div className="mt-7 divide-y divide-[#e5eaf1] overflow-hidden rounded-2xl border border-[#e5eaf1] bg-white">{faq.map(f=><details key={f.q} className="group px-5 py-5 sm:px-7"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold"><span className="flex items-center gap-3"><HelpCircle className="size-4 shrink-0 text-[#d62832]" />{f.q}</span><span aria-hidden className="text-xl font-normal text-[#d62832] group-open:rotate-45">+</span></summary><p className="mt-3 max-w-2xl pl-7 text-sm leading-relaxed text-[#596579]">{f.a}</p></details>)}</div></section>
        <section className="px-4 pb-16 sm:px-6"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 rounded-2xl bg-[#0b1f3a] px-6 py-9 text-white sm:px-10 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff8188]">O próximo passo</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">À procura da casa certa?</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">Explore os imóveis disponíveis e prepare o financiamento com as contas claras desde o início.</p></div><div className="flex flex-wrap gap-3"><Link href="/imoveis?operacao=comprar" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d62832] px-5 text-sm font-bold text-white hover:bg-[#b71d26]">Ver imóveis <ArrowRight className="size-4" /></Link><Link href="/credito" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/30 px-5 text-sm font-semibold hover:bg-white/10">Simular crédito</Link></div></div></section>
        <div className="mx-auto max-w-4xl px-4 pb-12 text-xs leading-relaxed text-[#667085] sm:px-6"><p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><span><strong>Estimativa indicativa.</strong> Baseada nas tabelas da AT para 2023–2026 (Ofícios-Circulados 40120/2023, 40123/2024, 40128/2025 e 40129/2026). Não substitui a liquidação oficial nem inclui escritura, registos ou outros encargos. Confirme benefícios e casos especiais com a AT ou um profissional.</span></p></div>
      </main>
      <PublicFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
