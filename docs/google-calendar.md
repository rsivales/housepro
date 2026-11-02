# Ligação individual ao Google Calendar

1. No Google Cloud, criar ou selecionar um projeto, ativar **Google Calendar API** e configurar o ecrã de consentimento OAuth para os utilizadores da HousePro. Declarar os âmbitos `calendar.events.owned` e `calendar.calendarlist.readonly`. Durante testes, adicionar os agentes à lista de utilizadores de teste; para uso público, concluir a verificação exigida pelo Google.
2. Criar um **OAuth client ID → Web application** com o URI de redirecionamento autorizado exato `https://housepro.pt/api/calendar/google/callback`. Adicionar `https://housepro.pt` às origens JavaScript autorizadas se o Google o solicitar.
3. No projeto Vercel `housepro`, configurar em **production** `GOOGLE_CALENDAR_CLIENT_ID` e `GOOGLE_CALENDAR_CLIENT_SECRET` como variáveis sensíveis. O `GOOGLE_CALENDAR_REDIRECT_URI` já corresponde ao URI acima. Fazer um novo deploy depois de guardar as variáveis.
4. Cada agente abre **Área profissional → Agenda → Ligar a minha conta Google**, autoriza a sua conta, escolhe uma agenda de que é proprietário e clica **Enviar ao Google** em cada evento. O mesmo botão atualiza o evento após uma edição no Helix. Desligar a conta remove o refresh token guardado no Supabase Vault; os eventos já criados no Google não são apagados.

O Helix não lê nem altera outros eventos do calendário. A ligação não sincroniza alterações feitas no Google de volta para o Helix. O evento é enviado quando o agente carrega no botão e não é enviado automaticamente na criação.
