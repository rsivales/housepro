import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Phone, BookOpen } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listCallLogs } from "@/lib/db/repo";
import { CALL_SCRIPTS, CALL_RESULT_LABEL } from "@/lib/data/xcall";
import { XCallButton } from "@/components/xcall/xcall-dialog";

export const metadata: Metadata = { title: "X Call — chamadas assistidas" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });

export default async function XCallPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  const calls = await listCallLogs(session.agent.id);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Área profissional
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-3xl">
            <Phone className="size-7 text-primary" /> X Call
          </h1>
          <XCallButton
            contactName="Chamada de demonstração"
            phone="351910000000"
            scriptHint="comprador"
            label="Simular chamada"
          />
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Chamadas assistidas com guião, objetivo e perguntas essenciais. O
          resultado alimenta a cronologia, cria a próxima tarefa e move a lead.
          {session.demo && " Dados de exemplo."}
        </p>

        {/* Chamadas recentes */}
        <h2 className="mt-8 font-display text-xl">Chamadas recentes</h2>
        <ul className="mt-3 space-y-2">
          {calls.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{c.contactName ?? "Contacto"}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {CALL_RESULT_LABEL[c.result]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmt(c.createdAt)}
                {c.temperature && <> · {c.temperature}</>}
                {c.nextTaskTitle && <> · próxima: {c.nextTaskTitle}</>}
              </p>
              {c.notes && <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>}
            </li>
          ))}
          {calls.length === 0 && (
            <li className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Ainda sem chamadas registadas.
            </li>
          )}
        </ul>

        {/* Biblioteca de guiões */}
        <h2 className="mt-8 flex items-center gap-2 font-display text-xl">
          <BookOpen className="size-5 text-primary" /> Guiões de chamada
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CALL_SCRIPTS.map((s) => (
            <div key={s.key} className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="font-medium">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.objective}</p>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {s.questions.slice(0, 3).map((q) => (<li key={q}>{q}</li>))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
