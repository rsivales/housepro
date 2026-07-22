"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  Loader2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/format";
import {
  computeIMT,
  computeSelo,
  estimateEscritura,
  monthlyPayment,
} from "@/lib/reuniao/calc";

export function CostWizard({
  propertyId,
  reference,
  price,
  referrerId,
}: {
  propertyId: string;
  reference: string;
  price: number;
  referrerId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [credito, setCredito] = React.useState(true);
  const [hpp, setHpp] = React.useState(true);
  const [idade, setIdade] = React.useState(35);
  const [entrada, setEntrada] = React.useState(Math.round(price * 0.2));
  const [prazo, setPrazo] = React.useState(30);
  const [taxa, setTaxa] = React.useState(3.4);
  const [form, setForm] = React.useState({
    name: "",
    contact: "",
    email: "",
    consent: false,
  });

  // Estimativa (pura, cliente) — valores indicativos.
  const est = React.useMemo(() => {
    const imt = computeIMT(price, hpp ? "hpp" : "secundaria");
    const selo = computeSelo(price);
    const escritura = estimateEscritura();
    const despesas = imt + selo + escritura;
    if (credito) {
      const financiamentoMax = price * 0.9;
      const financiamento = Math.max(0, Math.min(price - entrada, financiamentoMax));
      const entradaNecessaria = price - financiamento;
      const prestacao = monthlyPayment(financiamento, taxa, prazo);
      return {
        imt, selo, escritura, despesas, financiamento,
        entradaNecessaria, prestacao,
        totalInicial: entradaNecessaria + despesas,
      };
    }
    return {
      imt, selo, escritura, despesas, financiamento: 0,
      entradaNecessaria: price, prestacao: 0,
      totalInicial: price + despesas,
    };
  }, [price, hpp, credito, entrada, prazo, taxa]);

  function reset() {
    setStep(0);
    setDone(false);
    setError(null);
  }

  const steps = credito ? 3 : 2; // 0..steps-1 são inputs; o último é resultado
  function next() {
    setError(null);
    if (step === steps - 1) {
      submit();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function submit() {
    if (!form.name.trim() || !form.contact.trim()) {
      setError("Indique o nome e um contacto.");
      return;
    }
    if (!form.consent) {
      setError("É necessário o consentimento RGPD.");
      return;
    }
    setSending(true);
    const resumo = credito
      ? `Compra a crédito · HPP: ${hpp ? "sim" : "não"} · idade ${idade} · entrada ${formatEuro(
          entrada
        )} · prazo ${prazo} anos. Estimativa: despesas ${formatEuro(
          est.despesas
        )}, entrada+despesas ${formatEuro(est.totalInicial)}, prestação ~${formatEuro(
          est.prestacao
        )}/mês.`
      : `Compra a pronto · HPP: ${hpp ? "sim" : "não"}. Estimativa: despesas ${formatEuro(
          est.despesas
        )}, total com despesas ${formatEuro(est.totalInicial)}.`;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ref: referrerId,
          intent: "custos",
          name: form.name,
          contact: form.contact,
          email: form.email || undefined,
          message: `Pedido de valor total com despesas de compra. ${resumo}`,
          consent: form.consent,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        className="w-full"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Calculator className="size-4" /> Pedir valor total com despesas incluídas
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho + progresso */}
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="font-display text-lg">Valor com despesas incluídas</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md hover:bg-secondary"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            {!done && (
              <div className="flex gap-1 px-5 pt-3">
                {Array.from({ length: steps }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i <= step ? "bg-primary" : "bg-secondary"
                    )}
                  />
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
              {done ? (
                <Result est={est} credito={credito} onClose={() => setOpen(false)} />
              ) : (
                <>
                  {/* Passo 1 — modo de compra */}
                  {step === 0 && (
                    <div className="space-y-5">
                      <div>
                        <p className="text-sm font-medium">Como pretende comprar?</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {[
                            { v: true, t: "Com crédito" },
                            { v: false, t: "A pronto" },
                          ].map((o) => (
                            <button
                              key={String(o.v)}
                              type="button"
                              onClick={() => setCredito(o.v)}
                              className={cn(
                                "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                                credito === o.v
                                  ? "border-primary bg-primary/5 font-medium text-foreground"
                                  : "hover:bg-secondary"
                              )}
                            >
                              {o.t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={hpp}
                          onChange={(e) => setHpp(e.target.checked)}
                          className="size-4 accent-primary"
                        />
                        É habitação própria permanente
                        <span className="text-xs text-muted-foreground">(afeta o IMT)</span>
                      </label>
                    </div>
                  )}

                  {/* Passo 2 — dados de financiamento (só crédito) */}
                  {step === 1 && credito && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="cw-age">Idade</Label>
                          <Input
                            id="cw-age"
                            type="number"
                            value={idade || ""}
                            onChange={(e) => setIdade(Number(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cw-prazo">Prazo (anos)</Label>
                          <Input
                            id="cw-prazo"
                            type="number"
                            value={prazo || ""}
                            onChange={(e) => setPrazo(Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cw-entrada">Entrada disponível (€)</Label>
                        <Input
                          id="cw-entrada"
                          type="number"
                          value={entrada || ""}
                          onChange={(e) => setEntrada(Number(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Financiamento máximo habitual: 90% do valor.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cw-taxa">TAN estimada (%)</Label>
                        <Input
                          id="cw-taxa"
                          type="number"
                          step="0.1"
                          value={taxa || ""}
                          onChange={(e) => setTaxa(Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Passo final — contacto */}
                  {step === steps - 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Deixe o seu contacto — o consultor confirma os valores finais
                        (incluindo despesas de compra) para o imóvel{" "}
                        <span className="font-medium text-foreground">{reference}</span>.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="cw-name">Nome</Label>
                        <Input
                          id="cw-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="cw-contact">Telefone</Label>
                          <Input
                            id="cw-contact"
                            type="tel"
                            value={form.contact}
                            onChange={(e) => setForm({ ...form, contact: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cw-email">Email</Label>
                          <Input
                            id="cw-email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <label
                        htmlFor="cw-consent"
                        className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                      >
                        <input
                          id="cw-consent"
                          type="checkbox"
                          checked={form.consent}
                          onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                        />
                        <span>
                          Autorizo o tratamento dos meus dados para ser contactado, nos
                          termos da{" "}
                          <Link href="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
                            Política de Privacidade
                          </Link>
                          . (RGPD)
                        </span>
                      </label>

                      {/* Prévia da estimativa */}
                      <div className="rounded-xl border bg-secondary/40 p-3 text-sm">
                        <p className="font-medium">Estimativa indicativa</p>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <Row k="Preço" v={formatEuro(price)} />
                          <Row k="Despesas de compra (IMT, Selo, escritura)" v={formatEuro(est.despesas)} />
                          {credito ? (
                            <>
                              <Row k="Entrada necessária" v={formatEuro(est.entradaNecessaria)} />
                              <Row k="Prestação mensal estimada" v={`${formatEuro(est.prestacao)}/mês`} />
                              <Row k="Necessário para avançar" v={formatEuro(est.totalInicial)} strong />
                            </>
                          ) : (
                            <Row k="Total com despesas" v={formatEuro(est.totalInicial)} strong />
                          )}
                        </div>
                      </div>

                      {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Rodapé — navegação */}
            {!done && (
              <div className="flex items-center justify-between gap-2 border-t px-5 py-3.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (step === 0 ? setOpen(false) : setStep((s) => s - 1))}
                >
                  <ArrowLeft className="size-4" /> {step === 0 ? "Cancelar" : "Voltar"}
                </Button>
                <Button size="sm" onClick={next} disabled={sending}>
                  {sending && <Loader2 className="size-4 animate-spin" />}
                  {step === steps - 1 ? "Enviar pedido" : "Continuar"}
                  {step < steps - 1 && <ArrowRight className="size-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? "font-medium text-foreground" : ""}>{k}</span>
      <span className={cn("shrink-0 tabular-nums", strong && "font-semibold text-foreground")}>{v}</span>
    </div>
  );
}

function Result({
  est,
  credito,
  onClose,
}: {
  est: {
    despesas: number;
    entradaNecessaria: number;
    prestacao: number;
    totalInicial: number;
  };
  credito: boolean;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
        <Check className="size-6" />
      </div>
      <div>
        <p className="font-medium">Pedido enviado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          O consultor vai confirmar os valores finais. Entretanto, aqui fica a
          estimativa indicativa:
        </p>
      </div>
      <div className="rounded-xl border bg-secondary/40 p-4 text-left text-sm text-muted-foreground">
        <Row k="Despesas de compra" v={formatEuro(est.despesas)} />
        {credito ? (
          <>
            <Row k="Entrada necessária" v={formatEuro(est.entradaNecessaria)} />
            <Row k="Prestação mensal estimada" v={`${formatEuro(est.prestacao)}/mês`} />
            <Row k="Necessário para avançar" v={formatEuro(est.totalInicial)} strong />
          </>
        ) : (
          <Row k="Total com despesas" v={formatEuro(est.totalInicial)} strong />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Valores meramente indicativos e estimados, sem compromisso. Não dispensam
        simulação bancária nem a validação do consultor.
      </p>
      <Button className="w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}
