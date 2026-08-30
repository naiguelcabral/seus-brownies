# Homologação — importação de produção em development

Execução confirmada em 2026-08-29, usando
`Workbook_Gerenciamento_Seus_Brownies.xlsx` e exclusivamente a conexão de
runtime `development` já autorizada.

## Dados importados

- 1 receita-base com `source_id` `RECIPE-BASE-001`;
- 2 tarifas operacionais;
- 17 perfis de produção;
- 17 planejamentos com prefixo `PLAN`, todos em status `planned`;
- 12 componentes de recheio de perfil.

## Auditoria posterior

A leitura acionada pelo dashboard confirmou: 0 lotes reais, 0 consumos de
lote, 0 perdas e 0 movimentos de estoque com referência de produção. Portanto,
a etapa preservou os planejamentos como dados não físicos e não criou entradas
ou saídas de estoque.

## Verificações

- `npm run lint`: sucesso.
- `npm test`: 3 testes aprovados.
- `npm run build`: sucesso. O Wrangler emitiu somente o aviso não bloqueante de
  impossibilidade de gravar seu arquivo de log fora da área gravável local.

Nenhuma migration, importação de histórico, lote real, venda ou despesa foi
executada nesta homologação.
