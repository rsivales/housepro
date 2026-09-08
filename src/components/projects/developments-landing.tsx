"use client";
/* eslint-disable @next/next/no-img-element -- imagens publicadas no Supabase têm origem dinâmica */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  FileText,
  MapPin,
  Scale,
  Send,
  X,
} from "lucide-react";

import { formatArea, formatEuro } from "@/lib/format";
import type { Property } from "@/lib/data/types";

type Project = {
  id: string;
  name: string;
  location: string;
  stage?: Property["developmentStage"];
  image?: string;
  units: Property[];
  brochureUrl?: string;
};

type FormKind = "information" | "brochure" | "guide" | "alert";

const stageLabel: Record<string, string> = {
  planta: "Em planta",
  construcao: "Em construção",
  pronto: "Pronto a habitar",
};

function projectFromUnits(units: Property[]): Project[] {
  const grouped = new Map<string, Property[]>();
  for (const unit of units) {
    const key = unit.developmentName?.trim() || unit.id;
    grouped.set(key, [...(grouped.get(key) ?? []), unit]);
  }
  return [...grouped.entries()].map(([, group]) => {
    const first = group[0];
    return {
      id: first.id,
      name: first.developmentName?.trim() || first.title,
      location: [first.parish, first.municipality].filter(Boolean).join(", "),
      stage: first.developmentStage,
      image: first.image,
      units: group,
      brochureUrl: group.find((unit) => unit.developmentBrochureUrl)?.developmentBrochureUrl,
    };
  });
}

function typologies(units: Property[]) {
  return [...new Set(units.map((unit) => unit.typology).filter(Boolean))].join(" · ");
}

function LeadForm({
  kind,
  title,
  project,
  onDone,
}: {
  kind: FormKind;
  title: string;
  project?: Project;
  onDone?: () => void;
}) {
  const [state, setState] = React.useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/development-lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        projectId: project?.id,
        projectName: project?.name,
        brochureUrl: project?.brochureUrl,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
        marketingConsent: form.get("marketing") === "on",
        pageUrl: window.location.href,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; delivered?: boolean };
    if (!response.ok) {
      setMessage(data.error ?? "Não foi possível enviar agora. Tente novamente.");
      setState("error");
      return;
    }
    setMessage(data.delivered ? "Enviámos o material para o seu email." : "Recebemos o seu pedido. Um consultor irá acompanhar o envio.");
    setState("ok");
    onDone?.();
  }

  if (state === "ok") return <p className="rounded-xl bg-emerald-950 px-4 py-3 text-sm text-emerald-50"><Check className="mr-2 inline size-4" />{message}</p>;

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="sm:col-span-2 font-display text-2xl text-white">{title}</h3>
      <input required name="name" aria-label="Nome" placeholder="Nome" className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white placeholder:text-white/60" />
      <input required name="email" type="email" aria-label="Email" placeholder="Email" className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white placeholder:text-white/60" />
      <input name="phone" inputMode="tel" aria-label="Telefone" placeholder="Telefone (opcional)" className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white placeholder:text-white/60" />
      <input name="message" aria-label="Mensagem" placeholder="O que procura?" className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-3 text-sm text-white placeholder:text-white/60" />
      <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-white/75">
        <input required type="checkbox" className="mt-1 size-4" />
        Autorizo o tratamento dos meus dados para resposta a este pedido, nos termos da política de privacidade.
      </label>
      <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-white/70">
        <input name="marketing" type="checkbox" className="mt-1 size-4" />
        Quero receber novidades e oportunidades HousePro. Posso cancelar a qualquer momento.
      </label>
      <button disabled={state === "sending"} className="sm:col-span-2 min-h-11 rounded-xl bg-[#d81f37] px-4 text-sm font-semibold text-white transition hover:bg-[#bd152b] disabled:opacity-70">
        {state === "sending" ? "A enviar…" : "Enviar pedido"} <ArrowRight className="ml-1 inline size-4" />
      </button>
      {state === "error" && <p className="sm:col-span-2 text-sm text-red-200">{message}</p>}
    </form>
  );
}

