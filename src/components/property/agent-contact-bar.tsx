"use client";

import { Phone, MessageSquare } from "lucide-react";

import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { notifyContact } from "@/lib/contact-notify";
import type { Agent } from "@/lib/data/types";

/**
 * Barra de contacto do consultor, fixa no fundo em telemóvel. Cada ação
 * (WhatsApp / chamada / SMS) dispara também a cópia por email ao consultor e à
 * direção da agência, com o link do imóvel.
 */
export function AgentContactBar({
  agent,
  whatsappHref,
  telHref,
  smsHref,
  phone,
  propertyId,
  refId,
}: {
  agent: Agent;
  whatsappHref: string;
  telHref: string;
  smsHref: string;
  phone: string;
  propertyId: string;
  refId?: string;
}) {
  const notify = (channel: string) =>
    notifyContact(channel, { propertyId, ref: refId });

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 py-2.5 shadow-[0_-6px_24px_rgba(0,0,0,0.10)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <a
          href={telHref}
          onClick={() => notify("Chamada")}
          aria-label={`Ligar a ${agent.name}`}
          className="relative shrink-0"
        >
          <AgentAvatar agent={agent} className="size-11 ring-2 ring-primary/40" />
          <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Phone className="size-2.5" />
          </span>
        </a>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium">{agent.name}</p>
          <a
            href={telHref}
            onClick={() => notify("Chamada")}
            className="truncate text-xs text-muted-foreground hover:text-foreground"
          >
            {phone}
          </a>
        </div>

        <a
          href={whatsappHref}
          onClick={() => notify("WhatsApp")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar por WhatsApp"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-sm transition-transform active:scale-95"
        >
          <WhatsappIcon className="size-5" />
        </a>
        <a
          href={telHref}
          onClick={() => notify("Chamada")}
          aria-label="Ligar"
          className="grid size-10 shrink-0 place-items-center rounded-full border text-foreground transition-colors hover:bg-secondary"
        >
          <Phone className="size-4" />
        </a>
        <a
          href={smsHref}
          onClick={() => notify("SMS")}
          aria-label="Enviar mensagem"
          className="grid size-10 shrink-0 place-items-center rounded-full border text-foreground transition-colors hover:bg-secondary"
        >
          <MessageSquare className="size-4" />
        </a>
      </div>
    </div>
  );
}
