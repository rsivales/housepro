"use client";

import type { ReactNode } from "react";

import { notifyContact } from "@/lib/contact-notify";
import { track, type AnalyticsEvent } from "@/lib/analytics";

const EVENT: Record<string, AnalyticsEvent> = {
  WhatsApp: "pdp_whatsapp_click",
  Chamada: "pdp_call_click",
  SMS: "pdp_sms_click",
};

/** <a> de contacto que dispara a notificação (email ao agente + direção). */
export function ContactLink({
  href,
  channel,
  propertyId,
  refId,
  external,
  className,
  children,
}: {
  href: string;
  channel: string;
  propertyId: string;
  refId?: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => {
        if (EVENT[channel]) track(EVENT[channel]);
        notifyContact(channel, { propertyId, ref: refId });
      }}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
