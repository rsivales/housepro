# Ligar o HousePro ao Supabase + Vercel

Guia passo-a-passo para pôr o site em produção. Já tens conta no Supabase e na
Vercel — só falta ligar as três peças: **repositório GitHub → Supabase (base de
dados) → Vercel (alojamento)**.

Tempo estimado: ~20 minutos.

---

## 1. Criar o projeto Supabase

1. [app.supabase.com](https://app.supabase.com) → **New project**.
2. Escolhe nome (`housepro`), password da base de dados (guarda-a) e a **região**
   mais perto de Portugal — **West EU (London)** ou **Central EU (Frankfurt)**.
3. Espera ~2 min pelo provisionamento.

### Guarda 3 valores (Project Settings → API)
| Valor | Onde | Usado em |
|---|---|---|
| **Project URL** | Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public key** | Settings → API → Project API keys → `anon` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role key** | Settings → API → `service_role` (⚠️ secreta) | correr o seed |

E a **Reference ID** (Settings → General) — precisas dela para o CLI.

---

## 2. Criar o esquema + dados (migrações e seed)

Tens duas vias. **A** (CLI) é a recomendada; **B** (copiar/colar) não precisa de
instalar nada.

### Via A — Supabase CLI (recomendada)

```bash
# instalar o CLI (macOS: brew; ou npm)
brew install supabase/tap/supabase        # ou: npm i -g supabase

# na raiz do repositório:
supabase login                            # abre o browser
supabase link --project-ref <REFERENCE_ID>   # a tua Reference ID do passo 1

# aplicar as migrações 0001–0008 ao projeto remoto:
supabase db push

# correr o seed de demonstração (dados de exemplo):
psql "$(supabase db url)" -f supabase/seed.sql
```

> Antes de correr, abre `supabase/config.toml` e mete a tua **Reference ID** no
> campo `project_id`.

### Via B — Dashboard (sem instalar nada)

1. No Supabase: **SQL Editor → New query**.
2. Cola e corre, **por ordem**, o conteúdo de cada ficheiro:
   `supabase/migrations/0001_init.sql` … até `0008_teams_partnerships.sql`.
   (Um de cada vez, do 0001 ao 0008.)
3. Por fim, cola e corre `supabase/seed.sql` (cria os dados de exemplo).

> O seed cria 5 consultores demo: email `ana@housepro.pt`, `rui@housepro.pt`, …
> `carla@housepro.pt` — password **`housepro-demo`**. Podes entrar com qualquer
> um em `/entrar` depois do deploy. Em produção real, apaga estes utilizadores
> demo e cria os verdadeiros.

### Storage (fotos e documentos)
As migrações já criam os buckets (`property-docs` etc.). Confirma em
**Storage** que existem. Para produção, revê as políticas de acesso.

---

## 3. Deploy na Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importa o
   repositório do GitHub (`rsivales/housepro`, branch
   `claude/housepro-scaffold-setup-k7xfnj` — ou faz merge para `main` primeiro).
2. Framework: **Next.js** (deteta automaticamente). Não mexas no build command.
3. **Environment Variables** — adiciona:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL (passo 1) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key (passo 1) |

   Opcionais (notificações de lead — ver `.env.example`):
   `LEAD_WEBHOOK_URL`, `RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_NOTIFY_EMAIL`.

4. **Deploy**. Em ~1 min tens um URL `…vercel.app`.

> Estas duas variáveis chegam para o site ler tudo da base de dados. Sem elas, a
> app corre em **modo demo** (dados mock) — foi assim que a desenvolvemos.

---

## 4. Ligar o Supabase Auth ao domínio da Vercel

Para o login por email/magic-link funcionar:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL**: o teu URL de produção (ex.: `https://housepro.vercel.app` ou
   `https://www.housepro.pt`).
3. **Redirect URLs**: acrescenta esse mesmo URL + `/auth/callback`.

---

## 5. Verificar

- Abre o URL da Vercel → a homepage mostra os imóveis vindos do Supabase.
- `/imoveis` **não** mostra os pendentes de aprovação (HP-1049/HP-1050).
- `/entrar` com `carla@housepro.pt` / `housepro-demo` → área profissional.
- `/admin/aprovacoes` → vês os imóveis pendentes com o alerta e o SLA.

---

## 6. Domínio próprio (opcional, www.housepro.pt)

1. Vercel → Project → **Settings → Domains** → adiciona `www.housepro.pt`.
2. No teu registrar de DNS, cria o registo que a Vercel indicar
   (normalmente um **CNAME** `www` → `cname.vercel-dns.com`).
3. Atualiza o **Site URL / Redirect URLs** no Supabase (passo 4) para o domínio.
4. O `metadataBase` do site já aponta para `https://www.housepro.pt`.

---

## Resumo das variáveis de ambiente

```bash
# obrigatórias (Vercel + .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# opcionais — notificações de lead
# LEAD_WEBHOOK_URL=https://hooks.slack.com/services/...
# RESEND_API_KEY=re_...
# LEAD_FROM_EMAIL=leads@housepro.pt
# LEAD_NOTIFY_EMAIL=comercial@housepro.pt
```

Para desenvolver localmente: copia `.env.example` para `.env.local`, preenche as
duas variáveis, e corre `npm run dev`.
