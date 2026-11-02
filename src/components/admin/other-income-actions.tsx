"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function OtherIncomeActions({ agencyId, incomeId, status }: { agencyId: string; incomeId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "approve" | "reject" | "paid") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/agencies/other-income", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agencyId, incomeId, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap gap-2">{status === "pendente" && <><button disabled={busy} type="button" onClick={() => act("approve")} className="rounded-full border px-3 py-2 text-xs disabled:opacity-50">Validar</button><button disabled={busy} type="button" onClick={() => act("reject")} className="rounded-full border px-3 py-2 text-xs disabled:opacity-50">Recusar</button></>}{status === "aprovado" && <button disabled={busy} type="button" onClick={() => act("paid")} className="rounded-full border px-3 py-2 text-xs disabled:opacity-50">Marcar pago</button>}{message && <p role="alert" className="text-xs">{message}</p>}</div>;
}
