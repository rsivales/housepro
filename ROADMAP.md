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

## Princípios de produto (evoluído, mas leve e simples)

- **Leve e rápido:** o Modo Boost e os conteúdos pesados (vídeos/formação) são
  **opt-in** e carregam **só quando abertos** (lazy-load). Não pesam em quem não usa.
- **Modular:** cada funcionalidade é um módulo isolado — o sistema pode ser muito
  capaz sem que **nenhum ecrã** fique pesado ou lento.
- **Simples por defeito, poder a pedido:** mostra-se o caminho simples; as
  ferramentas avançadas só aparecem quando o consultor as liga.
- **Regra de ouro:** se uma funcionalidade não **poupa tempo**, não entra — o
  objetivo é adesão e valor real, não features a mais.

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
- **Especificação completa:** `docs/legalflow.md` (do cliente). Integração —
  Gestor→admin, Consultor→agente, Comprador/Vendedor→portais existentes, +novo
  papel **Advogado**; o "processo CPCV" é a **fase jurídica do negócio** já
  existente; reutiliza imóvel, documentos, notificações/email e o stepper.
- **Sub-fases:** (a) papel advogado + perfil + backbone do processo + onboarding;
  (b) documentos + questionário + perguntas; (c) versões CPCV + revisão +
  assinatura; (d) honorários/custos + risco + procurações + traduções + dashboards.

### 2. Modo Boost — copiloto do consultor
Guia o consultor passo a passo para não esquecer nada; liga ao CRM (as fases
viram checklists) e à gamificação (pontos por ações feitas).

- **Ativável na área do consultor** (interruptor "Boost"): **não é só para
  principiantes** — qualquer consultor, júnior ou sénior, o liga quando quer.
  **Acrescenta** ferramentas às que já tem e **simplifica** alguns processos,
  sem penalizar quem prefere o fluxo normal.

- **Cold calling:** **quadro pop-up** por cliente a contactar, com **script** da
  chamada e **seguimento** — registar resultado (atendeu / interessado /
  remarcar) e agendar **follow-up** automático.
- **Angariação:** ajudar a captar imóveis e a fazer seguimento das oportunidades.
- **Marcação de reuniões:** sugerir a quem/quando ligar e ajudar a agendar.
- **Procedimentos guiados:** checklists para **marcar visitas** e **fazer
  propostas** (todos os passos, sem falhar nenhum).
- **Próxima melhor ação** + **lembretes/tarefas** ("hoje: liga a estes 3;
  falta o documento X; a proposta Y aguarda resposta").

### 5. Formação / Academia (separada do Boost)
Área própria com **tutoriais**, **manual de procedimentos** e formação. Fica
**separada** do Boost (aprender vs. fazer) para não confundir nem atravancar o
fluxo, mas o Boost tem **links contextuais "saber mais"** que saltam para o
tópico relevante. Conteúdo pesado carrega só quando aberto.

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

---

## Back-office / Admin — melhorias pedidas (Fase 2/3)

### A. Admin real por agência
- **Painéis clicáveis (drill-down):** ex. "5 imóveis ativos" → clicar abre a lista desses 5. Aplicar a todos os cartões de números.
- **Marca de água — upload do logo:** permitir carregar a **imagem do logo** (objetivo inicial), não só texto.
- **Marca de água por agência:** ligar/desligar e **logo próprio por cada agência**.
- **Gestão de agências:** criar / editar / desativar; ver os **consultores** e **imóveis** de cada uma.

### B. Página pública da agência (`/agencia/[slug]`)
- **Aviso legal de gestão independente:** cada agência é gerida por pessoas **autónomas**; a marca **não é responsável** pela gestão das agências. (salvaguarda legal, visível.)
- **Personalização:** a agência escolhe o que mostra no topo / o que oculta.

### C. Aprovações & documentos
- Ao clicar no **aviso** (ex. vermelho "documentos em falta"), abrir o **imóvel** / a **secção de documentos** correspondente.
- **Notificação automática ao agente:** "imóvel visto, mas faltam documentos / situações detetadas pelo sistema" → enviado ao agente para corrigir (ele sabe que foi revisto e o que falta).

### D. Integrações — áreas de configuração
- **Idealista:** área para configurar **API/feed**, sincronização e **mapeamento** de campos.
- **Facebook Lead Ads:** configuração e **mapeamento dos ads na área do consultor** → as leads entram no **pipeline kanban** dele; e geram **notificação à administração** para **controlo de qualidade**.
- **Facebook para brokers (independente):** os brokers têm a sua **própria** configuração e pipeline de Lead Ads, **separada** da dos consultores — ex.: **campanhas de recrutamento** de novos agentes.

### E. Qualidade (brokers/coordenação)
- Área **"Qualidade"**: dados automáticos sobre **prestação de serviço dos agentes**, **qualidade dos imóveis** e **pontos a melhorar** (alertas de melhoria).
