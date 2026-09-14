import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Hash, Mail, Phone, ShieldCheck, Calculator, LayoutGrid, Users } from "lucide-react";

import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AgentAvatar } from "@/components/brand/agent-avatar";
import { ProfileEditPanel, type PendingProfileRequest } from "@/components/app/profile-edit-panel";
import { ROLE_LABEL, isStaff } from "@/lib/data/roles";

export const metadata: Metadata = { title: "O meu perfil — Helix" };

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const { agent, demo } = session;
  const roleLabel = (agent.roleKey && ROLE_LABEL[agent.roleKey]) || agent.role || "Consultor";
  const canManageConsultores = isStaff(agent);

  let pendingRequest: PendingProfileRequest | null = null;
  if (!demo && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_change_requests")
      .select("name, photo_url, whatsapp, created_at")
      .eq("profile_id", agent.id)
      .eq("status", "pendente")
      .maybeSingle();
    if (data) {
      pendingRequest = { name: data.name, whatsapp: data.whatsapp, photoUrl: data.photo_url, createdAt: data.created_at };
    }
  }

  const rows: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }[] = [
    { icon: ShieldCheck, label: "Papel", value: roleLabel },
    { icon: Building2, label: "Agência", value: agent.agency || "—" },
    { icon: Hash, label: "Código", value: agent.code ? String(agent.code) : "—" },
    { icon: Mail, label: "E-mail", value: agent.email || "—" },
    { icon: Phone, label: "Telefone / WhatsApp", value: agent.whatsapp || "—" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold">O meu perfil</h1>
      <p className="mt-1 text-sm hx-muted">Os teus dados na HousePro.</p>

      <div className="hx-card mt-6 p-5">
        <div className="flex items-center gap-4">
          <AgentAvatar agent={agent} className="size-16 text-xl" />
          <div className="min-w-0">
            <p className="text-lg font-semibold">{agent.name}</p>
            <p className="text-sm hx-muted">{roleLabel}{agent.agency ? ` · ${agent.agency}` : ""}</p>
            {agent.ownAMI && (
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "var(--hx-surface-blue)" }}>
                <ShieldCheck className="size-3.5" /> AMI próprio
              </span>
            )}
          </div>
        </div>

        <dl className="mt-6 divide-y divide-[var(--hx-border)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-3 text-sm">
              <r.icon className="size-4 hx-muted" />
              <dt className="w-40 shrink-0 hx-muted">{r.label}</dt>
              <dd className="min-w-0 truncate font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>

        {!demo && <ProfileEditPanel agent={agent} initialPending={pendingRequest} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/consultor/${agent.id}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]">
          <LayoutGrid className="size-4" /> A minha montra pública
        </Link>
        {/* Não é uma página de definições de conta — abre as calculadoras (IMT,
            crédito, mais-valias). Rótulo alinhado com o destino real. */}
        <Link href="/app/ferramentas" className="inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]">
          <Calculator className="size-4" /> Ferramentas
        </Link>
        {canManageConsultores && (
          <Link href="/admin/consultores" className="inline-flex items-center gap-2 rounded-full border border-[var(--hx-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--hx-surface-blue)]">
            <Users className="size-4" /> Consultores &amp; papéis
          </Link>
        )}
      </div>

      <p className="mt-6 text-xs hx-muted">
        {demo
          ? "Modo demonstração — os dados do perfil vêm do perfil de exemplo."
          : canManageConsultores
            ? "Para alterar nome, foto, papel ou dados de outros consultores usa Consultores & papéis acima. Para os teus próprios dados podes também usar Editar perfil — fica sujeito à mesma aprovação."
            : "Nome, foto e WhatsApp: usa Editar perfil acima — fica pendente até a coordenação/administração aprovar. Para alterar o papel ou a agência, contacta a coordenação."}
      </p>
    </div>
  );
}
