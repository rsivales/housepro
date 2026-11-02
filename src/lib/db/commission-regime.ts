import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_REGIME, type CommissionRegime } from "@/lib/data/commission-regime";

export async function readCommissionRegime(agencyId: string): Promise<{ plan: CommissionRegime; version: number }> {
  const { data, error } = await createAdminClient().from("agency_finance_settings")
    .select("commission_regime,commission_version").eq("agency_id", agencyId).single();
  if (error || !data) throw new Error("Regime de comissionamento indisponível.");
  return { plan: data.commission_regime ?? DEFAULT_REGIME, version: data.commission_version };
}
