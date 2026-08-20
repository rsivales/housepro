"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { VACANCIES, type Vacancy } from "@/lib/data/careers";
import { readVacancies, writeVacancies, newId } from "@/lib/data/site-content";

const field = "mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function VagasAdminPage() {
  const [vacancies, setVacancies] = React.useState<Vacancy[]>(VACANCIES);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setVacancies(readVacancies()), []);

  function persist(next: Vacancy[]) {
    setVacancies(next);
    writeVacancies(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  function patch(id: string, p: Partial<Vacancy>) {
    persist(vacancies.map((v) => (v.id === id ? { ...v, ...p } : v)));
  }
  function add() {
    persist([...vacancies, { id: newId("vaga"), title: "Nova vaga", location: "Algarve", type: "Full-time", summary: "", active: true }]);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link href="/admin/website" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Website público
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl">Vagas (carreiras)</h1>
          <button onClick={add} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="size-4" /> Nova vaga
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          As vagas ativas aparecem em /carreiras. {saved && <span className="font-medium text-emerald-600">✓ Guardado</span>}
        </p>

        <div className="mt-6 space-y-4">
          {vacancies.map((v) => (
            <div key={v.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => patch(v.id, { active: !v.active })}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                >
                  {v.active ? <Eye className="size-3.5 text-emerald-600" /> : <EyeOff className="size-3.5" />}
                  {v.active ? "Ativa" : "Inativa"}
                </button>
                <button onClick={() => persist(vacancies.filter((x) => x.id !== v.id))} className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
                  <Trash2 className="size-4" /> Remover
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium">Título</span>
                  <input className={field} value={v.title} onChange={(e) => patch(v.id, { title: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Localização</span>
                  <input className={field} value={v.location} onChange={(e) => patch(v.id, { location: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Tipo</span>
                  <input className={field} value={v.type} onChange={(e) => patch(v.id, { type: e.target.value })} placeholder="Full-time" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium">Resumo</span>
                  <textarea className={field} rows={2} value={v.summary} onChange={(e) => patch(v.id, { summary: e.target.value })} />
                </label>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => persist(VACANCIES)} className="mt-6 rounded-md border px-4 py-2 text-sm hover:bg-secondary">
          Repor vagas por defeito
        </button>
      </main>
    </div>
  );
}
