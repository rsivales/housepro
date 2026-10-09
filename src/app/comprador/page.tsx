import type { Metadata } from "next";
import Link from "next/link";
import { Mail, QrCode } from "lucide-react";

export const metadata: Metadata = { title: "Portal do comprador", robots: { index: false, follow: false } };

/**
 * Destino genérico para o QR code impresso em documentos físicos (proposta
 * de compra, etc.). Encaminha diretamente para o autorregisto por e-mail
 * (/cliente/entrar) — não é preciso esperar pelo consultor: ao entrar, o
 * comprador já fica com a sua página, e assim que o consultor ligar esse
 * e-mail a um negócio, o processo aparece lá automaticamente.
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
            A sua página pessoal, onde acompanha em tempo real cada fase do processo de compra — proposta,
            reserva, CPCV, escritura e entrega de chaves — e guarda os imóveis que lhe interessam.
          </p>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="flex items-center gap-2 font-medium text-[var(--hp-navy)]">
            <Mail className="size-5 text-[var(--hp-red)]" /> Entre com o seu e-mail
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--hp-text-2)]">
            Não precisa de esperar por nenhum link — entre agora com o seu e-mail. A sua página fica pronta de
            imediato, e assim que o seu consultor HousePro associar o processo, aparece aqui automaticamente.
          </p>
          <Link
            href="/cliente/entrar"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--hp-red)] px-5 py-2.5 text-sm font-medium text-white"
          >
            <Mail className="size-4" /> Entrar com o meu e-mail
          </Link>
        </section>
      </main>
    </div>
  );
}
