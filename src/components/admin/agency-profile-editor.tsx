"use client";

import * as React from "react";
import { AlertTriangle, Check, Eye, EyeOff, FileText, ImagePlus, Newspaper, Plus, Trash2, Upload, Wrench, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { downscaleImage } from "@/lib/img/downscale";
import { SaveBar, type SaveState } from "@/components/admin/save-bar";
import { AGENCY_DOCS, legalStatus, type AgencyDocKind } from "@/lib/data/agency-legal";
import type { Agency, AgencyNewsItem } from "@/lib/data/types";

const field = "mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";
const MAX_DOC = 2_500_000;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Ficha completa de UMA agência: serviços, notícias/comunicados locais, o que
 * mostrar na montra (ativos/vendidos/reservados), dados legais e apresentação
 * pública (descrição, fotos, prémios) — tudo persistido na tabela real
 * `agencies`, nunca só em localStorage. Grava automaticamente (debounced para
 * texto, imediato para ações discretas).
 */
export function AgencyProfileEditor({ agency, onSaved }: { agency: Agency; onSaved?: (next: Agency) => void }) {
  const [a, setA] = React.useState<Agency>(agency);
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newService, setNewService] = React.useState("");

  async function push(next: Agency) {
    setState("saving");
    try {
      const res = await fetch("/api/admin/agencies", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: agency.id,
          services: next.services ?? [],
          showActive: next.showActive !== false,
          showSold: next.showSold !== false,
          showReserved: next.showReserved !== false,
          news: next.news ?? [],
          description: next.description ?? "",
          photos: next.photos ?? [],
          prizes: next.prizes ?? [],
          amiLicense: next.amiLicense ?? "",
          amiExpires: next.amiExpires ?? "",
          nipc: next.nipc ?? "",
          cae: next.cae ?? "",
          legalEmail: next.legalEmail ?? "",
          docs: next.docs ?? {},
        }),
      });
      setState(res.ok ? "saved" : "error");
      if (res.ok) {
        onSaved?.(next);
        window.setTimeout(() => setState("idle"), 1800);
      }
    } catch {
      setState("error");
    }
  }
  // Texto debounced; ações (toggles/fotos/docs/prémios/notícias) gravam já.
  function set(next: Agency, immediate = false) {
    setA(next);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) void push(next);
    else timer.current = setTimeout(() => void push(next), 700);
  }
  const patch = (p: Partial<Agency>, immediate = false) => set({ ...a, ...p }, immediate);

  async function onDoc(kind: AgencyDocKind, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setState("optimizing");
    let url: string;
    if (f.type.startsWith("image/")) url = await downscaleImage(f, 1800, 0.8);
    else { if (f.size > MAX_DOC) { alert("Ficheiro grande demais (máx. ~2,5 MB)."); setState("idle"); return; } url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }); }
    patch({ docs: { ...a.docs, [kind]: url } }, true);
  }
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setState("optimizing");
    const img = await downscaleImage(f, 1600, 0.82);
    patch({ photos: [...(a.photos ?? []), img] }, true);
  }
  function addService() {
    const s = newService.trim();
    if (!s) return;
    patch({ services: [...(a.services ?? []), s] }, true);
    setNewService("");
  }
  function addNews() {
    const item: AgencyNewsItem = { id: newId("news"), title: "", body: "", date: new Date().toISOString().slice(0, 10) };
    patch({ news: [item, ...(a.news ?? [])] });
  }
  function patchNews(id: string, p: Partial<AgencyNewsItem>, immediate = false) {
    patch({ news: (a.news ?? []).map((n) => (n.id === id ? { ...n, ...p } : n)) }, immediate);
  }

  const legalDraft = { amiLicense: a.amiLicense ?? "", amiExpires: a.amiExpires ?? "", nipc: a.nipc ?? "", cae: a.cae ?? "", legalEmail: a.legalEmail ?? "", docs: a.docs ?? {} };
  const st = legalStatus(legalDraft);

  return (
    <div className="space-y-6 p-4">
      <SaveBar state={state} />

      {/* O que mostrar na montra pública */}
      <section>
        <h4 className="text-sm font-semibold text-foreground">O que aparece na montra pública</h4>
        <p className="mt-1 text-xs text-muted-foreground">A agência decide o que mostra — a equipa e os serviços aparecem sempre.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {([
            ["showActive", "Imóveis ativos"],
            ["showSold", "Últimos vendidos"],
            ["showReserved", "Em reserva"],
          ] as const).map(([key, label]) => {
            const on = a[key] !== false;
            return (
              <button
                key={key}
                onClick={() => patch({ [key]: !on } as Partial<Agency>, true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  on ? "border-primary/30 bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-secondary"
                )}
              >
                {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Serviços */}
      <section>
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Wrench className="size-4" /> Serviços</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {(a.services ?? []).map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
              {s}
              <button onClick={() => patch({ services: (a.services ?? []).filter((_, j) => j !== i) }, true)} aria-label="Remover serviço"><X className="size-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={cn(field, "mt-0 flex-1")} value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addService())} placeholder="ex.: Avaliação gratuita, Arrendamento, Consultoria de investimento…" />
          <button onClick={addService} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary"><Plus className="size-4" /> Adicionar</button>
        </div>
      </section>

      {/* Notícias locais / comunicados */}
      <section>
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Newspaper className="size-4" /> Notícias locais e comunicados</h4>
        <p className="mt-1 text-xs text-muted-foreground">Conquistas, eventos, novidades — só desta agência.</p>
        <div className="mt-2 space-y-3">
          {(a.news ?? []).map((n) => (
            <div key={n.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <input className={cn(field, "mt-0 flex-1")} value={n.title} onChange={(e) => patchNews(n.id, { title: e.target.value })} placeholder="Título" />
                <input type="date" className={cn(field, "mt-0 w-40")} value={n.date} onChange={(e) => patchNews(n.id, { date: e.target.value }, true)} />
                <button onClick={() => patch({ news: (a.news ?? []).filter((x) => x.id !== n.id) }, true)} className="grid size-9 shrink-0 place-items-center rounded-md border text-destructive hover:bg-destructive/5"><Trash2 className="size-4" /></button>
              </div>
              <textarea rows={2} className={field} value={n.body} onChange={(e) => patchNews(n.id, { body: e.target.value })} placeholder="Texto do comunicado…" />
            </div>
          ))}
          <button onClick={addNews} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="size-4" /> Nova notícia</button>
        </div>
      </section>

      {/* Apresentação pública */}
      <section>
        <h4 className="text-sm font-semibold text-foreground">Apresentação pública</h4>
        <label className="mt-2 block">
          <span className="text-sm font-medium">Descrição da agência</span>
          <textarea rows={3} className={field} value={a.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Uma equipa dedicada ao Algarve, com foco em…" />
        </label>

        <div className="mt-3">
          <span className="text-sm font-medium">Fotos</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {(a.photos ?? []).map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-24 rounded-lg object-cover" />
                <button onClick={() => patch({ photos: (a.photos ?? []).filter((_, j) => j !== i) }, true)} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-destructive text-white" aria-label="Remover foto"><X className="size-3" /></button>
              </div>
            ))}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-secondary">
              <ImagePlus className="size-4" /> Adicionar foto
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
          </div>
        </div>

        <div className="mt-3">
          <span className="text-sm font-medium">Prémios / reconhecimentos</span>
          <div className="mt-2 space-y-2">
            {(a.prizes ?? []).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={cn(field, "mt-0 flex-1")} value={p.title} onChange={(e) => patch({ prizes: (a.prizes ?? []).map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} placeholder="Prémio / distinção" />
                <input className={cn(field, "mt-0 w-24")} value={p.year ?? ""} onChange={(e) => patch({ prizes: (a.prizes ?? []).map((x, j) => j === i ? { ...x, year: e.target.value } : x) })} placeholder="Ano" />
                <button onClick={() => patch({ prizes: (a.prizes ?? []).filter((_, j) => j !== i) }, true)} className="grid size-9 shrink-0 place-items-center rounded-md border text-destructive hover:bg-destructive/5"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => patch({ prizes: [...(a.prizes ?? []), { title: "" }] })} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="size-4" /> Adicionar prémio</button>
          </div>
        </div>
      </section>

      {/* Dados legais */}
      <section>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Dados legais (obrigatório)</h4>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", st.complete ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive")}>
            {st.complete ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />} {st.complete ? "Conforme" : "Incompleta"}
          </span>
        </div>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-sm font-medium">Nº de licença AMI</span><input className={field} value={a.amiLicense ?? ""} onChange={(e) => patch({ amiLicense: e.target.value })} placeholder="18746" /></label>
          <label className="block"><span className="text-sm font-medium">Validade da AMI</span><input type="date" className={field} value={a.amiExpires ?? ""} onChange={(e) => patch({ amiExpires: e.target.value })} /></label>
          <label className="block"><span className="text-sm font-medium">NIPC</span><input className={field} value={a.nipc ?? ""} onChange={(e) => patch({ nipc: e.target.value })} placeholder="500000000" /></label>
          <label className="block"><span className="text-sm font-medium">CAE</span><input className={field} value={a.cae ?? ""} onChange={(e) => patch({ cae: e.target.value })} placeholder="68311" /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-medium">Email da direção / legal</span><input type="email" className={field} value={a.legalEmail ?? ""} onChange={(e) => patch({ legalEmail: e.target.value })} placeholder="direcao@housepro.pt" /></label>
        </div>
        {st.amiExpired && <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive"><AlertTriangle className="size-4" /> A licença AMI está fora de validade.</p>}

        <div className="mt-3 space-y-2">
          {AGENCY_DOCS.map((d) => {
            const has = Boolean(a.docs?.[d.kind]);
            return (
              <div key={d.kind} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                <FileText className={cn("size-4", has ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("flex-1", !has && "text-muted-foreground")}>{d.label}</span>
                {has && <a href={a.docs?.[d.kind]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">ver ✓</a>}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary">
                  <Upload className="size-3.5" /> {has ? "Trocar" : "Carregar"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onDoc(d.kind, e)} />
                </label>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
