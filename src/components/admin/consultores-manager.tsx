"use client";

import * as React from "react";
import { Plus, Trash2, Eye, EyeOff, Loader2, Copy, Check, AlertTriangle, Pencil, X } from "lucide-react";

import { ROLE_LABEL } from "@/lib/data/roles";
import type { RoleKey } from "@/lib/data/types";

interface Consultor {
  id: string; name: string; email?: string | null; role?: string; role_key?: string;
  agency_id?: string | null; whatsapp?: string | null; active?: boolean;
}
interface Agency { id: string; name: string; region?: string }

const ASSIGNABLE: RoleKey[] = ["superadmin", "admin", "diretor", "coordenador", "agente", "agente_ami"];
const field = "mt-1 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]";

export function ConsultoresManager() {
  const [loading, setLoading] = React.useState(true);
  const [state, setState] = React.useState<"ok" | "forbidden" | "no_service" | "error">("ok");
  const [list, setList] = React.useState<Consultor[]>([]);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [tempPass, setTempPass] = React.useState<{ email: string; pass: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/consultores");
      if (res.status === 403) { setState("forbidden"); return; }
      if (res.status === 501) { setState("no_service"); return; }
      if (!res.ok) { setState("error"); return; }
      const j = await res.json();
      setList(j.consultores ?? []); setAgencies(j.agencies ?? []); setState("ok");
    } catch { setState("error"); } finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const agencyName = (id?: string | null) => agencies.find((a) => a.id === id)?.name ?? "—";

  async function create(form: FormData) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/consultores", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"), email: form.get("email"), roleKey: form.get("roleKey"),
          agencyId: form.get("agencyId") || null, whatsapp: form.get("whatsapp") || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { alert("Não foi possível criar: " + (j.error ?? res.status)); return; }
      setTempPass({ email: String(form.get("email")), pass: j.tempPassword });
      setCreating(false); await load();
    } finally { setBusy(false); }
  }
  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/consultores", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert("Erro: " + (j.error ?? res.status)); return; }
      setEditing(null); await load();
    } finally { setBusy(false); }
  }
  async function remove(id: string, name: string) {
    if (!confirm(`Remover ${name}? Esta ação apaga o utilizador e o perfil.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/consultores?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json().catch(() => ({})); alert("Erro: " + (j.error ?? res.status)); return; }
      await load();
    } finally { setBusy(false); }
  }

  if (loading) return <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> A carregar…</p>;

  if (state === "no_service") return (
    <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 text-sm">
      <p className="flex items-center gap-2 font-medium text-amber-700"><AlertTriangle className="size-4" /> Falta a chave de serviço</p>
      <p className="mt-1 text-muted-foreground">Para criar/gerir consultores a partir da app, define <code>SUPABASE_SERVICE_ROLE_KEY</code> nas variáveis de ambiente da Vercel (a chave <em>secret</em> do teu projeto Supabase) e faz redeploy.</p>
    </div>
  );
  if (state === "forbidden") return <p className="mt-6 text-sm text-destructive">Sem permissão. Apenas coordenação e acima podem gerir consultores.</p>;
  if (state === "error") return <p className="mt-6 text-sm text-destructive">Não foi possível carregar. Confirma a ligação ao Supabase.</p>;

  return (
    <div className="mt-6">
      {tempPass && (
        <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-700">Consultor criado ✓</p>
          <p className="mt-1 text-muted-foreground">Partilha estes dados com <strong>{tempPass.email}</strong> (deve alterar a password ao entrar):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-background px-2 py-1">{tempPass.pass}</code>
            <button onClick={() => { navigator.clipboard?.writeText(tempPass.pass); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copiado" : "Copiar"}
            </button>
            <button onClick={() => setTempPass(null)} className="ml-auto text-xs text-muted-foreground hover:underline">Fechar</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} consultor(es)</p>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="size-4" /> Novo consultor
        </button>
      </div>

      {creating && (
        <form action={create} className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-sm font-medium">Nome</span><input name="name" required className={field} /></label>
            <label className="block"><span className="text-sm font-medium">E-mail</span><input name="email" type="email" required className={field} /></label>
            <label className="block"><span className="text-sm font-medium">Papel</span>
              <select name="roleKey" defaultValue="agente" className={field}>{ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            </label>
            <label className="block"><span className="text-sm font-medium">Agência</span>
              <select name="agencyId" className={field}><option value="">— sem agência —</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            </label>
            <label className="block sm:col-span-2"><span className="text-sm font-medium">Telefone / WhatsApp (opcional)</span><input name="whatsapp" className={field} /></label>
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Criar</button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
            {editing === c.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-xs font-medium">Nome</span><input id={`n-${c.id}`} defaultValue={c.name} className={field} /></label>
                <label className="block"><span className="text-xs font-medium">Papel</span>
                  <select id={`r-${c.id}`} defaultValue={c.role_key ?? "agente"} className={field}>{ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                </label>
                <label className="block"><span className="text-xs font-medium">Agência</span>
                  <select id={`a-${c.id}`} defaultValue={c.agency_id ?? ""} className={field}><option value="">— sem agência —</option>{agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                </label>
                <label className="block"><span className="text-xs font-medium">WhatsApp</span><input id={`w-${c.id}`} defaultValue={c.whatsapp ?? ""} className={field} /></label>
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={busy} onClick={() => patch(c.id, {
                    name: (document.getElementById(`n-${c.id}`) as HTMLInputElement).value,
                    roleKey: (document.getElementById(`r-${c.id}`) as HTMLSelectElement).value,
                    agencyId: (document.getElementById(`a-${c.id}`) as HTMLSelectElement).value,
                    whatsapp: (document.getElementById(`w-${c.id}`) as HTMLInputElement).value,
                  })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60"><Check className="size-4" /> Guardar</button>
                  <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"><X className="size-4" /> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {c.name}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{ROLE_LABEL[(c.role_key as RoleKey)] ?? c.role ?? "agente"}</span>
                    {c.active === false && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Suspenso</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.email ?? "—"} · {agencyName(c.agency_id)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(c.id)} title="Editar" className="grid size-9 place-items-center rounded-md border hover:bg-secondary"><Pencil className="size-4" /></button>
                  <button disabled={busy} onClick={() => patch(c.id, { active: c.active === false })} title={c.active === false ? "Reativar" : "Suspender"} className="grid size-9 place-items-center rounded-md border hover:bg-secondary">
                    {c.active === false ? <Eye className="size-4 text-emerald-600" /> : <EyeOff className="size-4" />}
                  </button>
                  <button disabled={busy} onClick={() => remove(c.id, c.name)} title="Remover" className="grid size-9 place-items-center rounded-md border text-destructive hover:bg-destructive/5"><Trash2 className="size-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">Ainda não há consultores. Cria o primeiro com “Novo consultor”.</p>}
      </div>
    </div>
  );
}
