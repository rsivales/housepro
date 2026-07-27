# LegalFlow — Módulo Jurídico (CPCV) do HousePro

Especificação do cliente para a gestão de **Contratos-Promessa de Compra e Venda
(CPCV)** e assuntos legais, entre **consultor, advogado, vendedor e comprador**.
Originalmente pensado como app separada ("LegalFlow"); **decisão: integrar** como
módulo do HousePro (uma só base de dados). "LegalFlow" fica como a **identidade da
área jurídica** (portal do advogado) dentro do HousePro.

Objetivo: mini-CRM jurídico-imobiliário colaborativo — recolha de documentos e
respostas, comunicação por email, elaboração/versões do CPCV, progresso, risco
jurídico, custos/honorários, marcação de assinatura, auditoria; foco em
transparência, confiança e redução de erros/atrasos. Mobile-first, premium.

---

## Mapa de integração (LegalFlow → HousePro)

**Papéis** (reutiliza os do HousePro, acrescenta 1):
- **Gestor** → `admin` (existente)
- **Consultor Imobiliário** → `agente`/`coordenador` (existente)
- **Comprador / Vendedor** → portais de cliente existentes (comprador/vendedor)
- **Advogado** → **NOVO papel** `advogado` (perfil profissional c/ nº da Ordem)

**Processo CPCV** = a **fase jurídica do negócio (deal)** que já existe
(proposta → aceite → reserva → **CPCV** → escritura). O módulo LegalFlow ativa-se
no negócio quando entra em reserva/CPCV; o advogado é associado como participante.

**Reutiliza:** autenticação/utilizadores/papéis, imóvel e os seus documentos
(bucket `property-docs`), negócio/participantes, notificações + email (Resend),
portais de comprador/vendedor e o stepper `/processo/[id]`.

**Novo (módulo LegalFlow):** perfil do advogado (gating pela Ordem), onboarding
wizard do CPCV, questionário estruturado, perguntas & respostas com destinatário,
versões do CPCV + revisão, agendamento de assinatura, inventário de recheio,
procurações & formalidades, traduções, risco jurídico/bloqueios, semáforo,
serviços/honorários + custos estimados, dashboards financeiros do advogado.

---

## Perfis e permissões (resumo)

- **Gestor:** acesso total; cria/gere utilizadores e associações; vê tudo
  (processos, docs, mensagens, logs, preços, indicadores); configura checklists,
  perguntas, templates, estados, permissões; dashboard global + alertas.
- **Consultor:** cria/gere processos; convida comprador/vendedor; carrega docs;
  responde a perguntas que lhe são dirigidas; acompanha progresso/semáforo/riscos;
  comunica por email; vê custos definidos; **não fecha juridicamente sem advogado**.
- **Advogado:** acesso pleno **só com perfil completo** (nome, **nº da Ordem**,
  email, telefone; morada opcional) — senão acesso bloqueado com aviso. Vê docs;
  marca-os recebido/validado/incompleto/rejeitado; cria/gere **versões do CPCV**;
  pede revisão; define estado jurídico; propõe/confirma assinatura; regista risco
  jurídico e nível; configura **tabela de honorários**; vê dashboard financeiro.
- **Vendedor / Comprador:** login próprio; só veem os seus processos; carregam a
  sua checklist; respondem ao questionário; veem progresso/semáforo, pedidos de
  revisão e versões autorizadas; enviam perguntas escolhendo destinatário
  (advogado/consultor); **nunca veem perguntas privadas do outro lado**; confirmam
  disponibilidade para assinatura; veem "o que falta"; veem advogado responsável
  (+ nº Ordem) e os serviços/preços aplicáveis, com aviso de custos extra.

---

## Estrutura / separadores do processo

Dashboard · Lista de processos · Detalhe do processo (Visão geral, Partes,
Onboarding, Documentos, Questionário, Perguntas, Emails, CPCV, Progresso,
Assinatura, Inventário de recheio, Procurações e formalidades, Traduções, Risco
jurídico/bloqueios, Serviços e custos, Histórico) · Gestão de utilizadores ·
Definições · Logs/auditoria.

## Estados do workflow (progresso automático + semáforo)

1. Onboarding inicial (não iniciado / em curso / completo)
2. Envio de documentos (pendente / em curso / completo / incompleto)
3. Resposta às perguntas (pendente / parcial / completo)
4. Elaboração do CPCV (não iniciada / em preparação / v1 / revisão solicitada)
5. Revisão (aguarda comentários / recebidos / alterações / versão final)
6. Marcação da assinatura (aguarda / proposta / confirmada / concluída)
7. Concluído (assinado / arquivado)

**Semáforo:** verde (a avançar) / amarelo (pendências/atrasos) / vermelho
(bloqueio crítico). Automático, com ajuste manual (advogado/gestor) registado em log.

## Onboarding wizard (guardar rascunho)

Etapas: identificação do negócio → imóvel e partes → tipo de CPCV → procurações/
representação → assinaturas/formalidades → tradução/idioma → custos/serviços →
confirmação. Barra de evolução por % e etapas. Recolhe: partes múltiplas,
procuração (nacional/estrangeira, apostila, tradução), reconhecimento (simples/
menções especiais), tradução do CPCV/docs, urgência, financiamento, herança/
empresa/estrangeiros/usufruto/inventário/cláusulas especiais, e estimativa de custos.

## Tipos de CPCV

simples · c/ financiamento · c/ procuração · c/ herança · c/ empresa · c/
estrangeiros · c/ tradução · c/ reconhecimento · c/ inventário · c/ cláusulas
especiais · urgente · complexo/misto.

## Módulos-chave

- **Documentos:** drag&drop, categorias configuráveis (vendedor/comprador/geral),
  estados (recebido/validado/incompleto/rejeitado → email automático), preview,
  versões, checklist visual de faltas, comentários; visibilidade por parte.
