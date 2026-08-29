# Homologação — produção real

Este roteiro não aplica migrations nem grava no Neon. Execute-o somente depois
de revisar e autorizar `0008_high_rumiko_fujikawa.sql` e
`0009_lethal_pyro.sql` no ambiente de homologação correto.

## Revisão das migrations

- `0008` é incremental sobre `0007`: cria o papel de saída de lote, adiciona
  `draft` ao enum de status e inclui os instantâneos necessários para custo,
  tarifa e conclusão. As novas colunas são nulas ou têm `default`, portanto os
  registros históricos `PLAN` permanecem válidos.
- `0009` torna obrigatório o motivo de perda. É compatível com os registros
  importados porque não há perdas históricas; antes de aplicar em qualquer base
  divergente, confirme que não existam linhas com `reason IS NULL`.
- A reversão não é automática na prática: valores adicionados a enum do
  PostgreSQL e colunas já preenchidas exigem migration corretiva planejada.
  Faça backup/branch do Neon e teste em homologação antes de produção.

## Checklist de homologação

1. Confirmar que as migrations até `0007` e os dados de referência existem.
2. Aplicar `0008` e `0009` somente na base de homologação autorizada.
3. Registrar uma compra com ingrediente, recheio e embalagem; conferir as
   entradas e o saldo calculado no razão de estoque.
4. Criar um lote em rascunho e confirmar que nenhum movimento/custo foi criado.
5. Concluir o lote e verificar, na mesma operação:
   - baixa de receita-base, recheio e embalagem;
   - entrada de produtos finais;
   - entrada de Bordinhas como `co_product`, nunca como perda;
   - custo médio aplicado aos consumos;
   - custos de energia e mão de obra com tarifa vigente, fora do estoque.
6. Registrar venda confirmada/paga e conferir baixa de estoque; testar rascunho
   e cancelamento sem baixa.
7. Registrar despesa e confirmar sua presença no relatório do período.
8. Exercitar falhas e confirmar reversão total, sem movimentos parciais:
   - saldo insuficiente;
   - rendimento acima do multiplicador;
   - Bordinhas diferente do saldo sem perda declarada;
   - perda sem motivo;
   - segunda tentativa de concluir o mesmo lote;
   - erro induzido entre consumo e saída, em uma base descartável.

## Evidência a registrar

Para cada cenário, anote ID do lote/compra/venda, saldo antes e depois,
movimentos criados, tarifas aplicadas e mensagem de erro quando aplicável.
Não inclua strings de conexão, tokens ou outros segredos na evidência.
