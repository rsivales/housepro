# HousePro — Website imobiliário

**Domínio:** www.housepro.pt · Website imobiliário moderno da agência HousePro, construído de raiz.

## Objetivo & estética (requisito de topo)

Lindo, limpo, profissional, intuitivo e **mobile-first** — o cliente tem de sentir um "íman".
Muito espaço branco, imagens grandes, tipografia refinada, microanimações subtis, modo
claro/escuro. **Os imóveis e os agentes são a estrela.**

> Antes de programar tudo: definir um design system e mostrar a landing e um cartão de imóvel
> para aprovação do visual.

## Stack

- **Next.js 15** (App Router) + **TypeScript** — SSR/SSG para SEO
- **Tailwind CSS v4** + **shadcn/ui** + **framer-motion**
- **Supabase** — Postgres, Auth, Storage, Edge Functions, **RLS por agência**
- **TanStack Query** · **react-hook-form + zod**
- Deploy no **Vercel** com **www.housepro.pt**

## Papéis / multi-agência

- **admin** (marca) — cria agências, gere papéis e permissões
- **coordenador** (agência)
- **agente**

Várias agências, cada uma com a sua **montra** (slug).

## Montra pública (SEO)

- Landing magnética
- `/imoveis` com filtros e pesquisa
- Detalhe do imóvel com **galeria rica**: fotos, vídeo, foto 3D/tour, **planta**, **slider antes/depois**
- **Calculadora de crédito habitação** com CTA "saber mais" (gera lead)
- **Calculadora de obras** opcional (ativada pelo consultor)
- **WhatsApp por agente** — cada agente com nº e foto; o cliente clica no imóvel e fala logo por
  WhatsApp com mensagem pré-preenchida com a referência (wa.me click-to-chat)
- Montra por agência
- **Magnet** — avaliação gratuita que capta leads
- Secção de **notícias**

## App do consultor (mobile-first)

- Login
- **Carregar imóveis pelo telemóvel** (fotos, vídeo, 3D, planta, antes/depois, docs; rascunho e publicar)
- Os meus imóveis
- **CRM com pipelines em Kanban** (angariação e comprador)
- **Matching automático** comprador↔imóvel (imóveis próprios ou de colegas; enviar por WhatsApp com 1 toque)
- **Objetivos & prémios** — metas de fecho/angariação, score/pontos, níveis, badges
- Definições de WhatsApp e foto

## Portal do comprador

Favoritos, pesquisas guardadas com alertas, matches automáticos, visitas, documentos, notificações.
**Acompanhamento do processo de compra** em infografia/stepper (mobile, bonito) que mostra a fase
atual e o que falta, ligado ao agente e supervisionável por gestor/broker, com notificações a todos:

- **Via transacional:** proposta enviada → aceite → reserva → CPCV → escritura
- **Via crédito bancário (paralela):** pedido → aprovação → avaliação → marcação de escritura

## Portal do proprietário

Desempenho do imóvel (visualizações/leads/visitas), propostas, documentos (mandato, cert.
energético), comunicação, notificações.

## Back office (admin / coordenador)

Criar/gerir agências, membros e permissões; supervisão de imóveis; supervisão dos processos de
compra; estado dos portais; notícias (CRUD).

## Integrações

- Exportação para **portais (Idealista / Imovirtual)** via **feed XML** com estado no back office
  (feed = via fiável; push por API = futuro)
- **Facebook Lead Ads** — webhook leadgen da Meta → lead vira cartão no pipeline + notificação

## Automações

Matching comprador↔imóvel; alertas de pesquisas guardadas; relatório periódico ao proprietário;
tarefas/lembretes ao agente; notificações por evento e por mudança de fase do processo de compra;
sync agendado do feed.

---

## Milestones

1. **Scaffold + design system** ← _atual_ (entrega: design system + landing + cartão de imóvel para aprovação)
2. **Dados + Auth** — migrations + RLS + Storage
3. **Montra pública** — detalhe rico + calculadoras + WhatsApp + SEO
4. **App do consultor** — upload mobile
5. **Back office** — agências / permissões
6. **Magnet + Notícias**
7. **Portais + CRM + Automações**
8. **Portais de comprador e proprietário** — com infografia do processo de compra
9. **Pipelines / Kanban + Gamificação + Facebook Lead Ads**
10. **Deploy Vercel + www.housepro.pt**

