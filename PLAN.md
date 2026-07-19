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

- [x] **M1 — Scaffold + design system** _(em curso)_
- [ ] M2 · [ ] M3 · [ ] M4 · [ ] M5 · [ ] M6 · [ ] M7 · [ ] M8 · [ ] M9 · [ ] M10

## Correr localmente

```bash
pnpm install
cp .env.example .env.local   # valores do projeto Supabase
pnpm dev                     # http://localhost:3000
```
