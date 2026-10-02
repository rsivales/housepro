"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, Pencil, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import { DEAL_STEPS } from "@/lib/data/deal";
import type { DealDetail, CommissionType } from "@/lib/db/deals";

export interface DealOption { id: string; name: string }

export function DealDetailView({
  deal,
  buyerContacts,
  agencies,
}: {
  deal: DealDetail;
  buyerContacts: DealOption[];
  agencies: DealOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [buyerContactId, setBuyerContactId] = React.useState(deal.buyerContactId ?? "");
  const [buyerName, setBuyerName] = React.useState(deal.buyerName);
  const [sellerName, setSellerName] = React.useState(deal.sellerName);
  const [amount, setAmount] = React.useState(String(deal.amount || ""));
  const [commissionType, setCommissionType] = React.useState<CommissionType>(deal.commissionType);
  const [commissionPct, setCommissionPct] = React.useState(deal.commissionPct != null ? String(deal.commissionPct) : "5");
  const [commissionFixed, setCommissionFixed] = React.useState(deal.commissionFixed != null ? String(deal.commissionFixed) : "");
  const [coBroker, setCoBroker] = React.useState(deal.coBroker);
  const [coBrokerAgencyId, setCoBrokerAgencyId] = React.useState(deal.coBrokerAgencyId ?? "");

  const stepIdx = DEAL_STEPS.findIndex((s) => s.stage === deal.stage);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/deals/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          buyerName,
          buyerContactId: buyerContactId || null,
          sellerName,
          amount: amount ? Number(amount) : undefined,
          commissionType,
          commissionPct: commissionType === "percent" && commissionPct ? Number(commissionPct) : null,
          commissionFixed: commissionType === "fixed" && commissionFixed ? Number(commissionFixed) : null,
          coBroker,
          coBrokerAgencyId: coBroker ? coBrokerAgencyId || null : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === "sem_permissao" ? "Sem permissão para editar este negócio." : "Não foi possível guardar.");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const estimate =
    commissionType === "fixed"
      ? (commissionFixed ? Number(commissionFixed) : null)
      : amount && commissionPct
        ? Math.round(Number(amount) * (Number(commissionPct) / 100) * 100) / 100
        : null;

  return (
    <div className="hx-card mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {deal.propertyId ? (
              <Link href={`/imovel/${deal.propertyId}`} className="text-primary hover:underline">Ref. {deal.propertyRef}</Link>
            ) : (
              <>Ref. {deal.propertyRef}</>
            )}
          </p>
          <h1 className="mt-0.5 font-display text-2xl">{deal.propertyTitle || "Negócio"}</h1>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Pencil className="size-4" /> Editar
          </button>
        )}
      </div>

      {/* Fases — só leitura aqui; avançar/recuar faz-se no quadro kanban. */}
      <div className="mt-5 flex items-center gap-1 overflow-x-auto">
        {DEAL_STEPS.map((s, i) => (
          <div key={s.stage} className="flex items-center gap-1">
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < DEAL_STEPS.length - 1 && <span className="h-px w-3 bg-border" />}
          </div>
        ))}
      </div>

      {!editing ? (
        <dl className="mt-6 divide-y divide-[var(--hx-border)]">
          <Row label="Comprador">
            <div>
              <p className="font-medium">{deal.buyerContact?.name || deal.buyerName || "—"}</p>
              {deal.buyerContact && (
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {deal.buyerContact.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {deal.buyerContact.phone}</span>}
                  {deal.buyerContact.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {deal.buyerContact.email}</span>}
                </div>
              )}
            </div>
          </Row>
          <Row label="Vendedor" value={deal.sellerName || "—"} />
          <Row label="Valor do negócio" value={deal.amount ? formatEuro(deal.amount) : "—"} />
          <Row
            label="Comissão estimada"
            value={
              deal.commissionEstimate != null
                ? `${formatEuro(deal.commissionEstimate)}${deal.commissionType === "percent" && deal.commissionPct ? ` (${deal.commissionPct}%)` : ""}`
                : "—"
            }
          />
          <Row
            label="Partilha com outra agência"
            value={deal.coBroker ? (deal.coBrokerAgencyName || "Sim") : "Não"}
          />
        </dl>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {buyerContacts.length > 0 ? (
              <select
                value={buyerContactId}
                onChange={(e) => {
                  const id = e.target.value;
                  const c = buyerContacts.find((x) => x.id === id);
                  setBuyerContactId(id);
                  if (c) setBuyerName(c.name);
                }}
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Comprador: escolher dos meus contactos…</option>
                {buyerContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : <span />}
            <Input
              value={buyerName}
              onChange={(e) => { setBuyerName(e.target.value); setBuyerContactId(""); }}
              placeholder={buyerContacts.length > 0 ? "…ou nome do comprador" : "Comprador"}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Vendedor" />
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (€)" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={commissionType}
              onChange={(e) => setCommissionType(e.target.value as CommissionType)}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="percent">Comissão em %</option>
              <option value="fixed">Comissão fixa (€)</option>
            </select>
            {commissionType === "percent" ? (
              <Input type="number" step="0.1" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} placeholder="Comissão (%)" />
            ) : (
              <Input type="number" step="50" value={commissionFixed} onChange={(e) => setCommissionFixed(e.target.value)} placeholder="Comissão (€)" />
            )}
          </div>
          {estimate != null && (
            <p className="text-xs text-muted-foreground">Estimativa: <strong className="text-foreground">{formatEuro(estimate)}</strong></p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={coBroker}
              onChange={(e) => { setCoBroker(e.target.checked); if (!e.target.checked) setCoBrokerAgencyId(""); }}
              className="size-4 accent-primary"
            />
            Partilha com outra agência
          </label>
          {coBroker && (
            <select
              value={coBrokerAgencyId}
              onChange={(e) => setCoBrokerAgencyId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Selecionar agência…</option>
              {agencies.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
            </select>
          )}

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Guardar
            </Button>
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 text-sm">
      <dt className="w-44 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children ?? value}</dd>
    </div>
  );
}
