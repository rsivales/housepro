"use client";

import * as React from "react";
import { Check, History, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuditEntry } from "@/lib/data/audit";
import { ENERGIAS, TIPOS, TIPOLOGIAS } from "@/lib/imovel/model";
import { commissionLabel } from "@/lib/data/commission";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

/** Campos editáveis — em paridade com o formulário de carregamento. */
export interface EditProperty {
  id: string;
  reference: string;
  title: string;
  operation: "venda" | "arrendamento";
  type: string;
  typology: string;
  price: number;
  commissionType: "percent" | "fixed";
  commissionPct: number | "";
  commissionFixed: number | "";
  area: number | "";
  beds: number | "";
  baths: number | "";
  constructionYear: number | "";
  energy: string;
  elevator: boolean;
  parish: string;
  municipality: string;
  district: string;
  sellerType: "particular" | "empresa";
  videoUrl: string;
  tourUrl: string;
  isDevelopment: boolean;
  developmentName: string;
  developmentStage: "planta" | "construcao" | "pronto" | "";
  developmentUnits: number | "";
  status: string;
  shortDescription: string;
  description: string;
}

const STATUS = ["", "novo", "destaque", "reduzido", "oportunidade", "reservado", "vendido"];
const STATUS_LABEL: Record<string, string> = {
  "": "— (sem etiqueta)", novo: "Novo", destaque: "Destaque", reduzido: "Preço reduzido",
  oportunidade: "Oportunidade", reservado: "Reservado", vendido: "Vendido",
};

/** Converte o valor de um campo numérico do input (aceita vazio). */
const num = (s: string): number | "" => (s.trim() === "" ? "" : Number(s.replace(/[^\d.]/g, "")) || 0);

