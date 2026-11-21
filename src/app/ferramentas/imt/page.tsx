import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Check, HelpCircle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";
import { ImtCalculator } from "@/components/tools/imt-calculator";

export const metadata: Metadata = {
  title: "Calculadora de IMT e Imposto do Selo | HousePro",
  description:
    "Calcule o IMT e o Imposto do Selo na compra de casa. Tabelas da Autoridade Tributária de 2023 a 2026, IMT Jovem e ajuda de um consultor.",
  keywords: [
    "calculadora IMT",
    "IMT 2026",
    "imposto de selo",
    "IMT jovem",
    "comprar casa impostos",
    "IMT continente",
    "simulador IMT",
  ],
  alternates: { canonical: "/ferramentas/imt" },
  openGraph: {
    title: "Calculadora de IMT e Imposto do Selo · HousePro",
    description:
      "Quanto vai pagar de impostos ao comprar casa? Simule com tabelas de 2023 a 2026 e esclareça dúvidas com um consultor.",
    type: "article",
  },
};

const faq = [
  {
    q: "O que é o IMT?",
    a: "O Imposto Municipal sobre as Transmissões Onerosas de Imóveis (IMT) é pago por quem compra um imóvel em Portugal. É apurado escalão a escalão sobre a base tributável — o maior valor entre o preço da escritura e o Valor Patrimonial Tributário (VPT).",
  },
  {
    q: "Como funciona o IMT Jovem?",
    a: "Compradores até 35 anos, na aquisição da primeira habitação própria e permanente, podem beneficiar de isenção total de IMT e Imposto de Selo até um determinado valor, e de isenção parcial num segundo escalão. Acima desses limites aplica-se a tabela normal.",
  },
  {
    q: "Quando se paga o IMT e o Imposto de Selo?",
    a: "Ambos os impostos têm de ser liquidados antes da escritura. O notário exige o comprovativo de pagamento para realizar a escritura de compra e venda.",
  },
  {
    q: "A calculadora inclui todos os custos da compra?",
    a: "Não. A ferramenta calcula o IMT e o Imposto de Selo. Não inclui custos de escritura, registo predial e outros encargos, que variam caso a caso. É uma estimativa e não substitui a liquidação oficial nas Finanças.",
  },
  { q: "Onde vejo quanto paguei numa compra antiga?", a: "Procure as guias e comprovativos do IMT e do Imposto do Selo junto da escritura. No Portal das Finanças, aceda a IMT, consulte a declaração Modelo 1 e obtenha ou imprima o comprovativo. Se não encontrar, peça ajuda pelo e-balcão ou ao profissional que realizou a escritura." },
  { q: "Posso usar a tabela de hoje para uma casa que comprei há anos?", a: "Não. Os escalões mudaram. A calculadora cobre compras entre 2023 e 2026. Para outros anos, use os comprovativos da liquidação original; não estime o imposto antigo com a tabela atual." },
  { q: "O Imposto do Selo da compra é igual ao do empréstimo?", a: "Não. A aquisição tem Imposto do Selo próprio, calculado sobre a base tributável. Se houve crédito, poderá existir outro Imposto do Selo sobre o financiamento. Os valores são apresentados em linhas separadas." },
];

export default function CalculadoraImtPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <FadeIn>
              <p className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                <Calculator className="size-3.5 text-primary" /> Ferramenta grátis · Tabelas 2023–2026
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] sm:text-5xl">
                Calculadora de IMT e Imposto de Selo
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
                Descubra quanto vai pagar de impostos ao comprar casa em Portugal.
                Escolha o ano da compra, a finalidade e a localização do imóvel.
                Veja o IMT, o Imposto do Selo da aquisição e, se aplicável, do crédito.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Calculadora */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <ImtCalculator />
        </section>

        {/* Como funciona */}
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl">Como se calcula o IMT</h2>
          <div className="mt-4 space-y-4 text-pretty leading-relaxed text-foreground/90">
            <p>
              O IMT é apurado <strong>escalão a escalão</strong> sobre a base
              tributável — o maior valor entre o preço de escritura e o Valor
              Patrimonial Tributário (VPT). Cada fatia do valor é tributada à taxa
              do seu escalão; nos dois escalões superiores aplica-se uma taxa única
              sobre o valor total.
            </p>
            <p>
              O <strong>Imposto de Selo</strong> é de 0,8% sobre o valor da
              aquisição. Se houver crédito à habitação, acresce 0,6% (prazo igual
              ou superior a 5 anos) ou 0,5% (prazo inferior a 5 anos) sobre o
              montante financiado.
            </p>
            <ul className="space-y-2">
              {[
                "Habitação própria e permanente tem escalões com isenção inicial.",
                "2.ª habitação e investimento pagam IMT desde o 1.º euro.",
                "Terrenos e prédios urbanos não habitacionais: taxa única de 6,5%.",
                "Prédios rústicos: taxa única de 5%.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl">Como obter os valores oficiais</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 text-sm leading-relaxed">
            <li>Confirme o preço da escritura e o VPT que constava da caderneta predial à data da compra.</li>
            <li>No <a className="underline" href="https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Compra_da_casa/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">Portal das Finanças: compra da casa</a>, consulte a declaração Modelo 1 de IMT e as guias de IMT e Selo. Para uma compra passada, procure também a escritura ou os recibos do notário/solicitador.</li>
            <li>Se faltar um comprovativo, veja as <a className="underline" href="https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Certidoes_e_comprovativos/Paginas/default.aspx" target="_blank" rel="noopener noreferrer">instruções da AT para obter e imprimir a declaração</a> ou peça apoio no e-balcão.</li>
          </ol>
          <p className="mt-4 rounded-xl border bg-secondary/40 p-4 text-sm">Comprou antes de 2023 ou teve isenção especial, permuta, compropriedade ou outra situação fora de uma compra simples? Use os valores da liquidação original e <a href="#duvidas-imt" className="font-semibold underline">peça esclarecimento</a>.</p>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl">Perguntas frequentes</h2>
          <div className="mt-5 divide-y rounded-2xl border bg-card">
            {faq.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="size-4 text-primary" /> {f.q}
                  </span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA lead */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary to-primary/80 px-6 py-10 text-primary-foreground sm:px-12 sm:py-12">
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl">
                  Vai comprar casa? Nós tratamos de tudo.
                </h2>
                <p className="mt-2 max-w-xl text-primary-foreground/85">
                  Um consultor HousePro ajuda-o a encontrar o imóvel certo, a
                  simular o crédito e a preparar toda a documentação — do primeiro
                  clique à escritura.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/imoveis"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-3 text-sm font-medium text-foreground transition-transform hover:scale-[1.02]"
                >
                  Ver imóveis <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/credito"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10"
                >
                  Simular crédito habitação
                </Link>
              </div>
            </div>
          </div>
        </section>

        <p className="mx-auto max-w-3xl px-4 pb-12 text-xs leading-relaxed text-muted-foreground sm:px-6">
          Tabelas da AT dos anos 2023 a 2026 (Ofícios-Circulados n.º 40120/2023,
          40123/2024, 40128/2025 e 40129/2026). Esta ferramenta dá
          uma <strong className="text-foreground">estimativa</strong> e não
          substitui a liquidação oficial nas Finanças nem o aconselhamento de um
          profissional. Não inclui custos de escritura, registo predial e outros
          encargos, que variam caso a caso.
        </p>
      </main>
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  );
}
