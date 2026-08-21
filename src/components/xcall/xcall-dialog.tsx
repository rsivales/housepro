"use client";

import * as React from "react";
import { Phone, X, Loader2, Check, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CALL_SCRIPTS,
  CALL_RESULT_LABEL,
  scriptByKey,
  suggestedScript,
  nextTaskForResult,
  type CallScriptKey,
  type CallResult,
  type CallTemperature,
} from "@/lib/data/xcall";

interface Props {
  contactId?: string;
  contactName: string;
  phone?: string;
  leadId?: string;
  /** Pista para sugerir o guião (tipo de contacto/pipeline). */
  scriptHint?: string;
  label?: string;
  size?: "sm" | "default";
}

/**
 * X Call — botão "Ligar" que abre o assistente de chamada: guião + objetivo +
 * perguntas essenciais, marcador via tel:, e captura do resultado (que propaga
 * para a cronologia, próxima tarefa e estado da lead).
 */
export function XCallButton(props: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size={props.size ?? "sm"} onClick={() => setOpen(true)}>
        <Phone className="size-4" /> {props.label ?? "Ligar"}
      </Button>
      {open && <XCallDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function XCallDialog({
  contactId,
  contactName,
  phone,
  leadId,
  scriptHint,
  onClose,
}: Props & { onClose: () => void }) {
  const [scriptKey, setScriptKey] = React.useState<CallScriptKey>(suggestedScript(scriptHint));
  const [phase, setPhase] = React.useState<"prep" | "result">("prep");
  const [result, setResult] = React.useState<CallResult>("atendeu");
  const [temperature, setTemperature] = React.useState<CallTemperature | "">("");
  const [notes, setNotes] = React.useState("");
  const [nextTitle, setNextTitle] = React.useState("");
  const [lostReason, setLostReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const script = scriptByKey(scriptKey);
  const opening = script.opening.replace("{nome}", contactName.split(" ")[0] ?? contactName);

  React.useEffect(() => {
    const suggestion = nextTaskForResult(result);
    setNextTitle(suggestion?.title ?? "");
  }, [result]);

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/xcall", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scriptKey,
          result,
          contactId,
          contactName,
          leadId,
          objective: script.objective,
          temperature: temperature || undefined,
          notes: notes || undefined,
          nextTaskTitle: nextTitle || undefined,
          lostReason: result === "sem_interesse" ? lostReason || undefined : undefined,
        }),
      });
      setDone(true);
      setTimeout(onClose, 800);
    } catch {
      setBusy(false);
    }
  }

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
            <p className="text-xs font-medium text-primary">X Call</p>
            <h2 className="font-display text-xl leading-tight">{contactName}</h2>
            {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-secondary">
            <X className="size-5" />
          </button>
        </div>

        {phase === "prep" ? (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Guião</span>
              <select value={scriptKey} onChange={(e) => setScriptKey(e.target.value as CallScriptKey)} className="input">
                {CALL_SCRIPTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-secondary/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objetivo</p>
              <p className="mt-1 text-sm">{script.objective}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abertura</p>
              <p className="mt-1 text-sm italic">“{opening}”</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perguntas essenciais</p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                {script.questions.map((q) => (<li key={q}>{q}</li>))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                >
                  <PhoneCall className="size-4" /> Abrir marcador
                </a>
              )}
              <Button variant="ghost" onClick={() => setPhase("result")}>
                Terminei — registar resultado
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Resultado</span>
              <select value={result} onChange={(e) => setResult(e.target.value as CallResult)} className="input">
                {(Object.keys(CALL_RESULT_LABEL) as CallResult[]).map((r) => (
                  <option key={r} value={r}>{CALL_RESULT_LABEL[r]}</option>
                ))}
              </select>
            </label>

            <div className="flex gap-2">
              {(["quente", "morna", "fria"] as CallTemperature[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemperature(temperature === t ? "" : t)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    temperature === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Notas</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" placeholder="O que ficou combinado?" />
            </label>

            {result === "sem_interesse" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Motivo de perda</span>
                <input value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="input" />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Próxima tarefa (opcional)</span>
              <input value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} className="input" placeholder="Ex.: voltar a ligar amanhã" />
            </label>

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={save} disabled={busy || done}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : null}
                {done ? "Registado" : "Guardar chamada"}
              </Button>
              <Button variant="ghost" onClick={() => setPhase("prep")}>Voltar ao guião</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
