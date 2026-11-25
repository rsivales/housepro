import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/supabase/auth";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { NewsletterBoard } from "@/components/admin/newsletter-board";
export default async function BrandNewsletter() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (session.demo || !isNetworkFinanceAdmin(session.agent)) redirect("/app");
  return <main className="mx-auto max-w-5xl space-y-7 px-4 py-10 sm:px-6"><Link href="/admin/website" className="text-sm text-primary">Website público</Link><header><p className="text-sm font-semibold text-primary">Brand · HousePro</p><h1 className="font-display text-3xl">Newsletter da marca</h1><p className="mt-2 text-muted-foreground">Seis edições editoriais com dois artigos cada. Os subscritores só entram na lista depois de confirmarem por email. Verifique cada edição antes de iniciar o envio.</p></header><NewsletterBoard readOnly={Boolean(session.viewingAs)} /></main>;
}
