"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

type InboxState = { read: string[]; hidden: string[] };
const empty: InboxState = { read: [], hidden: [] };
const preference = "helix:lead-inbox";
const keyFor = (agentId: string) => `${preference}:${agentId}`;
function clean(value: unknown): InboxState {
  const v = value as Partial<InboxState> | null;
  return {
    read: Array.isArray(v?.read) ? v.read.filter((id) => typeof id === "string") : [],
    hidden: Array.isArray(v?.hidden) ? v.hidden.filter((id) => typeof id === "string") : [],
  };
}
function load(agentId: string): InboxState {
  try { return clean(JSON.parse(localStorage.getItem(keyFor(agentId)) ?? "null")); } catch { return empty; }
}
async function sync(agentId: string) {
  const response = await fetch("/api/me/settings");
  if (!response.ok) return load(agentId);
  const result = await response.json();
  if (result.persisted && result.settings?.[preference]) {
    const state = clean(result.settings[preference]);
    localStorage.setItem(keyFor(agentId), JSON.stringify(state));
    return state;
  }
  return load(agentId);
}
async function save(agentId: string, state: InboxState) {
  try { localStorage.setItem(keyFor(agentId), JSON.stringify(state)); } catch {}
  const response = await fetch("/api/me/settings", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch: { [preference]: state } }),
  });
  if (!response.ok) throw new Error("Não foi possível guardar a alteração na conta.");
}
export function MarkLeadRead({ agentId, leadId }: { agentId: string; leadId: string }) {
  useEffect(() => {
    void sync(agentId).then((state) => {
      if (!state.read.includes(leadId)) return save(agentId, { ...state, read: [...state.read, leadId] });
    }).catch(() => {});
  }, [agentId, leadId]);
  return null;
}
export function LeadInboxView({ agentId, cards, expanded = false }: {
  agentId: string; cards: { id: string; content: ReactNode }[]; expanded?: boolean;
}) {
  const [state, setState] = useState(empty);
  const [ready, setReady] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setState(load(agentId));
      void sync(agentId).then((value) => { if (active) setState(value); }).catch(() => {}).finally(() => { if (active) setReady(true); });
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("pageshow", refresh); window.removeEventListener("focus", refresh); };
  }, [agentId]);
  const read = new Set(state.read), hidden = new Set(state.hidden);
  const unread = cards.filter(({ id }) => !read.has(id) && !hidden.has(id));
  const readVisible = cards.filter(({ id }) => read.has(id) && !hidden.has(id));
  const hiddenCount = cards.filter(({ id }) => hidden.has(id)).length;
  const visible = expanded ? cards.filter(({ id }) => showHidden || !hidden.has(id)) : unread.slice(0, 5);
  async function change(next: InboxState) {
    setBusy(true); setError("");
    try { await save(agentId, next); setState(next); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar."); } finally { setBusy(false); }
  }
  return <>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{ready ? `${unread.length} por ler` : "A carregar…"}</span>
      {!expanded && <Link href="/app/leads" className="text-primary hover:underline">Ver todos e gerir pedidos</Link>}
      {expanded && <>
        <button type="button" disabled={busy || !readVisible.length} className="rounded-full border bg-card px-3 py-1.5 disabled:opacity-50"
          onClick={() => void change({ ...state, hidden: [...state.hidden, ...readVisible.map(({ id }) => id)] })}>Limpar lidas ({readVisible.length})</button>
        {hiddenCount > 0 && <button type="button" onClick={() => setShowHidden(!showHidden)} aria-pressed={showHidden} className="text-primary">
          {showHidden ? "Ocultar removidas" : `Mostrar removidas (${hiddenCount})`}
        </button>}
      </>}
    </div>
    {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    {ready && visible.length > 0 ? <ul className="mt-4 space-y-3">{visible.map(({ id, content }) =>
      <li key={id} className="rounded-2xl border bg-card p-4 shadow-sm">
        {expanded && <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <span>{read.has(id) ? "Lida" : "Por ler"}{hidden.has(id) ? " · Removida da lista" : ""}</span>
          {!read.has(id) && <button disabled={busy} className="text-primary" onClick={() => void change({ ...state, read: [...state.read, id] })}>Marcar como lida</button>}
          <button disabled={busy} className="text-primary" onClick={() => void change({ ...state, hidden: hidden.has(id) ? state.hidden.filter((x) => x !== id) : [...state.hidden, id] })}>{hidden.has(id) ? "Repor" : "Remover da lista"}</button>
        </div>}
        {content}
      </li>
    )}</ul> : ready ? <p className="mt-4 rounded-2xl border border-dashed p-5 text-sm text-muted-foreground" role="status">{expanded ? "Sem pedidos nesta lista." : "Todos os pedidos foram lidos."}</p> : null}
    {!expanded && ready && unread.length > 5 && <Link className="mt-3 inline-block text-sm font-semibold text-primary" href="/app/leads">Ver mais {unread.length - 5} por ler</Link>}
  </>;
}
