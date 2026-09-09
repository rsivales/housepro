export const RELEASES = [
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
