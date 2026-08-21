import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { site, fullAddress } from "@/lib/site";

const SOCIAL: { label: string; href: string; path: string }[] = [
  { label: "Instagram", href: site.social.instagram, path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.2 8.8 2.2 12 2.2Zm0 3.05A6.75 6.75 0 1 0 18.75 12 6.75 6.75 0 0 0 12 5.25Zm0 11.13A4.38 4.38 0 1 1 16.38 12 4.38 4.38 0 0 1 12 16.38Zm6.96-11.4a1.58 1.58 0 1 1-1.58-1.58 1.58 1.58 0 0 1 1.58 1.58Z" },
  { label: "Facebook", href: site.social.facebook, path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" },
  { label: "LinkedIn", href: site.social.linkedin, path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" },
];

/** Rodapé compacto da Clínica de Finanças. */
export function ClinicaFooter() {
  const legal = [
    { label: "Privacidade", href: "/privacidade" },
    { label: "Termos", href: "/privacidade" },
    { label: "Contactos", href: `mailto:${site.email.general}` },
    { label: "Livro de reclamações", href: site.livroReclamacoes },
  ];
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--hp-navy)" }}>Clínica de Finanças</p>
            <p className="text-xs text-muted-foreground">Simuladores e informação imobiliária</p>
            <p className="mt-2 text-sm text-muted-foreground">{site.legalName} · AMI {site.amiLicense}</p>
            <p className="text-sm text-muted-foreground">{fullAddress}</p>
          </div>
          <div className="flex items-center gap-2">
            {SOCIAL.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-full border text-muted-foreground transition-colors hover:text-foreground" style={{ borderColor: "var(--border)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--border)" }}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {legal.map((l) => {
              const external = /^https?:|^mailto:/i.test(l.href);
              return <li key={l.label}><Link href={l.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="hover:text-foreground">{l.label}</Link></li>;
            })}
          </ul>
          <p>© {new Date().getFullYear()} {site.brand} · {site.legalName}</p>
        </div>
      </div>
    </footer>
  );
}
