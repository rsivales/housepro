"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChevronDown,
  FileCheck2,
  FileText,
  Globe2,
  Home,
  Lightbulb,
  Lock,
  Menu,
  Percent,
  Scale,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ManagedSiteImage } from "@/components/brand/managed-site-image";
import { Logo } from "@/components/brand/logo";

const goals = [
  { icon: Home, label: "Habitação própria", purpose: "Habitação própria" },
  { icon: Home, label: "Segunda habitação", purpose: "Segunda habitação" },
  {
    icon: Building2,
    label: "Empresa ou investimento",
    purpose: "Investimento",
  },
  {
    icon: Globe2,
    label: "Novo residente em Portugal",
    purpose: "Habitação própria",
  },
];
const nav = [
  ["Comprar", "/imoveis?operacao=comprar"],
  ["Empreendimentos", "/empreendimentos"],
  ["Signature", "/signature"],
  ["Internacional", "/internacional"],
  ["Vender", "/vender"],
];

export function CreditLanding() {
  const [menu, setMenu] = React.useState(false),
    [goal, setGoal] = React.useState(0),
    [advanced, setAdvanced] = React.useState(false);
  const [price, setPrice] = React.useState(250000),
    [own, setOwn] = React.useState(50000),
    [years, setYears] = React.useState(30),
    [rate, setRate] = React.useState(3.4),
    [income, setIncome] = React.useState(3000),
    [charges, setCharges] = React.useState(0),
    [holders, setHolders] = React.useState(2);
  const [purpose, setPurpose] = React.useState(goals[0].purpose),
    [country, setCountry] = React.useState("Portugal"),
    [name, setName] = React.useState(""),
    [email, setEmail] = React.useState(""),
    [consent, setConsent] = React.useState(false),
    [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">(
      "idle",
    );
  const financed = Math.max(0, price - own),
    mr = rate / 100 / 12,
    monthly = Math.round(
      mr
        ? (financed * mr) / (1 - Math.pow(1 + mr, -years * 12))
        : financed / (years * 12),
    ),
    effort = income ? Math.round(((monthly + charges) / income) * 100) : 0;
  function choose(i: number) {
    setGoal(i);
    setPurpose(goals[i].purpose);
    if (i === 3) setCountry("Outro país");
    document
      .getElementById("simulador")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name || !email || !consent) return;
    setStatus("sending");
    try {
      const r = await fetch("/api/contact-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "credito_habitacao",
          clientName: name,
          clientEmail: email,
          objetivo: `${goals[goal].label} · ${price} € · ${years} anos · ${holders} titular(es)`,
        }),
      });
      setStatus(r.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }
  return (
    <div className="min-h-screen bg-white text-[#102743]">
      <header className="sticky top-0 z-50 border-b border-[#dfe5ec] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[62px] max-w-[1440px] items-center px-5 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="h-7" />
            <span className="hidden border-l border-[#ccd3dc] pl-3 text-[10px] font-semibold text-[#526174] sm:block">
              Crédito Habitação
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-7 text-[11px] font-medium lg:flex">
            {nav.map(([l, h]) => (
              <Link key={l} href={h} className="hover:text-[#d62832]">
                {l}
              </Link>
            ))}
            <span className="border-b-2 border-[#d62832] py-5">
              Crédito Habitação
            </span>
            <span>PT⌄</span>
          </nav>
          <a
            href="#contacto"
            className="ml-8 hidden min-h-10 items-center rounded bg-[#c51f32] px-5 text-[11px] font-bold text-white lg:inline-flex"
          >
            Falar com um especialista
          </a>
          <button
            className="ml-auto grid size-11 place-items-center lg:hidden"
            onClick={() => setMenu(!menu)}
            aria-label="Menu"
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu && (
          <nav className="border-t bg-white px-5 py-4 lg:hidden">
            {nav.map(([l, h]) => (
              <Link key={l} href={h} className="block py-3 text-sm">
                {l}
              </Link>
            ))}
            <a
              href="#contacto"
              className="mt-2 flex min-h-11 items-center justify-center rounded bg-[#d62832] font-semibold text-white"
            >
              Falar com um especialista
            </a>
          </nav>
        )}
      </header>
      <main>
        <section className="relative min-h-[430px] overflow-hidden border-b bg-[#f7f8fa] lg:min-h-[500px]">
          <ManagedSiteImage
            assetKey="credit.hero"
            fallback="/credito/hero.jpg"
            fallbackAlt="Especialista HousePro a estudar uma proposta de crédito"
            className="absolute inset-y-0 right-0 h-full w-full object-cover object-[65%_center] lg:w-[64%]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/10 lg:via-white/85" />
          <div className="relative mx-auto max-w-[1440px] px-6 py-12 lg:px-12 lg:py-16">
            <div className="max-w-[520px]">
              <p className="text-[10px] font-bold tracking-[.14em] text-[#53657b]">
                CRÉDITO HABITAÇÃO, COM ACOMPANHAMENTO
              </p>
              <h1 className="mt-3 max-w-[470px] font-display text-[44px] leading-[.94] tracking-[-.03em] text-[#082e55] sm:text-[58px]">
                A casa certa merece uma proposta bem estudada.
              </h1>
              <p className="mt-5 max-w-[390px] text-sm leading-6 text-[#3d5067]">
                Compare cenários e receba apoio dedicado em cada decisão, da
                simulação à escritura.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#simulador"
                  className="inline-flex min-h-11 items-center gap-4 rounded bg-[#d32234] px-5 text-xs font-bold text-white"
                >
                  Simular crédito <ArrowRight className="size-4" />
                </a>
                <a
                  href="#contacto"
                  className="inline-flex min-h-11 items-center gap-3 px-2 text-xs font-semibold underline underline-offset-4"
                >
                  Falar com um especialista <ArrowRight className="size-4" />
                </a>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-[#53657b]">
                Simulação gratuita · Sem compromisso
                <br />O resultado detalhado é enviado por e-mail.
              </p>
              <p className="mt-6 flex items-center gap-3 text-[11px] font-semibold">
                <Users className="size-5" /> Um especialista dedicado ao seu
                processo
              </p>
            </div>
          </div>
        </section>
        <section className="border-b bg-white">
          <div className="mx-auto max-w-[1440px] px-6 py-7 lg:px-12">
            <h2 className="font-display text-2xl">Comece pelo seu objetivo.</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {goals.map(({ icon: Icon, label }, i) => (
                <button
                  key={label}
                  onClick={() => choose(i)}
                  className={`flex min-h-[64px] items-center gap-3 rounded border px-4 text-left text-xs font-semibold ${goal === i ? "border-[#d62832] bg-[#fffafb] text-[#b21d2d]" : "border-[#dfe4ea] bg-white"}`}
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section id="simulador" className="scroll-mt-20 border-b bg-[#f7f9fb]">
          <div className="mx-auto grid max-w-[1440px] gap-7 px-6 py-10 lg:grid-cols-[1fr_310px] lg:px-12">
            <div>
              <p className="eyebrow">SIMULADOR PERSONALIZADO</p>
              <h2 className="mt-1 font-display text-4xl leading-none">
                Uma estimativa mais próxima do seu caso.
              </h2>
              <div className="mt-6 grid grid-cols-4 border-b text-[10px]">
                {["Projeto", "Perfil", "Preferências", "Contacto"].map(
                  (x, i) => (
                    <div
                      key={x}
                      className={`min-h-11 border-b-2 pt-2 ${i === 0 ? "border-[#d62832] font-bold text-[#c41f31]" : "border-transparent text-[#8692a2]"}`}
                    >
                      <span
                        className={`mr-2 inline-grid size-6 place-items-center rounded-full ${i === 0 ? "bg-[#d62832] text-white" : "bg-[#e9edf2]"}`}
                      >
                        {i + 1}
                      </span>
                      {x}
                    </div>
                  ),
                )}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Num label="Valor do imóvel" value={price} set={setPrice} />
                <Num
                  label="Capital próprio / entrada"
                  value={own}
                  set={setOwn}
                />
                <label className="field-label">
                  Prazo pretendido
                  <select
                    value={years}
                    onChange={(e) => setYears(+e.target.value)}
                    className="field"
                  >
                    <option>20</option>
                    <option>25</option>
                    <option>30</option>
                    <option>35</option>
                    <option>40</option>
                  </select>
                </label>
                <label className="field-label">
                  Finalidade
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="field"
                  >
                    <option>Habitação própria</option>
                    <option>Segunda habitação</option>
                    <option>Investimento</option>
                  </select>
                </label>
                <label className="field-label">
                  País de residência fiscal
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="field"
                  >
                    <option>Portugal</option>
                    <option>Outro país</option>
                  </select>
                </label>
              </div>
              <button
                onClick={() => setAdvanced(!advanced)}
                className="mt-4 flex min-h-10 w-full items-center rounded bg-[#eef1f4] px-4 text-xs font-semibold"
              >
                <ChevronDown
                  className={`mr-2 size-4 ${advanced ? "rotate-180" : ""}`}
                />{" "}
                Opções avançadas
              </button>
              {advanced && (
                <div className="mt-3 grid gap-4 rounded border bg-white p-4 sm:grid-cols-4">
                  <Num
                    label="Rendimento mensal líquido"
                    value={income}
                    set={setIncome}
                  />
                  <Num
                    label="Outros encargos mensais"
                    value={charges}
                    set={setCharges}
                  />
                  <label className="field-label">
                    Taxa indicativa (%)
                    <input
                      className="field"
                      type="number"
                      step="0.1"
                      value={rate}
                      onChange={(e) => setRate(+e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    Titulares
                    <select
                      className="field"
                      value={holders}
                      onChange={(e) => setHolders(+e.target.value)}
                    >
                      <option value="1">1 titular</option>
                      <option value="2">2 titulares</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 rounded border bg-white sm:grid-cols-5">
                {[
                  [FileText, "Rendimentos e encargos"],
                  [Percent, "Tipo de taxa"],
                  [Users, "Titulares"],
                  [BriefcaseBusiness, "Situação profissional"],
                  [Calculator, "Outros financiamentos"],
                ].map(([I, t]) => {
                  const Icon = I as typeof Home;
                  return (
                    <button
                      key={String(t)}
                      onClick={() => setAdvanced(true)}
                      className="flex min-h-[78px] flex-col items-center justify-center gap-2 border-r p-2 text-[10px]"
                    >
                      <Icon className="size-5" />
                      {t as string}
                    </button>
                  );
                })}
              </div>
            </div>
            <aside className="self-start rounded bg-[#eaf5fb] p-6">
              <h3 className="font-display text-2xl">O seu resumo</h3>
              <dl className="mt-6 space-y-4 text-xs">
                <Sum
                  icon={FileText}
                  label="Montante a financiar"
                  value={`${financed.toLocaleString("pt-PT")} €`}
                />
                <Sum
                  icon={Percent}
                  label="Prestação estimada"
                  value={`${monthly.toLocaleString("pt-PT")} €/mês`}
                />
                <Sum
                  icon={Calculator}
                  label="Taxa de esforço"
                  value={`${effort}%`}
                />
                <Sum icon={BarChart3} label="Cenário" value={purpose} />
              </dl>
              <p className="mt-6 flex gap-2 border-t pt-4 text-[9px] leading-4 text-[#617389]">
                <Lock className="size-4 shrink-0" /> A estimativa detalhada será
                calculada com base nos dados fornecidos e enviada por e-mail.
              </p>
              <a
                href="#contacto"
                className="mt-4 flex min-h-11 items-center justify-center gap-3 rounded bg-[#c82032] text-xs font-bold text-white"
              >
                Continuar simulação <ArrowRight className="size-4" />
              </a>
            </aside>
          </div>
        </section>
        <Section
          title="Um especialista. Várias possibilidades."
          eyebrow="UM APOIO REAL"
        >
          <div className="grid gap-6 md:grid-cols-3">
            <Benefit
              icon={FileCheck2}
              title="Comparação de propostas"
              text="Análise de diferentes soluções disponíveis."
            />
            <Benefit
              icon={Users}
              title="Processo acompanhado"
              text="Apoio na documentação, negociação e etapas do financiamento."
            />
            <Benefit
              icon={Lightbulb}
              title="Decisões explicadas"
              text="Condições, custos e diferenças apresentados com clareza."
            />
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <Profile
              image="/credito/segunda-habitacao.jpg"
              title="Segunda habitação"
            />
            <Profile
              image="/credito/empresa.jpg"
              title="Empresa e investimento"
            />
            <Profile
              image="/credito/chegar-portugal.jpg"
              title="Chegar a Portugal"
            />
          </div>
        </Section>
        <Section
          title="Prepare a decisão antes de falar com o banco."
          eyebrow="FERRAMENTAS ÚTEIS"
          grey
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              [FileCheck2, "Checklist de documentos"],
              [BarChart3, "Comparar cenários"],
              [Calculator, "Custos da compra"],
              [Scale, "Capacidade financeira"],
            ].map(([I, t]) => {
              const Icon = I as typeof Home;
              return (
                <button
                  key={String(t)}
                  onClick={() => {
                    setAdvanced(true);
                    document
                      .getElementById("simulador")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="min-h-[92px] rounded border bg-white p-4 text-left text-xs font-semibold"
                >
                  <Icon className="mb-3 size-6" />
                  {t as string}
                  <span className="mt-2 block text-[10px] text-[#c82032]">
                    Abrir ferramenta →
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
        <section id="contacto" className="scroll-mt-20 border-b bg-white">
          <div className="mx-auto grid max-w-[1440px] px-6 py-10 lg:grid-cols-[1.25fr_.75fr] lg:px-12">
            <div className="relative min-h-[300px] overflow-hidden rounded-l border bg-[#f4f0e9]">
              <ManagedSiteImage
                assetKey="credit.guide"
                fallback="/credito/guia-credito.jpg"
                fallbackAlt="Guia de crédito HousePro"
                className="absolute inset-y-0 left-0 h-full w-[42%] object-cover"
              />
              <div className="ml-[42%] p-7">
                <p className="eyebrow">GUIA GRATUITO</p>
                <h2 className="font-display text-4xl leading-none">
                  O guia do crédito habitação, sem linguagem complicada.
                </h2>
                <p className="mt-4 text-xs leading-5 text-[#586a7e]">
                  Documentos, etapas, tipos de taxa e perguntas essenciais antes
                  de decidir.
                </p>
              </div>
            </div>
            <form onSubmit={submit} className="rounded-r border bg-white p-7">
              <label className="field-label">
                Nome
                <input
                  required
                  className="field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="O seu nome"
                />
              </label>
              <label className="field-label mt-4">
                E-mail
                <input
                  required
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="O seu e-mail"
                />
              </label>
              <button
                disabled={status === "sending"}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-3 rounded bg-[#c82032] text-xs font-bold text-white"
              >
                Receber simulação e guia <ArrowRight className="size-4" />
              </button>
              <label className="mt-4 flex gap-2 text-[9px] leading-4 text-[#65758a]">
                <input
                  required
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                Autorizo o contacto da HousePro para acompanhamento deste
                pedido.
              </label>
              {status === "sent" && (
                <p className="mt-4 text-xs font-bold text-emerald-700">
                  Pedido registado com sucesso.
                </p>
              )}
              {status === "error" && (
                <p className="mt-4 text-xs font-bold text-red-700">
                  Não foi possível enviar. Tente novamente.
                </p>
              )}
            </form>
          </div>
        </section>
        <Section title="Do primeiro cálculo à assinatura.">
          <div className="grid grid-cols-4 gap-2">
            {[
              [Calculator, "Simular"],
              [BarChart3, "Comparar"],
              [ShieldCheck, "Preparar"],
              [FileCheck2, "Formalizar"],
            ].map(([I, t], i) => {
              const Icon = I as typeof Home;
              return (
                <div
                  key={String(t)}
                  className="border-t border-[#9bacbd] pt-3 text-xs"
                >
                  <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-[#e8edf2]">
                    {i + 1}
                  </span>
                  <Icon className="mr-2 inline size-4" />
                  {t as string}
                </div>
              );
            })}
          </div>
          <h3 className="mt-8 font-display text-2xl">Antes de avançar</h3>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {[
              "Quanto posso financiar?",
              "E se comprar através de uma empresa?",
              "Que documentos vou precisar?",
              "Mudei-me recentemente para Portugal. Posso pedir financiamento?",
              "Taxa fixa, variável ou mista?",
              "O que acontece depois da simulação?",
              "Posso pedir crédito para uma segunda habitação?",
            ].map((q) => (
              <details
                key={q}
                className="border-b bg-[#fafbfc] px-4 py-3 text-xs"
              >
                <summary>{q}</summary>
                <p className="mt-3 text-[#607086]">
                  Um especialista analisa o perfil, explica as opções e
                  acompanha a proposta.
                </p>
              </details>
            ))}
          </div>
        </Section>
        <section className="relative overflow-hidden bg-[#082e55] text-white">
          <ManagedSiteImage
            assetKey="credit.hero"
            fallback="/credito/hero.jpg"
            fallbackAlt=""
            className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-35"
          />
          <div className="relative mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-9 md:flex-row md:items-center lg:px-12">
            <h2 className="max-w-sm font-display text-3xl leading-none">
              Quer perceber que opções fazem sentido para si?
            </h2>
            <a
              href="#simulador"
              className="flex min-h-11 items-center gap-3 rounded bg-[#d62832] px-6 text-xs font-bold"
            >
              Começar simulação <ArrowRight className="size-4" />
            </a>
            <a
              href="#contacto"
              className="flex min-h-11 items-center rounded border border-white/60 px-6 text-xs font-bold"
            >
              Falar com um especialista
            </a>
          </div>
        </section>
      </main>
      <footer className="bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-7 text-[9px] text-[#586a7e] md:flex-row md:items-end md:justify-between lg:px-12">
          <div>
            <Logo className="h-6" />
            <p className="mt-2">
              Tranquil Search Lda · AMI 18746
              <br />
              Rua de Portugal, n.º 31, 8000-281 Faro
            </p>
          </div>
          <div className="flex gap-8">
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/privacidade">Termos</Link>
            <a href="#contacto">Contactos</a>
          </div>
          <p className="max-w-md">
            As simulações são indicativas e não constituem proposta de crédito.
          </p>
        </div>
      </footer>
      <style jsx global>{`
        .field-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #334b65;
        }
        .field {
          min-height: 42px;
          width: 100%;
          border: 1px solid #d9e0e7;
          border-radius: 5px;
          background: white;
          padding: 0 12px;
          color: #102743;
          font-size: 12px;
          outline: none;
        }
        .field:focus {
          border-color: #1b527f;
          box-shadow: 0 0 0 2px rgba(27, 82, 127, 0.12);
        }
        .eyebrow {
          margin-bottom: 6px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #64758a;
        }
        @media (max-width: 639px) {
          .field {
            min-height: 46px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
function Num({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
}) {
  return (
    <label className="field-label">
      {label}
      <input
        className="field"
        type="number"
        min="0"
        value={value}
        onChange={(e) => set(+e.target.value || 0)}
      />
    </label>
  );
}
function Sum({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4" />
      <dt>{label}</dt>
      <dd className="ml-auto max-w-28 text-right font-bold">{value}</dd>
    </div>
  );
}
function Benefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Home;
  title: string;
  text: string;
}) {
  return (
    <article className="flex gap-4">
      <Icon className="size-7 shrink-0" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#607086]">{text}</p>
      </div>
    </article>
  );
}
function Profile({ image, title }: { image: string; title: string }) {
  return (
    <article className="overflow-hidden border bg-white">
      <img src={image} alt={title} className="h-52 w-full object-cover" />
      <div className="p-5">
        <h3 className="font-display text-2xl">{title}</h3>
        <p className="mt-2 text-xs text-[#607086]">
          Análise dedicada e acompanhamento especializado.
        </p>
        <a
          href="#contacto"
          className="mt-3 inline-block text-xs font-bold text-[#c82032]"
        >
          Saber mais →
        </a>
      </div>
    </article>
  );
}
function Section({
  title,
  eyebrow,
  grey,
  children,
}: {
  title: string;
  eyebrow?: string;
  grey?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`border-b ${grey ? "bg-[#f6f7f8]" : "bg-white"}`}>
      <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-12">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="mb-7 font-display text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}
