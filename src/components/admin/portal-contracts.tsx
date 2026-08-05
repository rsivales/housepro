"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Link2, Power, RefreshCw, Settings2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PortalIntegration } from "@/lib/data/exports";

const STORAGE = "portalContracts";

type State = Record<string, { active: boolean; contract: boolean; lastExport?: string }>;
type Verify = { loading: boolean; ok?: boolean; count?: number; error?: string };

/** URL do feed de cada portal (XML para Idealista/Imovirtual/Casa SAPO; CSV para Facebook). */
function feedFor(id: string): { url: string; kind: "xml" | "csv" } {
  if (id === "facebook") return { url: "/api/feeds/facebook", kind: "csv" };
  return { url: "/api/idealista-feed", kind: "xml" };
}

function fmt(dt?: string) {
  return dt ? new Date(dt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
}

/**
 * Gestão funcional dos contratos de exportação com portais. Permite estabelecer
 * contrato, ativar/desativar a exportação, gerir e VERIFICAR o feed (conta os
 * imóveis publicados). O estado é guardado localmente (protótipo).
 */
export function PortalContracts({ initial }: { initial: PortalIntegration[] }) {
  const [state, setState] = React.useState<State>({});
  const [open, setOpen] = React.useState<string | null>(null);
  const [verify, setVerify] = React.useState<Record<string, Verify>>({});
  const [copied, setCopied] = React.useState<string | null>(null);
  const [origin, setOrigin] = React.useState("");

  React.useEffect(() => {
    setOrigin(window.location.origin);
    const base: State = Object.fromEntries(initial.map((p) => [p.id, { active: p.active, contract: p.contract, lastExport: p.lastExport }]));
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      setState({ ...base, ...saved });
    } catch { setState(base); }
  }, [initial]);

  function save(next: State) {
    setState(next);
    try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch {}
  }
  function patch(id: string, p: Partial<{ active: boolean; contract: boolean; lastExport?: string }>) {
    save({ ...state, [id]: { ...(state[id] ?? { active: false, contract: false }), ...p } });
  }

  async function copy(url: string, id: string) {
    try { await navigator.clipboard.writeText(url); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  async function verifyFeed(id: string) {
    const { url, kind } = feedFor(id);
    setVerify((v) => ({ ...v, [id]: { loading: true } }));
    try {
      const res = await fetch(url);
      const text = await res.text();
      const count = kind === "xml"
        ? (text.match(/<property\b/g)?.length ?? 0)
        : Math.max(0, text.trim().split("\n").length - 1);
      setVerify((v) => ({ ...v, [id]: { loading: false, ok: res.ok, count } }));
      patch(id, { lastExport: new Date().toISOString() });
    } catch (e) {
      setVerify((v) => ({ ...v, [id]: { loading: false, ok: false, error: String(e) } }));
    }
  }

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      {initial.map((portal) => {
        const s = state[portal.id] ?? { active: portal.active, contract: portal.contract, lastExport: portal.lastExport };
        const { url, kind } = feedFor(portal.id);
        const fullUrl = origin ? `${origin}${url}` : url;
        const v = verify[portal.id];
        const isOpen = open === portal.id;
        return (
          <div key={portal.id} className={cn("rounded-2xl border bg-card p-5 shadow-sm", s.active && "ring-1 ring-primary/30")}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{portal.name}</p>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                s.active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              )}>
                <span className={cn("size-1.5 rounded-full", s.active ? "bg-success" : "bg-muted-foreground/50")} />
                {s.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Link2 className="size-3.5" /> Contrato: {s.contract ? "estabelecido" : "por estabelecer"}
              </p>
              <p>Última exportação: {fmt(s.lastExport)}</p>
              {portal.note && !s.active && <p className="text-xs">{portal.note}</p>}
            </div>

            {/* Ações principais */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!s.contract ? (
                <Button size="sm" onClick={() => patch(portal.id, { contract: true })}>
                  <Link2 className="size-3.5" /> Estabelecer contrato
                </Button>
              ) : !s.active ? (
                <Button size="sm" onClick={() => patch(portal.id, { active: true, lastExport: new Date().toISOString() })}>
                  <Power className="size-3.5" /> Ativar exportação
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setOpen(isOpen ? null : portal.id)}>
                  <Settings2 className="size-3.5" /> Gerir contrato
                </Button>
              )}
              {s.active && (
                <Button size="sm" variant="ghost" onClick={() => verifyFeed(portal.id)} disabled={v?.loading}>
                  <RefreshCw className={cn("size-3.5", v?.loading && "animate-spin")} /> Verificar feed
                </Button>
              )}
            </div>

            {/* Resultado da verificação */}
            {v && !v.loading && (
              v.ok ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1 text-xs text-success">
                  <Check className="size-3.5" /> Feed OK — {v.count} imóvel(is) no feed
                </p>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
                  <X className="size-3.5" /> Falha ao ler o feed
                </p>
              )
            )}

            {/* Painel de gestão */}
            {isOpen && s.active && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <label className="text-xs text-muted-foreground">URL do feed ({kind.toUpperCase()}) — cola no backoffice do portal</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={fullUrl} onFocus={(e) => e.target.select()}
                    className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none" />
                  <Button size="sm" variant="outline" onClick={() => copy(fullUrl, portal.id)}>
                    {copied === portal.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </Button>
                  <a href={url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><ExternalLink className="size-3.5" /></Button>
                  </a>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { patch(portal.id, { active: false }); setOpen(null); }}>
                  <Power className="size-3.5" /> Desativar exportação
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
