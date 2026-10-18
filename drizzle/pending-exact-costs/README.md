# Pacote pendente — custos exatos

Gerado por Drizzle; **não aplicado**. Ver
[ADR-0002](../../docs/ADR-0002-CUSTOS-EXATOS-E-EXIBICAO-MONETARIA.md).

- `0029_exact_costs.sql`: oito colunas JSONB em sete tabelas.
- `0030_exact_operational_cost.sql`: uma coluna JSONB em custos operacionais.
- `meta/`: snapshots e journal candidatos gerados, somente para revisão.

As nove colunas são nullable. Não há backfill, remoção ou reescrita de fatos.
O journal candidato descreve a proposta do Drizzle, não o histórico efetivo
da original (que inclui pontes específicas). Não aplicar este journal à base.
Não mover arquivos para a cadeia ativa ou rodar `db:migrate` para este pacote.
Resolver o plano por alvo e preservar todos os recibos existentes primeiro.

Ensaio independente, exclusivamente em PostgreSQL 17 vazio e descartável na
porta local 5437, com credenciais sintéticas fixadas no próprio runner:

```sh
env -i PATH="$PATH" node --import tsx scripts/test-exact-costs-disposable.ts --ack-disposable-postgres17
```

O runner recusa banco não vazio, não procura credenciais locais e não acessa
Neon. Sua validação não autoriza migration ou deploy no ambiente compartilhado.
