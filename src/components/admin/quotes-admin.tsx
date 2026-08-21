"use client";

import * as React from "react";
import { Plus, Trash2, Save, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GENERAL_QUOTES, SPECIAL_QUOTES, type DailyQuote, type QuoteTag } from "@/lib/data/quotes";

/**
 * Gestão das frases diárias: a biblioteca base (só leitura) e as frases de
 * campanha / datas especiais (editáveis). Grava em site_settings via /api/brand/quotes.
 */
export function QuotesAdmin({ initial }: { initial: DailyQuote[] }) {
  const [extra, setExtra] = React.useState<DailyQuote[]>(initial);
  const [text, setText] = React.useState("");
  const [date, setDate] = React.useState("");
  const [tag, setTag] = React.useState<QuoteTag>("comemorativa");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState<null | "ok" | "demo" | "err">(null);

  function add() {
    if (!text.trim()) return;
    setExtra((p) => [...p, { text: text.trim(), date: date || undefined, tag }]);
    setText("");
    setDate("");
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/brand/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setSaved(data.demo ? "demo" : "ok");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Frases de campanha / datas especiais */}
      <section>
        <h2 className="font-display text-xl">Campanhas e datas especiais</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Frases que têm prioridade num dia específico (data MM-DD) ou entram na rotação geral.
        </p>

        <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="input" placeholder="Escreve a frase…" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Data (MM-DD)
              <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="12-25" className="input w-24" />
            </label>
            <select value={tag} onChange={(e) => setTag(e.target.value as QuoteTag)} className="input w-40">
              <option value="comemorativa">Comemorativa</option>
              <option value="objetivo">Objetivo</option>
              <option value="geral">Geral</option>
            </select>
            <Button size="sm" variant="ghost" onClick={add}><Plus className="size-4" /> Adicionar</Button>
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {extra.map((q, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border bg-card p-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{q.text}</p>
                {q.date && <p className="text-[11px] text-muted-foreground">Dia {q.date}</p>}
              </div>
              <button aria-label="Remover" onClick={() => setExtra((p) => p.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
          {extra.length === 0 && <li className="rounded-xl border border-dashed py-4 text-center text-xs text-muted-foreground">Sem frases de campanha.</li>}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved === "ok" || saved === "demo" ? <Check className="size-4" /> : <Save className="size-4" />}
            Guardar
          </Button>
          {saved === "demo" && <span className="text-xs text-muted-foreground">Guardado (demo — não persiste).</span>}
          {saved === "err" && <span className="text-xs text-destructive">Falha ao guardar.</span>}
        </div>
      </section>

      {/* Biblioteca base (leitura) */}
      <section>
        <h2 className="font-display text-xl">Biblioteca base</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {GENERAL_QUOTES.length} frases gerais + {SPECIAL_QUOTES.length} datas especiais. A app mostra “Frase do dia” e a data, sem contador.
        </p>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {GENERAL_QUOTES.map((q, i) => (
            <li key={i} className="rounded-lg border bg-card/60 px-3 py-2 text-xs text-muted-foreground">{q}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
