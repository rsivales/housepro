import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/lib/data/types";
import { authorizedAgency } from "@/lib/db/agency-finance";

export interface OtherIncomeRow {
  id: string;
  agency_id: string;
  consultant_id: string;
  category: "credito" | "certificado" | "parceria" | "outros";
  partner_name: string;
  description: string;
  earned_on: string;
  gross_amount: number;
  consultant_share_pct: number | null;
  consultant_amount: number | null;
  agency_amount: number | null;
  status: "pendente" | "aprovado" | "pago" | "recusado";
  consultant?: { name: string } | { name: string }[] | null;
}

export async function ownOtherIncome(agent: Agent) {
  const { data, error } = await createAdminClient().from("consultant_other_income").select("id,agency_id,consultant_id,category,partner_name,description,earned_on,gross_amount,consultant_share_pct,consultant_amount,agency_amount,status")
    .eq("consultant_id", agent.id).order("earned_on", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os rendimentos.");
  return (data ?? []) as OtherIncomeRow[];
}

export async function agencyOtherIncome(agent: Agent, agencyId: string) {
  await authorizedAgency(agent, agencyId);
  const { data, error } = await createAdminClient().from("consultant_other_income").select("id,agency_id,consultant_id,category,partner_name,description,earned_on,gross_amount,consultant_share_pct,consultant_amount,agency_amount,status,consultant:profiles!consultant_id(name)")
    .eq("agency_id", agencyId).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os rendimentos da agência.");
  return (data ?? []) as OtherIncomeRow[];
}
