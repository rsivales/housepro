import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { visibleLeadRows } from "@/lib/db/lead-access";
import { LeadContactAction } from "@/components/consultant/lead-contact-action";
export const metadata = { title: "Detalhe do pedido — Helix" };
export default async function LeadDetail({ params }: { params: Promise<{id:string}> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || session.demo) notFound();
  const [lead] = await visibleLeadRows(session.agent, id);
  if (!lead) notFound();
  const phone = /^[+\d\s().-]{7,}$/.test(lead.contact) ? lead.contact.replace(/[^+\d]/g, "") : null;
  const email = lead.email || (lead.contact.includes("@") ? lead.contact : null);
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <Link href="/app/leads" className="text-sm text-primary">← Pedidos e leads</Link>
    <h1 className="mt-4 font-display text-3xl">{lead.name}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Recebido a {new Date(lead.created_at).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"})} · {lead.sub_source || lead.source}</p>
    <section className="mt-6 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Contacto e acompanhamento</h2>
      <p className="mt-3">{lead.contact}</p>{email && email !== lead.contact && <p>{email}</p>}
      {!phone && !email && <p className="mt-2 text-sm text-muted-foreground">Este registo assinala um clique em chamada ou WhatsApp. O visitante não deixou nome nem contacto; não é possível identificá-lo a partir deste clique.</p>}
      <div className="mt-4 flex flex-wrap gap-3">{phone && <a className="rounded-full border px-4 py-2 text-sm font-semibold" href={`tel:${phone}`}>Ligar</a>}{email && <a className="rounded-full border px-4 py-2 text-sm font-semibold" href={`mailto:${email}`}>Responder por e-mail</a>}{(phone || email) && <LeadContactAction leadId={id} contacted={Boolean(lead.contacted_at)} />}</div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Estado</dt><dd>{lead.contacted_at ? "Contactado" : lead.status}</dd></div><div><dt className="text-muted-foreground">Preferência / horário</dt><dd>{lead.contact_preference || "Não indicado"} · {lead.best_time || "Não indicado"}</dd></div>{lead.email_status && <div><dt className="text-muted-foreground">Envio do relatório</dt><dd>{lead.email_status === "enviado" ? "Aceite pelo serviço de e-mail" : "Pendente — responder ao cliente"}</dd></div>}</dl>
      {lead.property_id && <Link className="mt-4 block text-sm text-primary" href={`/imovel/${lead.property_id}`}>{lead.property?.reference} · {lead.property?.title}</Link>}
      {lead.contact_id && <Link className="mt-3 block text-sm text-primary" href={`/app/contactos/${lead.contact_id}`}>Abrir ficha do contacto →</Link>}
    </section>
    <section className="mt-4 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Pedido e relatório</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{lead.message || "Sem mensagem adicional."}</p></section>
    {lead.page_url && <p className="mt-4 break-all text-xs text-muted-foreground">Página de origem: {lead.page_url}</p>}
  </main>;
}
