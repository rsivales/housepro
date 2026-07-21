# HousePro — Supabase (Milestone 2)

Fundação de dados: Postgres + Auth + Storage, **multi-agência com RLS**.

## Estrutura
- `migrations/0001_init.sql` — esquema, políticas RLS e buckets de Storage.

## Modelo
- **agencies** · **profiles** (papéis: admin/coordenador/agente, ligados a `auth.users`)
- **properties** + **property_media** (angariador = `agent_id`)
- **leads** com **atribuição automática**: um trigger define `owner_id` = `referrer_id`
  (quem levou o cliente) ou, na ausência, o angariador do imóvel — implementando a
  regra de negócio já demonstrada no site.
- **favorites**, **saved_searches**, **news**, **site_config** (regra da homepage por agência)

## RLS (resumo)
- Montra pública: leitura de agências, perfis, imóveis publicados, media, notícias, config.
- Escrita de imóveis: angariador ou coordenador/admin **da mesma agência**.
- Leads: qualquer visitante cria; leem só o dono da lead ou a coordenação da agência.
- Favoritos/pesquisas: apenas o próprio utilizador.

## Aplicar
```bash
# com a Supabase CLI e um projeto ligado
supabase db push
# ou colar migrations/0001_init.sql no SQL editor do dashboard
```
Depois preencher `.env.local` (ver `.env.example`) com o URL e as chaves do projeto.

> Próximo passo do M2: gerar tipos (`supabase gen types typescript`), criar a camada
> de acesso a dados (substitui `src/lib/data/mock.ts`) e ligar Auth (login dos
> consultores) + upload para o Storage.
