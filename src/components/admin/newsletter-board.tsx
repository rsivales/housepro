"use client";
import { useCallback, useEffect, useState } from "react";
type Campaign = { id: string; title: string; intro: string; status: string; article_ids: string[]; created_at: string; sent_at: string | null };
export function NewsletterBoard({ agencyId, readOnly = false }: { agencyId?: string; readOnly?: boolean }) {
  const [rows, setRows] = useState<Campaign[]>([]), [busy, setBusy] = useState<string | null>(null), [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/newsletter" + (agencyId ? "?agency=" + encodeURIComponent(agencyId) : ""), { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setRows(payload.campaigns); else setNotice(payload.error ?? "Fila indisponível.");
  }, [agencyId]);
  useEffect(() => { void load(); }, [load]);
  async function send(id: string) {
    setBusy(id); setNotice("");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "send", id, agencyId }) });
      const payload = await response.json();
      setNotice(response.ok ? "Enviados nesta etapa: " + payload.sent + ". Por enviar: " + payload.remaining + "." : payload.error ?? "Falha no envio.");
      await load();
    } catch { setNotice("Falha de ligação. Volte a verificar a fila antes de repetir."); }
    finally { setBusy(null); }
  }
  return <section className="rounded-2xl border bg-card p-5"><h2 className="font-display text-xl">Fila da newsletter</h2><p className="mt-1 text-sm text-muted-foreground">Cada edição é enviada apenas quando escolher «Enviar». O envio é feito por etapas de 25 destinatários; em caso de pausa, clique em «Continuar».</p>
    {notice && <p role="status" className="mt-3 rounded-lg bg-secondary p-3 text-sm">{notice}</p>}
    <div className="mt-5 space-y-3">{rows.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-semibold">{c.title}</p><p className="text-sm text-muted-foreground">{c.intro}</p><p className="mt-1 text-xs">{c.status === "queued" ? "Em fila" : c.status === "sending" ? "Envio em curso" : c.status === "sent" ? "Enviada" : "Rascunho"}</p></div>{!readOnly && ["queued", "sending"].includes(c.status) && <button disabled={!!busy} onClick={() => send(c.id)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy === c.id ? "A enviar…" : c.status === "sending" ? "Continuar envio" : "Enviar edição"}</button>}</div>)}{!rows.length && <p className="text-sm text-muted-foreground">Ainda não há edições em fila.</p>}</div>
  </section>;
}
