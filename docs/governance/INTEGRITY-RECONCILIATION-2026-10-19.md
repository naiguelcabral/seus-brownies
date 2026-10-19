# Conferência integrada de integridade — 19/10/2026

## Objetivo

Fechar F02 do roadmap com uma conferência única, somente leitura, entre
estoque, custos de produção, camadas/alocações/reversões FIFO e cobertura do
CMV por competência. A rotina identifica fatos ausentes ou divergentes; ela
nunca altera saldo, custo, histórico, financeiro ou auditoria.

## Cobertura entregue

- Estoque: camadas, alocações, movimentos de saída, reversões, produto,
  quantidade e custo remanescente.
- Produção: custo total do lote, saídas realizadas, custo alocado e camada FIFO
  de origem.
- CMV por competência: receita de entrega, venda, itens e soma das quantidades
  cobertas pelas alocações FIFO.
- Custos exatos: quando há fração racional registrada, ela é comparada antes da
  projeção visual em centavos. Registros legados continuam usando o decimal
  persistido como fallback.
- Ausências: custo inválido, saída sem camada, item sem alocação, referência de
  venda ausente, consumo parcial e reversão excessiva são divergências
  rastreáveis, nunca custo zero presumido.

## Interface e exportação

`/relatorios` exibe a seção **Conferência integrada de integridade** com
contagens, área afetada, entidade, referências e valores quando aplicável. A
mesma informação integra o CSV operacional com proteção contra fórmulas já
existente. A seção somente aparece quando o schema necessário está disponível;
a ausência de schema opcional não interrompe os demais relatórios.

## Critério de aceite

Uma conferência está completa somente quando não há divergências nos fatos
disponíveis. Uma base sem operações reais não é tratada como erro: ela informa
zero fatos conferidos e não cria dados para preencher a tela.

## Ensaios

- Coerência com frações exatas antes da apresentação em duas casas.
- Fatos de custo ausentes, cobertura parcial, reversão acima da alocação e
  divergência de saldo.
- Receita de entrega sem venda vinculada.
- Navegador isolado: divergência legível, sem ação de correção e sem overflow
  em 375 px.

Nenhum dado de compra, produção, venda, estoque, financeiro ou auditoria foi
criado ou alterado no HML para estes ensaios.
