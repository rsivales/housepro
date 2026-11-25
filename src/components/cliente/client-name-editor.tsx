"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check } from "lucide-react";

export function ClientNameEditor({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback("");
    try {
      const response = await fetch("/api/cliente/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: value.trim() }) });
      if (!response.ok) throw new Error();
      setEditing(false); setFeedback("Nome atualizado."); router.refresh();
    } catch { setFeedback("Não foi possível guardar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <div className="mt-5 border-t border-white/20 pt-4 text-sm">
    {editing ? <form onSubmit={save} className="flex flex-wrap gap-2"><label className="w-full text-xs text-white/70">Nome a apresentar<input required minLength={2} maxLength={100} value={value} onChange={e => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-[#0b1f3a]" /></label><button disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 font-semibold text-[#0b1f3a] disabled:opacity-60"><Check className="size-4" /> Guardar</button><button type="button" onClick={() => { setEditing(false); setValue(name); }} className="rounded-full border border-white/30 px-4 py-2">Cancelar</button></form> : <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{value || "O seu nome"}</p><p className="mt-1 break-all text-xs text-white/65">{email}</p></div><button onClick={() => setEditing(true)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90 hover:underline"><Pencil className="size-3.5" /> Editar nome</button></div>}
    {feedback && <p role="status" className="mt-2 text-xs text-white/85">{feedback}</p>}
  </div>;
}
