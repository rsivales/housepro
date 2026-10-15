import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { dealStageToStatus, type DealStage } from "@/lib/data/deal";

/** Aplica o estado público do imóvel correspondente à fase do negócio (Helix).
 *  Best-effort e idempotente; não faz nada quando a fase não altera o estado. */
export async function syncPropertyStatusFromDeal(
  propertyId: string,
  stage: DealStage,
): Promise<boolean> {
  const status = dealStageToStatus(stage);
  if (!status || !propertyId || !hasServiceRole()) return false;
  try {
    const sb = createAdminClient();
    const patch: Record<string, unknown> = { status };
    if (status === "vendido")
      patch.sold_at = new Date().toISOString().slice(0, 10);
    if (status !== "vendido") patch.sold_at = null;
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
