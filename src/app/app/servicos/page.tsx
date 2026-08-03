"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, Percent, Plus, Star, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SERVICE_CATEGORIES,
  SERVICE_STATUS,
  SERVICE_STATUS_ORDER,
  serviceCategoryLabel,
  demoServiceReferrals,
  type ServiceReferral,
  type ServiceCategory,
  type ServiceStatus,
} from "@/lib/data/service-referrals";
import { formatEuro } from "@/lib/format";

const box =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

function feeLabel(r: ServiceReferral): string {
  if (r.feeType === "percent") return `${r.feePct ?? 0}%`;
  return formatEuro(r.feeFixed ?? 0);
}

export default function ServicosPage() {
  const [items, setItems] = React.useState<ServiceReferral[]>(demoServiceReferrals);
  const [open, setOpen] = React.useState(false);

  function addItem(r: ServiceReferral) {
    setItems((prev) => [r, ...prev]);
    setOpen(false);
  }

  function setStatus(id: string, status: ServiceStatus) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área do consultor
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl">
              <Briefcase className="size-7 text-primary" /> Referências de serviços
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Os contactos que encaminhou para parceiros (crédito, construção,
              jurídico, certificados…), com a % acordada, o responsável e como evolui.
            </p>
          </div>
          <Button onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-4" /> : <Plus className="size-4" />}
            {open ? "Fechar" : "Nova referência"}
          </Button>
        </div>

        {open && <AddForm onAdd={addItem} />}

        <div className="mt-6 space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      {serviceCategoryLabel(r.category)}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", SERVICE_STATUS[r.status].badge)}>
                      {SERVICE_STATUS[r.status].label}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{r.clientName}</p>
                  {r.clientContact && (
                    <p className="text-sm text-muted-foreground">{r.clientContact}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Percent className="size-3" /> Referência
                  </p>
                  <p className="font-display text-lg text-primary">{feeLabel(r)}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Responsável: <span className="font-medium text-foreground">{r.partnerName}</span>
                  {r.partnerContact && ` · ${r.partnerContact}`}
                </p>
                {r.feedback && (
                  <p className="flex items-start gap-1.5 text-muted-foreground">
                    <Star className="mt-0.5 size-3.5 shrink-0 text-gold" />
                    <span>{r.feedback}</span>
                  </p>
                )}
              </div>

              {/* Mudar estado */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SERVICE_STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(r.id, s)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      r.status === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {SERVICE_STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddForm({ onAdd }: { onAdd: (r: ServiceReferral) => void }) {
  const [category, setCategory] = React.useState<ServiceCategory>("credito");
  const [clientName, setClientName] = React.useState("");
  const [clientContact, setClientContact] = React.useState("");
  const [partnerName, setPartnerName] = React.useState("");
  const [partnerContact, setPartnerContact] = React.useState("");
  const [feeType, setFeeType] = React.useState<"percent" | "fixed">("percent");
  const [feeValue, setFeeValue] = React.useState(15);
  const [note, setNote] = React.useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !partnerName.trim()) return;
    onAdd({
      id: `sr-${Date.now()}`,
      category,
      clientName: clientName.trim(),
      clientContact: clientContact.trim() || undefined,
      partnerName: partnerName.trim(),
      partnerContact: partnerContact.trim() || undefined,
      feeType,
      feePct: feeType === "percent" ? feeValue : undefined,
      feeFixed: feeType === "fixed" ? feeValue : undefined,
      status: "enviado",
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de serviço</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCategory)} className={box}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Referência acordada</Label>
          <div className="flex gap-2">
            <select value={feeType} onChange={(e) => setFeeType(e.target.value as "percent" | "fixed")} className={cn(box, "w-28")}>
              <option value="percent">%</option>
              <option value="fixed">€ fixo</option>
            </select>
            <Input type="number" value={feeValue} onChange={(e) => setFeeValue(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Cliente encaminhado</Label>
          <Input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome" />
        </div>
        <div className="space-y-1.5">
          <Label>Contacto do cliente</Label>
          <Input type="text" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Telefone ou email" />
        </div>
        <div className="space-y-1.5">
          <Label>Profissional / parceiro responsável</Label>
          <Input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Nome do parceiro" />
        </div>
        <div className="space-y-1.5">
          <Label>Contacto do parceiro</Label>
          <Input type="text" value={partnerContact} onChange={(e) => setPartnerContact(e.target.value)} placeholder="Telefone ou email" />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>Nota (opcional)</Label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={box} />
      </div>
      <Button type="submit" className="mt-4">
        <Plus className="size-4" /> Adicionar referência
      </Button>
    </form>
  );
}
