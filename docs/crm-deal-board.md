# CRM: comissão por consultor e movimento de negócios

Os cartões e o detalhe apresentam a comissão do negócio, partilha externa, comissão bruta pessoal, royalties, pensão e valor pessoal após deduções. É uma projeção de leitura, calculada pelo motor `computeLeg` já existente; não cria pagamentos nem altera a faturação. Usa o vínculo validado e a faturação acumulada registados em `profiles`. O acumulado da agência é projetado pela mesma escada para aplicar o cap. Não constitui uma liquidação histórica ou fiscal e não acumula outros negócios em aberto.

A partilha externa é retirada antes da repartição interna. A repartição interna usa `properties.commission_split`. Com um único produtor fica atribuída integralmente a esse produtor; com produtores distintos e sem repartição definida, pede configuração em vez de inventar 50/50. Os mínimos de comissão e as exceções autorizadas seguem `effectiveCommission`. Valores pessoais são arredondados a cêntimos e reconciliam com as deduções apresentadas.

A pega **Arrastar** suporta Pointer Events (rato, caneta, toque) e mantém o scroll normal fora da pega. A proximidade às margens desloca o quadro horizontalmente. Teclado: Espaço/Enter inicia, setas escolhem a fase, Enter guarda e Escape cancela. Os botões anteriores continuam disponíveis. Marcar como perdido requer confirmação.

A mudança usa a mesma API de fases, com sessão real, equipa/agência autorizadas e bloqueio do modo de supervisão. Envia a fase anterior e grava por comparação de fase/revisão para não sobrepor alterações simultâneas. O cartão muda após confirmação do servidor; falhas são apresentadas. A API verifica o resultado da escrita e do histórico, compensa a mudança se o histórico falhar e a revisão ainda for a mesma, e comunica falhas de sincronização com o imóvel.

Sem nova migração de base de dados. Os registos contratuais de consultores e controlos de herança estão numa alteração independente, ainda dependente da respetiva migração.

Validação: testes de cálculo (escada, vínculo, cap, partilhas, cêntimos, entradas em falta), permissões e persistência de fases, além da suite existente e build de produção. A verificação no navegador com sessão autenticada requer um acesso real; não foram criadas sessões ou credenciais de teste na produção.
