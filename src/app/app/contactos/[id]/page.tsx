import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { getContact, listContactActivities } from "@/lib/db/repo";
import { ContactTimeline } from "@/components/crm/contact-timeline";
import { ContactHeader } from "@/components/crm/contact-header";

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

        {/* Cabeçalho da ficha — vê/edita inline */}
        <ContactHeader contact={contact} />

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
