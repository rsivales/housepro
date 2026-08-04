"use client";

import * as React from "react";
import {
  AlertTriangle, Award, Check, Gavel, MessageSquareWarning,
  ShieldAlert, ShieldCheck, TrendingDown, X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { agents } from "@/lib/data/mock";
import {
  CATEGORY_LABEL, SEVERITY, STATUS_LABEL, qualityScore,
  type QualityCategory, type QualityEvent, type QualitySeverity,
} from "@/lib/data/quality";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as QualityCategory[];
const SEVERITIES = Object.keys(SEVERITY) as QualitySeverity[];
const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export function QualityBoard({
  initial, meritBase, agentId, agentName, canManage,
}: {
  initial: QualityEvent[];
  meritBase: number;
  agentId: string;
  agentName: string;
  canManage: boolean;
}) {
  const [events, setEvents] = React.useState<QualityEvent[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const score = qualityScore(events, meritBase);

  function patch(id: string, next: Partial<QualityEvent>) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...next } : e)));
  }

  async function post(payload: Record<string, unknown>) {
    try {
      await fetch("/api/quality", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {/* best-effort — o estado local já reflete a ação */}
  }

  async function contest(e: QualityEvent) {
    const note = window.prompt("Motivo da contestação:", "") ?? "";
    setBusy(e.id);
    patch(e.id, { status: "contestada", contestNote: note });
    await post({ action: "contest", id: e.id, note });
    setBusy(null);
  }

  async function decide(e: QualityEvent, action: "confirm" | "cancel") {
    setBusy(e.id);
    patch(e.id, { status: action === "confirm" ? "confirmada" : "anulada" });
    await post({ action, id: e.id, agentId: e.agentId });
    setBusy(null);
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Cartão de reputação */}
      <div className="grid gap-3 sm:grid-cols-4">
        <ScoreCard icon={ShieldCheck} label="Reputação" value={String(score.net)} tone="primary" hint="méritos − infrações" />
        <ScoreCard icon={Award} label="Méritos" value={`+${score.merits}`} tone="emerald" />
        <ScoreCard icon={TrendingDown} label="Infrações" value={`−${score.penaltiesPoints}`} tone="destructive" hint="confirmadas" />
        <ScoreCard icon={Gavel} label="A compensar" value={formatEuro(score.moneyDue)} tone="amber" hint="no próx. acerto" />
      </div>

      {score.pending > 0 && (
        <p className="flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-700 dark:text-sky-300">
          <MessageSquareWarning className="size-4" />
          {score.pending} infração(ões) por decidir — em devido processo.
        </p>
      )}

      {canManage && <ProposeForm agentId={agentId} onCreated={(ev) => setEvents((p) => [ev, ...p])} post={post} />}

      {/* Livro-razão */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Livro-razão</h2>
        {events.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sem registos. A tua reputação começa limpa.
          </p>
        )}
        {events.map((e) => (
          <EventRow
            key={e.id}
            e={e}
            mine={e.agentId === agentId}
            canManage={canManage}
            busy={busy === e.id}
            onContest={() => contest(e)}
            onConfirm={() => decide(e, "confirm")}
            onCancel={() => decide(e, "cancel")}
          />
        ))}
      </div>

      <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
        Reputação é pública para clientes e agência: méritos valorizam o teu
        trabalho; a penalização monetária de uma infração confirmada é lançada
        como acerto negativo na comissão, auditável pelo teu código de consultor.
      </p>
    </div>
  );
}

function ScoreCard({
  icon: Icon, label, value, tone, hint,
}: {
  icon: React.ElementType; label: string; value: string;
  tone: "primary" | "emerald" | "destructive" | "amber"; hint?: string;
}) {
  const toneCls = {
    primary: "text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    destructive: "text-destructive",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", toneCls)}>
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EventRow({
  e, mine, canManage, busy, onContest, onConfirm, onCancel,
}: {
  e: QualityEvent; mine: boolean; canManage: boolean; busy: boolean;
  onContest: () => void; onConfirm: () => void; onCancel: () => void;
}) {
  const merit = e.kind === "merito";
  const sev = e.severity ? SEVERITY[e.severity] : undefined;
  const status = e.status ? STATUS_LABEL[e.status] : undefined;
  const decidable = e.status === "proposta" || e.status === "contestada";
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
          merit ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
        )}>
          {merit ? <Award className="size-4" /> : <ShieldAlert className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{e.reason}</p>
            {sev && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", sev.badge)}>{sev.label}</span>}
            {status && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", status.badge)}>{status.label}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {e.category ? `${CATEGORY_LABEL[e.category]} · ` : ""}
            {new Date(e.createdAt).toLocaleDateString("pt-PT")}
            {" · "}
            <span className={merit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
              {merit ? "+" : ""}{e.points} pts
            </span>
            {!merit && e.amount > 0 && e.status === "confirmada" && ` · ${formatEuro(e.amount)}`}
          </p>
          {e.contestNote && (
            <p className="mt-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
              Contestação: {e.contestNote}
            </p>
          )}

          {/* Ações */}
          {!merit && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {mine && decidable && (
                <Button variant="outline" size="sm" disabled={busy} onClick={onContest}>
                  <MessageSquareWarning className="size-3.5" /> Contestar
                </Button>
              )}
              {canManage && decidable && (
                <>
                  <Button size="sm" disabled={busy} onClick={onConfirm}>
                    <Check className="size-3.5" /> Confirmar
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy} onClick={onCancel}>
                    <X className="size-3.5" /> Anular
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProposeForm({
  agentId, onCreated, post,
}: {
  agentId: string;
  onCreated: (e: QualityEvent) => void;
  post: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [target, setTarget] = React.useState(agentId);
  const [severity, setSeverity] = React.useState<QualitySeverity>("leve");
  const [category, setCategory] = React.useState<QualityCategory>("procedimento");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setBusy(true);
    const sev = SEVERITY[severity];
    const ev: QualityEvent = {
      id: `q-${Date.now()}`, kind: "infracao", agentId: target,
      category, severity, points: -sev.points, amount: sev.amount,
      reason: reason.trim(), status: "proposta",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onCreated(ev);
    await post({ action: "propose", agentId: target, severity, category, reason: reason.trim() });
    setReason("");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Gavel className="size-4 text-primary" /> Propor infração (coordenação/direção)
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Fica em <strong>proposta</strong>: o consultor é notificado e pode contestar antes de confirmares.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select className={box} value={target} onChange={(e) => setTarget(e.target.value)}>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={box} value={category} onChange={(e) => setCategory(e.target.value as QualityCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select className={box} value={severity} onChange={(e) => setSeverity(e.target.value as QualitySeverity)}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY[s].label} · {SEVERITY[s].points} pts{SEVERITY[s].amount ? ` · ${SEVERITY[s].amount}€` : ""}
            </option>
          ))}
        </select>
      </div>
      <input
        className={cn(box, "mt-2")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Descrição da ocorrência…"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={busy || !reason.trim()} onClick={submit}>
          <AlertTriangle className="size-3.5" /> {busy ? "A propor…" : "Propor infração"}
        </Button>
      </div>
    </div>
  );
}
