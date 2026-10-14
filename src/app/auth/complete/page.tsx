"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNext, verifiedProfessionalDestination } from "@/lib/auth/navigation";

/** Compatibility landing for email links whose tokens are in the URL fragment.
 * Fragments never reach the server callback. Store cookies before navigating,
 * clear the sensitive fragment immediately, and verify professional access.
 */
export default function CompleteAuthPage() {
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const next = safeAuthNext(new URLSearchParams(window.location.search).get("next"));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    async function complete() {
      if (!access_token || !refresh_token || params.has("error")) throw new Error("invalid_link");
      const db = createClient({ detectSessionInUrl: false });
      const { error } = await db.auth.setSession({ access_token, refresh_token });
      if (error) throw new Error("invalid_session");
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const professional = verifiedProfessionalDestination(response.ok, await response.json());
      if (professional) {
        window.location.replace(type === "recovery" || type === "invite" ? "/entrar/nova-password" : next);
      } else if (next.startsWith("/cliente")) {
        const { data: { user }, error } = await db.auth.getUser();
        if (!user || error) throw new Error("invalid_session");
        window.location.replace(next);
      } else {
        throw new Error("professional_access_unavailable");
      }
    }
    void complete().catch(() => setError(true));
  }, []);
  return <main className="hp min-h-dvh bg-background px-6 py-24 text-foreground"><div className="mx-auto max-w-md rounded-2xl border bg-card p-8"><h1 className="font-display text-3xl">{error ? "Não foi possível concluir o acesso" : "A confirmar o seu acesso"}</h1><p className="mt-4 text-muted-foreground" role="status">{error ? "O link pode ter expirado. Volte à entrada para iniciar sessão ou pedir um novo link por email." : "Aguarde um momento enquanto estabelecemos uma ligação segura ao Helix."}</p>{error && <Link href="/entrar?erro=link" className="mt-6 inline-block font-semibold text-primary">Voltar à entrada</Link>}</div></main>;
}
