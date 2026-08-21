import Link from "next/link";
import { Images, Clapperboard, Briefcase, Newspaper, ShieldCheck, ExternalLink, ChevronRight, Globe } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";

/**
 * Hub de gestão do website público (homepage). Reúne os elementos geríveis —
 * banners, histórias reais (com consentimento), vagas e imagens de artigos.
 * Não é um segundo admin: vive dentro do painel de gestão existente.
 */
const CARDS = [
  { href: "/admin/website/banners", icon: Images, title: "Banners do hero", note: "Imagem, título, botões, prioridade, datas e ativação" },
  { href: "/admin/website/historias", icon: Clapperboard, title: "Histórias reais", note: "Registo de consentimento · só publica com autorização" },
  { href: "/admin/website/vagas", icon: Briefcase, title: "Vagas (carreiras)", note: "Criar, editar, ativar/desativar oportunidades" },
  { href: "/admin/website/artigos", icon: Newspaper, title: "Imagens de artigos", note: "Definir a imagem de destaque de cada artigo do Guia" },
];

export default function AdminWebsitePage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Globe className="size-4" /> Website público · Homepage
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Gestão do website</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Faça a gestão dos conteúdos da homepage pública. No protótipo, as
          alterações ficam guardadas neste navegador (pré-visualização); ao ligar
          o Supabase, passam a ser publicadas para todos os visitantes.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <Link key={c.href} href={c.href} className="group rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </div>
              <p className="mt-3 flex items-center gap-1 font-medium">{c.title} <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></p>
              <p className="text-xs text-muted-foreground">{c.note}</p>
            </Link>
          ))}
        </section>

        <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-700">
            <ShieldCheck className="size-4" /> Selos de confiança
          </p>
          <p className="mt-1 text-muted-foreground">
            A secção “Confiança reconhecida” mostra apenas distinções reais e verificáveis. O selo
            DECO PROteste <strong>não</strong> é apresentado enquanto não houver atribuição e
            autorização oficiais (nem selo, nem nome, nem placeholder público). Novos selos só devem
            ser ativados após aprovação, ficheiro, validade e link de verificação.
          </p>
        </div>

        <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          Ver a homepage <ExternalLink className="size-3.5" />
        </Link>
      </main>
    </div>
  );
}
