import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Guia para comprar em planta",
  description: "Guia HousePro com os passos essenciais para comprar um imóvel em planta.",
};

const steps = [
  ["Antes de reservar", "Confirme a localização, o promotor, o caderno de encargos e o que está efetivamente incluído."],
  ["Contrato-promessa", "Leia as condições de pagamento, prazos, licenças, alterações à obra e as regras para devolução do sinal."],
  ["Durante a construção", "Guarde as comunicações, acompanhe os marcos definidos no contrato e confirme qualquer alteração por escrito."],
  ["Entrega e escritura", "Faça uma vistoria cuidada, reúna a documentação final e esclareça previamente os encargos e os serviços associados."],
];

export default function GuiaComprarEmPlantaPage() {
  return <div className="min-h-dvh bg-[#f4f0e9] text-[#071d37]"><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20"><Link href="/empreendimentos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#a31621]"><ArrowLeft className="size-4" /> Empreendimentos</Link><p className="mt-12 text-xs font-semibold uppercase tracking-[.2em] text-[#735f42]">Guia HousePro</p><h1 className="mt-3 font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">Comprar em planta, passo a passo.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[#526074]">Um apoio prático para organizar as perguntas certas antes de escolher uma unidade num empreendimento novo.</p><div className="mt-12 space-y-4">{steps.map(([title, text], index) => <article key={title} className="rounded-2xl border border-[#ded4c6] bg-white p-6"><p className="text-xs font-semibold tracking-[.16em] text-[#a31621]">0{index + 1}</p><h2 className="mt-2 font-display text-3xl">{title}</h2><p className="mt-3 leading-7 text-[#526074]">{text}</p></article>)}</div><aside className="mt-10 rounded-2xl bg-[#071d37] p-6 text-white"><CheckCircle2 className="size-6 text-[#efd296]" /><h2 className="mt-4 font-display text-3xl">Cada projeto tem condições próprias.</h2><p className="mt-3 text-sm leading-6 text-white/75">Este guia não substitui a análise da documentação do empreendimento nem o aconselhamento jurídico ou técnico quando necessário.</p></aside></main><SiteFooter /></div>;
}
