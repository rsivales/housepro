import type { Metadata } from "next";
import { BadgeCheck, Camera, LineChart, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentField } from "@/components/forms/consent-field";

export const metadata: Metadata = {
  title: "Vender e avaliar",
  description:
    "Avaliação gratuita e plano de venda com a HousePro. Saiba quanto vale a sua casa.",
};

const steps = [
  { icon: LineChart, title: "Avaliação de mercado", desc: "Análise do valor real com base em vendas comparáveis." },
  { icon: Camera, title: "Marketing profissional", desc: "Fotografia, vídeo e divulgação nos principais portais." },
  { icon: BadgeCheck, title: "Acompanhamento", desc: "Visitas, negociação e apoio até à escritura." },
];

export default function VenderPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-gold" /> Gratuito e sem compromisso
              </span>
              <h1 className="mt-4 font-display text-4xl sm:text-5xl">
                Quanto vale a sua casa?
              </h1>
              <p className="mt-4 max-w-md text-lg text-muted-foreground">
                Peça uma avaliação gratuita. Um consultor HousePro analisa o seu
                imóvel e apresenta um plano de venda com o valor de mercado atual.
              </p>
              <ul className="mt-8 space-y-4">
                {steps.map((s) => (
                  <li key={s.title} className="flex gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <s.icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div id="contacto" className="scroll-mt-24 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-xl">Pedir avaliação gratuita</h2>
              <form className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" placeholder="O seu nome" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contacto-input">Contacto</Label>
                    <Input id="contacto-input" placeholder="Telemóvel ou email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="morada">Morada do imóvel</Label>
                  <Input id="morada" placeholder="Rua, concelho" />
                </div>
                <ConsentField />
                <Button variant="brand" size="lg" className="w-full">
                  Pedir avaliação gratuita
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
