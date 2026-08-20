import { BadgeCheck, ShieldCheck, Star, Landmark } from "lucide-react";

/**
 * "Confiança reconhecida" — apenas distinções REAIS e verificáveis.
 *
 * IMPORTANTE (constrangimento explícito): a HousePro ainda NÃO tem o selo
 * DECO PROteste. Por isso NÃO é aqui apresentado — nem selo, nem nome como
 * certificação, nem placeholder, nem logótipo, nem sugestão de atribuição.
 * Selos futuros só entram após aprovação/autorização oficial, ficheiro,
 * validade e link de verificação, com ativação manual no admin.
 *
 * Os itens abaixo são de natureza institucional/verificável (licença AMI e
 * enquadramento legal). O número de AMI é gerido no admin (Dados legais da
 * agência) — aqui usa-se o mesmo marcador do restante site até ser preenchido.
 */
const ITEMS = [
  { icon: BadgeCheck, title: "Licença AMI", note: "Mediação imobiliária autorizada · AMI 0000" },
  { icon: ShieldCheck, title: "RGPD", note: "Tratamento de dados conforme a lei" },
  { icon: Landmark, title: "Intermediação de crédito", note: "Apoio ao financiamento com rigor" },
  { icon: Star, title: "Avaliações de clientes", note: "Testemunhos reais e verificados" },
];

export function TrustBadges() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="text-center">
        <p className="hp-eyebrow">Confiança reconhecida</p>
        <h2 id="trust-title" className="mt-1 font-display text-2xl sm:text-3xl">
          Rigor que se comprova
        </h2>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-5 text-center shadow-sm">
            <span className="grid size-11 place-items-center rounded-full" style={{ background: "var(--secondary)", color: "var(--hp-navy)" }}>
              <it.icon className="size-5" />
            </span>
            <span className="font-display text-base">{it.title}</span>
            <span className="text-xs text-muted-foreground">{it.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
