"use client";

import * as React from "react";
import { Building2, Crown, Loader2, Pause, Play } from "lucide-react";

import { ROLE_LABEL } from "@/lib/data/roles";
import type { RoleKey } from "@/lib/data/types";

interface Consultor {
  id: string; name: string; email?: string | null; role?: string; role_key?: string;
  agency_id?: string | null; whatsapp?: string | null; active?: boolean;
}
interface Agency { id: string; name: string; region?: string }

const ASSIGNABLE: RoleKey[] = ["superadmin", "admin", "diretor", "coordenador", "agente", "agente_ami"];
const select = "h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-[3px]";

/**
 * Equipas REAIS por agência (dados de `profiles`/`agencies` no Supabase — os
 * mesmos usados no login). Diferente da lista abaixo (rede pública/marca,
 * guardada em site_settings): aqui atribui-se o papel — incluindo "Diretor de
 * agência (broker)" — e aprova/suspende-se o acesso de cada consultor.
 * Reutiliza a mesma API de /admin/consultores para não duplicar lógica.
 */
export function AgencyTeamsReal() {
  const [list, setList] = React.useState<Consultor[] | null>(null);
  const [agencies, setAgencies] = React.useState<Agency[]>([]);
  const [state, setState] = React.useState<"ok" | "forbidden" | "no_service" | "error">("ok");
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/consultores");
      if (res.status === 403) { setState("forbidden"); return; }
      if (res.status === 501) { setState("no_service"); return; }
      if (!res.ok) { setState("error"); return; }
      const j = await res.json();
      setList(j.consultores ?? []);
      setAgencies(j.agencies ?? []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/consultores", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  if (state === "no_service" || state === "error" || list === null) return null;
  if (state === "forbidden") {
    return (
      <p className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        A gestão de equipas por agência (papéis, broker, aprovar/suspender) está reservada à coordenação e acima.
      </p>
    );
  }

  const groups = agencies
    .map((a) => ({ agency: a, members: list.filter((m) => m.agency_id === a.id) }))
    .filter((g) => g.members.length > 0 || agencies.length <= 3); // com poucas agências, mostra sempre; com muitas, só as que têm gente
  const orphans = list.filter((m) => !m.agency_id || !agencies.some((a) => a.id === m.agency_id));

  return (
    <div className="space-y-4">
      {groups.map(({ agency, members }) => (
        <div key={agency.id} className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="flex items-center gap-2 font-medium">
            <Building2 className="size-4 text-primary" /> {agency.name}
            <span className="text-xs font-normal text-muted-foreground">{agency.region}</span>
          </p>
          {members.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sem consultores associados.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {members.map((m) => (
                <MemberRow key={m.id} m={m} busy={busy === m.id} onPatch={(body) => patch(m.id, body)} />
              ))}
            </ul>
          )}
        </div>
      ))}

      {orphans.length > 0 && (
        <div className="rounded-2xl border border-dashed p-4">
          <p className="text-sm font-medium text-muted-foreground">Sem agência atribuída</p>
          <ul className="mt-3 space-y-2">
            {orphans.map((m) => (
              <MemberRow key={m.id} m={m} busy={busy === m.id} onPatch={(body) => patch(m.id, body)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemberRow({ m, busy, onPatch }: { m: Consultor; busy: boolean; onPatch: (body: Record<string, unknown>) => void }) {
  const isBroker = m.role_key === "diretor";
  return (
    <li className="flex flex-wrap items-center gap-2.5 rounded-xl border p-2.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {m.name}
          {isBroker && <Crown className="size-3.5 shrink-0 text-amber-500" aria-label="Broker desta agência" />}
          {m.active === false && <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">suspenso</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
      </div>
      <select
        value={m.role_key ?? "agente"}
        onChange={(e) => onPatch({ roleKey: e.target.value })}
        disabled={busy}
        className={select}
        aria-label={`Papel de ${m.name}`}
      >
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <button
        onClick={() => onPatch({ active: m.active === false })}
        disabled={busy}
        title={m.active === false ? "Reativar" : "Suspender"}
        className="grid size-8 place-items-center rounded-lg border text-muted-foreground hover:bg-secondary disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : m.active === false ? <Play className="size-3.5 text-emerald-600" /> : <Pause className="size-3.5" />}
      </button>
    </li>
  );
}
