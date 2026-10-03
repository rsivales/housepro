"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Home, Loader2, Plus, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import { DEAL_STEPS, dealStageToStatus } from "@/lib/data/deal";
import type { DealListItem } from "@/lib/db/deals";
import { STATUS_LABEL } from "@/lib/data/status";
import type { PropertyStatus } from "@/lib/data/types";

const ORDER = DEAL_STEPS.map((s) => s.stage);
const ACCENT = ["bg-slate-400", "bg-sky-400", "bg-violet-400", "bg-amber-400", "bg-orange-400", "bg-emerald-500"];

export interface CrmBoardOption { id: string; name: string }

/** Vem da ficha do imóvel ("Criar negócio") — liga o negócio ao imóvel pelo
 *  id (nunca por referência escrita à mão) e já traz valor/vendedor/comissão. */
export interface CrmBoardPrefill {
  propertyId: string;
  reference: string;
  amount: number;
  sellerName: string;
  commissionPreview: string;
}

const NEW_DEAL_FORM = {
  propertyId: "", reference: "", buyerName: "", buyerContactId: "", sellerName: "", amount: "",
  coBroker: false, coBrokerAgencyId: "",
  coBrokerSplitType: "percent" as "percent" | "fixed", coBrokerSplitPct: "50", coBrokerSplitFixed: "",
};

function formFromPrefill(p?: CrmBoardPrefill): typeof NEW_DEAL_FORM {
  if (!p) return NEW_DEAL_FORM;
  return {
    ...NEW_DEAL_FORM,
    propertyId: p.propertyId,
    reference: p.reference,
    amount: p.amount ? String(p.amount) : "",
    sellerName: p.sellerName,
  };
}

/** Kanban de negócios REAIS (persistidos). Ao mover um cartão de fase, o estado
 *  do imóvel muda automaticamente (reserva→reservado, cpcv→cpcv, escritura/
 *  concluído→vendido). Cada cartão abre o detalhe do negócio. */
