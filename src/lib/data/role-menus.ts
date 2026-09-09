import type { RoleKey } from "@/lib/data/types";

export type RoleMenuGroup = { title: string; items: { label: string; href: string }[] };
const commercial = [{ label: "Leads e contactos", href: "/app/contactos" }, { label: "CRM e pipelines", href: "/app/meta/pipeline" }, { label: "Agenda", href: "/app/agenda" }];
const property = [{ label: "Os meus imóveis", href: "/app/desempenho" }, { label: "Carregar imóvel", href: "/app/imovel/novo" }, { label: "Empreendimentos", href: "/app/empreendimentos" }, { label: "Parcerias internacionais", href: "/app/parcerias" }];
const operation = [{ label: "Processos", href: "/processo/d1" }, { label: "LegalFlow", href: "/app/legalflow" }, { label: "Ferramentas", href: "/app/ferramentas" }];
const management = [{ label: "Equipa", href: "/app/equipa" }, { label: "Comissões", href: "/app/comissoes" }, { label: "Relatórios", href: "/app/observabilidade" }];

export function menuForRole(role: RoleKey): RoleMenuGroup[] {
  if (role === "superadmin") return [{ title: "Supervisão global", items: [{ label: "Website público", href: "/admin/website" }, { label: "Mapa do sistema", href: "/admin/mapa-sistema" }, { label: "Auditoria", href: "/admin/auditoria" }, { label: "Permissões", href: "/admin/permissoes" }] }];
  if (role === "advogado") return [{ title: "Jurídico", items: [{ label: "LegalFlow", href: "/app/legalflow" }, { label: "Documentos", href: "/app/legalflow" }] }];
  if (role === "parceiro") return [{ title: "Parceiro", items: [{ label: "X Market", href: "/app/x-market" }, { label: "Perfil", href: "/app/perfil" }] }];
  if (role === "recrutamento") return [{ title: "Recrutamento", items: [{ label: "Pipeline de recrutamento", href: "/app/meta/pipeline" }, { label: "Agenda", href: "/app/agenda" }] }];
  if (role === "marketing") return [{ title: "Marketing", items: [{ label: "Campanhas", href: "/app/x-campaigns" }, { label: "Meta / Facebook", href: "/app/meta" }, { label: "Relatórios", href: "/app/observabilidade" }] }];
  if (role === "apoio") return [{ title: "Apoio", items: [...commercial, ...operation] }];
  const groups: RoleMenuGroup[] = [{ title: "Comercial", items: commercial }, { title: "Imóveis", items: property }, { title: "Operação", items: operation }];
  if (["admin", "diretor", "coordenador"].includes(role)) groups.push({ title: "Gestão", items: management });
  return groups;
}
