import Link from "next/link";

import { Logo } from "@/components/brand/logo";

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
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
              links={[
                { label: "Comprar", href: "/imoveis?operacao=comprar" },
                { label: "Arrendar", href: "/imoveis?operacao=arrendar" },
                { label: "Vender", href: "/vender" },
                { label: "Investir", href: "/investir" },
              ]}
            />
            <FooterCol
              title="HousePro"
              links={[
                { label: "Crédito habitação", href: "/credito" },
                { label: "Avaliação", href: "/vender" },
                { label: "Indicar um amigo", href: "/indicar" },
                { label: "Notícias", href: "/#noticias" },
                { label: "Contactos", href: "/#agentes" },
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                { label: "Privacidade (RGPD)", href: "/privacidade" },
                { label: "Termos", href: "/privacidade" },
                { label: "Livro de reclamações", href: "https://www.livroreclamacoes.pt" },
              ]}
            />
          </div>
        </div>

        <div className="mt-10 space-y-1 border-t pt-6 text-xs text-muted-foreground">
          <div className="flex flex-col justify-between gap-2 sm:flex-row">
            <p>© {new Date().getFullYear()} HousePro. Todos os direitos reservados.</p>
            <p>www.housepro.pt · AMI 0000</p>
          </div>
          <p>
            Chamadas para os números dos consultores: chamada para rede móvel
            nacional. Tratamos os seus dados nos termos da Política de
            Privacidade (RGPD).
          </p>
        </div>
      </div>
    </footer>
  );
}