export function CrmBoard({
  initial,
  buyerContacts = [],
  agencies = [],
  prefill,
}: {
  initial: DealListItem[];
  /** Contactos do consultor com type="comprador" — para ligar ao negócio em vez de texto livre. */
  buyerContacts?: CrmBoardOption[];
  /** Outras agências (para "partilha com outra agência"). */
  agencies?: CrmBoardOption[];
  /** Veio de "Criar negócio" na ficha de um imóvel — abre o formulário já preenchido. */
  prefill?: CrmBoardPrefill;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState(Boolean(prefill));
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState(() => formFromPrefill(prefill));
  const [err, setErr] = React.useState<string | null>(null);

  const total = initial.reduce((s, d) => s + d.amount, 0);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.propertyId && !form.reference.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/deals/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Com propertyId (veio da ficha do imóvel) a ligação é direta pelo
          // id — a referência só serve de fallback para quem abre o formulário
          // a partir do CRM e tem de identificar o imóvel à mão.
          propertyId: form.propertyId || undefined,
          reference: form.propertyId ? undefined : form.reference.trim(),
          buyerName: form.buyerName,
          buyerContactId: form.buyerContactId || undefined,
          sellerName: form.sellerName,
          amount: form.amount ? Number(form.amount) : undefined,
          coBroker: form.coBroker,
          coBrokerAgencyId: form.coBroker ? form.coBrokerAgencyId || undefined : undefined,
          coBrokerSplitType: form.coBrokerSplitType,
          coBrokerSplitPct: form.coBroker && form.coBrokerSplitType === "percent" && form.coBrokerSplitPct ? Number(form.coBrokerSplitPct) : undefined,
          coBrokerSplitFixed: form.coBroker && form.coBrokerSplitType === "fixed" && form.coBrokerSplitFixed ? Number(form.coBrokerSplitFixed) : undefined,
        }),
      });
      const out = await res.json();
      if (res.ok) {
        setForm(NEW_DEAL_FORM);
        setShowNew(false);
        router.replace("/app/crm");
        router.refresh();
      } else {
        setErr(out.error === "property_missing" ? "Referência de imóvel não encontrada." : "Não foi possível criar o negócio.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function move(dealId: string, dir: 1 | -1, idx: number) {
    const to = ORDER[idx + dir];
    if (!to) return;
    setBusy(dealId);
    try {
      const res = await fetch("/api/deals/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, stage: to }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Área do consultor</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">CRM · Negócios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ao avançar um negócio de fase, o <strong>estado do imóvel muda sozinho</strong>
            (reserva → reservado · CPCV → CPCV · escritura/concluído → vendido).
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Valor em pipeline</p>
              <p className="font-display text-xl leading-none">{formatEuro(total)}</p>
            </div>
          </div>
          <Button onClick={() => setShowNew((s) => !s)}><Plus className="size-4" /> Novo negócio</Button>
        </div>
      </div>

      {/* Novo negócio */}
      {showNew && (
        <form onSubmit={create} className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          {form.propertyId && (
            <p className="mb-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              Ligado ao imóvel {form.reference} — valor, vendedor e comissão já vieram da ficha.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Referência (ex.: HP-1049)"
              disabled={Boolean(form.propertyId)}
            />
            <Input value={form.sellerName} onChange={(e) => setForm((f) => ({ ...f, sellerName: e.target.value }))} placeholder="Vendedor" />
            <Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Valor (€)" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {prefill?.commissionPreview
              ? <>Comissão em vigor no imóvel: <strong className="text-foreground">{prefill.commissionPreview}</strong> — só precisas de indicar abaixo se há partilha com outra agência.</>
              : "A comissão vem do imóvel — só precisas de indicar abaixo se há partilha com outra agência."}
          </p>

          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.coBroker}
                onChange={(e) => setForm((f) => ({ ...f, coBroker: e.target.checked, coBrokerAgencyId: e.target.checked ? f.coBrokerAgencyId : "" }))}
                className="size-4 accent-primary"
              />
              Partilha com outra agência
            </label>
            {form.coBroker && (
              <>
                <select
                  value={form.coBrokerAgencyId}
                  onChange={(e) => setForm((f) => ({ ...f, coBrokerAgencyId: e.target.value }))}
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">Selecionar agência…</option>
                  {agencies.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                </select>
                <select
                  value={form.coBrokerSplitType}
                  onChange={(e) => setForm((f) => ({ ...f, coBrokerSplitType: e.target.value as "percent" | "fixed" }))}
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="percent">Partilha em %</option>
                  <option value="fixed">Partilha fixa (€)</option>
                </select>
                {form.coBrokerSplitType === "percent" ? (
                  <Input type="number" step="1" value={form.coBrokerSplitPct} onChange={(e) => setForm((f) => ({ ...f, coBrokerSplitPct: e.target.value }))} placeholder="% para a outra agência" />
                ) : (
                  <Input type="number" step="50" value={form.coBrokerSplitFixed} onChange={(e) => setForm((f) => ({ ...f, coBrokerSplitFixed: e.target.value }))} placeholder="€ para a outra agência" />
                )}
              </>
            )}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {buyerContacts.length > 0 ? (
              <select
                value={form.buyerContactId}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = buyerContacts.find((x) => x.id === id);
                  setForm((f) => ({ ...f, buyerContactId: id, buyerName: c ? c.name : f.buyerName }));
                }}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Comprador: escolher dos meus contactos…</option>
                {buyerContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <span />
            )}
            <Input
              value={form.buyerName}
              onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value, buyerContactId: "" }))}
              placeholder={buyerContacts.length > 0 ? "…ou nome do comprador (sem contacto ligado)" : "Comprador"}
            />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Button type="submit" disabled={creating || (!form.propertyId && !form.reference.trim())}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar
            </Button>
            {err && <span className="text-sm text-destructive">{err}</span>}
          </div>
        </form>
      )}

      {/* Quadro Kanban de negócios reais */}
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {DEAL_STEPS.map((step, i) => {
          const cards = initial.filter((d) => d.stage === step.stage);
          const soma = cards.reduce((s, d) => s + d.amount, 0);
          return (
            <div key={step.stage} className="w-72 shrink-0">
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", ACCENT[i] ?? "bg-slate-400")} />
                  <span className="text-sm font-semibold">{step.label}</span>
                  <span className="text-xs text-muted-foreground">({cards.length})</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatEuro(soma)}</span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {cards.map((d) => {
                  const status = dealStageToStatus(d.stage);
                  return (
                    <div key={d.id} className="rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                      <Link href={`/app/crm/${d.id}`} className="block">
                        <div className="flex items-start gap-2.5">
                          {/* Thumbnail da foto de capa — identificar o imóvel de relance. */}
                          <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            {d.propertyImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={d.propertyImage} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-muted-foreground"><Home className="size-4" /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium leading-tight">{d.buyerName || "Comprador"}</p>
                              {status && (
                                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {STATUS_LABEL[status as PropertyStatus]}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{d.propertyTitle || d.propertyRef}</p>
                          </div>
                        </div>
                      </Link>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-display text-base">{d.amount ? formatEuro(d.amount) : "—"}</span>
                        {d.propertyId ? (
                          <Link href={`/imovel/${d.propertyId}`} className="text-[11px] text-primary hover:underline">Ref. {d.propertyRef}</Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Ref. {d.propertyRef}</span>
                        )}
                      </div>
                      {(d.commissionEstimate != null || d.coBroker) && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {d.commissionEstimate != null && <span>Comissão est.: {formatEuro(d.commissionEstimate)}</span>}
                          {d.coBroker && <span className="rounded-full bg-gold/15 px-2 py-0.5 font-medium text-gold-foreground">Partilha</span>}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2">
                        {busy === d.id && <Loader2 className="mr-auto size-3.5 animate-spin text-muted-foreground" />}
                        <button onClick={() => move(d.id, -1, i)} disabled={i === 0 || busy === d.id} aria-label="Recuar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                          <ChevronLeft className="size-4" />
                        </button>
                        <button onClick={() => move(d.id, 1, i)} disabled={i === ORDER.length - 1 || busy === d.id} aria-label="Avançar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">Sem negócios</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {initial.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Ainda não há negócios. Clica em <strong>Novo negócio</strong> e usa a referência de um imóvel (ex.: HP-1049).
        </p>
      )}
    </div>
  );
}
