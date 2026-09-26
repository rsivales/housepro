# Leads de campanhas: Meta + TikTok

O Helix usa um único módulo (`/app/meta`) para campanhas, formulários,
mapeamento, distribuição, pipeline, SLA e relatórios. TikTok é um fornecedor do
mesmo fluxo; não cria um segundo CRM nem um novo grupo de menu.

## Ativar TikTok

1. Aplicar as migrações `0020_meta_crm.sql`, `0021_meta_completion.sql` e
   `20260926080000_social_leads_tiktok.sql`, por esta ordem.
2. Configurar na Vercel `SUPABASE_SERVICE_ROLE_KEY` e um dos métodos de
   autenticação do webhook: `TIKTOK_WEBHOOK_SECRET` (HMAC) ou
   `TIKTOK_WEBHOOK_VERIFY_TOKEN` (Bearer).
3. Criar a ligação em `tiktok_connections`, guardando apenas `token_ref`; nunca
   guardar o token real na base de dados.
4. Criar a campanha e o formulário no Helix com `provider=tiktok` e preencher
   os IDs externos do TikTok Ads Manager.
5. Mapear os campos do formulário e configurar a regra de distribuição comum.
6. No TikTok Leads Center/API for Business, subscrever o formulário no webhook
   `https://<dominio>/api/tiktok/webhook`.
7. Enviar uma lead de teste, confirmar criação única, destino, notificação e
   métricas em `/app/meta/relatorios`.

## Segurança e operação

- O webhook rejeita pedidos não autenticados e exige `service_role` apenas no
  servidor.
- `social_webhook_events` guarda identificadores e estado técnico, nunca as
  respostas/PII; reentregas são idempotentes e falhas podem ser repetidas.
- A lead completa fica no modelo existente, sujeita às mesmas regras RLS,
  deduplicação, SLA, broker e superadmin usadas para Meta.
- Se faltar o mapeamento da campanha/formulário, o endpoint devolve erro
  temporário e regista a falha para correção, sem encaminhar para um destino
  arbitrário.

Fontes de ativação: documentação oficial TikTok API for Business e artigo
oficial “CRM Integrations TikTok Lead Generation”. Os cabeçalhos/segredos devem
ser configurados de acordo com o método disponibilizado na app TikTok aprovada.
