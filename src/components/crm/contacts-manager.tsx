"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Loader2, Search, ChevronRight, Phone, Mail } from "lucide-react";

import { BuyerFields } from "@/components/matching/buyer-fields";
import { OcrCapture } from "@/components/matching/ocr-capture";
import { buyerTemperature, TEMPERATURE_LABEL, type BuyerProfile } from "@/lib/matching/profile";
import { Button } from "@/components/ui/button";
import {
  CONTACT_TYPE_LABEL,
  type Contact,
  type ContactType,
} from "@/lib/data/contacts";

/**
 * Lista e criação de contactos. Pesquisa por nome/contacto e filtro por tipo.
 * Reutiliza o design system (Card/Button + tokens). Funciona em demo.
 */
type KpiKey = "quente" | "morno" | "frio" | "por_qualificar" | "credito" | "depende_venda" | "casa_para_vender" | "atraso";

const KPI_TEST: Record<KpiKey, (c: Contact, today: string) => boolean> = {
  quente: (c) => buyerTemperature(c.buyerProfile) === "quente",
  morno: (c) => buyerTemperature(c.buyerProfile) === "morno",
  frio: (c) => buyerTemperature(c.buyerProfile) === "frio",
  por_qualificar: (c) => buyerTemperature(c.buyerProfile) === "por_qualificar",
  credito: (c) => ["em_analise", "por_iniciar"].includes(c.buyerProfile?.financing ?? ""),
  depende_venda: (c) => Boolean(c.buyerProfile?.dependsOnSale),
  casa_para_vender: (c) => Boolean(c.buyerProfile?.hasHomeToSell || c.buyerProfile?.hasHomeToExchange),
  atraso: (c, today) => Boolean(c.buyerProfile?.nextContactAt && c.buyerProfile.nextContactAt < today),
};

const KPI_LABEL: Record<KpiKey, string> = {
  quente: "Compra até 3 meses",
  morno: "Compra em 4–6 meses",
  frio: "Mais de 6 meses",
  por_qualificar: "Por qualificar",
  credito: "Crédito por resolver",
  depende_venda: "Dependem de venda",
  casa_para_vender: "Casa para vender / permuta",
  atraso: "Seguimento em atraso",
};

/**
 * Lista e criação de contactos. Pesquisa por nome/contacto, filtro por tipo e
 * pelos indicadores de compradores (cartões clicáveis: clicar filtra a lista
 * de relance, clicar outra vez limpa o filtro).
 */
export function ContactsManager({ initial }: { initial: Contact[] }) {
  const [list, setList] = React.useState<Contact[]>(initial);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<ContactType | "todos">("todos");
  const [kpi, setKpi] = React.useState<KpiKey | null>(null);
  const [open, setOpen] = React.useState(false);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
  const buyers = list.filter((c) => ["comprador", "investidor"].includes(c.type) && c.buyerProfile?.active !== false);

  const filtered = list.filter((c) => {
    if (filter !== "todos" && c.type !== filter) return false;
    if (kpi && !KPI_TEST[kpi](c, today)) return false;
    if (!q.trim()) return true;
    const s = `${c.name} ${c.phone ?? ""} ${c.email ?? ""} ${c.zone ?? ""}`.toLowerCase();
    return s.includes(q.trim().toLowerCase());
  });

  return (
    <div>
      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(KPI_LABEL) as KpiKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setKpi((v) => (v === key ? null : key))}
            className={`rounded-2xl border p-4 text-left transition-colors ${kpi === key ? "border-primary bg-primary/5" : "bg-card hover:bg-secondary/40"}`}
          >
            <p className="text-sm text-muted-foreground">{KPI_LABEL[key]}</p>
            <p className="mt-2 text-2xl font-semibold">{buyers.filter((c) => KPI_TEST[key](c, today)).length}</p>
          </button>
        ))}
      </div>
      {kpi && (
        <p className="mb-3 text-sm text-muted-foreground">
          A filtrar por <strong className="text-foreground">{KPI_LABEL[kpi]}</strong> ·{" "}
          <button type="button" onClick={() => setKpi(null)} className="font-semibold text-primary hover:underline">Limpar</button>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Procurar por nome, telefone, email, zona…"
            className="input pl-9"
          />
        </div>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" /> Novo contacto
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["todos", ...Object.keys(CONTACT_TYPE_LABEL)] as (ContactType | "todos")[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "todos" ? "Todos" : CONTACT_TYPE_LABEL[t as ContactType]}
          </button>
        ))}
      </div>

      {open && <CreateForm onCreated={(c) => { setList((p) => [c, ...p]); setOpen(false); }} />}

      <div className="mt-4 space-y-2">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/app/contactos/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
              {c.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.name}</p>
              {["comprador","investidor"].includes(c.type) && <p className="text-sm text-muted-foreground">{TEMPERATURE_LABEL[buyerTemperature(c.buyerProfile)]}</p>}
              <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                {c.phone && (<span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>)}
                {c.email && (<span className="inline-flex items-center gap-1"><Mail className="size-3" />{c.email}</span>)}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {CONTACT_TYPE_LABEL[c.type]}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Sem contactos.
          </p>
        )}
      </div>
    </div>
  );
}

export function CreateForm({ onCreated, initial, leadId }: { onCreated: (c: Contact) => void; initial?: Partial<Contact>; leadId?: string }) {
  const [buyerProfile, setBuyerProfile] = React.useState<BuyerProfile>(initial?.buyerProfile ?? {});
  const [name, setName] = React.useState(initial?.name ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [email, setEmail] = React.useState(initial?.email ?? "");
  const [type, setType] = React.useState<ContactType>(initial?.type ?? "comprador");
  const [zone, setZone] = React.useState(initial?.zone ?? "");
  const [busy, setBusy] = React.useState(false);
  const [existingId,setExistingId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined, email: email || undefined, type, source: initial?.source ?? "manual", zone: buyerProfile.zones?.filter(Boolean).join(", ") || zone || undefined, buyerProfile, leadId }),
      });
      const data = await res.json();
      if (!res.ok) { if(data.existingContactId) setExistingId(data.existingContactId); throw new Error(data?.error ?? "Não foi possível criar."); }
      onCreated(data.contact as Contact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
      <OcrCapture onApply={p => { if(p.name)setName(p.name); if(p.phone)setPhone(p.phone); if(p.email)setEmail(p.email); if(p.zone)setZone(p.zone); if(p.buyerProfile)setBuyerProfile(v => ({...v,...p.buyerProfile})); }} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome *</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as ContactType)} className="input">
            {(Object.keys(CONTACT_TYPE_LABEL) as ContactType[]).map((t) => (
              <option key={t} value={t}>{CONTACT_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Zona de contacto (opcional)</span>
          <input value={zone} onChange={(e) => setZone(e.target.value)} className="input" />
        </label>
      </div>
      {["comprador","investidor"].includes(type) && <BuyerFields value={buyerProfile} onChange={setBuyerProfile}/>}
      {existingId && <a className="text-sm underline" href={`/app/contactos/${existingId}`}>Abrir contacto existente</a>}{error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar contacto
        </Button>
      </div>
    </form>
  );
}
