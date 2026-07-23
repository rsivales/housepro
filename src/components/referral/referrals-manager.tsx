"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Percent, Reply, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/format";
import { PropertyRef } from "@/components/property/property-ref";
import { REFERRAL_STATUS, type Referral } from "@/lib/data/referrals";

type Item = Referral & { direction: "in" | "out" };

export function ReferralsManager({
  incoming,
  outgoing,
  meId,
}: {
  incoming: Referral[];
  outgoing: Referral[];
  meId: string;
}) {
  const [items, setItems] = React.useState<Item[]>([
    ...incoming.map((r) => ({ ...r, direction: "in" as const })),
    ...outgoing.map((r) => ({ ...r, direction: "out" as const })),
  ]);
  const [counterId, setCounterId] = React.useState<string | null>(null);
  const [counterVal, setCounterVal] = React.useState(30);

  function myTurn(r: Item): boolean {
    if (r.status === "ativa" || r.status === "rejeitada") return false;
    const amDestino = r.toId === meId;
    const amOrigem = r.fromId === meId;
    if (amDestino && r.proposedBy === "origem") return true;
    if (amOrigem && r.proposedBy === "destino") return true;
    return false;
  }

  async function act(r: Item, action: "accept" | "reject" | "counter", sharePct?: number) {
    const by: "origem" | "destino" = r.toId === meId ? "destino" : "origem";
    // Atualização otimista.
    setItems((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? {
              ...x,
              status: action === "accept" ? "ativa" : action === "reject" ? "rejeitada" : "contraproposta",
              sharePct: action === "counter" && sharePct != null ? sharePct : x.sharePct,
              proposedBy: action === "counter" ? by : x.proposedBy,
            }
          : x
      )
    );
    setCounterId(null);
    try {
      await fetch("/api/referrals", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, action, sharePct, by }),
      });
    } catch {
      /* estado otimista mantém-se no protótipo */
    }
  }

  const ins = items.filter((i) => i.direction === "in");
  const outs = items.filter((i) => i.direction === "out");

  return (
    <div className="space-y-10">
      <Section title="Recebidas" icon={ArrowDownLeft} count={ins.length}>
        {ins.length === 0 ? (
          <Empty>Sem referências recebidas.</Empty>
        ) : (
          ins.map((r) => (
            <Card key={r.id} r={r} mine={myTurn(r)}>
              {myTurn(r) && (
                <Actions
                  r={r}
                  counterOpen={counterId === r.id}
                  counterVal={counterVal}
                  setCounterVal={setCounterVal}
                  onAccept={() => act(r, "accept")}
                  onReject={() => act(r, "reject")}
                  onOpenCounter={() => { setCounterId(r.id); setCounterVal(Math.max(r.sharePct + 5, r.sharePct)); }}
                  onSendCounter={() => act(r, "counter", counterVal)}
                  onCancelCounter={() => setCounterId(null)}
                />
              )}
            </Card>
          ))
        )}
      </Section>

      <Section title="Enviadas" icon={ArrowUpRight} count={outs.length}>
        {outs.length === 0 ? (
          <Empty>Ainda não enviaste referências.</Empty>
        ) : (
          outs.map((r) => (
            <Card key={r.id} r={r} mine={myTurn(r)}>
              {myTurn(r) && (
                <Actions
                  r={r}
                  counterOpen={counterId === r.id}
                  counterVal={counterVal}
                  setCounterVal={setCounterVal}
                  onAccept={() => act(r, "accept")}
                  onReject={() => act(r, "reject")}
                  onOpenCounter={() => { setCounterId(r.id); setCounterVal(Math.max(r.sharePct + 5, r.sharePct)); }}
                  onSendCounter={() => act(r, "counter", counterVal)}
                  onCancelCounter={() => setCounterId(null)}
                />
              )}
            </Card>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-xl">
        <Icon className="size-5 text-primary" /> {title}
        <span className="text-sm font-normal text-muted-foreground">{count}</span>
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Card({ r, mine, children }: { r: Item; mine: boolean; children?: React.ReactNode }) {
  const st = REFERRAL_STATUS[r.status];
  const counterpart =
    r.direction === "in" ? r.fromName : r.type === "cliente" ? r.agencyName : r.toName;
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-sm", r.status === "ativa" && "border-primary/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-none">{r.clientName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {r.clientContact.includes("@") ? r.clientContact : formatPhone(r.clientContact)}
            {r.propertyId && (
              <>
                {" · "}
                <PropertyRef propertyId={r.propertyId} label={`Ref. ${r.propertyRef}`} />
              </>
            )}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", st.badge)}>
          <span className={cn("size-1.5 rounded-full", st.dot)} /> {st.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          <Percent className="size-3.5" /> {r.sharePct}%
        </span>
        <span className="text-muted-foreground">
          {r.direction === "in" ? "De" : "Para"} {counterpart}
        </span>
        {r.propertyTitle && <span className="truncate text-muted-foreground">· {r.propertyTitle}</span>}
      </div>

      {r.note && <p className="mt-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">“{r.note}”</p>}

      {!mine && r.status !== "ativa" && r.status !== "rejeitada" && (
        <p className="mt-2 text-xs text-muted-foreground">A aguardar resposta da outra parte.</p>
      )}
      {children}
    </div>
  );
}

function Actions({
  r,
  counterOpen,
  counterVal,
  setCounterVal,
  onAccept,
  onReject,
  onOpenCounter,
  onSendCounter,
  onCancelCounter,
}: {
  r: Item;
  counterOpen: boolean;
  counterVal: number;
  setCounterVal: (n: number) => void;
  onAccept: () => void;
  onReject: () => void;
  onOpenCounter: () => void;
  onSendCounter: () => void;
  onCancelCounter: () => void;
}) {
  if (counterOpen) {
    return (
      <div className="mt-3 rounded-xl border bg-secondary/30 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Contrapor percentagem</span>
          <span className="font-semibold text-primary">{counterVal}%</span>
        </div>
        <input
          type="range" min={10} max={50} value={counterVal}
          onChange={(e) => setCounterVal(Number(e.target.value))}
          className="mt-2 w-full accent-primary"
        />
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onSendCounter}><Reply className="size-4" /> Enviar contraproposta</Button>
          <Button size="sm" variant="ghost" onClick={onCancelCounter}>Cancelar</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button size="sm" onClick={onAccept}><Check className="size-4" /> Aceitar {r.sharePct}%</Button>
      <Button size="sm" variant="outline" onClick={onOpenCounter}><Reply className="size-4" /> Contrapor</Button>
      <Button size="sm" variant="ghost" onClick={onReject}><X className="size-4" /> Rejeitar</Button>
    </div>
  );
}
