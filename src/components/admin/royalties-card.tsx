"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {formatMoney} from "@/lib/data/finance-access";
export function BrandRoyaltiesCard(){const [data,setData]=useState<{total:number;pending:number;rows:unknown[]}|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;fetch("/api/admin/royalties",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();const d=await r.json();if(active)setData(d);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 return <Link href="/admin/royalties" className="mt-6 block rounded-2xl border bg-card p-6 shadow-sm hover:border-primary"><p className="text-sm font-semibold text-primary">Brand · Royalties acumulados</p><p className="mt-2 font-display text-3xl">{data?formatMoney(data.total):error?"Consulta indisponível":"A carregar…"}</p><p className="mt-2 text-sm text-muted-foreground">{data?`${data.rows.length} negócio(s) · ${formatMoney(data.pending)} por receber`:"Movimentos financeiros por agência e negócio"}</p><span className="mt-3 inline-block text-sm font-semibold text-primary">Ver agências e negócios de origem →</span></Link>;
}
