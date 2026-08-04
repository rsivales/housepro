"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Check, FileText, ScrollText, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agencies } from "@/lib/data/mock";
import {
  AGENCY_DOCS, blankLegal, legalStatus, LEGAL_STORAGE_KEY,
  type AgencyLegal, type AgencyDocKind,
} from "@/lib/data/agency-legal";

type Store = Record<string, AgencyLegal>;

export default function AgenciaLegalPage() {
  const [store, setStore] = React.useState<Store>({});
  const [openId, setOpenId] = React.useState<string>(agencies[0]?.id ?? "");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
      if (raw) setStore(JSON.parse(raw));
    } catch {}
  }, []);

  function save(next: Store) {
    setStore(next);
    try { localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }
  function patch(id: string, p: Partial<AgencyLegal>) {
    const cur = store[id] ?? blankLegal();
    save({ ...store, [id]: { ...cur, ...p } });
  }
  async function onDoc(id: string, kind: AgencyDocKind, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(f);
    });
    const cur = store[id] ?? blankLegal();
    patch(id, { docs: { ...cur.docs, [kind]: url } });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Administração
        </Link>

        <h1 className="mt-4 flex items-center gap-2 font-display text-3xl">
          <ScrollText className="size-7 text-primary" /> Dados legais da agência
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configuração <strong>obrigatória</strong> de cada agência de mediação: licença
          AMI e comprovativo, certidões da empresa, registo comercial, seguro. Enquanto
          estiver incompleta, a agência fica assinalada como não conforme.
        </p>

        <div className="mt-6 space-y-3">
          {agencies.map((a) => {
            const legal = store[a.id] ?? blankLegal();
            const st = legalStatus(legal);
            const open = openId === a.id;
            return (
              <div key={a.id} className="rounded-2xl border bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? "" : a.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.region}</p>
                  </div>
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
                            {has && <span className="text-xs text-primary">carregado ✓</span>}
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-secondary">
                              <Upload className="size-3.5" /> {has ? "Trocar" : "Carregar"}
                              <input type="file" className="hidden" onChange={(e) => onDoc(a.id, d.kind, e)} />
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

        <p className="mt-6 rounded-xl border bg-secondary/40 p-4 text-xs text-muted-foreground">
          Protótipo guardado neste navegador. Em produção persiste nas colunas legais de
          <span className="font-mono"> agencies</span> (migração 0016) e o estado &quot;conforme&quot;
          controla o funcionamento operacional da agência.
        </p>
      </div>
    </div>
  );
}
