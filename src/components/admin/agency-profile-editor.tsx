"use client";

import * as React from "react";
import { AlertTriangle, Check, FileText, ImagePlus, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { downscaleImage } from "@/lib/img/downscale";
import { SaveBar, type SaveState } from "@/components/admin/save-bar";
import { AGENCY_DOCS, blankLegal, legalStatus, type AgencyLegal, type AgencyDocKind } from "@/lib/data/agency-legal";

const field = "mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";
const MAX_DOC = 2_500_000;

/**
 * Ficha completa de UMA agência: dados legais + apresentação pública
 * (descrição, fotos, prémios) — tudo num só sítio, com gravação automática.
 */
export function AgencyProfileEditor({ agencyId }: { agencyId: string }) {
  const [legal, setLegal] = React.useState<AgencyLegal>(blankLegal());
  const [loaded, setLoaded] = React.useState(false);
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/brand/agency-legal")
      .then((r) => (r.ok ? r.json() : { config: {} }))
      .then((j) => {
        if (!alive) return;
        const map = (j.config ?? {}) as Record<string, AgencyLegal>;
        setLegal({ ...blankLegal(), ...(map[agencyId] ?? {}) });
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [agencyId]);

  async function push(next: AgencyLegal) {
    setState("saving");
    try {
      const res = await fetch("/api/brand/agency-legal", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: agencyId, legal: next }),
      });
      setState(res.ok ? "saved" : "error");
      if (res.ok) window.setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
    }
  }
  // Texto debounced; ações (fotos/docs/prémios) gravam já.
  function set(next: AgencyLegal, immediate = false) {
    setLegal(next);
    if (timer.current) clearTimeout(timer.current);
    if (immediate) void push(next);
    else timer.current = setTimeout(() => void push(next), 700);
  }
  const patch = (p: Partial<AgencyLegal>, immediate = false) => set({ ...legal, ...p }, immediate);

  async function onDoc(kind: AgencyDocKind, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setState("optimizing");
    let url: string;
    if (f.type.startsWith("image/")) url = await downscaleImage(f, 1800, 0.8);
    else { if (f.size > MAX_DOC) { alert("Ficheiro grande demais (máx. ~2,5 MB)."); setState("idle"); return; } url = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }); }
    patch({ docs: { ...legal.docs, [kind]: url } }, true);
  }
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setState("optimizing");
    const img = await downscaleImage(f, 1600, 0.82);
    patch({ photos: [...(legal.photos ?? []), img] }, true);
  }

  if (!loaded) return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A carregar ficha…</p>;

  const st = legalStatus(legal);

  return (
    <div className="space-y-6 p-4">
      <SaveBar state={state} />

      {/* Apresentação pública */}
      <section>
        <h4 className="text-sm font-semibold text-foreground">Apresentação pública</h4>
        <label className="mt-2 block">
          <span className="text-sm font-medium">Descrição da agência</span>
          <textarea rows={3} className={field} value={legal.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Uma equipa dedicada ao Algarve, com foco em…" />
        </label>

        <div className="mt-3">
          <span className="text-sm font-medium">Fotos</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {(legal.photos ?? []).map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-16 w-24 rounded-lg object-cover" />
                <button onClick={() => patch({ photos: (legal.photos ?? []).filter((_, j) => j !== i) }, true)} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-destructive text-white" aria-label="Remover foto"><X className="size-3" /></button>
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
            {(legal.prizes ?? []).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={cn(field, "mt-0 flex-1")} value={p.title} onChange={(e) => patch({ prizes: (legal.prizes ?? []).map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} placeholder="Prémio / distinção" />
                <input className={cn(field, "mt-0 w-24")} value={p.year ?? ""} onChange={(e) => patch({ prizes: (legal.prizes ?? []).map((x, j) => j === i ? { ...x, year: e.target.value } : x) })} placeholder="Ano" />
                <button onClick={() => patch({ prizes: (legal.prizes ?? []).filter((_, j) => j !== i) }, true)} className="grid size-9 shrink-0 place-items-center rounded-md border text-destructive hover:bg-destructive/5"><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button onClick={() => patch({ prizes: [...(legal.prizes ?? []), { title: "" }] })} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><Plus className="size-4" /> Adicionar prémio</button>
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
          <label className="block"><span className="text-sm font-medium">Nº de licença AMI</span><input className={field} value={legal.amiLicense} onChange={(e) => patch({ amiLicense: e.target.value })} placeholder="18746" /></label>
          <label className="block"><span className="text-sm font-medium">Validade da AMI</span><input type="date" className={field} value={legal.amiExpires} onChange={(e) => patch({ amiExpires: e.target.value })} /></label>
          <label className="block"><span className="text-sm font-medium">NIPC</span><input className={field} value={legal.nipc} onChange={(e) => patch({ nipc: e.target.value })} placeholder="500000000" /></label>
          <label className="block"><span className="text-sm font-medium">CAE</span><input className={field} value={legal.cae} onChange={(e) => patch({ cae: e.target.value })} placeholder="68311" /></label>
          <label className="block sm:col-span-2"><span className="text-sm font-medium">Email da direção / legal</span><input type="email" className={field} value={legal.legalEmail} onChange={(e) => patch({ legalEmail: e.target.value })} placeholder="direcao@housepro.pt" /></label>
        </div>
        {st.amiExpired && <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive"><AlertTriangle className="size-4" /> A licença AMI está fora de validade.</p>}

        <div className="mt-3 space-y-2">
          {AGENCY_DOCS.map((d) => {
            const has = Boolean(legal.docs[d.kind]);
            return (
              <div key={d.kind} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                <FileText className={cn("size-4", has ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("flex-1", !has && "text-muted-foreground")}>{d.label}</span>
                {has && <a href={legal.docs[d.kind]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">ver ✓</a>}
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
