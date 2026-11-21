import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, newsImage, NEWS_FALLBACK } from "@/lib/data/news";

export async function PortalNewsBanner() {
  const articles = (await getNews()).filter(a => !/^https?:\/\//.test(a.url)).slice(0, 2);
  if (!articles.length) return null;
  return <section className="mt-10 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Notícias do Guia HousePro">
    <div className="bg-[#0b1f3a] px-5 py-6 text-white sm:px-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-red-300">Guia HousePro</p><h2 className="mt-2 font-display text-2xl">Informação para decidir melhor</h2><p className="mt-2 text-sm text-slate-200">As notícias mais recentes sobre habitação, mercado e legislação.</p></div>
    <div className="grid sm:grid-cols-2">{articles.map(a => {
      const url = `https://housepro.pt/noticias/${a.id}`;
      return <article key={a.id} className="border-t p-4 sm:p-5">
        <Link href={`/noticias/${a.id}`} className="group block"><div className="overflow-hidden rounded-lg"><ArticleImage id={a.id} base={newsImage(a)} fallback={NEWS_FALLBACK} alt={a.title} className="aspect-[16/8] w-full object-cover" /></div><p className="mt-3 text-xs font-semibold text-primary">{a.category}</p><h3 className="mt-1 font-semibold leading-snug group-hover:underline">{a.title} <ArrowUpRight className="inline size-4" /></h3></Link>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium"><a href={`https://wa.me/?text=${encodeURIComponent(a.title + " " + url)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Facebook</a><a href={`mailto:?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(url)}`} className="text-primary hover:underline">Email</a></div>
      </article>;
    })}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-7"><Link href="/noticias" className="text-sm font-semibold text-primary hover:underline">Ver todas as notícias →</Link><Link href="/subscrever?origem=portal-cliente" className="inline-flex items-center gap-2 rounded-full bg-[#A31621] px-4 py-2.5 text-sm font-semibold text-white"><Mail className="size-4" /> Subscrever por email</Link></div>
  </section>;
}
