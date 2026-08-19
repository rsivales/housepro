"use client";

import * as React from "react";
import { Save, Loader2, Check, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LEAD_FIELD_LABEL,
  type LeadForm,
  type LeadField,
  type FieldMapping,
} from "@/lib/data/meta";
import { detectUnmappedQuestions } from "@/lib/meta/ingest";

/**
 * Editor de mapeamento pergunta→campo por formulário. Para cada pergunta do
 * formulário Meta, escolhe-se o campo normalizado da lead (ou "resposta livre").
 * Guarda em /api/meta/mapping (persiste no Supabase; em demo devolve ok).
 */
export function FieldMapper({
  forms,
  mappings,
}: {
  forms: LeadForm[];
  mappings: Record<string, FieldMapping>;
}) {
  return (
    <div className="space-y-4">
      {forms.map((form) => (
        <FormCard key={form.id} form={form} mapping={mappings[form.id]} />
      ))}
      {forms.length === 0 && (
        <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Sem formulários. Os formulários chegam das campanhas Meta (Fase C).
        </p>
      )}
    </div>
  );
}

const FIELD_OPTIONS = Object.keys(LEAD_FIELD_LABEL) as LeadField[];

function FormCard({
  form,
  mapping,
}: {
  form: LeadForm;
  mapping?: FieldMapping;
}) {
  const initial: Record<string, LeadField> = {};
  for (const q of form.questions) {
    const found = mapping?.map.find((m) => m.questionKey === q.key);
    initial[q.key] = found?.leadField ?? guessField(q.key);
  }

  const [map, setMap] = React.useState<Record<string, LeadField>>(initial);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/meta/mapping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          map: form.questions.map((q) => ({
            questionKey: q.key,
            leadField: map[q.key],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível guardar.");
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  const unmapped = detectUnmappedQuestions(form, mapping);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <p className="font-medium">{form.name}</p>
        {unmapped.length > 0 && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">
            {unmapped.length} por mapear
          </span>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {form.questions.length} pergunta{form.questions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {form.questions.map((q) => (
          <div
            key={q.key}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{q.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {q.key} · {q.type}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <select
              value={map[q.key]}
              onChange={(e) =>
                setMap((prev) => ({ ...prev, [q.key]: e.target.value as LeadField }))
              }
              className="input w-48"
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {LEAD_FIELD_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : done ? (
            <Check className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {done ? "Guardado" : "Guardar mapeamento"}
        </Button>
      </div>
    </div>
  );
}

/** Palpite inicial do campo a partir da chave da pergunta. */
function guessField(key: string): LeadField {
  const k = key.toLowerCase();
  if (k.includes("name") || k.includes("nome")) return "name";
  if (k.includes("email")) return "email";
  if (k.includes("phone") || k.includes("telef") || k.includes("contact")) return "contact";
  if (k.includes("budget") || k.includes("orcamento") || k.includes("orçamento")) return "budget";
  if (k.includes("zone") || k.includes("zona") || k.includes("local")) return "zone";
  if (k.includes("message") || k.includes("obs") || k.includes("nota")) return "message";
  return "custom";
}
