import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/auth";
import { isSuperadmin } from "@/lib/data/roles";
import { SignatureManager } from "@/components/signature/signature-manager";

export const metadata = { title: "Signature | HousePro Admin" };
export default async function SignatureAdminPage() {
  const session = await getSession();
  if (!session || !isSuperadmin(session.agent)) redirect("/admin");
  return <main className="mx-auto max-w-6xl p-6 sm:p-10"><p className="text-xs font-semibold tracking-[.2em] text-amber-700">HOUSEPRO SIGNATURE</p><h1 className="mt-2 font-display text-3xl">Curadoria da coleção</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Apenas o Super Admin pode aprovar, publicar ou retirar imóveis da coleção. Todas as alterações ficam registadas no histórico do imóvel.</p><SignatureManager /></main>;
}
