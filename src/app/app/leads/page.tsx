import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { visibleLeadRows } from "@/lib/db/lead-access";
export const metadata = { title: "Pedidos e leads — Helix" };
export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const leads = session.demo ? [] : await visibleLeadRows(session.agent);
  return <main className="mx-auto max-w-4xl px-4 py-8">
    <Link href="/app" className="text-sm text-primary">← Área do consultor</Link>
    <h1 className="mt-4 font-display text-3xl">Pedidos e leads</h1>
    <p className="mt-2 text-sm text-muted-foreground">Contactos, pedidos do site e simulações para acompanhamento.</p>
    <div className="mt-6 space-y-3">{leads.map(lead => <Link key={lead.id} href={`/app/leads/${lead.id}`} className="block rounded-2xl border bg-card p-5 hover:border-primary">
      <h2 className="font-semibold">{lead.name}</h2><p className="mt-1 text-sm">{lead.contact} {lead.email && lead.email !== lead.contact ? `· ${lead.email}` : ""}</p>
      <p className="mt-2 text-sm text-muted-foreground">{lead.sub_source || lead.source} · {lead.property?.reference || "Sem imóvel associado"} · {new Date(lead.created_at).toLocaleString("pt-PT", {timeZone:"Europe/Lisbon"})}</p>
      <span className="mt-3 inline-block text-sm font-semibold text-primary">Abrir pedido e informação →</span>
    </Link>)}{!leads.length && <p className="rounded-2xl border p-6">Sem pedidos registados.</p>}</div>
  </main>;
}
