import type { Agent } from "@/lib/data/types";
import { isCommercialAgent } from "@/lib/data/agent-directory";
import { isNetworkFinanceAdmin } from "@/lib/data/finance-access";
import { isStaff, isSuperadmin } from "@/lib/data/roles";
export type NavigationAccess = { commercial: boolean; broker: boolean; admin: boolean; financeMaster: boolean; legal: boolean; superadmin: boolean; agentId: string };
export type NavigationGroup = { label: string; icon: string; items: { label: string; href: string }[] };
export function navigationAccess(agent: Agent, broker: boolean): NavigationAccess {
 return { commercial: isCommercialAgent(agent), broker, admin: isStaff(agent), superadmin: isSuperadmin(agent), financeMaster:isNetworkFinanceAdmin(agent), legal:agent.roleKey==="advogado", agentId: agent.id };
}
export function navigationGroups(a: NavigationAccess): NavigationGroup[] {
 const groups: NavigationGroup[] = a.commercial ? [
 {label:"Comercial",icon:"briefcase",items:[{label:"Leads e contactos",href:"/app/contactos"},{label:"Pedidos do website",href:"/app/leads"},{label:"CRM e pipelines",href:"/app/crm"},{label:"Correspondências",href:"/app/matches"},{label:"Agenda",href:"/app/agenda"},{label:"X Call",href:"/app/x-call"},{label:"Processos e LegalFlow",href:"/app/legalflow"},{label:"Reunião Uau",href:"/app/reuniao"},{label:"Guiões de reunião",href:"/app/guioes"}]},
 {label:"Imóveis",icon:"building",items:[{label:"Os meus imóveis",href:"/app/imoveis"},{label:"Carregar imóvel",href:"/app/imovel/novo"},{label:"Mercado e comissões",href:"/app/mercado"},{label:"A minha montra",href:`/consultor/${a.agentId}`},{label:"Desempenho dos imóveis",href:"/app/desempenho"},{label:"Relatórios ao proprietário",href:"/app/relatorios-proprietario"},{label:"Fichas de visita e propostas",href:"/app/atividade-imovel"},{label:"Empreendimentos",href:"/app/empreendimentos"},{label:"Parcerias internacionais",href:"/app/parcerias"}]},
 {label:"Marketing",icon:"megaphone",items:[{label:"X Campaigns",href:"/app/x-campaigns"},{label:"Meta CRM",href:"/app/meta"},{label:"Portais e exportações",href:"/app/portais"}]},
 {label:"Finanças",icon:"coins",items:[{label:"Comissões",href:"/app/comissoes"},{label:"Faturação e pagamentos",href:"/app/pagamentos"},{label:"Outros rendimentos",href:"/app/rendimentos"},{label:"Fees e Pro Producer",href:"/app/fees"},{label:"Fundo de pensão",href:"/app/fundo-pensao"}]},
 {label:"Equipa e formação",icon:"users",items:[{label:"A minha equipa",href:"/app/equipa"},{label:"Referências",href:"/app/referencias"},{label:"Referências de serviços",href:"/app/servicos"},{label:"X Market",href:"/app/x-market"},{label:"Objetivos e prémios",href:"/app/premios"},{label:"Formação",href:"/app/formacao"},{label:"Qualidade",href:"/app/qualidade"},{label:"Ferramentas",href:"/app/ferramentas"},{label:"Observabilidade",href:"/app/observabilidade"}]},
 ] : [];
 if(a.legal)groups.push({label:"LegalFlow",icon:"shield",items:[{label:"Processos e documentos",href:"/app/legalflow"},{label:"Agenda",href:"/app/agenda"}]});
 if (a.broker) groups.push({label:"Gestão da agência",icon:"agency",items:[{label:"Painel da agência",href:"/app/broker"},{label:"Negócios da agência",href:"/app/broker/crm"},{label:"Indicadores imobiliários",href:"/app/indicadores-imobiliarios"},{label:"Equipa e comissionamento",href:"/app/broker/comissionamento"},{label:"Pagamentos da agência",href:"/app/broker/pagamentos"},{label:"Fees e Pro Producer",href:"/app/broker/fees"}]});
 if (a.admin) groups.push({label:"Marca e administração",icon:"shield",items:[{label:"Painel da Marca",href:"/admin"},...(!a.broker?[{label:"Indicadores imobiliários",href:"/app/indicadores-imobiliarios"}]:[]),...(a.financeMaster?[{label:"Aprovações de comissões",href:"/app/aprovacoes-comissoes"},{label:"Negócios da rede",href:"/admin/crm"},{label:"Pagamentos da Marca",href:"/admin/pagamentos"},{label:"Fees e Pro Producer",href:"/admin/fees"},{label:"Integrações",href:"/admin/integracoes"}]:[]),{label:"Agências",href:"/admin/agencias"},{label:"Consultores",href:"/admin/consultores"},{label:"Website público",href:"/admin/website"},...(a.superadmin?[{label:"Manual técnico Helix",href:"/admin/helix-manual"}]:[]),{label:"Mapa e funções",href:"/admin/mapa-sistema"}]});
 return groups;
}
export function linkIsActive(path: string, href: string) { return path === href || (href !== "/app" && href !== "/admin" && href !== "/app/broker" && path.startsWith(href + "/")); }
