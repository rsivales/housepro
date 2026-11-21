import Link from "next/link";
import { ArrowRight, Mail, Newspaper } from "lucide-react";
import { ArticleImage } from "@/components/home/article-image";
import { getNews, newsImage, NEWS_FALLBACK } from "@/lib/data/news";

export async function PortalNewsBanner() {
  const articles = (await getNews()).filter(a => !/^https?:\/\//.test(a.url)).slice(0, 2);
  if (!articles.length) return null;
  return <section className="mt-10 overflow-hidden rounded-[1.75rem] border border-[#dce3ec] bg-white shadow-sm dark:border-white/15 dark:bg-white/5" aria-label="Notícias do Guia HousePro">
    <div className="flex flex-wrap items-end justify-between gap-4 bg-[#0b1f3a] px-6 py-7 text-white sm:px-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#ffb8bd]"><Newspaper className="size-4" /> Guia HousePro</p><h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Em foco para si</h2><p className="mt-2 max-w-lg text-sm text-white/75">Habitação, mercado e legislação explicados com contexto.</p></div><Link href="/noticias" className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline">Ver o guia <ArrowRight className="size-4" /></Link></div>
    <div className="flex snap-x snap-mandatory gap-0 overflow-x-auto sm:grid sm:grid-cols-2 sm:overflow-visible">{articles.map(a => {
      const url = `https://housepro.pt/noticias/${a.id}`;
      return <article key={a.id} className="min-w-[84%] snap-start border-r border-[#e3e8ef] p-4 sm:min-w-0 sm:p-6 dark:border-white/10">
        <Link href={`/noticias/${a.id}`} className="group block"><div className="overflow-hidden rounded-xl"><ArticleImage id={a.id} base={newsImage(a)} fallback={NEWS_FALLBACK} alt={a.title} className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#a31621]">{a.category} · {new Date(a.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}</p><h3 className="mt-1 font-display text-lg font-semibold leading-snug text-[#0b1f3a] group-hover:underline dark:text-white">{a.title}</h3></Link>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#5b687d] dark:text-white/75"><a href={`https://wa.me/?text=${encodeURIComponent(a.title + " " + url)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#a31621]">WhatsApp</a><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#a31621]">Facebook</a><a href={`mailto:?subject=${encodeURIComponent(a.title)}&body=${encodeURIComponent(url)}`} className="hover:text-[#a31621]">Email</a></div>
      </article>;
    })}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e8ef] bg-[#f8f9fb] px-6 py-5 sm:px-8 dark:border-white/10 dark:bg-white/5"><p className="text-sm text-[#4c5d73] dark:text-white/75">Receba novidades quando forem publicadas.</p><Link href="/subscrever?origem=portal-cliente" className="inline-flex items-center gap-2 rounded-full bg-[#a31621] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#bd2631]"><Mail className="size-4" /> Subscrever por email</Link></div>
  </section>;
}
