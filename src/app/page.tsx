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
import { SiteFooter } from "@/components/layout/site-footer";
import { CreditBanner } from "@/components/layout/credit-banner";
import { SearchBar } from "@/components/property/search-bar";
import { PropertyCard } from "@/components/property/property-card";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { ConsentField } from "@/components/forms/consent-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { featuredProperties, agents } from "@/lib/data/mock";
import { topFeatured } from "@/lib/data/ranking";
import { getNews } from "@/lib/data/news";

const stats = [
  { icon: Building2, value: "1.200+", label: "Imóveis angariados" },
  { icon: MapPin, value: "18", label: "Concelhos" },
  { icon: BadgeCheck, value: "40", label: "Consultores dedicados" },
  { icon: TrendingUp, value: "98%", label: "Clientes satisfeitos" },
];

export default async function Home() {
  const news = await getNews(6);
  const destaques = topFeatured(3);
  const destaqueIds = new Set(destaques.map((p) => p.id));
  const restantes = featuredProperties.filter((p) => !destaqueIds.has(p.id));

  return (
    <div id="top" className="min-h-dvh bg-background">
      <CreditBanner />
      <SiteHeader />

      <main>
        {/* Hero — banner outdoor */}
        <section className="relative">
          <div className="relative h-[86vh] min-h-[560px] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/properties/coastal-banner.svg"
              alt="Imóveis com vista mar no Algarve"
              className="absolute inset-0 size-full object-cover motion-safe:animate-kenburns"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
              <FadeIn>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  <Sparkles className="size-3.5 text-gold" />
                  Imobiliária · Algarve · Lisboa · Porto
                </span>
              </FadeIn>
              <FadeIn delay={0.05}>
                <h1 className="mt-5 max-w-2xl text-balance font-display text-5xl leading-[1.02] text-white drop-shadow-md sm:text-6xl lg:text-7xl">
                  A casa certa,{" "}
                  <span className="text-gold">bem acompanhada</span>.
                </h1>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="mt-5 max-w-lg text-pretty text-lg text-white/85">
                  Comprar, arrendar, vender ou investir — com consultores que
                  tratam de tudo por si, do primeiro clique à escritura.
                </p>
              </FadeIn>
              <FadeIn delay={0.15}>
                <SearchBar className="mt-8 max-w-2xl" />
              </FadeIn>
            </div>
          </div>
        </section>

        {/* Preview de destaques (top 3 por algoritmo) */}
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <FadeIn>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">Em destaque</p>
                <h2 className="mt-1 font-display text-3xl sm:text-4xl">
                  Os imóveis do momento
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">
                Ordenados por procura, novidade e preço
              </span>
            </div>
          </FadeIn>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((property, i) => (
              <FadeIn key={property.id} delay={i * 0.08}>
                <PropertyCard property={property} />
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-16 border-y bg-secondary/40 sm:mt-20">
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

        {/* Restantes imóveis */}
        <section id="imoveis" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">Selecionados</p>
                  <h2 className="mt-1 font-display text-3xl sm:text-4xl">
                    Mais imóveis para si
                  </h2>
                </div>
                <Button variant="outline" asChild>
                  <a href="/imoveis">
                    Ver todos os imóveis <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>
            </FadeIn>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {restantes.map((property, i) => (
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
                  <div className="mt-4">
                    <ConsentField />
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
            <p className="mt-6 text-center">
              <PhoneNote />
            </p>
          </div>
        </section>

        {/* Notícias — feed próprio */}
        <section id="noticias" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <FadeIn>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">
                    Feed automático · mundo imobiliário
                  </p>
                  <h2 className="mt-1 font-display text-3xl sm:text-4xl">
                    Notícias, mercado & investimento
                  </h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  Legislação · mercado · investimento · dicas · eventos
                </span>
              </div>
            </FadeIn>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {news.map((item, i) => (
                <FadeIn key={item.id} delay={(i % 3) * 0.08}>
                  <a
                    href={item.url}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <div className={`relative aspect-[16/10] bg-gradient-to-br ${item.tint}`}>
                      <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{item.source}</span>
                        <span>·</span>
                        <span>
                          {new Date(item.date).toLocaleDateString("pt-PT", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-lg leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {item.excerpt}
                      </p>
                      <span className="mt-auto pt-4 text-sm font-medium text-primary">
                        Ler artigo →
                      </span>
                    </div>
                  </a>
                </FadeIn>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Conteúdos agregados automaticamente de fontes do setor — sem
              necessidade de redação manual.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
