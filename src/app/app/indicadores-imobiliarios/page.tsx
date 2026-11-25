import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { isStaff } from "@/lib/data/roles";
import { ActivityKpis } from "@/components/property/activity-kpis";

export const metadata={title:"Indicadores imobiliários"};
export default async function ActivityKpisPage() {
 const session=await getSession();if(!session)redirect("/entrar");
 if(!isStaff(session.agent))redirect("/app");
 return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
  <h1 className="font-display text-3xl">Indicadores imobiliários</h1>
  <p className="mt-2 text-sm text-muted-foreground">Atividade comercial, origem de clientes e feedback dos imóveis por mês, semestre, ano ou período personalizado.</p>
  <ActivityKpis/>
 </main>;
}
