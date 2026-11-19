export const RELEASES = [
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
