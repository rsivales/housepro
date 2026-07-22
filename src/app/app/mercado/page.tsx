import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BedDouble, Bath, Maximize2, MapPin } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { listProperties } from "@/lib/db/repo";
import { agentById } from "@/lib/data/mock";
import { formatArea, formatPrice } from "@/lib/format";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { ReferralDialog } from "@/components/referral/referral-dialog";
import { CommissionInfo } from "@/components/consultant/commission-info";
import { DocNote } from "@/components/consultant/doc-note";
import { ClientModeToggle } from "@/components/consultant/client-mode-toggle";

export const metadata: Metadata = { title: "Mercado · Comissões e referências" };

export default async function MercadoPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent } = session;

  const all = await listProperties();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Área profissional
          </Link>
          <ClientModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-sm font-medium text-primary">Mercado HousePro</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl">Imóveis & comissões</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Todos os imóveis da rede com a respetiva comissão — para saberes quanto podes
          ganhar. Tens um cliente para um imóvel de outro consultor? Envia-lhe uma
          referência e recebe no mínimo 25% da comissão.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((p) => {
            const listing = agentById(p.agentId);
            const isMine = p.agentId === agent.id;
            const commission = {
              commissionType: p.commissionType,
              commissionPct: p.commissionPct,
              commissionFixed: p.commissionFixed,
            };
            return (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
                <Link href={`/imovel/${p.id}`} className="relative block aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="size-full object-cover" />
                  <div className="absolute left-3 top-3">
                    <CommissionInfo price={p.price} commission={commission} variant="badge" />
                  </div>
                </Link>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold tracking-tight">{formatPrice(p)}</p>
                    <span className="text-xs text-muted-foreground">Ref. {p.reference}</span>
                  </div>
                  <h3 className="line-clamp-1 font-display text-base leading-snug">{p.title}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    <span className="truncate">{p.parish}, {p.municipality}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm text-muted-foreground">
                    {p.typology && <span className="font-medium text-foreground">{p.typology}</span>}
                    <span className="flex items-center gap-1"><BedDouble className="size-4" /> {p.beds}</span>
                    <span className="flex items-center gap-1"><Bath className="size-4" /> {p.baths}</span>
                    <span className="flex items-center gap-1"><Maximize2 className="size-4" /> {formatArea(p.area)}</span>
                  </div>

                  <CommissionInfo price={p.price} commission={commission} variant="pill" />
                  <DocNote documents={p.documents} />

                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <AgentAvatar agent={listing} className="size-7" />
                      <span className="truncate text-xs text-muted-foreground">
                        {isMine ? "O teu imóvel" : listing.name}
                      </span>
                    </div>
                  </div>

                  {!isMine && (
                    <ReferralDialog
                      propertyId={p.id}
                      reference={p.reference}
                      toName={listing.name}
                      fromId={agent.id}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
