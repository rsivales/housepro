import Link from "next/link";
import { ArrowLeft, Building2, Check, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { InterestForm } from "@/components/projects/interest-form";
import { listDevelopments } from "@/lib/db/repo";

export default async function EmpreendimentoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = (await listDevelopments()).find((p) => p.id === id);
  const name = property?.developmentName ?? property?.title ?? "Empreendimento HousePro";
  return <div className="min-h-dvh bg-background"><SiteHeader /><main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><Link href="/empreendimentos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="size-4"/> Empreendimentos</Link><div className="mt-4 overflow-hidden rounded-3xl bg-[#061d3b] p-7 text-white sm:p-10"><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-200">Empreendimento</p><h1 className="mt-3 font-display text-4xl">{name}</h1><p className="mt-3 max-w-2xl text-white/75">Unidades selecionadas, acompanhamento pelo agente responsável e informação clara em cada fase do projeto.</p>{property && <p className="mt-5 flex items-center gap-2 text-sm text-sky-100"><MapPin className="size-4"/>{property.parish}, {property.municipality}</p>}</div><section className="mt-7 grid gap-6 md:grid-cols-[1.15fr_.85fr]"><div><h2 className="font-display text-2xl">Unidades disponíveis</h2><div className="mt-4 rounded-2xl border bg-card p-5"><p className="flex items-center gap-2 font-medium"><Building2 className="size-5 text-primary"/> Consulte disponibilidade e valores atualizados</p><ul className="mt-4 space-y-2 text-sm text-muted-foreground"><li className="flex gap-2"><Check className="size-4 text-primary"/>Tipologias e plantas do empreendimento</li><li className="flex gap-2"><Check className="size-4 text-primary"/>Condições comerciais explicadas pelo responsável</li></ul></div></div><aside className="rounded-2xl bg-primary p-5 text-primary-foreground"><h2 className="font-display text-xl">Pedir informações</h2><p className="mt-1 text-sm opacity-90">A sua mensagem é entregue diretamente ao agente responsável pelo empreendimento.</p><InterestForm kind="development" projectId={id} projectName={name}/></aside></section></main><SiteFooter /></div>;
}
