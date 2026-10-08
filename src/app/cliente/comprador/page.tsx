import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Home } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ensureBuyerContact } from "@/lib/db/repo";
import { getBuyerPortalDataByContactId } from "@/lib/db/buyer-portal";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FavoritesList } from "@/components/cliente/favorites-list";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "A minha compra" };

/**
 * Área do comprador autenticado (conta por e-mail em /cliente/entrar) — o
 * contacto e os favoritos ficam salvaguardados desde o primeiro acesso,
 * antes de qualquer negócio existir. Assim que um consultor liga este
 * e-mail a um negócio, o processo aparece aqui automaticamente.
 */
export default async function CompradorPortal() {
  if (!isSupabaseConfigured()) redirect("/cliente/entrar");

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) redirect("/cliente/entrar");

  const contact = await ensureBuyerContact(user.id, user.email);
  const deal = contact ? await getBuyerPortalDataByContactId(contact.id, contact.name) : null;
  const firstName = (contact?.name || user.email.split("@")[0] || "").split(" ")[0];

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-primary">A minha conta</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Olá, {firstName || "bem-vindo(a)"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O seu processo de compra e os imóveis que guardou — tudo num só sítio.
        </p>

        {deal?.propertyRef ? (
          <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center gap-4 p-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {deal.propertyImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={deal.propertyImage} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground"><Home className="size-5" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{deal.propertyTitle || "O seu imóvel"}</p>
                <p className="text-sm text-muted-foreground">
                  Ref. {deal.propertyRef}{deal.amount ? ` · ${formatEuro(deal.amount)}` : ""}
                </p>
              </div>
            </div>
            <div className="border-t p-4">
              <h2 className="font-display text-lg">Estado do processo</h2>
              <ol className="mt-3 space-y-2">
                {deal.milestones.map((m) => (
                  <li key={m.stage} className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        m.reached ? "bg-primary text-primary-foreground" : "border text-muted-foreground"
                      )}
                    >
                      {m.reached ? <Check className="size-4" /> : ""}
                    </span>
                    <span className={cn("text-sm", m.reached ? "font-medium" : "text-muted-foreground")}>{m.label}</span>
                    {m.at && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(m.at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : (
          <p className="mt-8 rounded-2xl border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Ainda não há nenhum processo de compra associado. Assim que o seu consultor iniciar um negócio consigo, o
            progresso aparece aqui automaticamente — não precisa de pedir um link.
          </p>
        )}

        <section className="mt-10">
          <h2 className="font-display text-xl">Imóveis guardados</h2>
          <FavoritesList />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
