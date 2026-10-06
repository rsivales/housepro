"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
export function SignatureMenu() {
  const [open, setOpen] = useState(false);
  return <div className="lg:hidden"><button type="button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="signature-mobile-menu" onClick={() => setOpen(!open)} className="grid size-11 place-items-center border border-white/40">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>{open && <nav id="signature-mobile-menu" aria-label="Navegação Signature" className="absolute inset-x-5 top-24 z-30 grid border border-white/20 bg-[#101a26] p-4 text-sm shadow-xl">{[{label:"Coleção",href:"/signature#colecao"},{label:"Coleções temáticas",href:"/signature#inspiracao"},{label:"Apresentar um imóvel",href:"/signature/apresentar"},{label:"Construção por medida",href:"/signature/construcao-por-medida"},{label:"Pedido privado",href:"/signature#pedido"}].map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="min-h-11 py-3">{link.label}</Link>)}</nav>}</div>;
}
