"use client";

import * as React from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  StickyNote,
  CalendarCheck,
  Home,
  Handshake,
  FileText,
  Loader2,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACTIVITY_LABEL,
  type ContactActivity,
  type ActivityType,
} from "@/lib/data/contacts";

const ICON: Record<ActivityType, typeof Phone> = {
  lead: MessageSquare,
  call: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  note: StickyNote,
  task: CalendarCheck,
  visit: CalendarCheck,
  stage: Home,
  deal: Handshake,
  document: FileText,
  system: StickyNote,
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });

/**
 * Cronologia única do contacto + acrescentar uma nota/registo. Os novos eventos
 * aparecem no topo. Escreve em /api/contacts/activity (best-effort em demo).
 */
export function ContactTimeline({
  contactId,
  initial,
}: {
  contactId: string;
  initial: ContactActivity[];
}) {
  const [items, setItems] = React.useState<ContactActivity[]>(initial);
  const [type, setType] = React.useState<ActivityType>("note");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const title = type === "note" ? "Nota" : ACTIVITY_LABEL[type];
    const optimistic: ContactActivity = {
      id: `tmp-${Date.now()}`,
      contactId,
      type,
      title,
      body: text.trim(),
      at: new Date().toISOString(),
    };
    try {
      await fetch("/api/contacts/activity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId, type, title, body: text.trim() }),
      });
      setItems((prev) => [optimistic, ...prev]);
      setText("");
    } catch {
      /* best-effort */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Registar */}
      <form onSubmit={add} className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {(["note", "call", "email", "whatsapp", "visit"] as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {ACTIVITY_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Registar na cronologia…"
            className="input flex-1"
          />
          <Button type="submit" size="sm" disabled={busy || !text.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>

      {/* Cronologia */}
      <ol className="mt-4 space-y-3">
        {items.map((a) => {
          const Icon = ICON[a.type] ?? StickyNote;
          return (
            <li key={a.id} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmt(a.at)}</span>
                </div>
                {a.body && <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>}
                {(a.actorName || a.propertyRef) && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[a.actorName, a.propertyRef].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Sem atividade ainda.
          </li>
        )}
      </ol>
    </div>
  );
}
