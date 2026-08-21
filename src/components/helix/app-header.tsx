"use client";

import * as React from "react";
import Link from "next/link";
import { Search, CalendarDays, Bell, User, Building2, Hash, Eye, Settings, LogOut, Check } from "lucide-react";

import { HelixLogo } from "./helix-logo";
import { CLIENT_MODE_KEY } from "@/lib/client-mode";

interface Props {
  name: string;
  photo?: string;
  agency?: string;
  code?: string;
  hasUnread?: boolean;
}

/**
 * Cabeçalho da app Helix: símbolo + HELIX/by HousePro, pesquisa, agenda,
 * notificações (com indicador) e avatar → menu de perfil.
 */
export function AppHeader({ name, photo, agency, code, hasUnread }: Props) {
  const [menu, setMenu] = React.useState(false);
  const first = name.split(" ")[0] ?? name;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hx-border)] bg-[var(--hx-surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/app" aria-label="Início Helix">
          <HelixLogo />
        </Link>

        <div className="flex items-center gap-0.5">
          <Link href="/app/pesquisa" aria-label="Pesquisar" className="hx-icon-btn">
            <Search className="size-5" />
          </Link>
          <Link href="/app/agenda" aria-label="Agenda" className="hx-icon-btn">
            <CalendarDays className="size-5" />
          </Link>
          <Link href="/app/notificacoes" aria-label="Notificações" className="hx-icon-btn relative">
            <Bell className="size-5" />
            {hasUnread && (
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full" style={{ background: "var(--hx-red)" }} />
            )}
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label="Perfil"
              aria-expanded={menu}
              className="ml-1 grid size-10 place-items-center overflow-hidden rounded-full border border-[var(--hx-border)]"
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-sm font-semibold" style={{ color: "var(--hx-navy)" }}>
                  {name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            {menu && <ProfileMenu name={first} agency={agency} code={code} onClose={() => setMenu(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({
  name,
  agency,
  code,
  onClose,
}: {
  name: string;
  agency?: string;
  code?: string;
  onClose: () => void;
}) {
  const [clientMode, setClientMode] = React.useState(false);
  React.useEffect(() => {
    try {
      setClientMode(localStorage.getItem(CLIENT_MODE_KEY) === "1");
    } catch {}
  }, []);
  function toggleClientMode() {
    const next = !clientMode;
    setClientMode(next);
    try {
      localStorage.setItem(CLIENT_MODE_KEY, next ? "1" : "0");
      window.dispatchEvent(new CustomEvent("housepro:clientmode"));
    } catch {}
  }

  return (
    <>
      <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={onClose} tabIndex={-1} />
      <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-[var(--hx-border)] bg-[var(--hx-surface)] shadow-xl">
        <div className="border-b border-[var(--hx-border)] p-3">
          <p className="font-semibold">{name}</p>
          {agency && <p className="flex items-center gap-1.5 text-xs hx-muted"><Building2 className="size-3.5" /> {agency}</p>}
          {code && <p className="flex items-center gap-1.5 text-xs hx-muted"><Hash className="size-3.5" /> {code}</p>}
        </div>
        <nav className="p-1 text-sm">
          <Link href="/app/afilhados" onClick={onClose} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[var(--hx-surface-blue)]">
            <User className="size-4 hx-muted" /> O meu perfil
          </Link>
          <button onClick={toggleClientMode} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[var(--hx-surface-blue)]">
            <Eye className="size-4 hx-muted" /> Modo cliente
            {clientMode && <Check className="ml-auto size-4" style={{ color: "var(--hx-success)" }} />}
          </button>
          <Link href="/app/ferramentas" onClick={onClose} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[var(--hx-surface-blue)]">
            <Settings className="size-4 hx-muted" /> Definições
          </Link>
          <a href="/auth/signout" className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[var(--hx-surface-blue)]" style={{ color: "var(--hx-red)" }}>
            <LogOut className="size-4" /> Terminar sessão
          </a>
        </nav>
      </div>
    </>
  );
}
