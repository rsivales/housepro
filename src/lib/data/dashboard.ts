/**
 * Dados de apoio ao Dashboard do consultor: frase motivante do dia,
 * notificações de exemplo e o quadro de atividades em curso (com alerta de
 * prospeção e dicas). Sem dependências de servidor — usável em demo.
 */

import type { Notification } from "@/lib/db/repo";
import { quoteTextOfDay } from "@/lib/data/quotes";

/** Frases motivantes (a do dia é escolhida de forma determinística pela data). */
export const MOTIVATION: string[] = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  "Não contes os negócios que fizeste. Faz com que cada negócio conte.",
  "Os grandes consultores não nasceram feitos — construíram-se, montra a montra.",
  "A tua próxima conquista está a uma chamada de distância.",
  "Quem planta angariações, colhe carreira.",
  "Confiança ganha-se ao segundo — e mantém-se ao longo do processo.",
  "A melhor angariação é a que nasce de um cliente bem servido.",
  "Foco no cliente, disciplina no seguimento, resultado no fecho.",
  "Cada 'não' aproxima-te do 'sim' que muda o teu mês.",
  "Vende a experiência, não o imóvel. O imóvel vende-se sozinho.",
];

/** Frase do dia — determinística (muda todos os dias, igual para todos).
 *  Delega na biblioteca de frases (§7), que suporta datas especiais e campanhas. */
export function phraseOfTheDay(now = new Date()): string {
  return quoteTextOfDay(now);
}

/** Notificações de exemplo (modo demo, sem Supabase). */
export function demoNotifications(): Notification[] {
  return [
    { id: "n1", type: "qualidade", title: "Contacto por atender há +48h", body: "Marta Nogueira: reatribuição automática em 24h se não atenderes.", href: "/app/qualidade", read: false, createdAt: "2026-08-04T08:20:00" },
    { id: "n2", type: "lead", title: "Nova lead — pedido de visita", body: "João Pereira quer visitar o T3 em Alvalade.", href: "/app", read: false, createdAt: "2026-08-03T19:05:00" },
    { id: "n3", type: "override", title: "Comissão de rede creditada", body: "Recebeste override de um negócio da tua equipa.", amount: 180, href: "/app/comissoes", read: true, createdAt: "2026-08-02T14:00:00" },
    { id: "n4", type: "premio", title: "Novo prémio ao teu alcance", body: "Estás a 6.000€ do prémio Impulso.", href: "/app/premios", read: true, createdAt: "2026-08-01T10:30:00" },
    { id: "n5", type: "referencia", title: "Referência aceite", body: "A tua referência foi aceite por um colega (25%).", href: "/app/referencias", read: true, createdAt: "2026-07-30T16:45:00" },
  ];
}

export interface Activity {
  id: string;
  label: string;
  detail: string;
  kind: "prospecao" | "seguimento" | "processo" | "documento";
  /** Alerta = precisa de ação hoje. */
  alert?: boolean;
}

/** Quadro de atividades em curso (demo) — com alerta de prospeção. */
export function demoActivities(): Activity[] {
  return [
    { id: "a1", kind: "prospecao", label: "Prospeção diária", detail: "Ainda não angariaste hoje — 5 contactos para bater a meta.", alert: true },
    { id: "a2", kind: "seguimento", label: "Seguimento de visita", detail: "Sofia Antunes visitou ontem — liga para recolher feedback.", alert: true },
    { id: "a3", kind: "processo", label: "CPCV a agendar", detail: "Processo HP-1048 aguarda marcação do CPCV." },
    { id: "a4", kind: "documento", label: "Documento em falta", detail: "Certificado energético pendente no processo em escritura." },
  ];
}

/** Dicas rápidas rotativas (a do dia acompanha a frase). */
export const TIPS: string[] = [
  "Liga às leads nos primeiros 5 minutos — a taxa de conversão multiplica.",
  "Depois de cada visita, envia um resumo com fotos e próximos passos.",
  "Pede sempre uma recomendação a quem acabaste de servir bem.",
  "Atualiza o CRM ao fim do dia: o que não está registado, perde-se.",
  "Uma angariação exclusiva vale por três partilhadas — negoceia exclusividade.",
];

export function tipOfTheDay(now = new Date()): string {
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return TIPS[day % TIPS.length];
}
