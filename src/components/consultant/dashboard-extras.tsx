import Link from "next/link";
import {
  ArrowRight, Bell, Home, Lightbulb, Sparkles, Target, ClipboardList, FileText, PhoneCall,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEuro } from "@/lib/format";
import type { Notification } from "@/lib/db/repo";
import type { Activity } from "@/lib/data/dashboard";
import type { Property } from "@/lib/data/types";

/** Frase motivante do dia — carregada automaticamente. */
export function PhraseOfTheDay({ phrase }: { phrase: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-4">
      <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Frase do dia</p>
        <p className="mt-0.5 font-display text-lg leading-snug">{phrase}</p>
      </div>
    </div>
  );
}

/** Banner com o último imóvel angariado na agência, com notificação. */
export function LastAngariadoBanner({ property, agentName }: { property: Property; agentName?: string }) {
  return (
    <Link
      href={`/imovel/${property.id}`}
      className="mt-4 flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/40"
    >
      <span className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.image} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
        <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Bell className="size-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
          <Home className="size-3.5" /> Nova angariação na agência
        </p>
        <p className="mt-0.5 truncate font-medium">{property.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {property.municipality} · {formatEuro(property.price)}
          {agentName ? ` · ${agentName}` : ""}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Caixa de notificações — mostra a mais recente e salta para a lista ao clicar. */
export function NotificationsInbox({ items }: { items: Notification[] }) {
  const latest = items[0];
  const unread = items.filter((n) => !n.read).length;
  return (
    <Link
      href="/app/notificacoes"
      className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Bell className="size-4 text-primary" /> Notificações
        </p>
        {unread > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {unread} nova{unread > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {latest ? (
        <div className="mt-2 min-w-0">
          <p className="truncate text-sm font-medium">{latest.title}</p>
          {latest.body && <p className="line-clamp-2 text-xs text-muted-foreground">{latest.body}</p>}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Sem notificações.</p>
      )}
      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
        Ver todas <ArrowRight className="size-3.5" />
      </p>
    </Link>
  );
}

const ACT_ICON: Record<Activity["kind"], React.ElementType> = {
  prospecao: Target,
  seguimento: PhoneCall,
  processo: ClipboardList,
  documento: FileText,
};

/** Quadro de atividades em curso, com alerta de prospeção e dica do dia. */
export function ActivitiesBoard({ activities, tip }: { activities: Activity[]; tip: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <ClipboardList className="size-4 text-primary" /> Atividades em curso
      </p>
      <ul className="mt-3 space-y-2">
        {activities.map((a) => {
          const Icon = ACT_ICON[a.kind];
          return (
            <li key={a.id} className="flex items-start gap-2.5">
              <span className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                a.alert ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-secondary text-muted-foreground"
              )}>
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {a.label}
                  {a.alert && <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">hoje</span>}
                </p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/50 p-2.5">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Dica:</span> {tip}</p>
      </div>
    </div>
  );
}