export function DevelopmentsLanding({ units }: { units: Property[] }) {
  const projects = React.useMemo(() => projectFromUnits(units), [units]);
  const [location, setLocation] = React.useState("all");
  const [typology, setTypology] = React.useState("all");
  const [stage, setStage] = React.useState("all");
  const [budget, setBudget] = React.useState("all");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [form, setForm] = React.useState<{ kind: FormKind; project?: Project } | null>(null);

  const locations = React.useMemo(() => [...new Set(projects.map((project) => project.location).filter(Boolean))], [projects]);
  const allTypes = React.useMemo(() => [...new Set(units.map((unit) => unit.typology).filter(Boolean))], [units]);
  const filtered = projects.filter((project) => {
    const price = Math.min(...project.units.map((unit) => unit.price).filter(Boolean));
    return (location === "all" || project.location === location)
      && (typology === "all" || project.units.some((unit) => unit.typology === typology))
      && (stage === "all" || project.stage === stage)
      && (budget === "all" || (Number.isFinite(price) && price <= Number(budget)));
  });
  const compared = units.filter((unit) => selected.includes(unit.id));

  function toggle(unit: Property) {
    setSelected((current) => current.includes(unit.id)
      ? current.filter((id) => id !== unit.id)
      : current.length < 3 ? [...current, unit.id] : current);
  }

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#061a31] text-white">
        {projects[0]?.image && <img src={projects[0].image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-55" />}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(3,19,39,.98)_0%,rgba(4,28,54,.88)_42%,rgba(4,28,54,.32)_100%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-28 pt-16 sm:px-6 sm:pt-24 lg:pb-36">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/65">Novos empreendimentos</p>
          <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[.95] tracking-tight sm:text-6xl lg:text-7xl">Novas formas de viver Portugal.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/80 sm:text-lg">Descubra projetos selecionados pela arquitetura, localização e qualidade de vida.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#colecao" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#d81f37] px-5 text-sm font-semibold text-white">Explorar empreendimentos <ArrowRight className="size-4" /></a>
            <a href="#comparador" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/45 px-5 text-sm font-semibold text-white">Comparar unidades <Scale className="size-4" /></a>
          </div>
          <p className="mt-10 text-xs text-white/60">{projects.length ? `${projects.length} projetos em comercialização` : "Em preparação pela HousePro"}</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); document.getElementById("colecao")?.scrollIntoView({ behavior: "smooth" }); }} className="absolute bottom-0 left-1/2 z-10 w-[min(100%-2rem,72rem)] -translate-x-1/2 translate-y-1/2 rounded-xl bg-white p-3 text-[#071d37] shadow-xl">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Filter label="Localização" value={location} onChange={setLocation} options={locations.map((item) => [item, item])} />
            <Filter label="Tipologia" value={typology} onChange={setTypology} options={allTypes.map((item) => [item!, item!])} />
            <Filter label="Fase do projeto" value={stage} onChange={setStage} options={Object.entries(stageLabel)} />
            <Filter label="Preço" value={budget} onChange={setBudget} options={[["500000", "Até 500 000 €"], ["1000000", "Até 1 000 000 €"], ["2000000", "Até 2 000 000 €"]]} />
            <button className="min-h-12 rounded-md bg-[#d81f37] px-4 text-sm font-semibold text-white">Pesquisar <ArrowRight className="ml-1 inline size-4" /></button>
          </div>
        </form>
      </section>

      <section id="colecao" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 pt-28 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Em destaque</p><h2 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">Cada projeto, uma forma diferente de viver.</h2></div>
          {projects.length > 3 && <a href="#todos" className="text-sm font-semibold text-[#a31621]">Ver todos os empreendimentos <ArrowRight className="ml-1 inline size-4" /></a>}
        </div>
        {filtered.length ? <div className="mt-9 grid gap-4 md:grid-cols-3">{filtered.slice(0, 6).map((project, index) => <ProjectCard key={project.id} project={project} featured={index === 0} onBrochure={() => setForm({ kind: "brochure", project })} />)}</div> : <EmptyProjects />}
      </section>

      <section className="border-y bg-[#f4f0e9] py-14 text-[#071d37]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#735f42]">Empreendimentos no Algarve</p><h2 className="mt-3 font-display text-4xl leading-none">Descubra o Algarve, projeto a projeto.</h2><p className="mt-4 max-w-sm leading-7 text-[#465269]">As localizações surgem apenas quando existem empreendimentos publicados.</p></div>
          <div className="rounded-2xl border border-[#d9d0c2] bg-white p-6"><MapPin className="size-6 text-[#a31621]" /><p className="mt-4 font-medium">Mapa de localizações</p><p className="mt-1 text-sm text-[#637083]">{locations.length ? locations.join(" · ") : "Ainda sem localizações de empreendimentos publicadas."}</p></div>
        </div>
      </section>

      <section id="comparador" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">Escolha com clareza</p><h2 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">Encontre a unidade certa para si.</h2><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Compare até três unidades disponíveis, sem perder de vista o que realmente importa.</p><UnitComparison units={compared} /></div>
          <aside className="rounded-2xl bg-[#071d37] p-6 text-white"><BarChart3 className="size-6 text-[#f1d6a1]" /><h3 className="mt-4 font-display text-2xl">Selecione unidades</h3><p className="mt-2 text-sm leading-6 text-white/70">Marque até três unidades da lista abaixo para as comparar lado a lado.</p><div className="mt-5 max-h-72 space-y-2 overflow-auto pr-1">{units.length ? units.map((unit) => <label key={unit.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 px-3 py-3 text-sm"><input type="checkbox" checked={selected.includes(unit.id)} disabled={!selected.includes(unit.id) && selected.length >= 3} onChange={() => toggle(unit)} className="size-4 accent-[#d81f37]" /><span className="min-w-0"><b className="block truncate">{unit.typology || unit.title}</b><span className="text-xs text-white/65">{unit.reference} · {formatEuro(unit.price)}</span></span></label>) : <p className="rounded-xl border border-dashed border-white/30 p-4 text-sm text-white/70">As unidades serão disponibilizadas quando os empreendimentos forem publicados.</p>}</div><button onClick={() => setForm({ kind: "information" })} className="mt-5 min-h-11 w-full rounded-md bg-[#d81f37] px-4 text-sm font-semibold">Falar com um consultor <ArrowRight className="ml-1 inline size-4" /></button></aside>
        </div>
      </section>

      <section className="bg-[#f4f0e9] py-16 text-[#071d37]"><div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#735f42]">Decida com acompanhamento</p><h2 className="mt-3 font-display text-4xl leading-none">Plantas, orientação e documentação explicadas por um consultor.</h2><button onClick={() => setForm({ kind: "information" })} className="mt-7 min-h-11 rounded-md bg-[#d81f37] px-5 text-sm font-semibold text-white">Pedir apoio <ArrowRight className="ml-1 inline size-4" /></button></div><div className="rounded-2xl border border-[#dfd6c9] bg-white p-6"><BookOpen className="size-7 text-[#a31621]" /><p className="mt-4 text-xs font-semibold uppercase tracking-[.18em] text-[#735f42]">Guia gratuito</p><h2 className="mt-2 font-display text-3xl">Comprar em planta, passo a passo.</h2><p className="mt-3 text-sm leading-6 text-[#526074]">Receba um guia prático sobre etapas, documentos, pagamentos e cuidados essenciais antes de escolher.</p><button onClick={() => setForm({ kind: "guide" })} className="mt-5 min-h-11 rounded-md border border-[#a31621] px-4 text-sm font-semibold text-[#a31621]">Receber o guia <Send className="ml-1 inline size-4" /></button></div></div></section>

      <section className="bg-[#071d37] py-12 text-white"><div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/60">Alertas personalizados</p><h2 className="mt-2 font-display text-3xl">Se surgir o projeto certo, avisamos primeiro.</h2></div><button onClick={() => setForm({ kind: "alert" })} className="min-h-11 rounded-md bg-[#d81f37] px-5 text-sm font-semibold">Criar alerta <ArrowRight className="ml-1 inline size-4" /></button></div></section>

      {form && <div role="dialog" aria-modal="true" aria-label="Pedido de informação" className="fixed inset-0 z-[70] grid place-items-center bg-black/65 p-4"><div className="relative max-h-[92dvh] w-full max-w-xl overflow-auto rounded-2xl bg-[#071d37] p-6 shadow-2xl"><button onClick={() => setForm(null)} aria-label="Fechar" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-white hover:bg-white/10"><X className="size-5" /></button><LeadForm kind={form.kind} project={form.project} title={form.kind === "guide" ? "Receber o guia" : form.kind === "brochure" ? `Receber brochura${form.project ? ` · ${form.project.name}` : ""}` : form.kind === "alert" ? "Criar alerta de empreendimento" : "Pedir informações"} onDone={() => undefined} /></div></div>}
    </>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="relative block rounded-md border border-slate-200 px-3 py-2"><span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 w-full appearance-none bg-transparent pr-5 text-sm outline-none"><option value="all">Qualquer opção</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-4 text-slate-400" /></label>;
}

function ProjectCard({ project, featured, onBrochure }: { project: Project; featured: boolean; onBrochure: () => void }) {
  const minPrice = Math.min(...project.units.map((unit) => unit.price).filter(Boolean));
  return <article className={featured ? "relative min-h-[27rem] overflow-hidden rounded-2xl bg-[#071d37] md:row-span-2" : "relative min-h-80 overflow-hidden rounded-2xl bg-[#071d37]"}>{project.image && <img src={project.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-[#061a31] via-[#061a31]/35 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">{project.location || "Localização a confirmar"}</p><h3 className="mt-2 font-display text-3xl leading-none">{project.name}</h3><p className="mt-3 text-sm text-white/80">{typologies(project.units) || "Unidades disponíveis"}{Number.isFinite(minPrice) ? ` · Desde ${formatEuro(minPrice)}` : ""}</p><div className="mt-5 flex flex-wrap gap-2"><Link href={`/empreendimentos/${project.id}`} className="inline-flex min-h-10 items-center rounded-md border border-white/65 px-3 text-sm font-semibold">Conhecer o projeto <ArrowRight className="ml-1 size-4" /></Link>{project.brochureUrl && <button onClick={onBrochure} className="inline-flex min-h-10 items-center px-2 text-sm font-semibold underline underline-offset-4"><FileText className="mr-1 size-4" />Obter brochura</button>}</div></div></article>;
}

function UnitComparison({ units }: { units: Property[] }) {
  const rows: [string, (unit: Property) => string][] = [["Tipologia", (unit) => unit.typology || "—"], ["Piso", () => "—"], ["Área", (unit) => unit.area ? formatArea(unit.area) : "—"], ["Quartos", (unit) => unit.beds ? String(unit.beds) : "—"], ["Casas de banho", (unit) => unit.baths ? String(unit.baths) : "—"], ["Preço", (unit) => unit.price ? formatEuro(unit.price) : "Sob consulta"], ["Estado", (unit) => unit.developmentStage ? stageLabel[unit.developmentStage] : "—"]];
  if (!units.length) return <div className="mt-8 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Escolha unidades publicadas para iniciar a comparação. Não mostramos valores de exemplo.</div>;
  return <div className="mt-8 overflow-x-auto rounded-2xl border"><table className="min-w-[38rem] w-full text-left text-sm"><thead className="bg-secondary/60"><tr><th className="p-4 font-medium text-muted-foreground">Unidade</th>{units.map((unit) => <th key={unit.id} className="min-w-44 p-4 font-semibold">{unit.typology || unit.title}<span className="mt-1 block text-xs font-normal text-muted-foreground">{unit.reference}</span></th>)}</tr></thead><tbody>{rows.map(([label, get]) => <tr key={label} className="border-t"><th className="p-4 font-medium text-muted-foreground">{label}</th>{units.map((unit) => <td key={unit.id} className="p-4">{get(unit)}</td>)}</tr>)}</tbody></table></div>;
}

function EmptyProjects() { return <div className="mt-9 rounded-2xl border border-dashed bg-card px-6 py-14 text-center"><Building2 className="mx-auto size-9 text-muted-foreground" /><h3 className="mt-4 font-display text-3xl">Novos projetos a caminho</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Ainda não existem empreendimentos publicados. Assim que uma unidade real estiver aprovada, aparecerá aqui com a respetiva informação e materiais autorizados.</p></div>; }
