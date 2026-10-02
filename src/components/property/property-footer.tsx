import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { site, fullAddress, legalLine } from "@/lib/site";

/**
 * Rodapé compacto Deep Navy da página de imóvel — não repete o menu completo
 * da homepage. Inclui os dados institucionais reais. O padding inferior deixa
 * espaço para a barra fixa do consultor não tapar o conteúdo.
 */
export function PropertyFooter() {
  return (
    <footer className="mt-16 bg-[var(--hp-navy)] text-white/85">
      <div className="mx-auto max-w-6xl px-4 py-10 pb-32 sm:px-6 lg:pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm font-medium text-white">{legalLine}</p>
            <p className="text-sm text-white/70">{fullAddress}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link href="/privacidade" className="text-white/80 hover:text-white">Privacidade</Link>
            <Link href="/privacidade" className="text-white/80 hover:text-white">Termos</Link>
            <Link href="/#contacto" className="text-white/80 hover:text-white">Contactos</Link>
            <a href="https://www.livroreclamacoes.pt/" target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white">
              Livro de reclamações
            </a>
          </nav>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-white/55">
          © {new Date().getFullYear()} {site.brand} · {site.legalName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
