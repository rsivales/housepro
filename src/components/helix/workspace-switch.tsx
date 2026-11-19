"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import { ClientModeToggle } from "@/components/consultant/client-mode-toggle";
export function WorkspaceSwitch({consultant,broker,admin}:{consultant:boolean;broker:boolean;admin:boolean}) {
 const path=usePathname()??"/app";
 const active=path.startsWith("/admin")||path.startsWith("/app/aprovacoes-comissoes")?"admin":path.startsWith("/app/broker")?"broker":consultant?"consultant":broker?"broker":"admin";
 const items=[{key:"consultant",show:consultant,href:"/app/consultor",label:"Área de consultor"},{key:"broker",show:broker,href:"/app/broker",label:"Área de broker"},{key:"admin",show:admin,href:"/admin",label:"Brand / Administração"}].filter(x=>x.show);
 const context=items.find(x=>x.key===active)?.label??"Área profissional";
 return <div className="border-b bg-card"><div className="mx-auto max-w-7xl px-4 py-3 sm:px-6"><nav aria-label="Áreas da minha conta" className="flex flex-wrap gap-2">{items.map(x=><Link key={x.href} href={x.href} aria-current={active===x.key?"page":undefined} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${active===x.key?"bg-primary text-primary-foreground":"bg-card text-foreground hover:bg-secondary"}`}>{x.label}</Link>)}</nav><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><p>A visualizar: <strong className="text-foreground">{context}</strong></p>{consultant&&<ClientModeToggle/>}</div></div></div>;
}
