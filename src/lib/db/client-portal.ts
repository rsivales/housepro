import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { ensureBuyerContact } from "@/lib/db/repo";

export type PortalRole = "comprador" | "vendedor" | "investidor";
const ROLES: PortalRole[] = ["comprador", "vendedor", "investidor"];

export interface PortalProfile {
  contactId: string;
  role: PortalRole | null;
  onboarded: boolean;
}

/** Papel de portal do cliente autenticado — null se ainda não escolheu
 *  (mostra o seletor em /cliente/escolher-perfil). Cria o contacto se
 *  necessário, tal como o resto do portal do comprador já fazia. */
export async function getClientPortalProfile(
  authUserId: string,
  email: string,
): Promise<PortalProfile | null> {
  if (!hasServiceRole()) return null;
  const contact = await ensureBuyerContact(authUserId, email);
  if (!contact) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("contacts")
    .select("portal_role, portal_onboarded_at")
    .eq("id", contact.id)
    .maybeSingle();
  return {
    contactId: contact.id,
    role: (data?.portal_role as PortalRole | null) ?? null,
    onboarded: Boolean(data?.portal_onboarded_at),
  };
}

export async function setPortalRole(
  contactId: string,
  role: PortalRole,
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  if (!ROLES.includes(role)) return { error: "bad_request" };
  const sb = createAdminClient();
  const { error } = await sb
    .from("contacts")
    .update({ portal_role: role })
    .eq("id", contactId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markPortalOnboarded(
  contactId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!hasServiceRole()) return { error: "not_configured" };
  const sb = createAdminClient();
  const { error } = await sb
    .from("contacts")
    .update({ portal_onboarded_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) return { error: error.message };
  return { ok: true };
}
