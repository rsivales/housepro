import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runTransactionAlerts } from "@/lib/helix/transaction-alerts";

export async function transactionAlertsWorkerSecret() {
  const { data, error } = await createAdminClient().rpc(
    "transaction_alerts_worker_access",
  );
  if (error || !data?.secret) throw new Error("worker_unavailable");
  return String(data.secret);
}

export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function runTransactionAlertsWorker() {
  const db = createAdminClient();
  const token = randomUUID();
  const { data: lock, error: lockError } = await db.rpc(
    "transaction_alerts_worker_access",
    { p_token: token },
  );
  if (lockError || !lock?.claimed) return { status: "busy" as const };
  try {
    const result = await runTransactionAlerts();
    return { status: "ok" as const, ...result };
  } finally {
    await db.rpc("transaction_alerts_worker_access", {
      p_token: token,
      p_release: true,
    });
  }
}
