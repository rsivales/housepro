"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SIGNATURE_COLLECTIONS, getSignatureCollection } from "@/lib/signature/collections";

type Item = { id: string; reference: string; title: string; municipality: string; is_signature: boolean; signature_status: string; signature_order: number | null; signature_editorial_title: string | null; signature_collection: string | null; signature_visibility: string; signature_price_visible: boolean; signature_featured: boolean };
export function SignatureManager() {
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState<string | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/signature/manage")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.detail || body?.error || `HTTP ${r.status}`);
        return body;
      })
      .then((d) => setItems(d.properties ?? []))
      .catch((e) => setError(`Não foi possível carregar os imóveis (${e.message}).`))
      .finally(() => setLoading(false));
  }, []);
  async function save(item: Item) {
    setSaving(item.id); setError(""); setSaved(null);
    try {
      const patch = { is_signature: item.is_signature, signature_status: item.signature_status, signature_order: item.signature_order, signature_editorial_title: item.signature_editorial_title, signature_collection: item.signature_collection, signature_visibility: item.signature_visibility, signature_price_visible: item.signature_price_visible, signature_featured: item.signature_featured };
      const response = await fetch("/api/signature/manage", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, patch }) });
      if (!response.ok) throw new Error("Não foi possível guardar. Confirme as permissões e tente novamente.");
      setSaved(item.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível guardar."); }
    finally { setSaving(null); }
  }
  function update(id:string, patch:Partial<Item>){setSaved(null);setItems((all)=>all.map((item)=>item.id===id?{...item,...patch}:item));}
  if(loading)return <p className="mt-8 text-sm text-muted-foreground">A carregar coleção…</p>;
  const pendingReview = items.filter((i) => i.signature_status === "candidate" || i.signature_status === "pending");
  return <div className="mt-8 space-y-4"><p className="rounded-xl border bg-card p-4 text-sm leading-6">Para colocar um imóvel numa página temática, escolha a <strong>Coleção</strong> e clique em <strong>Guardar</strong>. Só os imóveis Signature aprovados, públicos e ativos aparecem nas páginas. Cada imóvel pode pertencer a uma coleção e continua também na seleção principal.</p>{error&&<p className="text-sm text-destructive">{error}</p>}
  {pendingReview.length > 0 && <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold-foreground">✦ {pendingReview.length} candidatura(s) submetida(s) por consultores à espera de revisão — aparecem primeiro na lista abaixo.</p>}
  {items.map((item)=><article id={`property-${item.id}`} key={item.id} className={`rounded-xl border bg-card p-4 ${(item.signature_status==="candidate"||item.signature_status==="pending")?"border-gold/50 bg-gold/5":""}`}><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs text-muted-foreground">{item.reference} · {item.municipality}</p><h2 className="font-medium">{item.title}</h2><Link href={`/imovel/${item.id}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver imóvel em detalhe →</Link></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_signature} onChange={(e)=>update(item.id,{is_signature:e.target.checked})}/> Candidato Signature</label></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs">Estado<select value={item.signature_status} onChange={(e)=>update(item.id,{signature_status:e.target.value})} className="mt-1 min-h-10 w-full rounded border bg-background px-2"><option value="candidate">Candidato</option><option value="pending">Em análise</option><option value="approved">Aprovado</option><option value="rejected">Recusado</option></select></label><label className="text-xs">Visibilidade<select value={item.signature_visibility} onChange={(e)=>update(item.id,{signature_visibility:e.target.value})} className="mt-1 min-h-10 w-full rounded border bg-background px-2"><option value="private">Privado</option><option value="public">Público</option></select></label><label className="text-xs">Ordem<input type="number" value={item.signature_order??""} onChange={(e)=>update(item.id,{signature_order:e.target.value?Number(e.target.value):null})} className="mt-1 min-h-10 w-full rounded border bg-background px-2"/></label><label className="text-xs">Coleção<select value={getSignatureCollection(item.signature_collection)?.slug ?? ""} onChange={(e)=>update(item.id,{signature_collection:e.target.value||null})} className="mt-1 min-h-10 w-full rounded border bg-background px-2"><option value="">Sem coleção temática</option>{SIGNATURE_COLLECTIONS.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}</select></label></div><label className="mt-3 block text-xs">Título editorial<input value={item.signature_editorial_title??""} onChange={(e)=>update(item.id,{signature_editorial_title:e.target.value||null})} className="mt-1 min-h-10 w-full rounded border bg-background px-2"/></label><div className="mt-3 flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={item.signature_price_visible} onChange={(e)=>update(item.id,{signature_price_visible:e.target.checked})}/> Mostrar preço</label><label className="flex items-center gap-2"><input type="checkbox" checked={item.signature_featured} onChange={(e)=>update(item.id,{signature_featured:e.target.checked})}/> Destacar na agregadora</label>{saved === item.id && <span role="status" className="text-sm text-green-700">Alterações guardadas.</span>}{getSignatureCollection(item.signature_collection) && <Link href={`/signature/colecoes/${getSignatureCollection(item.signature_collection)!.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Abrir coleção →</Link>}<button onClick={()=>save(item)} disabled={saving===item.id} className="ml-auto min-h-10 rounded bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving===item.id?"A guardar…":"Guardar"}</button></div></article>)}</div>;
}
