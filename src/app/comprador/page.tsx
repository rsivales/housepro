import type { Metadata } from "next";
import { QrCode, UserRound } from "lucide-react";

export const metadata: Metadata = { title: "Portal do comprador", robots: { index: false, follow: false } };

/**
 * Destino genérico para o QR code impresso em documentos físicos (proposta
 * de compra, etc.) — o portal em si é um link pessoal por comprador
 * (/comprador/[token]), que não pode ser pré-impresso. Esta página explica
 * o conceito e remete para o consultor.
 */
export default function CompradorIndexPage() {
  return (
    <div className="hp min-h-dvh bg-[var(--card)] text-[var(--hp-navy)]">
      <header className="border-b bg-[var(--hp-navy)] text-white">
        <div className="mx-auto max-w-xl px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">HousePro</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">Portal do comprador</h1>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-6 px-4 py-10 sm:px-6">
        <section className="rounded-2xl border bg-white p-5">
          <p className="flex items-center gap-2 font-medium text-[var(--hp-navy)]">
            <QrCode className="size-5 text-[var(--hp-red)]" /> O que é o portal do comprador
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--hp-text-2)]">
            Um link pessoal e privado onde acompanha, em tempo real, cada fase do seu processo de compra —
            proposta, reserva, CPCV, escritura e entrega de chaves.
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <p className="flex items-center gap-2 font-medium text-[var(--hp-navy)]">
            <UserRound className="size-5 text-[var(--hp-red)]" /> Ainda não tem o seu link?
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--hp-text-2)]">
            O seu consultor HousePro envia-lhe o link pessoal assim que o processo de compra é iniciado. Se já
            avançou com uma proposta e ainda não o recebeu, peça-o diretamente ao seu consultor.
          </p>
        </section>
      </main>
    </div>
  );
}
