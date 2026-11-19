import { RELEASES } from "@/lib/data/releases";
import Link from "next/link";
export const metadata = { title: "Atualizações do Helix" };
export default function ReleasesPage() {
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <Link className="text-sm text-primary" href="/app">Voltar ao início</Link>
    <h1 className="font-display text-3xl">Atualizações do Helix</h1>
    {RELEASES.map((release) => <article key={release.id} className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{release.date} · {release.version}</p>
      <h2 className="mt-2 text-xl font-semibold">{release.title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{release.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul>
    </article>)}
  </main>;
}
