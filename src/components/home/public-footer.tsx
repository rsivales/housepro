import Link from "next/link";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const SOCIAL: { label: string; href: string; path: string }[] = [
  { label: "Instagram", href: "https://instagram.com/", path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.2 8.8 2.2 12 2.2Zm0 3.05A6.75 6.75 0 1 0 18.75 12 6.75 6.75 0 0 0 12 5.25Zm0 11.13A4.38 4.38 0 1 1 16.38 12 4.38 4.38 0 0 1 12 16.38Zm6.96-11.4a1.58 1.58 0 1 1-1.58-1.58 1.58 1.58 0 0 1 1.58 1.58Z" },
  { label: "Facebook", href: "https://facebook.com/", path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" },
  { label: "LinkedIn", href: "https://linkedin.com/", path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" },
];

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Imóveis",
    links: [
      { label: "Comprar", href: "/imoveis?operacao=comprar" },
      { label: "Arrendar", href: "/imoveis?operacao=arrendar" },
      { label: "Investir", href: "/investir" },
      { label: "Vender", href: "/vender" },
    ],
  },
  {
    title: "Apoio",
    links: [
      { label: "Ferramentas", href: "/ferramentas" },
      { label: "Guia HousePro", href: "/noticias" },
      { label: "Crédito", href: "/credito" },
      { label: "FAQ", href: "/ferramentas" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre nós", href: "/historias-reais" },
      { label: "Histórias reais", href: "/historias-reais" },
      { label: "Carreiras", href: "/carreiras" },
      { label: "Contactos", href: "/#contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacidade", href: "/privacidade" },
      { label: "Cookies", href: "/privacidade" },
      { label: "Termos", href: "/privacidade" },
      { label: "Livro de reclamações", href: "https://www.livroreclamacoes.pt/" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Paixão por casas. Foco nas pessoas.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="size-4" /> +351 000 000 000</li>
              <li className="flex items-center gap-2"><Mail className="size-4" /> ola@housepro.pt</li>
              <li className="flex items-center gap-2"><MapPin className="size-4" /> Algarve · Lisboa · Porto</li>
              <li className="flex items-center gap-2"><Globe className="size-4" /> Português</li>
            </ul>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid size-9 place-items-center rounded-full border text-muted-foreground transition-colors hover:text-foreground"
                  style={{ borderColor: "var(--border)" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden><path d={s.path} /></svg>
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <p className="font-medium">{col.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => {
                  const external = /^https?:\/\//i.test(l.href);
                  return (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} HousePro — Mediação Imobiliária · AMI 0000</p>
          <p>Resultados de ferramentas indicativos e sem valor contratual.</p>
        </div>
      </div>
    </footer>
  );
}
