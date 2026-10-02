"use client";

import * as React from "react";
import { BellRing, Bug, CheckCircle2, ShieldCheck, Sparkles, X } from "lucide-react";
import { LATEST_RELEASE } from "@/lib/data/releases";

const STORAGE_KEY = "helix:last-seen-release";

/**
 * Antes guardava só em localStorage — como cada deployment de preview tem um
 * domínio diferente (housepro-<hash>-...vercel.app), o localStorage nunca
 * atravessava para o preview seguinte e a notificação "reaparecia" mesmo
 * depois de marcada como vista. Agora guarda-se em profiles.settings (a
 * conta, não o browser) — sobrevive a qualquer domínio/dispositivo. Mantém o
 * localStorage como resposta imediata e reserva para modo demo/sem sessão.
 */
export function ReleaseNotice() {
  const [visible, setVisible] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // Resposta imediata a partir do cache local (evita o "flash" do aviso).
    try { setVisible(localStorage.getItem(STORAGE_KEY) !== LATEST_RELEASE.id); } catch { setVisible(true); }

    fetch("/api/me/settings")
      .then((r) => (r.ok ? r.json() : { persisted: false }))
      .then((j) => {
        if (cancelled) return;
        if (j?.persisted && j.settings) {
          const seen = j.settings[STORAGE_KEY];
          setVisible(seen !== LATEST_RELEASE.id);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });

    return () => { cancelled = true; };
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, LATEST_RELEASE.id); } catch {}
    setVisible(false);
    setOpen(false);
    fetch("/api/me/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patch: { [STORAGE_KEY]: LATEST_RELEASE.id } }),
    }).catch(() => {});
  }

  // Evita mostrar por um instante antes de confirmar o estado guardado na conta.
  if (!ready || !visible) return null;
  return <>
    <button onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-[var(--hx-border)] bg-[var(--hx-surface)] px-4 py-3 text-left shadow-xl lg:bottom-5" aria-label="Ver novidades desta versão">
      <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: "var(--hx-red)" }}><BellRing className="size-4" /></span>
      <span><strong className="block text-sm">Nova versão disponível</strong><span className="text-xs hx-muted">Clique para ver as novidades</span></span>
    </button>
    {open ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="release-title">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--hx-surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--hx-red)" }}>Versão {LATEST_RELEASE.version}</p><h2 id="release-title" className="mt-1 text-xl font-bold">{LATEST_RELEASE.title}</h2><p className="text-xs hx-muted">{LATEST_RELEASE.date}</p></div><button onClick={() => setOpen(false)} className="hx-icon-btn" aria-label="Fechar"><X className="size-5" /></button></div>
        <ul className="mt-5 space-y-3">{LATEST_RELEASE.items.map((item) => { const Icon = item.type === "security" ? ShieldCheck : item.type === "bugfix" ? Bug : Sparkles; return <li key={item.text} className="flex gap-3 rounded-xl bg-[var(--hx-surface-blue)] p-3 text-sm"><Icon className="mt-0.5 size-4 shrink-0" style={{ color: item.type === "security" ? "var(--hx-success)" : "var(--hx-red)" }} /><span>{item.text}</span></li>; })}</ul>
        <button onClick={dismiss} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white" style={{ background: "var(--hx-navy)" }}><CheckCircle2 className="size-4" /> Marcar como vista</button>
      </div>
    </div> : null}
  </>;
}
