"use client";

import { AlertTriangle, FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useClientMode } from "@/lib/client-mode";
import { docStatus } from "@/lib/imovel/model";

/**
 * Nota do estado documental do imóvel (X documentos em falta dos mínimos
 * obrigatórios + X extra). Informação interna — some em "modo cliente".
 */
export function DocNote({
  documents,
  sellerType,
  className,
}: {
  documents?: string[];
  sellerType?: "particular" | "empresa";
  className?: string;
}) {
  const { ready, clientMode } = useClientMode();
  if (!ready || clientMode) return null;

  const st = docStatus(documents ?? [], sellerType === "empresa");

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
        st.complete
          ? "bg-success/10 text-success"
          : "bg-gold/10 text-gold-foreground",
        className
      )}
    >
      {st.complete ? (
        <>
          <FileCheck2 className="size-3.5" />
          Documentação completa
        </>
      ) : (
        <>
          <AlertTriangle className="size-3.5" />
          {st.missingCount} de {st.requiredTotal} documentos em falta
        </>
      )}
      {st.extraCount > 0 && (
        <span className="ml-auto text-muted-foreground">+{st.extraCount} extra</span>
      )}
    </div>
  );
}
