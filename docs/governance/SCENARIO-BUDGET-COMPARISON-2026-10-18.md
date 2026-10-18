# Comparação de orçamento do cenário — 18/10/2026

Usuário autorizou continuar a revisão antes da ativação. Preparada uma
simulação local, sem atualizar o cenário, os preços do catálogo ou a base.
READ ONLY confirmou cenário ID 1, draft, revisão 1, mix 100%/17 itens, Bordinhas
no catálogo/cenário ainda a R$ 5,00 e demais preços iguais à fonte anterior.

## Premissas usadas e limites

- Orçamento mensal de R$ 2.200 mantido integral: já inclui MO R$ 600
  (R$ 150/dia × quatro dias) e energia nos demais R$ 1.600.
- Custos variáveis de referência calculados a partir da precisão completa da
  fonte: custo histórico com MO − (R$ 1,70 + R$ 0,04) ÷ rendimento histórico.
  Evita contar as mesmas MO/energia também nos custos unitários da projeção.
  São referências de planejamento, não custo completo realizado de um lote.
- Bordinhas: proposta de preço R$ 6,00/pacote de 100 g; acabamento histórico
  R$ 0,27 preservado sem somar adesivo duas vezes. O rateio antigo da massa e
  o rendimento isolado 12 são mantidos **apenas para comparação numérica**:
  não foram validados para 100 g de aproveitamento variável.
- Chocolate da massa confirmado como Melken 50% em pó; recheios comprados
  prontos. Bombom com cerca de 50 g de cobertura; Kit quatro bombons direto
  na embalagem. Um adesivo por apresentação vendida. Custos variáveis
  reconstruídos: R$ 2,654/Bombom e R$ 9,898/Kit; referências de planejamento
  com custos mestre e rendimento histórico, não medição realizada.
- Meta R$ 10.000, 20 dias de venda, quatro semanas e alerta de margem 70%
  herdados para comparação. Taxas/impostos em 0% continuam **não aprovados**;
  essa comparação não confirma sua ausência nem homologa a meta líquida.
- Mix original de 103% preservado e normalizado pela função nativa a 100%.
  Seus pesos distribuem a contribuição necessária; não são proporções de
  unidades produzidas ou vendidas.

## Resultado condicional pelas funções existentes

| Indicador | Referência do rascunho | Comparação de orçamento |
| --- | ---: | ---: |
| Faturamento para a meta | R$ 15.868,00 | R$ 15.881,00 |
| Unidades mensais | 1.492 | 1.477 |
| Unidades semanais (soma arredondada por SKU) | 380 | 376 |
| Lucro gerencial projetado | R$ 10.101,81 | R$ 10.058,27 |
| Produtos abaixo do alerta de 70% | 4 | 4 |

Não interpretar a diferença de lucro como perda de rentabilidade: o cálculo
reduz o volume necessário e o excedente de arredondamento para a mesma meta.
As margens na segunda coluna de comparação usam custo variável; não devem
ser anunciadas como margem bruta realizada que inclui todo o custo produtivo.
O resultado não autoriza ativar enquanto as premissas pendentes não forem
resolvidas. Não há resultado realizado ou compra/produção/venda semeada.

## Capacidade: sinal que precisa de reconciliação

Para os 14 SKUs de brownie, quantidade mensal ÷ rendimento histórico soma
469/8 = **58,625 receitas equivalentes**. É um subtotal parcial, excluindo
Bombom/Kit e Bordinhas. Trata rendimentos como alternativas de uma receita,
sem montar agenda de fornadas inteiras ou medir perdas reais.

A capacidade informada é quatro dias × 14–16 receitas = **56–64 receitas/mês**.
A ponta de 14 receitas/dia já fica abaixo do subtotal só dos brownies. Na ponta
de 16, restam 5,375 receitas equivalentes antes de fechar Bombom/Kit, perdas e
arredondamento de lotes. Bordinhas depende da massa recuperada, sem produção
adicional garantida. Não declarar viabilidade de todas as vendas planejadas
somente por estar dentro da faixa superior. Incluindo Bombom/Kit pelos
rendimentos históricos e sem contar Bordinhas como produção independente,
o total condicional é **61,495 receitas equivalentes/mês**. Restam cerca de
2,505 receitas na ponta de 64, sem agenda de lotes inteiros ou perdas medidas.

## Validação e continuação

Contrato, unicidade dos 17 produtos, validação técnica de mix/produtos e
normalização exata de 10.000 passaram nas funções nativas. Soma independente
com Decimal confirmou faturamento, custo variável arredondado por linha,
lucro após os R$ 2.200 e quantidades. Validação técnica não é homologação das
premissas de negócio.

Payload de simulação, comparação, projeção detalhada e diagnóstico de
capacidade: [scenario-budget-comparison-2026-10-18.json](evidence/scenario-budget-comparison-2026-10-18.json).
Este arquivo não é instrução de aplicar nem referência idempotente consumida.

Meta confirmada em R$ 10.000 de lucro após custos, incluindo Bordinhas.
Recheios comprados prontos e chocolate em pó definidos; cobertura e
embalagens/adesivos de Bombom e Kit também esclarecidos, agora recalculados.
A simulação anterior de R$ 15.551/1.437 unidades foi substituída após fechar
50 g de cobertura por bombom, sem dupla contagem dos componentes.
Faltam taxas/impostos e rateio da massa recuperada de Bordinhas. Perguntados
percentuais/valores de taxas e peso assado da receita para custear 100 g.
Após respostas, recalcular e preparar pacote aditivo e revisão autenticada.
Nenhuma modificação do writer de produção, FIFO ou regra financeira implementada.

A revisão da representação dos materiais confirmou que o enum atual de
componentes de perfil só aceita `filling`. Os 14 vínculos de adesivo na
reconciliação são regras conceituais, não payload executável. Não gravar
adesivo como recheio para contornar essa restrição; preparar representação
aditiva revisada, ensaio e migration quando for implementar o consumo físico.
