"use client";

import * as React from "react";
import {
  AlertTriangle, Award, Check, Gavel, Inbox, MessageSquareWarning,
  ShieldAlert, ShieldCheck, TrendingDown, Users, Wrench, X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { agents } from "@/lib/data/mock";
import {
  ABANDONO_RESIDUAL_PCT, CATEGORY_LABEL, KIND_LABEL, REFERRAL_STANDARD_PCT,
  SEVERITY, STATUS_LABEL, escalation, qualityScore,
  type QualityCategory, type QualityEvent, type QualitySeverity,
} from "@/lib/data/quality";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as QualityCategory[];
const SEVERITIES = Object.keys(SEVERITY) as QualitySeverity[];
const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export function QualityBoard({
  initial, meritBase, agentId, canManage,
}: {
  initial: QualityEvent[];
  meritBase: number;
  agentId: string;
  canManage: boolean;
}) {
  const [events, setEvents] = React.useState<QualityEvent[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const score = qualityScore(events, meritBase);

  const queue = events.filter((e) => e.status === "pendente");
  const ledger = events.filter((e) => e.status !== "pendente");

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

  async function resolve(e: QualityEvent) {
    setBusy(e.id);
    patch(e.id, { status: "resolvido" });
    await post({ action: "resolve", id: e.id });
    setBusy(null);
  }

  async function triage(e: QualityEvent, to: "reparo" | "infracao" | "arquivar", severity?: QualitySeverity) {
    setBusy(e.id);
    if (to === "arquivar") patch(e.id, { status: "arquivada" });
    else if (to === "reparo") patch(e.id, { kind: "reparo", status: "ativo" });
    else {
      const sev = SEVERITY[severity ?? "media"];
      patch(e.id, { kind: "infracao", status: "proposta", severity: severity ?? "media", points: -sev.points, amount: sev.amount });
    }
    await post({ action: "triage", id: e.id, agentId: e.agentId, to, severity });
    setBusy(null);
  }

  async function reassign(e: QualityEvent, toAgentId: string) {
    setBusy(e.id);
    patch(e.id, { kind: "reparo", category: "abandono", status: "resolvido", reassignedTo: toAgentId, residualPct: ABANDONO_RESIDUAL_PCT });
    await post({ action: "reassign", id: e.id, agentId: e.agentId, toAgentId });
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

      {/* Sinais */}
      <div className="flex flex-wrap gap-2 text-sm">
        {score.openReparos > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-700 dark:text-amber-300">
            <Wrench className="size-4" /> {score.openReparos} reparo(s) em aberto — corrige para não escalar
          </span>
        )}
        {score.pending > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1.5 text-sky-700 dark:text-sky-300">
            <MessageSquareWarning className="size-4" /> {score.pending} infração(ões) em devido processo
          </span>
        )}
        {canManage && score.queue > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-violet-700 dark:text-violet-300">
            <Inbox className="size-4" /> {score.queue} na fila de análise
          </span>
        )}
      </div>

      {/* Escada da Qualidade (explicação curta) */}
      <div className="rounded-xl border bg-secondary/40 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Como escala:</span>{" "}
        o portal do cliente entra na <strong>fila de análise</strong> (nunca pune sozinho) →{" "}
        a Qualidade regista um <strong>reparo</strong> (pedagógico, 0 pts) →{" "}
        se <strong>reincide</strong>, propõe <strong>infração</strong> (com devido processo) →{" "}
        em <strong>abandono de contacto</strong>, o contacto é reatribuído a um colega
        com <strong>{ABANDONO_RESIDUAL_PCT}%</strong> residual (vs {REFERRAL_STANDARD_PCT}% de referência).
      </div>

      {/* Fila de análise (só coordenação/direção) */}
      {canManage && queue.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Inbox className="size-4" /> Fila de análise (portal)
          </h2>
          {queue.map((e) => (
            <QueueRow key={e.id} e={e} busy={busy === e.id} onTriage={(to, sev) => triage(e, to, sev)} />
          ))}
        </div>
      )}

      {canManage && (
        <RegistarForm agentId={agentId} onCreated={(ev) => setEvents((p) => [ev, ...p])} post={post} />
      )}

      {/* Livro-razão */}
      <div className="space-y-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Livro-razão</h2>
        {ledger.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Sem registos. A tua reputação começa limpa.
          </p>
        )}
        {ledger.map((e) => (
          <EventRow
            key={e.id}
            e={e}
            mine={e.agentId === agentId}
            canManage={canManage}
            busy={busy === e.id}
            esc={e.kind === "reparo" && e.category ? escalation(events, e.agentId, e.category) : undefined}
            onContest={() => contest(e)}
            onConfirm={() => decide(e, "confirm")}
            onCancel={() => decide(e, "cancel")}
            onResolve={() => resolve(e)}
            onReassign={(to) => reassign(e, to)}
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

function QueueRow({
  e, busy, onTriage,
}: {
  e: QualityEvent; busy: boolean;
  onTriage: (to: "reparo" | "infracao" | "arquivar", severity?: QualitySeverity) => void;
}) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
          <Inbox className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{e.reason}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {e.category ? `${CATEGORY_LABEL[e.category]} · ` : ""}
            {e.submittedBy ? `${e.submittedBy} · ` : ""}
            {new Date(e.createdAt).toLocaleDateString("pt-PT")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onTriage("reparo")}>
              <Wrench className="size-3.5" /> Registar reparo
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onTriage("infracao", "media")}>
              <Gavel className="size-3.5" /> Propor infração
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onTriage("arquivar")}>
              <X className="size-3.5" /> Arquivar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventRow({
  e, mine, canManage, busy, esc, onContest, onConfirm, onCancel, onResolve, onReassign,
}: {
  e: QualityEvent; mine: boolean; canManage: boolean; busy: boolean;
  esc?: { reparos: number; suggestInfraction: boolean; suggestReassign: boolean };
  onContest: () => void; onConfirm: () => void; onCancel: () => void;
  onResolve: () => void; onReassign: (toAgentId: string) => void;
}) {
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [colega, setColega] = React.useState(agents.find((a) => a.id !== e.agentId)?.id ?? "");
  const merit = e.kind === "merito";
  const reparo = e.kind === "reparo";
  const sev = e.severity ? SEVERITY[e.severity] : undefined;
  const status = e.status ? STATUS_LABEL[e.status] : undefined;
  const decidable = e.status === "proposta" || e.status === "contestada";
  const reparoOpen = reparo && e.status === "ativo";

  const tone = merit
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : reparo
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "bg-destructive/10 text-destructive";

  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", tone)}>
          {merit ? <Award className="size-4" /> : reparo ? <Wrench className="size-4" /> : <ShieldAlert className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{e.reason}</p>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{KIND_LABEL[e.kind]}</span>
            {sev && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", sev.badge)}>{sev.label}</span>}
            {status && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", status.badge)}>{status.label}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {e.category ? `${CATEGORY_LABEL[e.category]} · ` : ""}
            {new Date(e.createdAt).toLocaleDateString("pt-PT")}
            {!reparo && (
              <>
                {" · "}
                <span className={merit ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                  {merit ? "+" : ""}{e.points} pts
                </span>
              </>
            )}
            {!merit && !reparo && e.amount > 0 && e.status === "confirmada" && ` · ${formatEuro(e.amount)}`}
            {e.reassignedTo && ` · reatribuído a ${agents.find((a) => a.id === e.reassignedTo)?.name ?? "colega"} (${e.residualPct ?? ABANDONO_RESIDUAL_PCT}%)`}
          </p>
          {e.contestNote && (
            <p className="mt-1.5 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
              Contestação: {e.contestNote}
            </p>
          )}

          {/* Sugestão de escalonamento (reincidência) */}
          {canManage && reparoOpen && esc?.suggestInfraction && (
            <p className="mt-1.5 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
              <AlertTriangle className="size-3.5" /> Reincidência ({esc.reparos}× {e.category ? CATEGORY_LABEL[e.category] : ""}) — considera propor infração ou reatribuir.
            </p>
          )}

          {/* Ações */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {mine && decidable && (
              <Button variant="outline" size="sm" disabled={busy} onClick={onContest}>
                <MessageSquareWarning className="size-3.5" /> Contestar
              </Button>
            )}
            {(mine || canManage) && reparoOpen && (
              <Button variant="outline" size="sm" disabled={busy} onClick={onResolve}>
                <Check className="size-3.5" /> Marcar resolvido
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
            {canManage && reparoOpen && (esc?.suggestReassign || e.category === "abandono" || e.category === "atraso") && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setReassignOpen((v) => !v)}>
                <Users className="size-3.5" /> Reatribuir (abandono)
              </Button>
            )}
          </div>

          {/* Painel de reatribuição */}
          {reassignOpen && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border bg-secondary/40 p-2.5">
              <span className="text-xs text-muted-foreground">Passar contacto a:</span>
              <select className={cn(box, "w-auto")} value={colega} onChange={(ev) => setColega(ev.target.value)}>
                {agents.filter((a) => a.id !== e.agentId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <Button size="sm" disabled={busy || !colega} onClick={() => { onReassign(colega); setReassignOpen(false); }}>
                Confirmar ({ABANDONO_RESIDUAL_PCT}% residual)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegistarForm({
  agentId, onCreated, post,
}: {
  agentId: string;
  onCreated: (e: QualityEvent) => void;
  post: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [kind, setKind] = React.useState<"reparo" | "infracao">("reparo");
  const [target, setTarget] = React.useState(agentId);
  const [severity, setSeverity] = React.useState<QualitySeverity>("leve");
  const [category, setCategory] = React.useState<QualityCategory>("procedimento");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setBusy(true);
    if (kind === "reparo") {
      const ev: QualityEvent = {
        id: `q-${Date.now()}`, kind: "reparo", agentId: target,
        category, points: 0, amount: 0, reason: reason.trim(),
        status: "ativo", origin: "manual",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onCreated(ev);
      await post({ action: "reparo", agentId: target, category, reason: reason.trim() });
    } else {
      const sev = SEVERITY[severity];
      const ev: QualityEvent = {
        id: `q-${Date.now()}`, kind: "infracao", agentId: target,
        category, severity, points: -sev.points, amount: sev.amount,
        reason: reason.trim(), status: "proposta",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      onCreated(ev);
      await post({ action: "propose", agentId: target, severity, category, reason: reason.trim() });
    }
    setReason("");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Gavel className="size-4 text-primary" /> Registar ocorrência (coordenação/direção)
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        <strong>Reparo</strong> = aviso pedagógico (0 pts). <strong>Infração</strong> fica em
        proposta: o consultor é notificado e pode contestar antes de confirmares.
      </p>

      {/* Tipo */}
      <div className="mt-3 inline-flex rounded-lg border p-0.5 text-sm">
        {(["reparo", "infracao"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md px-3 py-1 transition-colors",
              kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {k === "reparo" ? "Reparo" : "Infração"}
          </button>
        ))}
      </div>

      <div className={cn("mt-3 grid gap-2", kind === "infracao" ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <select className={box} value={target} onChange={(e) => setTarget(e.target.value)}>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={box} value={category} onChange={(e) => setCategory(e.target.value as QualityCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        {kind === "infracao" && (
          <select className={box} value={severity} onChange={(e) => setSeverity(e.target.value as QualitySeverity)}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY[s].label} · {SEVERITY[s].points} pts{SEVERITY[s].amount ? ` · ${SEVERITY[s].amount}€` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <input
        className={cn(box, "mt-2")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Descrição da ocorrência…"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" disabled={busy || !reason.trim()} onClick={submit}>
          {kind === "reparo" ? <Wrench className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {busy ? "A registar…" : kind === "reparo" ? "Registar reparo" : "Propor infração"}
        </Button>
      </div>
    </div>
  );
}
