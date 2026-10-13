import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getSession } from "@/lib/supabase/auth";
import type { Agent } from "@/lib/data/types";
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function portfolioSession(write = false) {
  const s = await getSession();
  if (!s || s.demo || !hasServiceRole()) return null;
  if (write && s.viewingAs) return null;
  return s;
}
export async function mayEditProperty(agent: Agent, id: string) {
  if (!hasServiceRole()) return false;
  const { data, error } = await createAdminClient().rpc("portfolio_allowed", {
    p_actor: agent.id,
    p_property: id,
    p_kind: "edit",
  });
  return !error && data === true;
}
export function operationError(message: string) {
  if (/forbidden/.test(message))
    return {
      status: 403,
      error: "Sem permissão para estes imóveis ou para o consultor escolhido.",
    };
  if (/reason_required/.test(message))
    return { status: 400, error: "Indique o motivo da rejeição." };
  if (/reference_configuration_missing/.test(message))
    return {
      status: 409,
      error:
        "O consultor/agência ainda não tem o código necessário para gerar referências.",
    };
  if (/batch_conflict/.test(message))
    return {
      status: 409,
      error:
        "Este pedido já foi utilizado com outros dados. Feche e reabra a duplicação.",
    };
  if (/not_pending|approval_required|already_approved|invalid/.test(message))
    return {
      status: 409,
      error:
        "O estado de um dos imóveis mudou ou os dados não são válidos. Atualize a lista.",
    };
  return {
    status: 503,
    error:
      "Não foi possível concluir a operação. Nenhum lote parcial foi criado. Tente novamente.",
  };
}
