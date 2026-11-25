"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";

const DEFAULT_SUBJECT = "Parabéns pela sua nova casa, {nome}! 🏡💛";
const DEFAULT_BODY =
  "Hoje é um dia especial — a escritura da sua casa!\n\n" +
  "Foi um gosto enorme acompanhá-lo(a) nesta jornada, do primeiro \"olá\" até este momento. " +
  "Que esta casa se encha de histórias felizes, boas memórias e muito carinho.\n\n" +
  "Um abraço grande da parte de toda a equipa HousePro — estamos aqui sempre que precisar. 💛🏡";

/** Email de parabéns enviado automaticamente ao comprador no dia da escritura. */
export function CelebrationTemplateManager() {
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    fetch("/api/admin/notification-templates").then((r) => r.json()).then((d) => {
      const row = (d.rows ?? []).find((r: { key: string }) => r.key === "deal_escritura_celebration");
      setSubject(row?.subject || DEFAULT_SUBJECT);
      setBody(row?.body || DEFAULT_BODY);
      setLoaded(true);
    });
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: "deal_escritura_celebration", subject, body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMessage("Guardado. Aplica-se já ao próximo negócio que chegue à fase de escritura.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
      <p className="font-medium">🏡 Comemoração da escritura</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Enviado automaticamente ao comprador assim que o negócio avança para a fase &quot;Escritura&quot; — uma única vez por
        negócio. Já tem um texto fofinho por defeito; edite à vontade.
      </p>
      {!loaded ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A carregar…</p>
      ) : (
        <div className="mt-3 space-y-2">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto (pode usar {nome})" className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensagem (pode usar {nome})" rows={6} className="w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none" />
          <button type="button" disabled={busy} onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Guardar
          </button>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      )}
    </div>
  );
}
