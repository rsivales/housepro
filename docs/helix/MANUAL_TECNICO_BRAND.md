# Helix — Manual técnico de arquitetura / Transaction Manager
**Versão:** 0.1 (especificação, NÃO implementado)  
**Destinatário:** role brand (acesso exclusivo a validar na autenticação e RLS)  
**Repositório:** rsivales/housepro

## Estado da auditoria
- Consultados: README.md, PLAN.md, package.json, src/app/admin/page.tsx.
- PLAN.md descreve vias paralelas de transação e crédito, portais comprador/proprietário, deal_events, deal_documents, permissões admin/coordenador/agente e funções advance_deal / advance_credit.
- O PLAN.md é documentação histórica e contém estados de milestones desatualizados; **não prova implementação**.
- O admin/page.tsx usa demoDeals em alguns indicadores; não assumir que esses dados são reais.
- **Pendente:** confirmar migrations, endpoints, rotas atuais, perfis reais (brand/broker), dados, Resend, tarefas agendadas, autorização por portal e regras atuais de propostas/reservas.

## Princípios arquiteturais
1. Um negócio, duas vias paralelas: comercial (proposta→reserva→CPCV→escritura) e crédito (pedido→documentação→pré-aprovação→avaliação→aprovação final→FINE/reflexão→disponibilização).
2. Não criar coluna extra para crédito; usar subfluxo dentro do negócio.
3. Preservar dados, rotas e fluxos existentes; migrações aditivas, compatíveis e reversíveis.
4. Brand decide arquitetura; broker supervisiona; consultor é dono comercial; transaction manager tem acesso transversal somente aos negócios atribuídos (ou âmbito explicitamente concedido).
5. Autorização validada no servidor e RLS, nunca apenas por ocultação de botões.
6. Portais do comprador e proprietário reutilizam identidade e processo existentes, com visibilidade separada e acesso apenas a documentos autorizados.

## Cartões mobile
- KPI minimalista sem grandes fundos/etiquetas; cartões Kanban compactos.
- Negócio: idade total (dias/horas), última evolução, segurança transacional e prazo CPCV/escritura.
- Segurança: proposta=baixa; proposta aceite=intermédia; reserva formalizada=compromisso; CPCV assinado=elevada; escritura concluída=concluído. Não inferir compromisso só por mudança de coluna: exigir evidência e validação.
- Leads/contactos: temperatura térmica vermelho (quente) → laranja → amarelo → azul (frio), baseada em eventos reais e inatividade, configurável e reversível.
- Urgência de tarefas/prazos é independente da cor de segurança e temperatura.

## Datas, alertas e validação
- Guardar datas e fusos horários explicitamente; contagem regressiva em dias/horas para prazo CPCV, escritura e obrigações individualizadas.
- Marcos de aviso do prazo contratual: 30, 15, 7, 3, 1 dias e vencido; início obrigatório da validação pré-escritura **pelo menos 7 dias antes**.
- Se pendências: reforçar aos 7, 5, 3, 2 e 1 dias, escalando ao broker nas críticas; evitar duplicados por (negócio, obrigação, marco, versão do prazo, canal, destinatário).
- E-mail via integração existente após auditoria; notificações internas. Não enviar documentos confidenciais por e-mail: usar links autenticados aos portais.
- Ao reagendar, recalcular alertas e manter histórico; não enviar avisos de prazo vencido se concluído ou formalmente alterado.
- Não considerar escritura «pronta» enquanto houver bloqueios críticos sem validação do responsável.

## Checklist condicional
- Antes do CPCV: titularidade, ónus, identificação, poderes, condições, validade e financiamento.
- Após CPCV: direito de preferência (quando aplicável, incluindo comprovação de conclusão), compropriedade/certidões quando aplicável, certidão permanente, caderneta, certificado energético, declaração de encargos/dívidas condomínio, hipoteca e distrate, condições suspensivas, aprovação e documentação bancária, FINE/reflexão, seguros, IMT/IS e meios de pagamento, procurações, marcação e intervenientes, chaves/comandos, contadores e entrega.
- Cada item: applicability (required/optional/not-applicable), responsável, vencimento, estado, documento/evidência, validação por pessoa autorizada, histórico e comentários.
- **Direito legal de preferência público:** a fonte oficial Casa Pronta refere normalmente 10 dias úteis após publicação para resposta. Não tratar «7 dias antes da escritura» como suficiente para iniciar esta formalidade; calcular antecipadamente, com feriados e regras legais aplicáveis, e exigir revisão jurídica.
- Não generalizar obrigações de condomínio, preferência ou crédito a todas as transações.

## Crédito
- Etapas próprias com timestamps, banco/intermediário, responsável, valores, avaliação, documentos pendentes, condições, bloqueios e próxima ação.
- Cliente pode comunicar progresso e carregar evidência; só responsável autorizado confirma aprovação.
- Alterações com trilho de auditoria e notificações seletivas.

## Transaction Manager
- Atribuição de gestor processual e tarefas por negócio; painel transversal de atribuídos, escrituras 7/15/30 dias, documentos por validar, crédito bloqueado, prazos críticos.
- Comentários internos separados de comunicações ao cliente.
- Estados: solicitado, recebido, em validação, validado, rejeitado, dispensado; preservar autor, instante e justificação.

## Portais
- Pedidos originados no Helix aparecem apenas ao participante destinatário; upload regressa ao negócio em estado 'recebido', sem aprovação automática.
- Notificações por e-mail sem anexos sensíveis, com links de acesso seguro.
- Confirmar RLS por deal_participants e permissões de Storage antes de qualquer publicação.

## Manual vivo — role brand
- Secções: arquitetura, dados e RLS, fluxos, permissões, integrações, automações, portais, auditoria, decisões, changelog, testes, publicação.
- Cada funcionalidade deve ter estado: proposto / especificado / implementado / testado / publicado; links a PR, commits e evidência.
- Nunca apresentar como 'publicado' algo apenas especificado.

## Sequência de implementação
1. Inventário técnico do repositório e ambiente real, incluindo regras de propostas/reservas e portais.
2. Modelo de dados e permissões, migrações aditivas e testes RLS.
3. Motor de checklist, datas e alertas idempotentes.
4. Crédito paralelo e atribuição de transaction manager.
5. Portais e sincronização segura.
6. UI mobile/Kanban e painel gestor.
7. Manual técnico no produto, acessível só a brand, com auditoria.
8. Testes end-to-end e publicação controlada.

## Testes de aceitação mínimos
- Contagem correta com fuso horário, horário de verão, reagendamento e vencimento.
- Nenhum e-mail duplicado por marco e versão; escalonamento apenas a destinatários autorizados.
- Comprador não lê documentos privados do vendedor e vice-versa.
- Agente não altera aprovação bancária nem valida sozinho documentos reservados à gestão.
- Reserva/CPCV não mudam para confirmado sem evidência exigida.
- Alertas desaparecem após conclusão/dispensa autorizada, sem apagar histórico.
- Acesso ao manual negado a todos os roles exceto brand.
