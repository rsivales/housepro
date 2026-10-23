import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { dealStageToStatus, type DealStage } from "@/lib/data/deal";

/** Aplica o estado público do imóvel correspondente à fase do negócio (Helix).
 *  Best-effort e idempotente; não faz nada quando a fase não altera o estado. */
export async function syncPropertyStatusFromDeal(
  propertyId: string,
  stage: DealStage,
): Promise<boolean> {
  let status: string | null = dealStageToStatus(stage);
  if (!status || !propertyId || !hasServiceRole()) return false;
  try {
    const sb = createAdminClient();
    const { data: property, error: readError } = await sb.from("properties").select("operation").eq("id", propertyId).maybeSingle();
    if (readError || !property) return false;
    if (status === "vendido" && property.operation === "arrendamento") status = "arrendado";
    const patch: Record<string, unknown> = { status };
    const { data, error } = await sb
      .from("properties")
      .update(patch)
      .eq("id", propertyId)
      .select("id")
      .maybeSingle();
    return !error && Boolean(data);
  } catch {
    return false;
  }
}
