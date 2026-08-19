import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, MapPin, Wallet } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getContact, listContactActivities } from "@/lib/db/repo";
import { CONTACT_TYPE_LABEL } from "@/lib/data/contacts";
import { ContactTimeline } from "@/components/crm/contact-timeline";

export const metadata: Metadata = { title: "Ficha de contacto" };

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { id } = await params;

  const contact = await getContact(id);
  if (!contact) notFound();
  const activities = await listContactActivities(id);

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/app/contactos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Contactos
        </Link>

        {/* Cabeçalho da ficha */}
        <div className="mt-4 flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-lg font-semibold text-muted-foreground">
            {contact.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight">{contact.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                {CONTACT_TYPE_LABEL[contact.type]}
              </span>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="size-3.5" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Mail className="size-3.5" /> {contact.email}
                </a>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {contact.zone && (<span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {contact.zone}</span>)}
              {contact.budget && (<span className="inline-flex items-center gap-1"><Wallet className="size-3" /> {contact.budget}</span>)}
            </div>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl">Cronologia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tudo o que acontece com este contacto, num só sítio.
        </p>
        <div className="mt-4">
          <ContactTimeline contactId={contact.id} initial={activities} />
        </div>
      </div>
    </div>
  );
}
