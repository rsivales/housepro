import {
  ArrowRight,
  BadgeCheck,
  Building2,
  MapPin,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { FadeIn } from "@/components/motion/fade-in";
import { SiteHeader } from "@/components/layout/site-header";
import { SearchBar } from "@/components/property/search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { Logo } from "@/components/brand/logo";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { featuredProperties, agents } from "@/lib/data/mock";

const stats = [
  { icon: Building2, value: "1.200+", label: "Imóveis angariados" },
  { icon: MapPin, value: "18", label: "Concelhos" },
  { icon: BadgeCheck, value: "40", label: "Consultores dedicados" },
  { icon: TrendingUp, value: "98%", label: "Clientes satisfeitos" },
];

const news = [
  {
    tag: "Mercado",
    date: "12 Jul 2026",
    title: "Preços da habitação estabilizam no litoral em 2026",
    tint: "from-primary/15 to-primary/5",
  },
  {
    tag: "Guia",
    date: "3 Jul 2026",
    title: "Comprar casa com crédito: o passo a passo simplificado",
    tint: "from-gold/20 to-gold/5",
  },
  {
    tag: "HousePro",
    date: "28 Jun 2026",
    title: "Abrimos nova montra em Braga com equipa dedicada",
    tint: "from-chart-3/15 to-chart-3/5",
  },
];

export default function Home() {
  return (
    <div id="top" className="min-h-dvh bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* decorative blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 size-[420px] rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-40 size-[360px] rounded-full bg-gold/10 blur-3xl"
          />

          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-8">
            <div>
              <FadeIn>
                <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5 text-gold" />
                  Imobiliária de confiança em Portugal
                </span>
              </FadeIn>
              <FadeIn delay={0.05}>
                <h1 className="mt-5 text-balance font-display text-5xl leading-[1.05] sm:text-6xl">
                  A casa certa,{" "}
                  <span className="text-primary">bem acompanhada</span>.
                </h1>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="mt-5 max-w-md text-pretty text-lg text-muted-foreground">
                  Imóveis selecionados e consultores dedicados. Encontre, visite
                  e compre com quem trata de tudo por si — do primeiro clique à
                  escritura.
                </p>
              </FadeIn>
              <FadeIn delay={0.15}>
                <SearchBar className="mt-8 max-w-xl" />
              </FadeIn>
            </div>

            {/* Featured card as hero visual — the star */}
            <FadeIn delay={0.2} className="lg:pl-6">
              <div className="relative mx-auto max-w-sm">
                <div
                  aria-hidden
                  className="absolute -right-4 -top-4 hidden rounded-2xl border bg-card px-4 py-3 shadow-lg sm:block"
                >
                  <p className="text-xs text-muted-foreground">Avaliação média</p>
                  <p className="font-display text-lg">★ 4,9 / 5</p>
                </div>
                <PropertyCard property={featuredProperties[1]} />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-secondary/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.06}>
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm">
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-display text-2xl leading-none">{s.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Featured properties */}
        <section id="imoveis" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">Em destaque</p>
                  <h2 className="mt-1 font-display text-3xl sm:text-4xl">
                    Imóveis selecionados para si
                  </h2>
                </div>
                <Button variant="outline" asChild>
                  <a href="#imoveis">
                    Ver todos os imóveis <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </FadeIn>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.map((property, i) => (
                <FadeIn key={property.id} delay={(i % 3) * 0.08}>
                  <PropertyCard property={property} />
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Avaliação magnet */}
        <section id="avaliacao" className="scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
          <FadeIn>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary to-primary/80 px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-gold/25 blur-3xl"
              />
              <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    <Sparkles className="size-3.5" /> Gratuito e sem compromisso
                  </span>
                  <h2 className="mt-4 font-display text-3xl sm:text-4xl">
                    Quanto vale a sua casa?
                  </h2>
                  <p className="mt-3 max-w-md text-primary-foreground/80">
                    Peça uma avaliação gratuita. Um consultor HousePro analisa o
                    seu imóvel e apresenta-lhe o valor de mercado atual.
                  </p>
                </div>
                <form className="rounded-2xl bg-background p-5 text-foreground shadow-xl sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" placeholder="O seu nome" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contacto">Contacto</Label>
                      <Input id="contacto" placeholder="Telemóvel ou email" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="morada">Morada do imóvel</Label>
                      <Input id="morada" placeholder="Rua, concelho" />
                    </div>
                  </div>
                  <Button variant="brand" size="lg" className="mt-4 w-full">
                    Pedir avaliação gratuita <ArrowRight className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Agentes */}
        <section id="agentes" className="scroll-mt-20 border-t bg-secondary/40 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <div className="max-w-2xl">
                <p className="text-sm font-medium text-primary">A nossa equipa</p>
                <h2 className="mt-1 font-display text-3xl sm:text-4xl">
                  Consultores que tratam de tudo por si
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Fale diretamente com o consultor de cada imóvel por WhatsApp —
                  resposta rápida, acompanhamento próximo.
                </p>
              </div>
            </FadeIn>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {agents.map((agent, i) => (
                <FadeIn key={agent.id} delay={i * 0.06}>
                  <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-sm">
                    <AgentAvatar agent={agent} className="size-16 text-lg" />
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.role}</p>
                      <p className="text-xs text-muted-foreground">{agent.agency}</p>
                    </div>
                    <a
                      href={`https://wa.me/${agent.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105"
                    >
                      <WhatsappIcon className="size-4" /> WhatsApp
                    </a>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Notícias */}
        <section id="noticias" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-3xl sm:text-4xl">Notícias & guias</h2>
                <Button variant="ghost" asChild>
                  <a href="#noticias">
                    Ver todas <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </FadeIn>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {news.map((item, i) => (
                <FadeIn key={item.title} delay={i * 0.08}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg">
                    <div className={`aspect-[16/10] bg-gradient-to-br ${item.tint}`} />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                          {item.tag}
                        </span>
                        <span>{item.date}</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg leading-snug">
                        {item.title}
                      </h3>
                      <span className="mt-auto pt-4 text-sm font-medium text-primary">
                        Ler artigo →
                      </span>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm text-muted-foreground">
                Imóveis selecionados e consultores dedicados em todo o país.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <FooterCol
                title="Imóveis"
                links={["Comprar", "Arrendar", "Vender", "Avaliação"]}
              />
              <FooterCol
                title="HousePro"
                links={["Agências", "Consultores", "Notícias", "Contactos"]}
              />
              <FooterCol
                title="Legal"
                links={["Privacidade", "Termos", "Livro de reclamações"]}
              />
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} HousePro. Todos os direitos reservados.</p>
            <p>www.housepro.pt</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="transition-colors hover:text-foreground">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
