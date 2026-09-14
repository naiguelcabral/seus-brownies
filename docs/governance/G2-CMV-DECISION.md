# Decisão aprovada — competência, CMV, reversões e margem

Atualizado em 14 de setembro de 2026. A decisão humana foi aprovada e passa a
ser regra canônica; a análise histórica abaixo é preservada como evidência.

## Resultado aprovado

- Usar a alternativa A para posição/fechamento e a alternativa C para eventos
  financeiros, com receita reconhecida na entrega e caixa separado.
- Corrigir erro no período original; registrar evento econômico posterior na
  data real do evento, sem apagar fatos.
- Cancelamento pré-entrega restaura estoque e CMV. Devolução pós-entrega pode
  gerar reembolso ou crédito futuro, mas não restaura alimento vendável nem
  desfaz o CMV realizado.
- Somente Dono corrige período fechado. Dono e Gerente podem decidir a forma de
  compensação ao cliente.
- O resgate de crédito consome somente o saldo da emissão vinculada, sem novo
  efeito em receita ou caixa.
- Custos diretos de energia e mão de obra permanecem incorporados ao custo do
  lote e não voltam a ser abatidos no resultado.
- Margem mínima é alerta configurável. O mix histórico é normalizado
  proporcionalmente de 103% para 100%.

## Fatos atuais

Uma venda confirmada ou paga recebe alocações FIFO por item. Cada alocação
aponta para uma camada; quando a camada veio de produção, pode apontar para uma
saída e lote. Compra e ajuste positivo não possuem lote. Devoluções e
cancelamentos criam reversões com quantidade e custo restaurado.

Hoje o relatório filtra a venda pelo período, mas considera reversões
posteriores. Assim, o CMV histórico pode mudar. Também não há fato financeiro
canônico separado para crédito de devolução/cancelamento.

Exemplo: venda em 30/09 por R$ 100,00, CMV R$ 60,00; devolução em 05/10 de 40%
(crédito R$ 40,00 e custo restaurado R$ 24,00).

| Alternativa               | Setembro consultado em outubro          | Outubro                     | Efeito                                    |
| ------------------------- | --------------------------------------- | --------------------------- | ----------------------------------------- |
| A. posição na data        | receita R$ 100, CMV R$ 60, margem R$ 40 | depende de crédito separado | fechamento não muda retrospectivamente    |
| B. visão atual            | receita R$ 60, CMV R$ 36, margem R$ 24  | sem linha própria           | altera período passado                    |
| C. competência por evento | venda R$ 100/R$ 60/R$ 40                | crédito -R$ 40, CMV -R$ 24  | fatos pertencem ao período em que ocorrem |

## Alternativas e testes

**A — posição FIFO na data de corte.** Limita alocações e reversões ao fim do
período. Exige decidir se a receita é bruta, líquida ou acompanhada por crédito
posterior separado. Testar devolução/cancelamento depois do corte, várias
devoluções, corte no mesmo dia e origens compra, ajuste e produção.

**B — visão operacional atual.** Mantém o estado atual de vendas antigas, mas
deve ser rotulada como visão não imutável. Testar explicitamente que a reversão
posterior altera o período original sem duplicar receita ou CMV.

**C — competência por fatos financeiros explícitos.** Registra crédito de
devolução/cancelamento no instante da reversão. Exige schema/migration,
auditoria e política para desconto, entrega e cancelamento parcial. Testar
idempotência, concorrência, devolução sucessiva, reconciliação e isolamento por
período/canal/parceiro.

## Vínculo venda–lote e recomendação técnica

O vínculo mínimo já é `item de venda -> alocação -> camada`; lote é opcional.
Exigir lote para compra ou ajuste criaria fatos fictícios. Margem por produto
deve usar todas as alocações; margem por lote deve mostrar apenas a parcela de
produção e separar a parcela sem lote.

A recomendação **A + C** foi aprovada em 11 de setembro de 2026. A visão B pode
continuar somente como consulta operacional explicitamente rotulada; não é
fonte do fechamento nem substitui fatos financeiros.
