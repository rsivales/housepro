"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
export function WorkspaceSwitch({consultant,broker,admin}:{consultant:boolean;broker:boolean;admin:boolean}){const path=usePathname();return <nav aria-label="Áreas da minha conta" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3">{[{show:consultant,href:"/app/consultor",label:"Área de consultor"},{show:broker,href:"/app/broker",label:"Área de broker"},{show:admin,href:"/admin",label:"Brand / Administração"}].filter(x=>x.show).map(x=><Link key={x.href} href={x.href} aria-current={path===x.href?"page":undefined} className={`rounded-full border px-4 py-2 text-xs font-semibold ${path===x.href?"bg-primary text-primary-foreground":"bg-card text-foreground"}`}>{x.label}</Link>)}</nav>;}
