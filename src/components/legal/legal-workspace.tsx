"use client";

import * as React from "react";
import {
  Check, FileText, MessageSquarePlus, Send, Share2, Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import {
  DOC_TYPE_LABEL, PARTY_ROLE_LABEL, STATUS_LABEL,
  type ChecklistItem, type LegalActivity, type LegalProcess, type LegalSection,
} from "@/lib/data/legalflow";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/**
 * Espaço de trabalho do processo LegalFlow. O advogado (ou coordenação)
 * constrói o documento por cláusulas e PARTILHA versões; as restantes partes
 * acompanham em tempo real e podem comentar. Estado guardado localmente (o
 * protótipo simula a partilha; a sincronização real chega com o Supabase).
 */
export function LegalWorkspace({
  process, actorName, canEditDoc, canManageChecklist,
}: {
  process: LegalProcess;
  actorName: string;
  canEditDoc: boolean;
  canManageChecklist: boolean;
}) {
  const key = `legal:${process.id}`;
  const [sections, setSections] = React.useState<LegalSection[]>(process.sections);
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>(process.checklist);
  const [activity, setActivity] = React.useState<LegalActivity[]>(process.activity);
  const [version, setVersion] = React.useState(process.docVersion);
  const [comment, setComment] = React.useState("");
  const [savedFlash, setSavedFlash] = React.useState(false);

  // Carrega o estado guardado (protótipo).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.sections) setSections(s.sections);
        if (s.checklist) setChecklist(s.checklist);
        if (s.activity) setActivity(s.activity);
        if (s.version) setVersion(s.version);
      }
    } catch {/* ignore */}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function persist(next: Partial<{ sections: LegalSection[]; checklist: ChecklistItem[]; activity: LegalActivity[]; version: number }>) {
    const snapshot = {
      sections: next.sections ?? sections,
      checklist: next.checklist ?? checklist,
      activity: next.activity ?? activity,
      version: next.version ?? version,
    };
    try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch {/* ignore */}
  }

  function setBody(id: string, body: string) {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, body } : s));
      persist({ sections: next });
      return next;
    });
  }

  function toggleDoc(id: string) {
    setChecklist((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c));
      persist({ checklist: next });
      return next;
    });
  }

  function addActivity(action: string) {
    const entry: LegalActivity = { id: `a-${Date.now()}`, actorName, action, when: "agora" };
    setActivity((prev) => {
      const next = [entry, ...prev];
      persist({ activity: next });
      return next;
    });
  }

  async function share() {
    const v = version + 1;
    setVersion(v);
    addActivity(`partilhou o ${DOC_TYPE_LABEL[process.type]} v${v}`);
    persist({ version: v });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    try {
      await fetch("/api/legal/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: process.ref, version: v, parties: process.parties.map((p) => p.id) }),
      });
    } catch {/* best-effort */}
  }

  function submitComment() {
    if (!comment.trim()) return;
    addActivity(`comentou: "${comment.trim()}"`);
    setComment("");
  }

  const st = STATUS_LABEL[process.status];
  const pendentes = checklist.filter((c) => !c.done).length;

  return (
    <div className="mt-4">
      {/* Cabeçalho do processo */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{process.ref}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", st.badge)}>
          <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{process.typeNote}</span>
      </div>
      <h1 className="mt-1 font-display text-2xl sm:text-3xl">{process.title}</h1>
      <p className="text-sm text-muted-foreground">{process.address}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Documento */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-display text-lg">
              <FileText className="size-5 text-primary" /> {DOC_TYPE_LABEL[process.type]} · v{version}
            </h2>
            {canEditDoc && (
              <Button size="sm" onClick={share}>
                <Share2 className="size-3.5" /> Partilhar atualização
              </Button>
            )}
          </div>
          {savedFlash && <p className="mt-1 text-xs text-primary">✓ Versão partilhada — todas as partes foram notificadas.</p>}

          <div className="mt-3 space-y-3">
            {sections.map((s, i) => (
              <div key={s.id} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-medium">{i + 1}. {s.title}</p>
                {canEditDoc ? (
                  <textarea
                    className={cn(box, "mt-2 min-h-20 resize-y")}
                    value={s.body}
                    onChange={(e) => setBody(s.id, e.target.value)}
                    placeholder="Redigir cláusula…"
                  />
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                    {s.body || <span className="italic">Por redigir pelo advogado.</span>}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!canEditDoc && (
            <div className="mt-4 rounded-xl border bg-card p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium"><MessageSquarePlus className="size-4 text-primary" /> Comentar / pedir esclarecimento</p>
              <div className="mt-2 flex gap-2">
                <input className={box} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="A sua nota para o advogado…" />
                <Button size="sm" onClick={submitComment} disabled={!comment.trim()}><Send className="size-3.5" /></Button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">
          {/* Progresso + checklist */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Documentos ({checklist.length - pendentes}/{checklist.length})</p>
              {pendentes > 0 && <span className="text-xs text-amber-600 dark:text-amber-400">{pendentes} pendente(s)</span>}
            </div>
            <ul className="mt-3 space-y-2">
              {checklist.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5">
                  <button
                    onClick={() => canManageChecklist && toggleDoc(c.id)}
                    disabled={!canManageChecklist}
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                      c.done ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
                      !canManageChecklist && "cursor-default opacity-80"
                    )}
                  >
                    {c.done && <Check className="size-3.5" />}
                  </button>
                  <span className={cn("text-sm", c.done && "text-muted-foreground line-through")}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Partes */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm font-medium"><Users className="size-4 text-primary" /> Intervenientes</p>
            <ul className="mt-3 space-y-2">
              {process.parties.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{PARTY_ROLE_LABEL[p.role]}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Atividade */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium">Atividade</p>
            <ul className="mt-3 space-y-2.5">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium">{a.actorName}</span> <span className="text-muted-foreground">{a.action}</span>
                  <span className="block text-xs text-muted-foreground">{a.when}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Financeiro */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium">Honorários & extras</p>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Pipeline</dt><dd className="tabular-nums">{formatEuro(process.financial.pipeline)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Extras aprovados</dt><dd className="tabular-nums">{formatEuro(process.financial.extras)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Pendente</dt><dd className="tabular-nums">{formatEuro(process.financial.pending)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
