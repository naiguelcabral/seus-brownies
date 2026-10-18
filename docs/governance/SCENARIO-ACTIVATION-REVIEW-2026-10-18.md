# Revisão para ativação do cenário 1 — 18/10/2026

Usuário solicitou: “Vamos seguir para tirar ele do rascunho”. Esta instrução
substitui a limitação anterior de manter o cenário em rascunho quanto à intenção
de ativar. Não define novas quantidades físicas, preços, custos ou tarifas.

## Conferência atual

Leitura independente READ ONLY e atualização da interface autenticada
confirmaram um único cenário, ID 1, versão 1, revisão 1, status draft, sem
cenário ativo. Os 17 produtos do mix são produtos finais ativos e o total
normalizado é 10.000 pontos-base (100%). Não criar novamente o cenário.

Premissas persistidas: meta de lucro mensal R$ 10.000,00; custos fixos
R$ 2.200,00; 20 dias; quatro semanas; margem mínima 70%; reserva de taxas e
impostos 0%. Os custos são históricos. Quatro margens planejadas abaixo do
alerta: Bordinhas 42,36%, Bombom 66,46%, Kit 66,73%, Ninho 7×7 68,94%.
Isso é alerta, não impedimento técnico automático à ativação ou venda.

22 testes locais de cálculo, rota e lifecycle passaram. A ativação nativa
valida produtos e mix, exige revisão concorrente, serializa a troca do cenário
ativo e registra histórico/auditoria em transação. Nenhuma alteração de código,
SQL de escrita, implantação ou criação de fatos foi feita nesta revisão.

## Decisão de negócio pendente

A descrição persistida diz “Não homologado para operação” e pede revisão antes
de ativar. As divergências W01–W06 continuam documentadas em
[WORKBOOK-COMPLETENESS-REVIEW-2026-10-18.md](WORKBOOK-COMPLETENESS-REVIEW-2026-10-18.md):

- Energia e MO da fonte: R$ 0,04/R$ 1,70 por receita; quantidades × tarifas
  explícitas: R$ 0,85/R$ 25,00. Confirmar base das duas horas e do rateio.
- Consumo de adesivo, acabamento/rendimento de Bordinhas, cobertura/montagem
  de bombom e kit e recheios prontos versus fabricados ainda não definidos.
- Preços sugeridos e margem mínima divergem; reserva 0% ainda não validada.

Solicitada escolha entre reconciliar custos/premissas antes de ativar ou
ativar como referência provisória com os valores históricos e ressalvas.
Pedido genérico de ativar não foi usado para inventar decisões físicas ou
certificar custos como homologados. Não há falha técnica de integridade.

## Decisão recebida

Usuário escolheu “Vamos revisar custos e premissas”. Não autorizou a alternativa
de referência provisória. Revisão em
[SCENARIO-COST-RECONCILIATION-2026-10-18.md](SCENARIO-COST-RECONCILIATION-2026-10-18.md).

## Execução após a decisão

Se reconciliar: obter as definições físicas e gerenciais faltantes, recalcular
o custo planejado com rastreabilidade e apresentar premissas finais antes da
ativação. Não alterar preços nem regras físicas por inferência.

Se optar explicitamente pela referência provisória: preservar nome, mix,
preços e valores históricos; atualizar a descrição para refletir o aceite das
ressalvas sem declarar homologação produtiva. Salvar pelo editor nativo,
obter a nova revisão e ativar pela ação autenticada, com motivo explícito.
Conferir status/revisão, histórico, autoria e auditoria em READ ONLY. Caso
exista outro cenário ativo ou edição concorrente, revisar antes de substituir.

A classificação ativa refere-se ao planejamento estimado. Não cria estoque,
compras, vendas, produção ou resultado realizado. A revisão física dos custos
permanece necessária mesmo se aceita a referência provisória.
