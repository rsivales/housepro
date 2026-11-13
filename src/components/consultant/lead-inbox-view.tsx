"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

type InboxState = { read: string[]; hidden: string[] };
const empty: InboxState = { read: [], hidden: [] };
const keyFor = (agentId: string) => `helix:lead-inbox:${agentId}`;

function load(agentId: string): InboxState {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(agentId)) ?? "null");
    return {
      read: Array.isArray(value?.read) ? value.read : [],
      hidden: Array.isArray(value?.hidden) ? value.hidden : [],
    };
  } catch {
    return empty;
  }
}

function save(agentId: string, state: InboxState) {
  try {
    localStorage.setItem(keyFor(agentId), JSON.stringify(state));
  } catch {
    // The current view remains usable if the browser blocks storage.
  }
}

export function MarkLeadRead({ agentId, leadId }: { agentId: string; leadId: string }) {
  useEffect(() => {
    const state = load(agentId);
    if (!state.read.includes(leadId)) save(agentId, { ...state, read: [...state.read, leadId] });
  }, [agentId, leadId]);
  return null;
}

export function LeadInboxView({ agentId, cards }: {
  agentId: string;
  cards: { id: string; content: ReactNode }[];
}) {
  const [state, setState] = useState(empty);
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => {
    const sync = () => setState(load(agentId));
    sync();
    window.addEventListener("pageshow", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("storage", sync);
    };
  }, [agentId]);
  const read = new Set(state.read);
  const hidden = new Set(state.hidden);
  const readVisible = cards.filter(({ id }) => read.has(id) && !hidden.has(id));
  const hiddenCount = cards.filter(({ id }) => hidden.has(id)).length;
  const visible = cards.filter(({ id }) => showHidden || !hidden.has(id));

  return <>
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <button type="button" disabled={!readVisible.length} className="rounded-full border bg-card px-3 py-1.5 disabled:opacity-50" onClick={() => {
        const next = { ...state, hidden: [...state.hidden, ...readVisible.map(({ id }) => id)] };
        setState(next);
        save(agentId, next);
      }}>Limpar leads lidas{readVisible.length > 0 && ` (${readVisible.length})`}</button>
      {hiddenCount > 0 && <button type="button" aria-pressed={showHidden} className="rounded-full border bg-card px-3 py-1.5" onClick={() => setShowHidden(!showHidden)}>
        {showHidden ? "Ocultar leads lidas" : `Mostrar ocultas (${hiddenCount})`}
      </button>}
      <Link href="/app/leads" className="text-primary hover:underline">Ver todos os pedidos e leads</Link>
    </div>
    {visible.length > 0 ? <ul className="mt-4 space-y-3">{visible.map(({ id, content }) =>
      <li key={id} className="rounded-2xl border bg-card p-4 shadow-sm">
        {read.has(id) && <p className="mb-2 text-xs text-muted-foreground">Lida{hidden.has(id) ? " · Oculta no início" : ""}</p>}
        {content}
      </li>
    )}</ul> : <p className="mt-4 rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground" role="status">
      {hiddenCount ? "As leads lidas foram ocultadas deste ecrã. Continuam disponíveis em Pedidos e leads." : "Ainda sem contactos."}
    </p>}
  </>;
}
