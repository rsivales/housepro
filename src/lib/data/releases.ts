export const RELEASES = [
 {id:"2026.11.20-followup-support",version:"2026.11.20.3",title:"Acompanhamento fiável e apoio por tickets",date:"20 de novembro de 2026",items:[
 {type:"bugfix",text:"Leitura de pedidos separada do contacto: Dashboard mostra por ler, sem primeira ação e acompanhamentos vencidos."},
 {type:"security",text:"SLA controlado no servidor, com histórico e revisão humana. Não há transferências automáticas nem penalizações por leitura."},
 {type:"feature",text:"Tickets por tópico, função e agência, incluindo denúncias confidenciais e indicadores de resolução."},
 {type:"feature",text:"Correspondências com leitura individual e filtros de vistas/por ler. Atualizações da sugestão voltam a aparecer por ler."}
 ]},

 {id:"2026.11.20-safe-sla",version:"2026.11.20.2",title:"Leitura e acompanhamento sem conflitos",date:"20 de novembro de 2026",items:[
 {type:"bugfix",text:"Dashboard distingue pedidos por ler e leads sem primeira ação, excluindo cliques anónimos sem contacto."},
 {type:"security",text:"Verificação de SLA deixa de reatribuir contactos, enviar emails de transferência ou criar penalizações automaticamente."},
 {type:"feature",text:"Registar contacto atualiza a página e a contagem de acompanhamento. Marcar como lida continua a controlar apenas a leitura."}
 ]},
 {id:"2026.11.20-buyer-matching",version:"2026.11.20",title:"Compradores, correspondências e comunicação HousePro",date:"20 de novembro de 2026",items:[
  {type:"feature",text:"Ficha de comprador com orçamento, zonas, prazo, financiamento, venda/permuta e leitura por fotografia com revisão."},
  {type:"feature",text:"Correspondências entre compradores e imóveis da rede, com flexibilidade de 30–40%, estado comercial e alertas aos consultores responsáveis."},
  {type:"bugfix",text:"Opção de permuta no imóvel com indicação automática na montra e emails com identidade HousePro."},
  {type:"security",text:"Os outros agentes recebem a referência da qualificação e o consultor responsável, preservando os contactos pessoais do comprador."},
 ]},
 {id:"2026.11.19-consultant-scope-integrations",version:"2026.11.19.3",title:"Área pessoal e configuração de integrações",date:"19 de novembro de 2026",items:[
  {type:"bugfix",text:"Pagamentos, fees e pensão do consultor separados das visões de agência e Marca, mesmo para contas Super Admin."},
  {type:"feature",text:"Identificação permanente do utilizador, com fotografia, nome e prefixo das referências de imóveis."},
  {type:"feature",text:"Simulador profissional de mais-valias com os campos e motor da versão pública, resultado no Helix e relatório atribuídos ao consultor."},
  {type:"feature",text:"Configuração central de Google Calendar e Resend na Marca. Autorização individual da agenda e diagnósticos de envio de e-mail."},
 ]},
  {id:"2026.11.19-navigation-team-cycle",version:"2026.11.19.2",title:"Navegação e acompanhamento da equipa",date:"19 de novembro de 2026",items:[
   {type:"feature",text:"Menus agrupados na barra lateral, com áreas de Consultor, Broker e Brand. Banner personalizado e Ver como preservados."},
   {type:"feature",text:"Equipa e comissionamento: ciclos anuais, comissão atual, progresso e estimativa de negócios para os objetivos."},
   {type:"security",text:"Overrides e alterações de regime só entram em vigor após pedido e autorização da Marca, com histórico."},
   {type:"bugfix",text:"Faturação de novos fechos e estimativas respeita o ciclo de 12 meses desde a entrada do agente."},
  ]},
  {
    id: "2026.11.19-inbox-commission-fees",
    version: "2026.11.19",
    title: "Caixa de entrada e gestão financeira",
    date: "19 de novembro de 2026",
    items: [
      { type: "feature", text: "O início mostra até cinco pedidos por ler, com contador e acesso à gestão completa." },
      { type: "feature", text: "Comissões: 50%/40%, 60%/50% e 80%/70%. Propostas Pro Producer sujeitas à aprovação da Marca." },
      { type: "feature", text: "Registo mensal de fees Pro Producer e tecnológicos, com valores tecnológicos definidos pela Marca." },
      { type: "bugfix", text: "Novidades do sistema atualizadas e disponíveis numa página de histórico." },
    ],
  },
  {
    id: "2026.09.09-website-governance",
    version: "2026.09.09",
    title: "Gestão do website e supervisão",
    date: "9 de setembro de 2026",
    items: [
      { type: "feature", text: "Gestão central de logótipos e imagens públicas no Super Admin." },
      { type: "feature", text: "Mapa do website e do CRM Helix e pré-visualização segura dos menus por função." },
      { type: "bugfix", text: "Uploads com progresso, confirmação visual e mensagens de erro específicas." },
      { type: "security", text: "Conteúdo público global protegido por validação server-side de Super Admin." },
    ],
  },
] as const;

export const LATEST_RELEASE = RELEASES[0];
