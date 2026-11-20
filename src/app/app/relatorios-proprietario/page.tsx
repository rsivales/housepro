import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { OwnerReportsPanel } from "@/components/property/owner-reports-panel";

export const metadata={title:"Relatórios ao proprietário"};
export default async function OwnerReportsPage() {
  if(!await getSession())redirect("/entrar");
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <h1 className="font-display text-3xl">Relatórios ao proprietário</h1>
    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Configure a comunicação de cada imóvel. O envio mensal fica ativo ao guardar. Pode ajustar o conteúdo, a periodicidade e a apresentação, e consultar os envios.</p>
    <OwnerReportsPanel />
  </main>;
}
