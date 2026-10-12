"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CAMPAIGN_TYPE_LABEL, type LeadFormQuestion } from "@/lib/data/meta";

interface CampaignOption {
  id: string;
  name: string;
  type: keyof typeof CAMPAIGN_TYPE_LABEL;
}

/**
 * Regista um formulário Meta novo: o ID do formulário (Gestor de Anúncios →
 * Publicação → Biblioteca de formulários → ⋯ → Pré-visualizar, mostra o ID),
 * a que campanha pertence, e as perguntas que tem (para depois mapear em
 * "Formulários & mapeamento"). Fecha o ciclo de self-service — sem isto só um
 * developer conseguia ligar um formulário novo ao CRM.
 */
export function NewForm({ campaigns }: { campaigns: CampaignOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [metaFormId, setMetaFormId] = React.useState("");
  const [name, setName] = React.useState("");
  const [campaignId, setCampaignId] = React.useState(campaigns[0]?.id ?? "");
  const [questions, setQuestions] = React.useState<LeadFormQuestion[]>([
    { key: "full_name", label: "Nome", type: "text" },
    { key: "phone_number", label: "Telefone", type: "phone" },
  ]);

  function updateQuestion(i: number, patch: Partial<LeadFormQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metaFormId: metaFormId.trim(),
          name: name.trim(),
          campaignId: campaignId || undefined,
          questions: questions.filter((q) => q.key.trim() && q.label.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível registar.");
      setDone(true);
      setMetaFormId("");
      setName("");
      router.refresh();
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Button size="sm" onClick={() => setOpen((v) => !v)}>
        <Plus className="size-4" /> Novo formulário
      </Button>

      {open && (
        <form onSubmit={submit} className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ID do formulário no Meta">
              <input
                required
                value={metaFormId}
                onChange={(e) => setMetaFormId(e.target.value)}
                placeholder="Ex.: 123456789012345"
                className="input"
              />
            </Field>
            <Field label="Nome (para identificares aqui)">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Angariação proprietários — Out26"
                className="input"
              />
            </Field>
            <Field label="Campanha" className="sm:col-span-2">
              <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="input">
                <option value="">— sem campanha (fica por mapear) —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {CAMPAIGN_TYPE_LABEL[c.type]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Perguntas do formulário (chave tal como vem do Meta → rótulo para mostrar aqui)
            </p>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={q.key}
                    onChange={(e) => updateQuestion(i, { key: e.target.value })}
                    placeholder="chave (ex.: full_name)"
                    className="input flex-1"
                  />
                  <input
                    value={q.label}
                    onChange={(e) => updateQuestion(i, { label: e.target.value })}
                    placeholder="rótulo"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remover pergunta"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setQuestions((prev) => [...prev, { key: "", label: "", type: "text" }])}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              + Adicionar pergunta
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" /> : <Plus className="size-4" />}
              {done ? "Registado" : "Registar formulário"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
