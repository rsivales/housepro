"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Home, Loader2, Phone, X, Mail, MapPin, Wallet, Calendar, Tag, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { LEAD_PIPELINES, type LeadPipeline } from "@/lib/data/lead-pipelines";
import { scoreBand } from "@/lib/meta/scoring";
import { LEAD_CREDIT_STATUS_LABEL, type LeadCreditStatus } from "@/lib/data/leads";

export interface LeadCard {
  id: string;
  name: string;
  contact: string;
  email?: string;
  propertyId?: string;
  propertyRef?: string;
  propertyImage?: string;
  pipeline?: string;
  stage?: number;
  source?: string;
  message?: string;
  intent?: string;
  zone?: string;
  budget?: string;
  qualification?: string;
  score?: number;
  creditStatus?: LeadCreditStatus;
  campaignId?: string;
  formId?: string;
  createdAt?: string;
}

/** Cor da etiqueta de crédito — visível de relance, sem abrir a lead. */
const CREDIT_BADGE: Record<LeadCreditStatus, string> = {
  aprovado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  nao_aprovado: "bg-destructive/15 text-destructive",
  pendente: "bg-gold/15 text-gold-foreground",
};

/** "há X min/h/d" a partir da data de criação — para ver a urgência de relance. */
function timeAgo(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  const min = Math.round(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

const SOURCE_LABEL: Record<string, string> = {
  site: "Site",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  portal: "Portal",
  consultor: "Consultor",
};

const QUALIFICATION_LABEL: Record<string, string> = {
  novo: "Por qualificar",
  qualificado: "Qualificada",
  desqualificado: "Desqualificada",
  duplicado: "Duplicada",
};

const INTENT_LABEL: Record<string, string> = {
  mensagem: "Mensagem",
  visita: "Pedido de visita",
  custos: "Pedido de custos",
};

const ACCENT = ["bg-slate-400", "bg-sky-400", "bg-violet-400", "bg-amber-400", "bg-orange-400", "bg-emerald-500"];

/** Kanban de LEADS de um pipeline (compradores/proprietários). Separado dos
 *  negócios: as leads entram e classificam-se aqui, com fases próprias. */
export function LeadsBoard({ pipeline, leads }: { pipeline: LeadPipeline; leads: LeadCard[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<LeadCard | null>(null);
  const [creditOverride, setCreditOverride] = React.useState<Record<string, LeadCreditStatus | undefined>>({});
  const [showFilters, setShowFilters] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [urgencyFilter, setUrgencyFilter] = React.useState<"" | "Quente" | "Morna" | "Fria">("");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [creditFilter, setCreditFilter] = React.useState<"" | LeadCreditStatus>("");

  // Leads deste pipeline; as por classificar (sem pipeline) caem no 1.º pipeline.
  const isDefault = pipeline.key === LEAD_PIPELINES[0].key;
  const ofPipeline = leads
    .filter((l) => l.pipeline === pipeline.key || (isDefault && !l.pipeline))
    .map((l) => (l.id in creditOverride ? { ...l, creditStatus: creditOverride[l.id] } : l));

  const sources = [...new Set(ofPipeline.map((l) => l.source).filter((s): s is string => Boolean(s)))];
  const term = q.trim().toLowerCase();
  const mine = ofPipeline.filter((l) => {
    if (term && !`${l.name} ${l.contact} ${l.email ?? ""} ${l.zone ?? ""} ${l.propertyRef ?? ""}`.toLowerCase().includes(term)) return false;
    if (urgencyFilter && scoreBand(l.score ?? 0).label !== urgencyFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    if (creditFilter && l.creditStatus !== creditFilter) return false;
    return true;
  });
  const filtersActive = Boolean(term || urgencyFilter || sourceFilter || creditFilter);

  async function post(leadId: string, stage: number, pipe?: string) {
    setBusy(leadId);
    try {
      const res = await fetch("/api/leads/stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, stage, pipeline: pipe ?? pipeline.key }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function postCredit(leadId: string, creditStatus: LeadCreditStatus | undefined) {
    setBusy(leadId);
    setCreditOverride((prev) => ({ ...prev, [leadId]: creditStatus }));
    try {
      const res = await fetch("/api/leads/credit-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, creditStatus: creditStatus ?? null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Pesquisar por nome, contacto, zona, imóvel…"
        className="h-9 min-w-48 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring"
      />
      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium",
          (showFilters || filtersActive) && "border-primary/40 bg-primary/5 text-primary"
        )}
      >
        <SlidersHorizontal className="size-3.5" /> Filtros{filtersActive ? " ·" : ""}
      </button>
    </div>
    {showFilters && (
      <div className="mt-2 flex flex-wrap gap-2">
        <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as typeof urgencyFilter)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none">
          <option value="">Urgência: todas</option>
          <option value="Quente">🔴 Quente</option>
          <option value="Morna">🟡 Morna</option>
          <option value="Fria">⚪ Fria</option>
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none">
          <option value="">Origem: todas</option>
          {sources.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>)}
        </select>
        <select value={creditFilter} onChange={(e) => setCreditFilter(e.target.value as typeof creditFilter)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none">
          <option value="">Crédito: todos</option>
          {(Object.keys(LEAD_CREDIT_STATUS_LABEL) as LeadCreditStatus[]).map((k) => <option key={k} value={k}>{LEAD_CREDIT_STATUS_LABEL[k]}</option>)}
        </select>
        {filtersActive && (
          <button type="button" onClick={() => { setQ(""); setUrgencyFilter(""); setSourceFilter(""); setCreditFilter(""); }} className="text-sm text-muted-foreground hover:text-foreground">
            Limpar filtros
          </button>
        )}
      </div>
    )}
    <div className="mt-2 flex gap-4 overflow-x-auto pb-4">
      {pipeline.stages.map((label, i) => {
        const cards = mine.filter((l) => (l.stage ?? 0) === i);
        return (
          <div key={label} className="w-72 shrink-0">
            <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", ACCENT[i] ?? "bg-slate-400")} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">({cards.length})</span>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {cards.map((l) => (
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(l)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(l)}
                  className="cursor-pointer rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-2.5">
                    {l.propertyRef && (
                      // Thumbnail da foto de capa — identificar o imóvel de relance.
                      <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {l.propertyImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.propertyImage} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center text-muted-foreground"><Home className="size-4" /></div>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{l.name}</p>
                        {l.source && (
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{l.source}</span>
                        )}
                      </div>
                      {/* Urgência + tempo desde a captura + crédito — tudo visível sem abrir a lead */}
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {(() => {
                          const band = scoreBand(l.score ?? 0);
                          return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", band.badge)}>{band.label}</span>;
                        })()}
                        {timeAgo(l.createdAt) && (
                          <span className="text-[10px] text-muted-foreground">{timeAgo(l.createdAt)}</span>
                        )}
                        {l.creditStatus && (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", CREDIT_BADGE[l.creditStatus])}>
                            {LEAD_CREDIT_STATUS_LABEL[l.creditStatus]}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{l.contact}</p>
                      {l.propertyRef && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {l.propertyId ? (
                            <Link href={`/imovel/${l.propertyId}`} className="text-primary hover:underline">{l.propertyRef}</Link>
                          ) : l.propertyRef}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Classificar noutro pipeline + estado de crédito */}
                  <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={l.pipeline ?? (isDefault ? pipeline.key : "")}
                      onChange={(e) => post(l.id, 0, e.target.value)}
                      aria-label="Classificar pipeline"
                      className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring"
                    >
                      {LEAD_PIPELINES.map((p) => (
                        <option key={p.key} value={p.key}>Pipeline: {p.label}</option>
                      ))}
                    </select>
                    <select
                      value={l.creditStatus ?? ""}
                      onChange={(e) => void postCredit(l.id, (e.target.value || undefined) as LeadCreditStatus | undefined)}
                      aria-label="Estado do crédito"
                      disabled={busy !== null}
                      className="w-32 shrink-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none focus-visible:border-ring"
                    >
                      <option value="">Crédito: —</option>
                      {(Object.keys(LEAD_CREDIT_STATUS_LABEL) as LeadCreditStatus[]).map((k) => (
                        <option key={k} value={k}>{LEAD_CREDIT_STATUS_LABEL[k]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                    {busy === l.id && <Loader2 className="mr-auto size-3.5 animate-spin text-muted-foreground" />}
                    <a href={`tel:${l.contact.replace(/\s/g, "")}`} aria-label="Contactar" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                      <Phone className="size-3.5" />
                    </a>
                    <button onClick={() => post(l.id, i - 1)} disabled={i === 0 || busy === l.id} aria-label="Recuar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button onClick={() => post(l.id, i + 1)} disabled={i === pipeline.stages.length - 1 || busy === l.id} aria-label="Avançar fase" className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && (
                <p className="rounded-2xl border border-dashed py-6 text-center text-xs text-muted-foreground">Sem leads</p>
              )}
            </div>
          </div>
        );
      })}

      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    </div>
    </div>
  );
}

/** Ficha completa da lead, aberta ao clicar no cartão: contacto, respostas do
 *  formulário/qualificação e origem — tudo o que o cartão do pipeline não
 *  tem espaço para mostrar. */
function LeadDetail({ lead, onClose }: { lead: LeadCard; onClose: () => void }) {
  const createdLabel = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">Ficha da lead</p>
            <h2 className="font-display text-xl leading-tight">{lead.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>

        {/* Origem + qualificação — o que faltava ver de relance */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lead.source && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Origem: {SOURCE_LABEL[lead.source] ?? lead.source}
            </span>
          )}
          {lead.qualification && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {QUALIFICATION_LABEL[lead.qualification] ?? lead.qualification}
            </span>
          )}
          {typeof lead.score === "number" && (() => {
            const band = scoreBand(lead.score ?? 0);
            return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", band.badge)}>{band.label} · {lead.score}</span>;
          })()}
          {lead.creditStatus && (
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", CREDIT_BADGE[lead.creditStatus])}>
              {LEAD_CREDIT_STATUS_LABEL[lead.creditStatus]}
            </span>
          )}
        </div>

        {/* Contacto */}
        <div className="mt-4 space-y-2">
          <a href={`tel:${lead.contact.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm hover:underline">
            <Phone className="size-4 text-muted-foreground" /> {lead.contact}
          </a>
          {lead.email && lead.email !== lead.contact && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm hover:underline">
              <Mail className="size-4 text-muted-foreground" /> {lead.email}
            </a>
          )}
        </div>

        {/* Respostas do formulário / qualificação dadas no preenchimento */}
        <div className="mt-4 rounded-2xl bg-secondary/50 p-3 text-sm">
          {lead.intent && (
            <p>
              <span className="font-medium">Pedido:</span> {INTENT_LABEL[lead.intent] ?? lead.intent}
            </p>
          )}
          {lead.message && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{lead.message}</p>}
          {!lead.message && !lead.intent && <p className="text-muted-foreground">Sem respostas registadas no formulário.</p>}
        </div>

        {/* Zona / orçamento, quando o formulário os captou */}
        {(lead.zone || lead.budget) && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {lead.zone && (
              <p className="flex items-center gap-1.5"><MapPin className="size-4 text-muted-foreground" /> {lead.zone}</p>
            )}
            {lead.budget && (
              <p className="flex items-center gap-1.5"><Wallet className="size-4 text-muted-foreground" /> {lead.budget}</p>
            )}
          </div>
        )}

        {lead.propertyRef && (
          <p className="mt-3 flex items-center gap-1.5 text-sm">
            <Home className="size-4 text-muted-foreground" />
            {lead.propertyId ? (
              <Link href={`/imovel/${lead.propertyId}`} className="text-primary hover:underline">{lead.propertyRef}</Link>
            ) : lead.propertyRef}
          </p>
        )}

        {(lead.campaignId || lead.formId) && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="size-3.5" />
            {lead.campaignId && `Campanha ${lead.campaignId}`}
            {lead.campaignId && lead.formId && " · "}
            {lead.formId && `Formulário ${lead.formId}`}
          </p>
        )}

        {createdLabel && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" /> Recebida em {createdLabel}
          </p>
        )}
      </div>
    </div>
  );
}
