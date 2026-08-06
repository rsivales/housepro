# Pôr a HousePro em produção (sair do modo demo)

O site funciona em **modo demo** (dados de exemplo) enquanto não houver Supabase
ligado. Para persistir tudo de verdade (qualidade, pagamentos, agências,
concelhos, histórico de imóveis, etc.), são 3 passos.

> **Segurança:** nunca partilhes a `service_role key` nem a password da base de
> dados em chat. Estas chaves só vão para as variáveis de ambiente do Vercel.

## 1. Base de dados
1. Cria um projeto em https://supabase.com.
2. Abre **SQL Editor** → **New query**.
3. Cola o conteúdo de **`supabase/setup_full.sql`** (todas as migrações 0001–0019) e corre.
   - Opcional: corre também `supabase/seed.sql` para dados iniciais.
4. Em **Storage**, cria um bucket público **`property-media`** (fotos de imóveis,
   artes de prémios, fotos de concelho, etc.).

## 2. Variáveis de ambiente no Vercel
Em **Vercel → Project → Settings → Environment Variables**, adiciona:

| Variável | Onde encontrar (Supabase) |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (secreta) |

Opcionais (notificações reais por email/webhook):
`RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL`, `LEAD_FROM_EMAIL`, `LEAD_WEBHOOK_URL`,
`GOOGLE_DRIVE_API_KEY`, `CONTACT_REVERT_SECRET`.

## 3. Redeploy
Faz **Redeploy** no Vercel para as variáveis entrarem em vigor. A partir daí o
`isSupabaseConfigured()` passa a `true` e a app lê/grava na base de dados.

## Verificação rápida
- Entra em `/entrar` e cria/associa um utilizador (Supabase Auth).
- O rodapé "Modo demo" na área profissional deve desaparecer.
- Edita um imóvel → o histórico de alterações fica gravado.
