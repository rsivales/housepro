"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, X, PanelLeftClose, PanelLeftOpen, Briefcase, Building2, Megaphone, Coins, Users, ShieldCheck, ChevronDown, Settings, Bell } from "lucide-react";
import { HelixLogo } from "./helix-logo";
import { navigationGroups, linkIsActive, type NavigationAccess } from "@/lib/helix/navigation";
const icons = {briefcase:Briefcase,building:Building2,megaphone:Megaphone,coins:Coins,users:Users,agency:Building2,shield:ShieldCheck};
export function HelixSidebar({access,children}:{access:NavigationAccess;children:React.ReactNode}) {
 const path=usePathname()??"/app";
 const [collapsed,setCollapsed]=React.useState(false),[quick,setQuick]=React.useState(false);
 const [open,setOpen]=React.useState<string[]>(["Comercial"]);
 React.useEffect(()=>{try{setCollapsed(localStorage.getItem("helix:sidebar:v2")==="collapsed");}catch{}},[]);
 const groups=navigationGroups(access);
 React.useEffect(()=>{const activeGroup=navigationGroups(access).find(g=>g.items.some(i=>linkIsActive(path,i.href)));if(activeGroup)setOpen(v=>v.includes(activeGroup.label)?v:[...v,activeGroup.label]);},[path,access]);
 function toggle(){setCollapsed(v=>{try{localStorage.setItem("helix:sidebar:v2",v?"expanded":"collapsed");}catch{}return !v;});}
 const navLink="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary";
 return <div style={{"--helix-sidebar-width":collapsed?"76px":"264px"} as React.CSSProperties}>
 <aside aria-label="Navegação Helix" className="fixed inset-y-0 left-0 z-40 hidden w-[var(--helix-sidebar-width)] flex-col border-r bg-card lg:flex">
 <Link href="/app" aria-label="Início Helix" className="flex min-h-24 shrink-0 items-center justify-center border-b px-3">{collapsed?<span className="font-extrabold text-primary">HX</span>:<HelixLogo/>}</Link>
 <div className="relative px-3 py-4"><button onClick={()=>setQuick(v=>!v)} aria-label="Novo" aria-expanded={quick} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[var(--hx-red)] text-white">{quick?<X className="size-5"/>:<Plus className="size-5"/>}{!collapsed&&<span className="font-semibold">Novo</span>}</button>
 {quick&&<div className="absolute left-3 top-full z-50 w-56 rounded-xl border bg-card p-2 shadow-xl">{(access.commercial?[{label:"Lead / contacto",href:"/app/contactos"},{label:"Imóvel",href:"/app/imovel/novo"},{label:"Tarefa ou visita",href:"/app/agenda"},{label:"Campanha",href:"/app/x-campaigns"}]:[{label:"Gestão da Marca",href:"/admin"}]).map(i=><Link key={i.href} href={i.href} onClick={()=>setQuick(false)} className={navLink}>{i.label}</Link>)}</div>}</div>
 <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"><Link title="Início" href="/app" className={`${navLink} ${path==="/app"||path==="/app/consultor"?"bg-secondary text-primary":""}`}><Home className="size-5 shrink-0"/>{!collapsed&&"Início"}</Link>
 {groups.map(g=>{const Icon=icons[g.icon as keyof typeof icons]??Briefcase;const active=g.items.some(i=>linkIsActive(path,i.href));const expanded=open.includes(g.label);return <div key={g.label} className={g.label==="Gestão da agência"||g.label==="Marca e administração"?"border-t pt-2":""}>
 <button title={g.label} onClick={()=>{if(collapsed){setCollapsed(false);setOpen([g.label]);}else setOpen(v=>v.includes(g.label)?v.filter(x=>x!==g.label):[...v,g.label]);}} aria-expanded={!collapsed&&expanded} className={`${navLink} w-full text-left ${active?"text-primary":""}`}><Icon className="size-5 shrink-0"/>{!collapsed&&<><span className="flex-1">{g.label}</span><ChevronDown className={`size-4 transition-transform ${expanded?"rotate-180":""}`}/></>}</button>
 {!collapsed&&expanded&&<div className="ml-5 border-l pl-3">{g.items.map(i=><Link key={i.href} href={i.href} aria-current={linkIsActive(path,i.href)?"page":undefined} className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-secondary ${linkIsActive(path,i.href)?"bg-secondary font-semibold text-primary":"text-muted-foreground"}`}>{i.label}</Link>)}</div>}</div>;})}</nav>
 <div className="space-y-1 border-t p-3"><Link title="Notificações" href="/app/notificacoes" className={navLink}><Bell className="size-5 shrink-0"/>{!collapsed&&"Notificações"}</Link><Link title="O meu perfil" href="/app/perfil" className={navLink}><Settings className="size-5 shrink-0"/>{!collapsed&&"Perfil e definições"}</Link><button onClick={toggle} aria-label={collapsed?"Expandir navegação":"Recolher navegação"} className={`${navLink} w-full text-muted-foreground`}>{collapsed?<PanelLeftOpen className="size-5"/>:<><PanelLeftClose className="size-5"/>Recolher</>}</button></div>
 </aside><div className="min-w-0 lg:pl-[var(--helix-sidebar-width)]">{children}</div></div>;
}
