import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Check, HelpCircle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FadeIn } from "@/components/motion/fade-in";
import { ImtCalculator } from "@/components/tools/imt-calculator";

export const metadata: Metadata = {
  title: "Calculadora de IMT e Imposto de Selo 2026",
  description:
    "Calcule o IMT e o Imposto de Selo na compra de casa em Portugal em 2026. Escalões oficiais, IMT Jovem (até 35 anos) e imposto de selo do crédito à habitação. Grátis.",
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
    title: "Calculadora de IMT e Imposto de Selo 2026 · HousePro",
    description:
      "Quanto vai pagar de impostos ao comprar casa? Escalões oficiais 2026, IMT Jovem e crédito à habitação.",
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
                <Calculator className="size-3.5 text-primary" /> Ferramenta grátis · Escalões 2026
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] sm:text-5xl">
                Calculadora de IMT e Imposto de Selo
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
                Descubra quanto vai pagar de impostos ao comprar casa em Portugal.
                Escalões oficiais em vigor em 2026, com IMT Jovem (compradores até
                35 anos) e o Imposto de Selo do crédito à habitação.
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
          <h2 className="font-display text-2xl sm:text-3xl">Como se calcula o IMT em 2026</h2>
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
          Valores conforme os escalões de IMT em vigor em 2026 (Ofício-Circulado
          n.º 40129/2026 da Autoridade Tributária, OE 2026). Esta ferramenta dá
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
