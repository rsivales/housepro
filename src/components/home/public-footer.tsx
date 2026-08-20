import Link from "next/link";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

import { Logo } from "@/components/brand/logo";

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
              Comprar, vender ou investir — com paixão pelo que fazemos.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Phone className="size-4" /> +351 000 000 000</li>
              <li className="flex items-center gap-2"><Mail className="size-4" /> ola@housepro.pt</li>
              <li className="flex items-center gap-2"><MapPin className="size-4" /> Algarve · Lisboa · Porto</li>
              <li className="flex items-center gap-2"><Globe className="size-4" /> Português</li>
            </ul>
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