---

## Estado

- [x] **M1 — Scaffold + design system**
- [~] **M2 — Dados + Auth** _(em curso: esquema Supabase + RLS + Storage em `supabase/migrations/0001_init.sql`; falta gerar tipos, camada de dados e Auth)_
- [ ] M3 · [ ] M4 · [ ] M5 · [ ] M6 · [ ] M7 · [ ] M8 · [ ] M9 · [ ] M10

## Correr localmente

```bash
pnpm install
cp .env.example .env.local   # valores do projeto Supabase
pnpm dev                     # http://localhost:3000
```

---

## Montras, configuração e atribuição de leads (registo de requisitos)

Adicionado a pedido do cliente. Mecanismo demonstrado no M1 com dados mock;
persistência real (por agência) + autenticação chegam no M2/M5.

### Configuração pela marca/coordenador (back office — M5)
- A secção **"Mais imóveis para si"** da homepage tem uma **regra escolhível**
  (mais recentes, preço, mais procurados, algoritmo de destaque). Editável no
  **/admin** (protótipo, guardado no browser; depois persistido no Supabase).

### Montra por agência — `/agencia/[slug]`
- Imóveis da agência (por defeito **mais recentes / do mês**).
- Linha de **últimos vendidos** (prova social).
- Equipa de consultores da agência.

### Página do consultor — `/consultor/[id]`
- **Os seus imóveis** + botão **"Mais imóveis"**.
- Pode **enviar um imóvel a um cliente** a partir da sua área — o link gerado
  leva a sua atribuição (`?ref=<consultor>`), mesmo para imóveis de colegas.

### Modelo de atribuição de leads (regra de negócio)
- Convenção `?ref=<consultorId>` em links de imóvel.
- Se o cliente chega a um imóvel **através de um consultor** (página do
  consultor ou link partilhado), o **contacto/lead fica com esse consultor**
  (quem o levou lá) e **não com o angariador** do imóvel.
- Sem `ref`, o contacto é do agente angariador.
- No detalhe (`/imovel/[id]`) e nos cartões, o WhatsApp e o rótulo
  "Apresentado por" refletem essa atribuição.
- No M2/M5 isto passa a registar a lead no CRM/pipeline do consultor certo.

---

## Papéis e finalização de transações (M2 estrutura · M5/M8 UI)

### Papéis (múltiplos por utilizador)
- Um utilizador **pode acumular papéis** (tabela `user_roles`): ex.: um **admin
  que também é coordenador**.
- **`has_role(r)`** devolve verdadeiro se o utilizador tem o papel `r` **ou é
  admin** — ou seja, o **admin tem implicitamente os poderes de coordenador**.
- Papéis: `admin` (marca) · `coordenador` (agência) · `agente`.

### Finalização do negócio (transação)
Só a **coordenação** (ou admin) da agência faz avançar as etapas, via funções
`advance_deal` / `advance_credit` (SQL, security definer):

- **Via transacional:** proposta enviada → **proposta aceite** → **reserva**
  (recolha de informação + documentos + sinal) → **CPCV** → **escritura** →
  concluído. Percentagem: 10/30/50/75/95/100.
- **Via crédito (paralela):** pedido → aprovação → avaliação → escritura marcada.

Cada avanço regista um evento (`deal_events`) e **reflete a percentagem** na área
do **comprador**, do **vendedor** e do **agente/equipa** — infografia/stepper em
`/processo/[id]`. Documentos em bucket privado `deal-docs`.

### Quem vê / quem faz (matriz)
| Ação | admin | coordenador | agente (participante) | comprador/vendedor |
|------|:---:|:---:|:---:|:---:|
| Ver a transação | ✓ | ✓ (agência) | ✓ (se envolvido) | ✓ (a sua) |
| Avançar etapas / finalizar | ✓ | ✓ | — | — |
| Carregar documentos | ✓ | ✓ | ✓ | ✓ (os pedidos) |
| Recolher info / acompanhar | ✓ | ✓ | ✓ | acompanha |

Tabelas: `deals`, `deal_participants` (equipa de consultores), `deal_documents`,
`deal_events`. RLS por participante + por agência. Ver
`supabase/migrations/0002_transactions.sql`.
