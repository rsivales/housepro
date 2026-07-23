import Link from "next/link";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { PhoneNote } from "@/components/legal/phone-note";
import { ModeToggle } from "@/components/mode-toggle";
import { CLIENT_PROFILES, type ClientProfile } from "@/lib/data/client";
import { agentById } from "@/lib/data/mock";
import { formatPhone, telLink } from "@/lib/format";

export function PortalShell({
  active,
  clientName,
  consultantId,
  children,
}: {
  active: ClientProfile;
  clientName: string;
  consultantId: string;
  children: React.ReactNode;
}) {
  const consultant = agentById(consultantId);
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="HousePro">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Olá, <span className="font-medium text-foreground">{clientName.split(" ")[0]}</span>
            </span>
          </div>
        </div>
        {/* Tabs de perfil */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {CLIENT_PROFILES.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active === p.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0">{children}</div>

          {/* Consultor dedicado */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <p className="text-xs font-medium text-primary">O seu consultor dedicado</p>
              <div className="mt-3 flex items-center gap-3">
                <AgentAvatar agent={consultant} className="size-12" />
                <div className="min-w-0">
                  <p className="font-medium">{consultant.name}</p>
                  <p className="text-sm text-muted-foreground">{consultant.agency}</p>
                </div>
              </div>
              <a
                href={`https://wa.me/${consultant.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                <WhatsappIcon className="size-4" /> Falar por WhatsApp
              </a>
              <a
                href={telLink(consultant.whatsapp)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                {formatPhone(consultant.whatsapp)}
              </a>
              <p className="mt-1.5 text-center">
                <PhoneNote />
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
