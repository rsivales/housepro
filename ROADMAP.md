# HousePro — Roteiro

Documento vivo do rumo do projeto. Ordem pensada para **menos erros e resultado
mais polido**: fundação primeiro, funcionalidades depois, polimento no fim.

## Fases

- **Fase 1 — Fundação (Supabase)** ← _em curso_
  Ligar a base de dados real (esquema em `supabase/setup.sql`), variáveis na
  Vercel. Passa o site de "demo" a plataforma real (dados persistem).
- **Fase 2 — Ligação final dos dados**
  Gerar tipos, migrar páginas públicas do mock para o Supabase, **login de
  cliente a sério** (email/palavra-passe).
- **Fase 3 — Módulos novos** (ver backlog): Jurídico, Modo Boost, Pesquisas
  guardadas + alertas.
- **Fase 4 — Polimento e QA final** (visual, textos, casos-limite, SEO, perf).

---

## Estado atual (feito)

- Montra pública: landing, `/imoveis`, detalhe rico, crédito, montras por
  agência/consultor.
- Contacto do agente: WhatsApp/SMS/chamada com **link do imóvel** na mensagem +
  **cópia por email** ao consultor e à direção.
- Conta de cliente (demo): favoritos, **coração 3D flutuante** com contador,
  **comparação** de imóveis, pergunta de objetivo (própria/segunda/investimento).
- Área do consultor: carregar imóvel, mercado, referências, Reunião Uau,
  **CRM/Kanban**, **Gamificação** (objetivos/pontos/níveis/distintivos/ranking).
- Back office: admin, aprovações, permissões, exportações.
- Portais de cliente (comprador/vendedor/investidor) + processo `/processo/[id]`.
- Integrações: feed Idealista/Imovirtual + **Facebook Lead Ads** (webhook).

---

## Backlog — módulos a construir (Fase 2/3)

### 1. Módulo Jurídico (Gabinete Jurídico) — **integrado**
Extensão do processo de negócio já existente (reserva → CPCV → escritura).

- Novo papel **`jurídico` / advogado**: cadastra-se e tem a **sua própria área**
  de colaboração; associado ao negócio como participante.
- Acede aos **documentos do imóvel** já carregados.
- Ao pedir o **contrato-promessa (CPCV)**, o sistema **valida automaticamente**
  se a documentação está completa/em dia.
- O advogado **constrói a minuta passo-a-passo** e define os **honorários**.
- O **cliente** vê na sua área o **valor** e o **progresso do CPCV** a ser
  construído, com **notificações**.
- **Consultor + coordenadora** acompanham o mesmo processo.
- Nota de arquitetura: o **modelo de dados** deste módulo deve entrar no esquema
  já na Fase 1/2 (para não re-migrar); a interface constrói-se na Fase 3.

### 2. Modo Boost — copiloto do consultor
Guia o consultor passo a passo para não esquecer nada; liga ao CRM (as fases
viram checklists) e à gamificação (pontos por ações feitas).

- **Cold calling:** **quadro pop-up** por cliente a contactar, com **script** da
  chamada e **seguimento** — registar resultado (atendeu / interessado /
  remarcar) e agendar **follow-up** automático.
- **Angariação:** ajudar a captar imóveis e a fazer seguimento das oportunidades.
- **Marcação de reuniões:** sugerir a quem/quando ligar e ajudar a agendar.
- **Procedimentos guiados:** checklists para **marcar visitas** e **fazer
  propostas** (todos os passos, sem falhar nenhum).
- **Próxima melhor ação** + **lembretes/tarefas** ("hoje: liga a estes 3;
  falta o documento X; a proposta Y aguarda resposta").

### 3. Pesquisas guardadas + alertas (comprador)
Guardar critérios de pesquisa e receber alerta quando entram novos imóveis que
correspondem; visível no portal do comprador.

### 4. Login de cliente a sério (Supabase)
Substituir a conta demo (navegador) por sessão real, sincronizada entre
dispositivos; favoritos/pesquisas passam a persistir por utilizador.

---

## Ideias em aberto / a esclarecer
- 2.º projeto externo a ligar (a detalhar pelo cliente): avaliar integrar como
  módulo vs. ponte.