- **Questionário inteligente:** secções (imóvel, partes, condições, sinal/
  pagamento, prazos, cláusulas, financiamento, posse, recheio, encargos,
  procurações, assinaturas, traduções, observações), tipos de campo variados,
  obrigatório/opcional, **lógica condicional**.
- **Perguntas & respostas:** comprador/vendedor abrem pergunta e escolhem
  destinatário (advogado/consultor); privacidade entre lados; consultor/advogado/
  gestor veem tudo.
- **Emails:** toda a comunicação externa por email, registada no processo;
  templates + automações (convite, doc em falta/rejeitado, responder questionário,
  nova versão CPCV, nova pergunta/resposta, proposta/confirmação de assinatura,
  conclusão, custo adicional, tradução, falta de procuração).
- **Versões do CPCV:** CPCV_v1/v2/final, descrição de alterações, idioma, estado,
  disponibilizar para revisão, histórico, versão ativa.
- **Revisão:** advogado carrega versão → partes recebem email → aprovado /
  necessita esclarecimento / sugerir alteração → registo → versão final.
- **Assinatura/agendamento:** data/hora/local (morada + Google Maps), entidades,
  estado.
- **Inventário de recheio.**
- **Procurações & formalidades:** registo por parte (tipo, país, idioma, apostila,
  legalização, tradução, poderes, validação do advogado); tipos de procuração;
  reconhecimento (sem/simples/menções especiais) e menções → ajustam checklist,
  custos, complexidade, timeline.
- **Traduções:** idioma origem/destino, informativa vs certificada, upload,
  custos, estado; idiomas base PT/EN/FR/ES/DE (+ outros).
- **Serviços, preços e custos:** advogado define tabela (base, revisão simples/
  complexa, urgência, tradução/certificada, procuração/apostila, reconhecimento,
  cláusulas, empresa, herança, múltiplas partes, extras). Sistema mostra base +
  extras ativados + custos potenciais + subtotal + aprovados/pendentes + aviso de
  honorários adicionais. Pedidos especiais geram **potencial custo extra**
  (aguarda validação → aprovado/recusado/faturado).
- **Painel "O que falta para avançar":** por utilizador/processo (docs, respostas,
  revisões, ações do advogado, assinatura, bloqueios, formalidades, procurações,
  custos por aprovar).
- **Dashboards:** Gestor (global + financeiro), Consultor (atribuídos + faltas +
  próximos passos), Advogado (**financeiro/operacional completo:** fila, em curso,
  urgentes, bloqueados, carteira, pipeline, recebido, a receber, faturado, extras,
  médias, por tipo/tradução/procuração/reconhecimento), Comprador/Vendedor
  (estado, %, semáforo, faltas, perguntas, versões, assinatura, custos previstos).

## Extras fundamentais

Checklist automática por perfil · tarefas automáticas · SLA/alertas de atraso ·
comentários internos privados · resumo executivo · **export PDF** do resumo ·
etiquetas · histórico cronológico · multi-advogado/multi-consultor · risco/
semáforo · inventário · painel "o que falta" · procurações · traduções · preços ·
dashboard financeiro do advogado · onboarding com barra de evolução.

## Modelo de dados (tabelas novas do módulo)

users, profiles, roles, processes, process_parties, properties*, documents*,
document_categories, document_reviews, questionnaires, questionnaire_sections,
questionnaire_questions, questionnaire_answers, process_questions,
process_question_responses, email_messages, email_templates, contract_versions,
review_requests, signature_schedules, notifications*, activity_logs, checklists,
checklist_items, process_tasks, process_comments, legal_risks,
process_status_signals, inventory_items, powers_of_attorney,
signature_requirements, translations, service_pricing, process_cost_items,
invoices_or_receivables.
(* = já existem no HousePro; reutilizar/estender em vez de duplicar.)
Com relações, índices e **RLS por papel**.

## Regras de negócio críticas

- Sem advogado validamente identificado (nº Ordem), **não avança** a elaboração
  jurídica.
- Comprador/vendedor **nunca** veem questões privadas um do outro; consultor/
  advogado acompanham.
- Emails sempre registados no processo; barra de progresso automática.
- Suporta >1 advogado e >1 consultor; claro para utilizadores pouco tecnológicos.
- Alterações manuais críticas **sempre em auditoria**.
- Risco jurídico pode **bloquear** avanço de etapa (se definido).
- Procurações/formalidades e traduções ajustam automaticamente checklist, estados
  e custos; pedidos especiais geram previsão de custo extra.

## Dados de demonstração (seed)

1 gestor · 2 consultores · 2 advogados · 2 vendedores · 2 compradores · 3
processos em estados diferentes; docs, perguntas, versões CPCV e assinatura de
exemplo; 1 processo c/ inventário, 1 c/ bloqueio, 1 c/ procuração apostilhada, 1
c/ tradução, 1 c/ custos aprovados; 1 amarelo e 1 vermelho (testar UX).

---

## Sub-fases de construção (dentro da Fase 3, sobre dados reais)

- **3.J-a:** papel Advogado + perfil (gating nº Ordem) · backbone do processo
  CPCV (ligado ao negócio) · onboarding wizard · estados/semáforo/progresso.
- **3.J-b:** documentos (categorias/estados/rejeição+email) · questionário
  (secções + lógica condicional) · perguntas & respostas com privacidade.
- **3.J-c:** versões do CPCV · revisão pelas partes · agendamento de assinatura ·
  inventário de recheio.
- **3.J-d:** procurações & formalidades · traduções · risco jurídico/bloqueios ·
  serviços/honorários + custos · dashboards (advogado/gestor) · export PDF · logs.
