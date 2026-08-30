# Homologação — IDs de consumo de produção

Verificado em 2026-08-29, exclusivamente em `development`.

## Correção confirmada

- Consumos de itens da receita usam `products.id`; o ID de `recipe_items`
  permanece separado em `recipeItemId` para auditoria.
- Componentes de recheio também entregam `products.id` ao consumo.
- A busca de movimentos e o bloqueio de produtos usam somente IDs de catálogo.

## Regressão e prévia

- Os testes cobrem o vínculo de Farinha `INS004` entre o consumo de `240 g` e
  o movimento HML de `+240 g`, além do ID válido do Brigadeiro `INS013`.
- A prévia visual em Vite isolado confirmou Farinha disponível `240 g`,
  necessária `240 g` e suficiente.
- A Embalagem Recheado 5x5 permaneceu corretamente insuficiente: disponível
  `1 un.` para `12 un.` necessárias.

Nenhuma compra, lote, venda, despesa ou movimento foi criado nesta validação.
