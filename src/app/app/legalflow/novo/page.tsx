"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LegalWorkspace } from "@/components/legal/legal-workspace";
import {
  DOC_TYPE_LABEL, templateSections,
  type LegalDocType, type LegalProcess,
} from "@/lib/data/legalflow";

const box =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";
const TYPES: LegalDocType[] = ["cpcv", "arrendamento", "procuracao", "outro"];

export default function NovoProcessoPage() {
  const [created, setCreated] = React.useState<LegalProcess | null>(null);
  const [type, setType] = React.useState<LegalDocType>("cpcv");
  const [title, setTitle] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [note, setNote] = React.useState("");

  function create() {
    if (!title.trim()) return;
    const id = `cpcv-${Date.now().toString(36)}`;
    const proc: LegalProcess = {
      id,
      ref: `${DOC_TYPE_LABEL[type].toUpperCase().slice(0, 4)}-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      title: title.trim(),
      address: address.trim(),
      type,
      typeNote: note.trim() || DOC_TYPE_LABEL[type],
      status: "normal",
      progress: 5,
      parties: [],
      alerts: [],
      activity: [{ id: "a0", actorName: "Você", action: `criou o processo (${DOC_TYPE_LABEL[type]})`, when: "agora" }],
      financial: { pipeline: 0, extras: 0, pending: 0 },
      docVersion: 1,
      sections: templateSections(type),
      checklist: [],
      updatedAt: new Date().toISOString(),
      clientVisible: false,
    };
    setCreated(proc);
    // Avisa o advogado (app + email) que há um pedido novo — best-effort.
    void fetch("/api/legal/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, propertyRef: title.trim(), note: note.trim() || undefined }),
    }).catch(() => {});
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/app/legalflow" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> LegalFlow
        </Link>

        {!created ? (
          <>
            <h1 className="mt-4 font-display text-3xl">Novo processo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolhe o tipo de documento e começa a construí-lo. As cláusulas são
              pré-carregadas por modelo; o advogado preenche e partilha.
            </p>
            <div className="mt-6 max-w-lg space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo de documento</span>
                <select className={box} value={type} onChange={(e) => setType(e.target.value as LegalDocType)}>
                  {TYPES.map((t) => <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Título (imóvel — partes)</span>
                <input className={box} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Apartamento T3 Cascais — Comprador / Vendedor" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Morada / identificação</span>
                <input className={box} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua das Flores 42, 3.º Dto" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Nota do tipo (opcional)</span>
                <input className={box} value={note} onChange={(e) => setNote(e.target.value)} placeholder="CPCV com financiamento" />
              </label>
              <Button onClick={create} disabled={!title.trim()}>Criar e começar a redigir</Button>
            </div>
          </>
        ) : (
          <LegalWorkspace process={created} actorName="Você" canEditDoc canManageChecklist />
        )}
      </div>
    </div>
  );
}
