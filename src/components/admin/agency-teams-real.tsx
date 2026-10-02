"use client";

import * as React from "react";
import { Building2, Crown, Loader2, Pause, Play, Users } from "lucide-react";

import { ROLE_LABEL } from "@/lib/data/roles";
import type { RoleKey } from "@/lib/data/types";

interface Consultor {
  id: string; name: string; email?: string | null; role?: string; role_key?: string;
  agency_id?: string | null; whatsapp?: string | null; active?: boolean;
  sponsor_id?: string | null; code?: number | null;
}
interface Agency { id: string; name: string; region?: string }

const ASSIGNABLE: RoleKey[] = ["superadmin", "admin", "diretor", "coordenador", "agente", "agente_ami"];
// Ordem hierárquica para ler o grupo de cima para baixo, como um organograma.
const RANK: Record<string, number> = { superadmin: 0, admin: 1, diretor: 2, coordenador: 3, agente_ami: 4, agente: 5 };
const select = "h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-[3px]";

/**
 * Equipas REAIS por agência (dados de `profiles`/`agencies` no Supabase — os
 * mesmos usados no login e na ficha pública da agência abaixo). Aqui
 * atribui-se o papel — incluindo "Diretor de agência (broker)" — vê-se a
 * estrutura de padrinhado (afilhados) e aprova/suspende-se o acesso de cada
 * consultor. Reutiliza a mesma API de /admin/consultores para não duplicar
 * lógica.
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

  const byRank = (a: Consultor, b: Consultor) => (RANK[a.role_key ?? "agente"] ?? 9) - (RANK[b.role_key ?? "agente"] ?? 9) || a.name.localeCompare(b.name);
  const groups = agencies
    .map((a) => ({ agency: a, members: list.filter((m) => m.agency_id === a.id).sort(byRank) }))
    .filter((g) => g.members.length > 0 || agencies.length <= 3); // com poucas agências, mostra sempre; com muitas, só as que têm gente
  const orphans = list.filter((m) => !m.agency_id || !agencies.some((a) => a.id === m.agency_id)).sort(byRank);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Ordenados por hierarquia (direção → coordenação → consultores) dentro de cada agência. O <Crown className="inline size-3" /> marca o broker/diretor da agência; <Users className="inline size-3" /> mostra a rede de padrinhado (quem apadrinhou quem).
      </p>
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
                <MemberRow key={m.id} m={m} all={list} busy={busy === m.id} onPatch={(body) => patch(m.id, body)} />
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
              <MemberRow key={m.id} m={m} all={list} busy={busy === m.id} onPatch={(body) => patch(m.id, body)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemberRow({ m, all, busy, onPatch }: { m: Consultor; all: Consultor[]; busy: boolean; onPatch: (body: Record<string, unknown>) => void }) {
  const isBroker = m.role_key === "diretor";
  const godchildren = all.filter((p) => p.sponsor_id === m.id);
  return (
    <li className="rounded-xl border p-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {m.name}
            {m.code != null && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">#{m.code}</span>}
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
      </div>

      {/* Rede de padrinhado — quem apadrinhou este consultor, e quem ele apadrinha. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="size-3" /> Padrinho:
          <select
            value={m.sponsor_id ?? ""}
            onChange={(e) => onPatch({ sponsorId: e.target.value || null })}
            disabled={busy}
            className="h-6 rounded border border-input bg-transparent px-1.5 text-[11px] outline-none"
            aria-label={`Padrinho de ${m.name}`}
          >
            <option value="">— nenhum —</option>
            {all.filter((p) => p.id !== m.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </span>
        {godchildren.length > 0 && (
          <span>{godchildren.length} afilhado{godchildren.length > 1 ? "s" : ""}: {godchildren.map((g) => g.name).join(", ")}</span>
        )}
      </div>
    </li>
  );
}
