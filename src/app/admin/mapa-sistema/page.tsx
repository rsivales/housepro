import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe2, Network } from "lucide-react";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";

const website = [
  ["Homepage", "/"], ["Imóveis", "/imoveis"], ["Empreendimentos", "/empreendimentos"], ["Signature", "/signature"], ["Internacional", "/internacional"], ["Vender", "/vender"], ["Avaliação", "/avaliacao-imovel"], ["Crédito", "/credito"], ["Mais-valias", "/ferramentas/calculadora-mais-valias"], ["Guia HousePro", "/noticias"], ["Carreiras", "/carreiras"],
];
const helix = [
  ["Início", "/app"], ["Contactos", "/app/contactos"], ["Pipeline", "/app/meta/pipeline"], ["Agenda", "/app/agenda"], ["Imóveis", "/app/desempenho"], ["Empreendimentos", "/app/empreendimentos"], ["Internacional", "/app/parcerias"], ["LegalFlow", "/app/legalflow"], ["Ferramentas", "/app/ferramentas"], ["Equipa", "/app/equipa"], ["Relatórios", "/app/observabilidade"],
];

export default async function SystemMapPage() {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Painel Super Admin</Link><h1 className="mt-5 font-display text-3xl">Mapa do ecossistema HousePro</h1><p className="mt-2 text-sm text-muted-foreground">Inventário navegável das áreas públicas e do CRM Helix. A presença no mapa não altera permissões.</p><div className="mt-8 grid gap-6 lg:grid-cols-2"><Map title="Website público" icon={Globe2} items={website} /><Map title="CRM Helix" icon={Network} items={helix} /></div></main>;
}
function Map({ title, icon: Icon, items }: { title: string; icon: typeof Globe2; items: string[][] }) { return <section className="rounded-3xl border bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><Icon className="size-5 text-primary" /> {title}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{items.map(([label, href]) => <Link key={href} href={href} target="_blank" className="flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm hover:bg-secondary"><span>{label}</span><ExternalLink className="size-3.5 text-muted-foreground" /></Link>)}</div></section>; }
