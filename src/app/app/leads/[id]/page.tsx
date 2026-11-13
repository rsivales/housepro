import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { readLeadAnswers, visibleLeadRows } from "@/lib/db/lead-access";
import { LeadContactAction } from "@/components/consultant/lead-contact-action";
import { MarkLeadRead } from "@/components/consultant/lead-inbox-view";
import { LeadPipelineAction } from "@/components/consultant/lead-pipeline-action";
import { hasPipelinePhone } from "@/lib/data/lead-pipelines";
import { crmLeadPipelines } from "@/lib/db/crm-lead-pipelines";
import { contactWait, valuationAnswers, websiteForm } from "@/lib/data/lead-answers";
export const metadata = { title: "Detalhe do pedido — Helix" };
export default async function LeadDetail({ params }: { params: Promise<{id:string}> }) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || session.demo) notFound();
  const [lead] = await visibleLeadRows(session.agent, id);
  if (!lead) notFound();
  const [{ answers, unavailable }, pipelines] = await Promise.all([readLeadAnswers(id), crmLeadPipelines(session.agent, session.demo)]);
  const fields = answers.length
    ? answers.map((answer) => ({ label: answer.label || answer.question_key.replace(/_/g, " "), value: answer.value }))
    : valuationAnswers(lead.message ?? "");
  const pipeline = pipelines.find((p) => p.key === lead.pipeline);
  const wait = contactWait(lead.created_at);
  const form = websiteForm(lead.source, lead.sub_source, lead.message);
  const phone = /^[+\d\s().-]{7,}$/.test(lead.contact) ? lead.contact.replace(/[^+\d]/g, "") : null;
  const email = lead.email || (lead.contact.includes("@") ? lead.contact : null);
  return <main className="mx-auto max-w-3xl px-4 py-8">
    <MarkLeadRead agentId={session.agent.id} leadId={id} />
    <nav className="flex flex-wrap gap-4 text-sm text-primary">
      <Link href="/app">← Início</Link>
      <Link href="/app/leads">Pedidos e leads</Link>
    </nav>
    <h1 className="mt-4 font-display text-3xl">{lead.name}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Recebido a {new Date(lead.created_at).toLocaleString("pt-PT",{timeZone:"Europe/Lisbon"})} · {lead.sub_source || lead.source}</p>
    <p className="mt-2 text-sm font-medium">
      {lead.contacted_at
        ? `Contactada a ${new Date(lead.contacted_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}`
        : lead.status === "novo" && (phone || email) && wait
          ? `Aguarda contacto há ${wait}`
          : "Sem primeiro contacto registado"}
    </p>
    <section className="mt-6 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Contacto e acompanhamento</h2>
      <p className="mt-3">{lead.contact}</p>{email && email !== lead.contact && <p>{email}</p>}
      {!phone && !email && <p className="mt-2 text-sm text-muted-foreground">Este registo assinala um clique em chamada ou WhatsApp. O visitante não deixou nome nem contacto; não é possível identificá-lo a partir deste clique.</p>}
      <div className="mt-4 flex flex-wrap gap-3">{phone && <a className="rounded-full border px-4 py-2 text-sm font-semibold" href={`tel:${phone}`}>Ligar</a>}{email && <a className="rounded-full border px-4 py-2 text-sm font-semibold" href={`mailto:${email}`}>Responder por e-mail</a>}{(phone || email) && <LeadContactAction leadId={id} contacted={Boolean(lead.contacted_at)} />}</div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Estado</dt><dd>{lead.contacted_at ? "Contactado" : lead.status}</dd></div><div><dt className="text-muted-foreground">Preferência / horário</dt><dd>{lead.contact_preference || "Não indicado"} · {lead.best_time || "Não indicado"}</dd></div>{lead.email_status && <div><dt className="text-muted-foreground">Envio do relatório</dt><dd>{lead.email_status === "enviado" ? "Aceite pelo serviço de e-mail" : "Pendente — responder ao cliente"}</dd></div>}</dl>
      {lead.property_id && <Link className="mt-4 block text-sm text-primary" href={`/imovel/${lead.property_id}`}>{lead.property?.reference} · {lead.property?.title}</Link>}
      {lead.contact_id && <Link className="mt-3 block text-sm text-primary" href={`/app/contactos/${lead.contact_id}`}>Abrir ficha do contacto →</Link>}
    </section>
    <section className="mt-4 rounded-2xl border bg-card p-5"><h2 className="font-semibold">Pedido e relatório</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{lead.message || "Sem mensagem adicional."}</p></section>
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Perguntas e respostas</h2>
      {fields.length > 0 ? <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(({ label, value }, i) => <div key={i} className="rounded-xl bg-secondary/50 p-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words font-medium">{value}</dd>
        </div>)}
      </dl> : <p className="mt-3 text-sm text-muted-foreground">{unavailable ? "Não foi possível carregar as respostas." : "Não foram guardadas respostas individuais para este pedido."}</p>}
    </section>
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Origem da lead</h2>
      <dl className="mt-3 grid gap-3 break-words text-sm sm:grid-cols-2">
        {[
          ["Canal", lead.source], ["Origem específica", lead.sub_source],
          ["Página de origem", lead.page_url], ["Campanha", lead.campaign_id],
          ["Formulário do website", lead.source === "site" ? form ?? "Não registado" : null], ["ID do formulário", lead.form_id], ["Versão do formulário", lead.form_version],
          ["Referência externa", lead.external_id],
        ].filter(([, value]) => value).map(([label, value]) => <div key={label}>
          <dt className="text-muted-foreground">{label}</dt><dd>{value}</dd>
        </div>)}
      </dl>
    </section>
    <section className="mt-4 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Pipeline</h2>
      <p className="mt-2 text-sm text-muted-foreground">Atual: {pipeline?.label ?? lead.pipeline ?? "Por classificar"}{pipeline && pipeline.stages[lead.stage] ? ` · ${pipeline.stages[lead.stage]}` : ""}</p>
      {hasPipelinePhone(lead.contact) ? <LeadPipelineAction leadId={id} current={lead.pipeline ?? undefined} pipelines={pipelines} /> : <p className="my-3 text-sm text-muted-foreground">É necessário um telefone válido para colocar este pedido num pipeline.</p>}
      <Link href="/app/crm" className="text-sm text-primary hover:underline">Ver pipelines do CRM →</Link>
    </section>
  </main>;
}
