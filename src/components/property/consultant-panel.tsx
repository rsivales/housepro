import { CalendarClock, Phone } from "lucide-react";

import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { ContactLink } from "@/components/property/contact-link";
import type { Agent } from "@/lib/data/types";

/**
 * Painel de contacto do consultor — compacto e sticky, apenas no desktop.
 * (No telemóvel o contacto vive na barra fixa inferior.) Não é um segundo
 * cartão grande: mostra o essencial e encaminha para o pedido de visita.
 */
export function ConsultantPanel({
  agent,
  role,
  whatsappHref,
  telHref,
  phone,
  propertyId,
  refId,
  referrerName,
}: {
  agent: Agent;
  role: string;
  whatsappHref: string;
  telHref: string;
  phone: string;
  propertyId: string;
  refId?: string;
  referrerName?: string;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border bg-white p-5 shadow-[0_10px_40px_-24px_rgba(11,31,58,.35)]">
        {referrerName && (
          <p className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2 text-xs text-[var(--hp-text-2)]">
            Apresentado por <span className="font-medium text-[var(--hp-navy)]">{referrerName}</span> — o seu consultor dedicado.
          </p>
        )}
        <div className="flex items-center gap-3">
          <AgentAvatar agent={agent} className="size-12" />
          <div className="min-w-0">
            <p className="font-medium text-[var(--hp-navy)]">{agent.name}</p>
            <p className="truncate text-sm text-[var(--hp-text-2)]">{role}</p>
          </div>
        </div>

        <a
          href="#visita-heading"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--hp-red)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--hp-red-hover)]"
        >
          <CalendarClock className="size-4" /> Pedir visita
        </a>
        <ContactLink
          href={whatsappHref}
          channel="WhatsApp"
          propertyId={propertyId}
          refId={refId}
          external
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.01]"
        >
          <WhatsappIcon className="size-4" /> Falar por WhatsApp
        </ContactLink>
        <ContactLink
          href={telHref}
          channel="Chamada"
          propertyId={propertyId}
          refId={refId}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium text-[var(--hp-navy)] transition-colors hover:bg-black/[0.03]"
        >
          <Phone className="size-4" /> {phone}
        </ContactLink>
        <p className="mt-1.5 text-center text-xs text-[var(--hp-text-2)]">
          <PhoneNote />
        </p>
      </div>
    </aside>
  );
}
