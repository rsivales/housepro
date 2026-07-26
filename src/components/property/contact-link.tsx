"use client";

import type { ReactNode } from "react";

import { notifyContact } from "@/lib/contact-notify";

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
      onClick={() => notifyContact(channel, { propertyId, ref: refId })}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