export function PropertyEditForm({
  property, audit, demo,
}: {
  property: EditProperty;
  audit: AuditEntry[];
  demo?: boolean;
}) {
  const [form, setForm] = React.useState(property);
  const [history, setHistory] = React.useState<AuditEntry[]>(audit);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<null | "ok" | "noop" | "err">(null);

  function set<K extends keyof EditProperty>(k: K, v: EditProperty[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setMsg(null);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    // Envia TODOS os campos; o servidor calcula as diferenças e só aplica o que mudou.
    const patch: Record<string, unknown> = {
      title: form.title,
      operation: form.operation,
      type: form.type,
      typology: form.typology,
      price: Number(form.price) || 0,
      area: form.area === "" ? "" : Number(form.area),
      beds: form.beds === "" ? "" : Number(form.beds),
      baths: form.baths === "" ? "" : Number(form.baths),
      parish: form.parish,
      municipality: form.municipality,
      district: form.district,
      energy: form.energy,
      status: form.status,
      commissionType: form.commissionType,
      commissionPct: form.commissionPct === "" ? "" : Number(form.commissionPct),
      commissionFixed: form.commissionFixed === "" ? "" : Number(form.commissionFixed),
      sellerType: form.sellerType,
      videoUrl: form.videoUrl,
      tourUrl: form.tourUrl,
      constructionYear: form.constructionYear === "" ? "" : Number(form.constructionYear),
      elevator: form.elevator,
      isDevelopment: form.isDevelopment,
      developmentName: form.developmentName,
      developmentStage: form.developmentStage,
      developmentUnits: form.developmentUnits === "" ? "" : Number(form.developmentUnits),
      shortDescription: form.shortDescription,
      description: form.description,
    };
    try {
      const res = await fetch("/api/properties/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: property.id, patch }),
      });
      const data = await res.json();
      if (res.ok && data.noop) setMsg("noop");
      else if (res.ok && data.entry) { setHistory((h) => [data.entry, ...h]); setMsg("ok"); }
      else setMsg("err");
    } catch {
      setMsg("err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {demo && (
        <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          Modo demo: as alterações registam-se no histórico mas só persistem de verdade com o Supabase ligado.
        </p>
      )}

      {/* Identificação */}
      <Section title="Identificação">
        <Field label="Título">
          <input className={box} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Operação">
            <select className={box} value={form.operation} onChange={(e) => set("operation", e.target.value as EditProperty["operation"])}>
              <option value="venda">Venda</option>
              <option value="arrendamento">Arrendamento</option>
            </select>
          </Field>
          <Field label="Tipo">
            <select className={box} value={TIPOS.includes(form.type) ? form.type : ""} onChange={(e) => set("type", e.target.value)}>
              {!TIPOS.includes(form.type) && <option value="">{form.type || "—"}</option>}
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Tipologia">
            <select className={box} value={form.typology} onChange={(e) => set("typology", e.target.value)}>
              <option value="">—</option>
              {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Estado (etiqueta pública)">
          <select className={box} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
      </Section>

      {/* Preço & comissão */}
      <Section title="Preço & comissão">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Preço (€)">
            <input className={box} inputMode="numeric" value={form.price} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </Field>
          <Field label="Comissão" hint={`Em vigor: ${commissionLabel(Number(form.price) || 0, {
            commissionType: form.commissionType,
            commissionPct: form.commissionPct === "" ? undefined : Number(form.commissionPct),
            commissionFixed: form.commissionFixed === "" ? undefined : Number(form.commissionFixed),
          })} · interna.`}>
            <div className="flex gap-2">
              <select className={cn(box, "w-28 shrink-0")} value={form.commissionType} onChange={(e) => set("commissionType", e.target.value as EditProperty["commissionType"])}>
                <option value="percent">%</option>
                <option value="fixed">€ fixo</option>
              </select>
              {form.commissionType === "percent" ? (
                <input className={box} inputMode="decimal" value={form.commissionPct} onChange={(e) => set("commissionPct", num(e.target.value.replace(",", ".")))} placeholder="5" />
              ) : (
                <input className={box} inputMode="numeric" value={form.commissionFixed} onChange={(e) => set("commissionFixed", num(e.target.value))} placeholder="6000" />
              )}
            </div>
          </Field>
        </div>
      </Section>

      {/* Características */}
      <Section title="Características">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Área (m²)"><input className={box} inputMode="numeric" value={form.area} onChange={(e) => set("area", num(e.target.value))} /></Field>
          <Field label="Quartos"><input className={box} inputMode="numeric" value={form.beds} onChange={(e) => set("beds", num(e.target.value))} /></Field>
          <Field label="Casas de banho"><input className={box} inputMode="numeric" value={form.baths} onChange={(e) => set("baths", num(e.target.value))} /></Field>
          <Field label="Ano de construção"><input className={box} inputMode="numeric" value={form.constructionYear} onChange={(e) => set("constructionYear", num(e.target.value))} placeholder="2005" /></Field>
          <Field label="Certificado energético">
            <select className={box} value={form.energy} onChange={(e) => set("energy", e.target.value)}>
              <option value="">—</option>
              {ENERGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={form.elevator} onChange={(e) => set("elevator", e.target.checked)} className="size-4 accent-primary" />
            Elevador
          </label>
        </div>
      </Section>

      {/* Localização */}
      <Section title="Localização">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Freguesia"><Input value={form.parish} onChange={(e) => set("parish", e.target.value)} /></Field>
          <Field label="Concelho"><Input value={form.municipality} onChange={(e) => set("municipality", e.target.value)} /></Field>
          <Field label="Distrito"><Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Ex.: Faro" /></Field>
        </div>
      </Section>

      {/* Vendedor & multimédia */}
      <Section title="Vendedor & multimédia">
        <Field label="Tipo de vendedor">
          <div className="flex flex-wrap gap-2">
            {(["particular", "empresa"] as const).map((t) => (
              <button key={t} type="button" onClick={() => set("sellerType", t)}
                className={cn("rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                  form.sellerType === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary")}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link de vídeo (YouTube, Vimeo…)"><Input value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtu.be/..." /></Field>
          <Field label="Tour virtual 3D (Matterport…)"><Input value={form.tourUrl} onChange={(e) => set("tourUrl", e.target.value)} placeholder="https://my.matterport.com/..." /></Field>
        </div>
      </Section>

      {/* Empreendimento */}
      <Section title="Empreendimento novo (opcional)">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isDevelopment} onChange={(e) => set("isDevelopment", e.target.checked)} className="size-4 accent-primary" />
          É um empreendimento novo (nova construção)
        </label>
        {form.isDevelopment && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Nome do empreendimento"><Input value={form.developmentName} onChange={(e) => set("developmentName", e.target.value)} placeholder="Ex.: Jardins do Tejo" /></Field>
            <Field label="Fase da obra">
              <select className={box} value={form.developmentStage} onChange={(e) => set("developmentStage", e.target.value as EditProperty["developmentStage"])}>
                <option value="">—</option>
                <option value="planta">Em planta</option>
                <option value="construcao">Em construção</option>
                <option value="pronto">Pronto a habitar</option>
              </select>
            </Field>
            <Field label="Nº de frações"><input className={box} inputMode="numeric" value={form.developmentUnits} onChange={(e) => set("developmentUnits", num(e.target.value))} placeholder="24" /></Field>
          </div>
        )}
      </Section>

      {/* Descrição */}
      <Section title="Descrição">
        <Field label="Resumo (aparece nas listagens)">
          <input className={box} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
        </Field>
        <Field label="Descrição completa">
          <textarea className={cn(box, "min-h-28 resize-y")} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "A guardar…" : "Guardar alterações"}</Button>
        {msg === "ok" && <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="size-4" /> Guardado.</span>}
        {msg === "noop" && <span className="text-sm text-muted-foreground">Sem alterações.</span>}
        {msg === "err" && <span className="text-sm text-destructive">Falha ao guardar.</span>}
      </div>

      <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        As fotografias, plantas, documentos e etiquetas gerem-se em fatias próprias (a seguir). Aqui edita todos os
        dados do imóvel — os mesmos campos do carregamento.
      </p>

      {/* Histórico de rastreio */}
      <div>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="size-4" /> Histórico de alterações
        </h2>
        <ol className="mt-3 space-y-2">
          {history.map((e) => (
            <li key={e.id} className="rounded-xl border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-medium">{e.actorName}</span>
                  <span className="text-muted-foreground"> {e.action === "criou" ? "criou o imóvel" : "editou"}</span>
                  {e.actorRole && <span className="text-muted-foreground"> · {e.actorRole}</span>}
                </p>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              {e.changes && e.changes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                  {e.changes.map((c, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{c.field}:</span> {c.from} → {c.to}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {history.length === 0 && (
            <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Sem alterações registadas.</li>
          )}
        </ol>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </label>
  );
}
