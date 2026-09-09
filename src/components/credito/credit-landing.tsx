"use client";
import * as React from "react";
import {
  ArrowRight,
  Building2,
  Calculator,
  FileText,
  Globe2,
  Home,
  Landmark,
  Lock,
  Scale,
  Users,
} from "lucide-react";
const goals = [
  [Home, "Habitação própria"],
  [Home, "Segunda habitação"],
  [Building2, "Empresa ou investimento"],
  [Globe2, "Novo residente em Portugal"],
];
const cards = [
  [
    "/credito/segunda-habitacao.jpg",
    "Segunda habitação",
    "Cenários adaptados a uma compra para férias ou arrendamento.",
  ],
  [
    "/credito/empresa.jpg",
    "Empresa e investimento",
    "Análise da estrutura da operação e encaminhamento para soluções adequadas.",
  ],
  [
    "/credito/chegar-portugal.jpg",
    "Chegar a Portugal",
    "Acompanhamento para quem vive no estrangeiro ou mudou recentemente.",
  ],
];
export function CreditLanding() {
  const [goal, setGoal] = React.useState(0);
  const [price, setPrice] = React.useState(250000);
  const [own, setOwn] = React.useState(50000);
  const [years, setYears] = React.useState(30);
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [guideStatus, setGuideStatus] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const monthly = Math.round(
    (Math.max(0, price - own) * (0.034 / 12)) /
      (1 - Math.pow(1 + 0.034 / 12, -years * 12)),
  );
  async function requestGuide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !consent) return;
    setGuideStatus("sending");
    try {
      const response = await fetch("/api/contact-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "guia_credito",
          clientName: name.trim(),
          clientEmail: email.trim(),
          objetivo: "Crédito habitação — pedido do guia",
        }),
      });
      setGuideStatus(response.ok ? "sent" : "error");
    } catch {
      setGuideStatus("error");
    }
  }
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#f8f5ef] pt-20">
        <img
          src="/credito/hero.jpg"
          className="absolute inset-0 -z-10 size-full object-cover object-[68%_center]"
          alt="Especialista de crédito a analisar propostas"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#f8f5ef_0%,rgba(248,245,239,.97)_37%,rgba(248,245,239,.25)_69%,rgba(248,245,239,.08))]" />
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="max-w-xl">
            <p className="text-[11px] font-bold tracking-[.16em] text-[#617087]">
              CRÉDITO HABITAÇÃO, COM ACOMPANHAMENTO
            </p>
            <h1 className="mt-3 font-display text-4xl leading-[.98] text-[#0b315b] sm:text-6xl">
              A casa certa merece uma proposta bem estudada.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#42526b] sm:text-base">
              Compare cenários e receba apoio dedicado em cada decisão, do
              pré-estudo à escritura.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#simular"
                className="hp-btn-red inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold"
              >
                Simular crédito <ArrowRight className="size-4" />
              </a>
              <a
                href="#especialista"
                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-[#0b315b]"
              >
                Falar com um especialista <ArrowRight className="size-4" />
              </a>
            </div>
            <p className="mt-3 text-[11px] text-[#4b5b70]">
              Simulação gratuita · Sem compromisso
              <br />O resultado detalhado é enviado por e-mail.
            </p>
          </div>
        </div>
      </section>
      <main className="bg-[#f5f7fa]">
        <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
          <h2 className="font-display text-2xl text-[#0b315b]">
            Comece pelo seu objetivo.
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {goals.map(([I, t], i) => {
              const Icon = I as typeof Home;
              return (
                <button
                  key={String(t)}
                  onClick={() => setGoal(i)}
                  className={`flex min-h-14 items-center gap-3 rounded border px-3 text-left text-xs font-semibold ${goal === i ? "border-[#b51f32] bg-white text-[#a31621]" : "border-[#d9dee5] bg-white text-[#263b57]"}`}
                >
                  <Icon className="size-5" />
                  {t as string}
                </button>
              );
            })}
          </div>
        </section>
        <section
          id="simular"
          className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_250px]"
        >
          <div>
            <p className="text-[11px] font-bold tracking-[.16em] text-[#617087]">
              SIMULADOR PERSONALIZADO
            </p>
            <h2 className="mt-1 font-display text-3xl text-[#0b315b]">
              Uma estimativa mais próxima do seu caso.
            </h2>
            <div className="mt-4 flex gap-4 border-b pb-3 text-xs">
              {["Projeto", "Perfil", "Preferências", "Contacto"].map((x, i) => (
                <button
                  key={x}
                  onClick={() => setStep(i + 1)}
                  className={
                    step === i + 1
                      ? "font-bold text-[#a31621]"
                      : "text-[#758297]"
                  }
                >
                  {i + 1}. {x}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Field label="Valor do imóvel" value={price} set={setPrice} />
              <Field
                label="Capital próprio / entrada"
                value={own}
                set={setOwn}
              />
              <label className="text-xs font-semibold text-[#31435c]">
                Prazo pretendido
                <select
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded border bg-white px-3 text-sm"
                >
                  <option value={25}>25 anos</option>
                  <option value={30}>30 anos</option>
                  <option value={35}>35 anos</option>
                </select>
              </label>
            </div>
            <div className="mt-4 rounded bg-white p-3 text-xs text-[#526174]">
              <b>⌄ Opções avançadas</b>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  [FileText, "Rendimentos e encargos"],
                  [Scale, "Tipo de taxa"],
                  [Users, "Titulares"],
                  [Landmark, "Situação profissional"],
                  [Calculator, "Outros financiamentos"],
                ].map(([I, t]) => {
                  const Icon = I as typeof Home;
                  return (
                    <button
                      key={String(t)}
                      className="flex min-h-16 flex-col items-center justify-center gap-1 border-l text-center"
                    >
                      <Icon className="size-4 text-[#0b315b]" />
                      <span>{t as string}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <aside className="rounded bg-[#eaf4fb] p-5 text-[#0b315b]">
            <h3 className="font-display text-xl">O seu resumo</h3>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <dt>Montante a financiar</dt>
                <dd>{(price - own).toLocaleString("pt-PT")} €</dd>
              </div>
              <div className="flex justify-between">
                <dt>Prestação estimada</dt>
                <dd>{monthly.toLocaleString("pt-PT")} €/mês</dd>
              </div>
              <div className="flex justify-between">
                <dt>Prazo</dt>
                <dd>{years} anos</dd>
              </div>
            </dl>
            <button
              onClick={() =>
                document
                  .getElementById("contacto-credito")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="hp-btn-red mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold"
            >
              Continuar simulação <ArrowRight className="size-4" />
            </button>
            <p className="mt-3 flex gap-1 text-[10px] text-[#607080]">
              <Lock className="size-3" /> Os seus dados são tratados apenas para
              preparar e acompanhar o pedido.
            </p>
          </aside>
        </section>
        <section
          id="especialista"
          className="mx-auto max-w-6xl px-5 py-10 sm:px-8"
        >
          <p className="text-[11px] font-bold tracking-[.16em] text-[#617087]">
            UM APOIO REAL
          </p>
          <h2 className="mt-1 font-display text-3xl text-[#0b315b]">
            Um especialista. Várias possibilidades.
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {cards.map(([im, t, d]) => (
              <article
                key={String(t)}
                className="overflow-hidden rounded border bg-white"
              >
                <img
                  src={im as string}
                  alt=""
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-display text-lg text-[#0b315b]">
                    {t as string}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-[#526174]">
                    {d as string}
                  </p>
                  <a
                    href="#contacto-credito"
                    className="mt-3 inline-flex text-xs font-bold text-[#a31621]"
                  >
                    Saber mais →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-6xl bg-[#0b1f3a] px-5 py-10 text-white sm:px-8">
          <h2 className="font-display text-3xl text-[#0b315b]">
            Prepare a decisão antes de falar com o banco.
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              "Checklist de documentos",
              "Comparar cenários",
              "Custos da compra",
              "Capacidade financeira",
            ].map((x) => (
              <a
                key={x}
                href="#simular"
                className="rounded border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white"
              >
                {x}
                <span className="mt-2 block text-xs text-[#ff9ca2]">
                  Abrir ferramenta →
                </span>
              </a>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-5 px-5 py-10 sm:px-8 md:grid-cols-2">
          <div className="relative min-h-60 overflow-hidden rounded border bg-white p-6">
            <img
              src="/credito/guia-credito.jpg"
              alt="Guia do crédito habitação HousePro"
              className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-80"
            />
            <div className="relative max-w-sm">
              <p className="text-[11px] font-bold tracking-[.16em] text-[#617087]">
                GUIA GRATUITO
              </p>
              <h2 className="mt-2 font-display text-3xl text-[#0b315b]">
                O guia do crédito habitação, sem linguagem complicada.
              </h2>
              <p className="mt-3 text-sm text-[#526174]">
                Documentos, etapas, tipos de taxa e perguntas essenciais antes
                da decisão.
              </p>
            </div>
          </div>
          <form
            id="contacto-credito"
            className="rounded border bg-white p-6"
            onSubmit={requestGuide}
          >
            <h2 className="font-display text-2xl text-[#0b315b]">
              Receba o guia
            </h2>
            <input
              placeholder="O seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-4 h-10 w-full rounded border px-3 text-sm"
            />
            <input
              placeholder="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-3 h-10 w-full rounded border px-3 text-sm"
            />
            <label className="mt-3 flex gap-2 text-[11px] leading-4 text-[#526174]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              Autorizo o contacto da HousePro para receber este guia.
            </label>
            <button
              disabled={guideStatus === "sending"}
              className="hp-btn-red mt-3 flex h-10 w-full items-center justify-center rounded text-sm font-bold disabled:opacity-60"
            >
              Receber o guia <ArrowRight className="ml-2 size-4" />
            </button>
            {guideStatus === "sent" && (
              <p
                role="status"
                className="mt-3 text-xs font-semibold text-emerald-700"
              >
                Pedido registado. Iremos enviar-lhe o guia por e-mail.
              </p>
            )}
            {guideStatus === "error" && (
              <p
                role="alert"
                className="mt-3 text-xs font-semibold text-red-700"
              >
                Não foi possível registar o pedido. Tente novamente.
              </p>
            )}
          </form>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <h2 className="font-display text-3xl text-[#0b315b]">
            Antes de avançar
          </h2>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {[
              "Quanto posso financiar?",
              "E se comprar através de uma empresa?",
              "Que documentos vou precisar?",
              "Mudei-me recentemente para Portugal. Posso pedir financiamento?",
              "Taxa fixa, variável ou mista?",
              "O que acontece depois da simulação?",
            ].map((q) => (
              <details key={q} className="rounded border bg-white p-3 text-sm">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-xs text-[#526174]">
                  Cada caso é analisado por um especialista, de acordo com o
                  perfil e as condições aplicáveis.
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
}) {
  return (
    <label className="text-xs font-semibold text-[#31435c]">
      {label}
      <input
        value={value}
        onChange={(e) => set(Number(e.target.value) || 0)}
        type="number"
        className="mt-1 h-10 w-full rounded border bg-white px-3 text-sm"
      />
    </label>
  );
}
