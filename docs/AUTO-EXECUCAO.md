# Registro de autoexecução

## Fase 1 — Categorias e produtos reais

Concluída. As rotas `/categorias` e `/produtos` usam Server Functions e Drizzle para listar, criar, editar e ativar/desativar, sem exclusão física. Produtos finais exigem preço de venda; ingredientes e embalagens o aceitam como opcional.

Verificações concluídas: `npm run lint` e `npm run build`.

## Fase 2 — Compras e estoque

Concluída. A rota `/compras` registra fornecedor, data, itens com quantidades decimais, custos, observações e referência futura de nota fiscal. A compra, seus itens e as entradas de estoque são gravadas em uma única transação. A rota `/estoque` calcula saldos a partir de movimentações, com filtro e histórico.

## Prévia do histórico do workbook

Concluída em modo somente leitura. O comando `npm run import:history:preview -- <workbook>` gera `docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md` e não acessa o banco. A migration e a importação transacional foram deixadas para depois da revisão explícita das pendências de datas, aliases de compra, locais/canais e impacto histórico de estoque.

Verificações concluídas: `npm run lint` e `npm run build`.

## Fase 3 — Vendas e despesas

Concluída. As rotas `/vendas` e `/despesas` registram dados reais com validação. Vendas confirmadas ou pagas criam a saída de estoque na mesma transação; rascunhos e canceladas não fazem baixa.

Verificações concluídas: `npm run lint` e `npm run build`.

## Fase 4 — Dashboard e qualidade

Concluída. A visão geral deixou de usar dados demonstrativos e passou a consultar produtos ativos, itens sem saldo ou com saldo negativo, compras recentes, vendas recentes, despesas do mês e itens com saldo. Estados vazios foram incluídos.

Verificações concluídas: `npm run lint` e `npm run build`.
