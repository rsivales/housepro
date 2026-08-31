"use client";

import * as React from "react";
import { AlertTriangle, Check, FileText, Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downscaleImage } from "@/lib/img/downscale";
import {
  AGENCY_DOCS, blankLegal, legalStatus, LEGAL_STORAGE_KEY,
  type AgencyLegal, type AgencyDocKind,
} from "@/lib/data/agency-legal";

interface AgencyRow { id: string; name: string; region: string }
type Store = Record<string, AgencyLegal>;

const MAX_DOC_BYTES = 2_500_000; // ~2,5 MB por comprovativo (sem bucket)

/** Aproxima o tamanho em bytes de um data URL base64. */
function dataUrlBytes(url: string): number {
  const i = url.indexOf(",");
  return i < 0 ? url.length : Math.floor((url.length - i - 1) * 0.75);
}

/**
 * Gestão dos dados legais das agências, com gravação automática no Supabase
 * (site_settings via /api/brand/agency-legal). O localStorage fica como cache
 * e fallback (modo demo). Imagens são comprimidas; PDFs têm limite de tamanho.
 */
export function AgencyLegalManager({ agencies, initial }: { agencies: AgencyRow[]; initial: Store }) {
  const [store, setStore] = React.useState<Store>(initial ?? {});
  const [openId, setOpenId] = React.useState<string>(agencies[0]?.id ?? "");
  const [status, setStatus] = React.useState<Record<string, "saving" | "ok" | "err" | "demo">>({});
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Migração/So-offline: junta valores do localStorage que ainda não estão no servidor.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
      if (!raw) return;
      const local = JSON.parse(raw) as Store;
      setStore((cur) => {
        const merged = { ...cur };
        for (const [id, v] of Object.entries(local)) if (!merged[id]) merged[id] = v;
        return merged;
      });
    } catch {
      /* ignore */
    }
  }, []);

  function cacheLocal(next: Store) {
    try { localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  async function persist(id: string, legal: AgencyLegal) {
    setStatus((s) => ({ ...s, [id]: "saving" }));
    try {
      const res = await fetch("/api/brand/agency-legal", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, legal }),
      });
      setStatus((s) => ({ ...s, [id]: res.ok ? "ok" : res.status === 401 ? "demo" : "err" }));
    } catch {
      setStatus((s) => ({ ...s, [id]: "err" }));
    } finally {
      setTimeout(() => setStatus((s) => (s[id] === "saving" ? s : { ...s, [id]: s[id] })), 2000);
    }
  }

  function scheduleSave(id: string, legal: AgencyLegal) {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => persist(id, legal), 700);
  }

  function patch(id: string, p: Partial<AgencyLegal>, immediate = false) {
    setStore((cur) => {
      const legal = { ...(cur[id] ?? blankLegal()), ...p };
      const next = { ...cur, [id]: legal };
      cacheLocal(next);
      if (immediate) persist(id, legal); else scheduleSave(id, legal);
      return next;
    });
  }

  async function onDoc(id: string, kind: AgencyDocKind, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    let url: string;
    if (f.type.startsWith("image/")) {
      url = await downscaleImage(f, 1800, 0.8);
    } else {
      if (f.size > MAX_DOC_BYTES) {
        alert("O ficheiro é demasiado grande (máx. ~2,5 MB). Comprime o PDF ou usa uma imagem.");
        return;
      }
      url = await new Promise<string>((res) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.readAsDataURL(f);
      });
    }
    if (dataUrlBytes(url) > MAX_DOC_BYTES) {
      alert("O comprovativo ficou demasiado grande. Usa um ficheiro mais pequeno.");
      return;
    }
    const cur = store[id] ?? blankLegal();
    patch(id, { docs: { ...cur.docs, [kind]: url } }, true);
  }

  const badge = (id: string) => {
    const s = status[id];
    if (s === "saving") return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> a guardar…</span>;
    if (s === "ok") return <span className="inline-flex items-center gap-1 text-xs text-primary"><Check className="size-3.5" /> guardado</span>;
    if (s === "demo") return <span className="text-xs text-muted-foreground">guardado localmente (demo)</span>;
    if (s === "err") return <span className="text-xs text-destructive">falha ao guardar</span>;
    return null;
  };

  return (
    <div className="mt-6 space-y-3">
      {agencies.map((a) => {
        const legal = store[a.id] ?? blankLegal();
        const st = legalStatus(legal);
        const open = openId === a.id;
        return (
          <div key={a.id} className="rounded-2xl border bg-card shadow-sm">
            <button type="button" onClick={() => setOpenId(open ? "" : a.id)} className="flex w-full items-center gap-3 p-4 text-left">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.region}</p>
              </div>
              {badge(a.id)}
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                st.complete ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                {st.complete ? <Check className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                {st.complete ? "Conforme" : "Incompleta"}
              </span>
            </button>

            {open && (
              <div className="border-t p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nº de licença AMI</Label>
                    <Input value={legal.amiLicense} onChange={(e) => patch(a.id, { amiLicense: e.target.value })} placeholder="AMI 0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validade da AMI</Label>
                    <Input type="date" value={legal.amiExpires} onChange={(e) => patch(a.id, { amiExpires: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>NIPC</Label>
                    <Input value={legal.nipc} onChange={(e) => patch(a.id, { nipc: e.target.value })} placeholder="500000000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CAE</Label>
                    <Input value={legal.cae} onChange={(e) => patch(a.id, { cae: e.target.value })} placeholder="68311" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Email da direção / legal</Label>
                    <Input type="email" value={legal.legalEmail} onChange={(e) => patch(a.id, { legalEmail: e.target.value })} placeholder="direcao@agencia.pt" />
                  </div>
                </div>

                {st.amiExpired && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="size-4" /> A licença AMI está fora de validade.
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {AGENCY_DOCS.map((d) => {
                    const has = Boolean(legal.docs[d.kind]);
                    return (
                      <div key={d.kind} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                        <FileText className={cn("size-4", has ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("flex-1", !has && "text-muted-foreground")}>{d.label}</span>
                        {has && (
                          <a href={legal.docs[d.kind]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            ver ✓
                          </a>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary">
                          <Upload className="size-3.5" /> {has ? "Trocar" : "Carregar"}
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onDoc(a.id, d.kind, e)} />
                        </label>
                      </div>
                    );
                  })}
                </div>

                {!st.complete && (
                  <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">
                    Em falta: {[...st.missingFields, ...st.missingDocs].length} item(ns). Complete tudo para a agência ficar conforme.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
