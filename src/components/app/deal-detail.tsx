"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Mail, Pencil, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OwnerLinkButton } from "@/components/property/owner-link-button";
import { BuyerLinkButton } from "@/components/property/buyer-link-button";
import { formatEuro } from "@/lib/format";
import { DEAL_STEPS } from "@/lib/data/deal";
import type { DealDetail, CommissionType as SplitType } from "@/lib/db/deals";

const STAGE_ORDER = DEAL_STEPS.map((s) => s.stage);

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
  const [advancing, setAdvancing] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const [buyerContactId, setBuyerContactId] = React.useState(deal.buyerContactId ?? "");
  const [buyerName, setBuyerName] = React.useState(deal.buyerName);
  const [sellerName, setSellerName] = React.useState(deal.sellerName);
  const [amount, setAmount] = React.useState(String(deal.amount || ""));
  const [coBroker, setCoBroker] = React.useState(deal.coBroker);
  const [coBrokerAgencyId, setCoBrokerAgencyId] = React.useState(deal.coBrokerAgencyId ?? "");
  const [splitType, setSplitType] = React.useState<SplitType>(deal.coBrokerSplitType);
  const [splitPct, setSplitPct] = React.useState(deal.coBrokerSplitPct != null ? String(deal.coBrokerSplitPct) : "50");
  const [splitFixed, setSplitFixed] = React.useState(deal.coBrokerSplitFixed != null ? String(deal.coBrokerSplitFixed) : "");

  const stepIdx = DEAL_STEPS.findIndex((s) => s.stage === deal.stage);

  async function advance(dir: 1 | -1) {
    const to = STAGE_ORDER[stepIdx + dir];
    if (!to) return;
    setAdvancing(true);
    setErr(null);
    try {
      const res = await fetch("/api/deals/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, stage: to }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error === "sem_permissao" ? "Sem permissão para mover este negócio de fase." : "Não foi possível avançar o negócio.");
        return;
      }
      router.refresh();
    } finally {
      setAdvancing(false);
    }
  }

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
          coBroker,
          coBrokerAgencyId: coBroker ? coBrokerAgencyId || null : null,
          coBrokerSplitType: splitType,
          coBrokerSplitPct: coBroker && splitType === "percent" && splitPct ? Number(splitPct) : null,
          coBrokerSplitFixed: coBroker && splitType === "fixed" && splitFixed ? Number(splitFixed) : null,
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

  // A comissão em si vem sempre do imóvel (deal.commissionEstimate); aqui só
  // se recalcula a fatia da partilha, em função do que se está a editar.
  const splitAmount =
    deal.commissionEstimate == null
      ? null
      : splitType === "fixed"
        ? (splitFixed ? Number(splitFixed) : null)
        : splitPct
          ? Math.round(deal.commissionEstimate * (Number(splitPct) / 100) * 100) / 100
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

      {/* Fases — avança/recua diretamente aqui; o estado do imóvel sincroniza
          sozinho (também disponível no quadro kanban). */}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => advance(-1)}
          disabled={advancing || stepIdx <= 0}
          aria-label="Recuar fase"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
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
        {advancing ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <button
            type="button"
            onClick={() => advance(1)}
            disabled={advancing || stepIdx >= DEAL_STEPS.length - 1}
            aria-label="Avançar fase"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

      {/* Links privados — o comprador e o proprietário acompanham a evolução
          destas mesmas fases sem precisar de login, assim que o negócio existe. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {deal.buyerContactId ? (
          <BuyerLinkButton contactId={deal.buyerContactId} />
        ) : (
          <span className="text-xs text-muted-foreground">Liga um comprador dos teus contactos para poderes partilhar o portal com ele.</span>
        )}
        {deal.propertyId && <OwnerLinkButton propertyId={deal.propertyId} />}
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
                ? `${formatEuro(deal.commissionEstimate)}${deal.commissionType === "percent" && deal.commissionPct ? ` (${deal.commissionPct}% do imóvel)` : ""}`
                : "— (sem comissão definida no imóvel)"
            }
          />
          <Row
            label="Partilha com outra agência"
            value={
              deal.coBroker
                ? `${deal.coBrokerAgencyName || "Sim"}${deal.coBrokerSplitAmount != null ? ` — ${formatEuro(deal.coBrokerSplitAmount)}${deal.coBrokerSplitType === "percent" && deal.coBrokerSplitPct ? ` (${deal.coBrokerSplitPct}%)` : ""}` : ""}`
                : "Não"
            }
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
          <p className="text-xs text-muted-foreground">
            Comissão (do imóvel):{" "}
            <strong className="text-foreground">
              {deal.commissionEstimate != null ? formatEuro(deal.commissionEstimate) : "não definida"}
            </strong>
            {" "}— só se edita na ficha do imóvel.
          </p>
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
            <>
              <select
                value={coBrokerAgencyId}
                onChange={(e) => setCoBrokerAgencyId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Selecionar agência…</option>
                {agencies.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </select>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as SplitType)}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="percent">Partilha em %</option>
                  <option value="fixed">Partilha fixa (€)</option>
                </select>
                {splitType === "percent" ? (
                  <Input type="number" step="1" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} placeholder="% para a outra agência" />
                ) : (
                  <Input type="number" step="50" value={splitFixed} onChange={(e) => setSplitFixed(e.target.value)} placeholder="€ para a outra agência" />
                )}
              </div>
              {splitAmount != null && (
                <p className="text-xs text-muted-foreground">Fica com a outra agência: <strong className="text-foreground">{formatEuro(splitAmount)}</strong></p>
              )}
            </>
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
