import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export interface AgentRequest {
  id: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  requesterId: string;
  requesterName: string;
  status: "pendente" | "aprovado" | "recusado";
  createdAt: string;
}

/** Pedidos de co-angariação pendentes (para a fila do broker/coordenação). */
export async function listPendingAgentRequests(): Promise<AgentRequest[]> {
  if (!hasServiceRole()) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("property_agent_requests")
    .select(
      "id, property_id, requester_id, status, created_at, property:properties!property_id(reference, title), requester:profiles!requester_id(name, email)"
    )
    .eq("status", "pendente")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => {
    const property = (Array.isArray(r.property) ? r.property[0] : r.property) as
      | { reference?: string; title?: string }
      | null;
    const requester = (Array.isArray(r.requester) ? r.requester[0] : r.requester) as
      | { name?: string; email?: string }
      | null;
    return {
      id: String(r.id),
      propertyId: String(r.property_id),
      propertyRef: property?.reference ?? "—",
      propertyTitle: property?.title ?? "",
      requesterId: String(r.requester_id),
      requesterName: requester?.name || requester?.email || "Consultor",
      status: (r.status as AgentRequest["status"]) ?? "pendente",
      createdAt: String(r.created_at ?? ""),
    };
  });
}

/** Pedido do agente para um imóvel (para saber o estado do botão). */
export async function getAgentRequestStatus(
  propertyId: string,
  requesterId: string
): Promise<AgentRequest["status"] | null> {
  if (!hasServiceRole()) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("property_agent_requests")
    .select("status")
    .eq("property_id", propertyId)
    .eq("requester_id", requesterId)
    .maybeSingle();
  return (data?.status as AgentRequest["status"]) ?? null;
}
