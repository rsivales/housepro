"use client";

import * as React from "react";
import { X, ExternalLink } from "lucide-react";

import { FISCAL_YEAR, LAST_REVIEWED, ENGINE_VERSION, SOURCES } from "@/lib/tools/mais-valias-fiscal";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--card)] p-6 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button>
        </div>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

export function MethodologyLink({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] hover:underline"}>
        Consultar metodologia e fontes <ExternalLink className="size-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Metodologia e fontes">
        <p><strong className="text-foreground">Fórmula geral:</strong> mais-valia = valor de realização (venda) − (valor de aquisição × coeficiente de desvalorização) − despesas e encargos elegíveis.</p>
        <p>Para residentes, 50% da mais-valia é tributável (englobamento), sendo somada aos restantes rendimentos e tributada às taxas progressivas de IRS. A isenção por reinvestimento aplica-se à habitação própria e permanente, na proporção reinvestida.</p>
        <p><strong className="text-foreground">Ano fiscal:</strong> {FISCAL_YEAR} · <strong className="text-foreground">Última revisão:</strong> {LAST_REVIEWED} · <strong className="text-foreground">Versão do motor:</strong> {ENGINE_VERSION}</p>
        <div>
          <p className="font-medium text-foreground">Fontes oficiais</p>
          <ul className="mt-1 list-disc pl-5">{SOURCES.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <p className="text-xs">Os coeficientes de desvalorização devem ser confirmados com a Portaria em vigor. A estimativa é indicativa e não substitui a liquidação oficial da Autoridade Tributária.</p>
      </Modal>
    </>
  );
}

export function ConditionsLink({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hp-navy)] hover:underline"}>
        Ler condições da simulação <ExternalLink className="size-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Condições da simulação">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>A simulação é <strong className="text-foreground">meramente indicativa</strong> e depende exclusivamente dos dados fornecidos por si.</li>
          <li>As regras fiscais podem ser alteradas; a estimativa reflete o ano fiscal {FISCAL_YEAR} (revisão {LAST_REVIEWED}).</li>
          <li>Existem situações não contempladas (ex.: não residentes, regimes especiais) que exigem análise personalizada.</li>
          <li>O resultado <strong className="text-foreground">não substitui</strong> aconselhamento fiscal, contabilístico ou jurídico, nem constitui liquidação oficial da Autoridade Tributária.</li>
          <li>Não existe qualquer vínculo à Autoridade Tributária.</li>
          <li>A responsabilidade da HousePro limita-se, na medida permitida por lei, ao carácter informativo desta ferramenta.</li>
          <li><strong className="text-foreground">Dados:</strong> tratados para enviar o relatório e responder ao pedido, nos termos da Política de Privacidade (RGPD); o consentimento de marketing é separado e opcional.</li>
          <li><strong className="text-foreground">Retenção:</strong> os dados de contacto são mantidos enquanto necessários ao acompanhamento comercial; pode solicitar acesso ou eliminação a qualquer momento.</li>
          <li><strong className="text-foreground">Contacto:</strong> através dos canais indicados no rodapé.</li>
        </ul>
      </Modal>
    </>
  );
}
