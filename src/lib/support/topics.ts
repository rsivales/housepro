export const TOPICS = {
 tecnico_acesso:{label:"Acesso, conta e permissões",group:"Problema técnico",scope:"tecnico"},
 tecnico_crm:{label:"CRM, pipelines e contagens",group:"Problema técnico",scope:"tecnico"},
 tecnico_imoveis:{label:"Imóveis, fotografias e publicação",group:"Problema técnico",scope:"tecnico"},
 tecnico_integracoes:{label:"Emails, Google, portais e integrações",group:"Problema técnico",scope:"tecnico"},
 leads_sla:{label:"Acompanhamento de lead / SLA",group:"Leads e acompanhamento",scope:"agencia"},
 atribuicao:{label:"Atribuição de lead ou conflito entre agentes",group:"Leads e acompanhamento",scope:"agencia"},
 comissoes:{label:"Comissões e repartições",group:"Financeiro",scope:"marca"},
 fees:{label:"Fees, faturação e pagamentos",group:"Financeiro",scope:"marca"},
 conduta:{label:"Infração, conduta ou denúncia confidencial",group:"Confidencial",scope:"confidencial"},
 apoio:{label:"Ajuda operacional ou formação",group:"Apoio",scope:"agencia"},
 sugestao:{label:"Sugestão de melhoria",group:"Melhorias",scope:"marca"},
} as const;
export const TICKET_STATUS={aberto:"Aberto",em_analise:"Em análise",aguarda_requerente:"Aguarda a sua resposta",resolvido:"Resolvido",fechado:"Fechado"} as const;
export type TicketTopic=keyof typeof TOPICS;
export const SCOPE_LABEL={agencia:"Autor e gestão da agência",marca:"Autor e administração da Marca",tecnico:"Autor, apoio técnico e Marca",confidencial:"Apenas autor e administração da Marca"};
