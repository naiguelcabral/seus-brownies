# MEI e taxas por pagamento — definições de 18/10/2026

Usuário informou MEI R$ 88 por mês e confirmou que deve ser acrescentado aos
R$ 2.200 fixos anteriores. Detalhou as taxas como débito 1,43 e crédito 3,36,
no contexto de percentuais, e confirmou Pix **R$ 0,49 por transação**. A
combinação de meios “Não tem padrão depende do local de venda”.

Esses são valores operacionais fornecidos pelo usuário, não certificação de
alíquota legal ou tabela pública da adquirente. A referência genérica anterior
“1,99” está substituída pelas taxas discriminadas abaixo.

| Premissa | Valor para a revisão | Tratamento |
| --- | ---: | --- |
| Fixos anteriores, com MO e energia | R$ 2.200/mês | Preservar a inclusão já confirmada, sem cobrança dupla |
| MEI informado | R$ 88/mês | Adicional fixo; não percentual de faturamento |
| Fixos revistos | **R$ 2.288/mês** | MO R$ 600; outros fixos incluindo energia e MEI R$ 1.688 |
| Débito | **1,43%** | Sobre o valor pago em débito |
| Crédito | **3,36%** | Sobre o valor pago em crédito |
| Pix | **R$ 0,49/transação** | Uma cobrança por pagamento Pix, não por item vendido |

Não lançar uma despesa paga de MEI só porque foi informada a premissa mensal.
O fato financeiro/caixa exige seu registro próprio; esta tarefa não o criou.
Não inventar recebimento líquido, taxa ou meio de pagamento no histórico.

## Cálculo e apresentação necessários

Não fixar uma média universal para todos os locais. Registrar o meio de cada
pagamento e somar a taxa correspondente. Uma compra com vários produtos paga
num único Pix incorre em R$ 0,49; pagamentos Pix distintos são transações
distintas. Não confundir 1.477 unidades de produto com 1.477 pagamentos.

Exemplo de uma transação Pix: R$ 6 vendidos → R$ 0,49 (8,17% efetivos);
R$ 30 vendidos → os mesmos R$ 0,49 (1,63%); R$ 100 vendidos → R$ 0,49 (0,49%).
Logo, gravar 0,49% como taxa Pix ou usar crédito/débito como média produziria
erro de custo. Para prever Pix, usar quantidade estimada de pagamentos ou
cestas/valores estimados explicitamente, sem assumir um pagamento por unidade.

A apuração por pagamento precisa preservar receita, taxa, recebimento e caixa
sem descontar a mesma taxa duas vezes. Definir representação auditável, vigência
e política de arredondamento na integração, sem reescrever fatos anteriores.
O campo atual de cenário é apenas uma reserva percentual: não representa por
si uma tarifa fixa por transação ou uma taxa diferente por local/meio.

## Comparações locais por meio, sem pressupor mistura de pagamentos

Mantidos os custos físicos de referência e o rateio histórico provisório de
Bordinhas da última simulação. Fixos agora em R$ 2.288. Cada linha é um caso
separado, não afirmação do comportamento real de pagamento.

| Caso de comparação | Vendas para meta | Unidades/mês | Taxa estimada | Lucro projetado | Receitas equivalentes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sem taxa percentual, comparação-base | R$ 16.057,00 | 1.492 | R$ 0,00 | R$ 10.104,51 | 62,216 |
| Todo faturamento em débito | R$ 16.346,00 | 1.520 | R$ 233,75 | R$ 10.088,57 | 63,307 |
| Todo faturamento em crédito | R$ 16.779,00 | 1.560 | R$ 563,77 | R$ 10.086,19 | 64,987 |

A primeira linha não é hipótese de Pix gratuito; é somente a base sem taxa
percentual. Não foi criada uma projeção de “todo Pix” sem saber o número de
transações ou valor das cestas. Resultados são estimativas condicionadas aos
custos físicos ainda pendentes e rendimentos históricos, não homologação.
As receitas equivalentes excluem Bordinhas como produção independente e não
montam fornadas inteiras. Na comparação de crédito, a conta supera 64 receitas
mensais, antes de perdas; ajustar capacidade ou agenda também afeta diária.

Funções nativas e conferência Decimal independente de receita, custos
variáveis arredondados por linha, reserva e fixos fecharam os três casos.
Evidência: [scenario-mei-payment-fees-2026-10-18.json](evidence/scenario-mei-payment-fees-2026-10-18.json).

## Estado e continuação

Taxas e MEI definidos; não repetir a pergunta sobre sua inexistência nem sobre
se o MEI já estava nos R$ 2.200. A divisão de pagamentos é variável por local,
não uma informação faltante que o agente possa inventar. Construir comparação
por meio/local e registrar pagamentos para usar a mistura observada quando
houver dados suficientes.

Ainda falta a medição/base de rateio da massa aproveitada de Bordinhas, além
de implementar, ensaiar e aplicar o pacote técnico autorizado no HML. Nenhum
valor deste documento foi gravado no banco; o rascunho existente não foi
ativado ou duplicado. Não houve mudança de fonte, schema, código ou deploy.
