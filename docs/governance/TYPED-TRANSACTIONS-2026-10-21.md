# S04 — contratos tipados de finanças e lifecycle — 21/10/2026

Seguimento: incremento integrado pelas PRs #52/#53 e publicado no HML em
21/10/2026. O texto abaixo preserva o checkpoint de preparação/validação.
[Publicação e limites](JOINT-HML-PUBLICATION-2026-10-21.md).

Incremento técnico preparado em branch própria, a partir de `32a0b11` da
PR #51. A revisão desta entrega compara com essa branch; integração e
publicação conjunta continuam separadas. S04 permanece parcial: a extração
dos módulos extensos e os contratos de Cenários ficam para incrementos próprios.

## Alteração

`src/db/contracts.ts` deriva os contratos do driver e schema usados por
`getDb`, com importação exclusivamente de tipo. Define consultas somente por
`select`, capacidades de transação `select`/`insert`/`update`/`execute` e
callback genérico que preserva o tipo de retorno. Não abre conexão nem
introduz outro driver. A restrição de capacidades é de compilação; não
substitui privilégios SQL, middleware ou isolamento do banco.

Finanças e os writers de lifecycle deixam de usar `any` explícito para banco,
transação e retorno. Seleções passam a inferir campos e nulabilidade do schema,
removendo casts redundantes. Mantida a asserção existente do ledger de crédito,
cuja enumeração é restringida pelo `WHERE` e não estreitada pelo compilador.
Consultas, locks, ordem das escritas, custos, referências e permissões foram
preservados.

No lifecycle, cinco resultados obrigatórios — venda, movimentos e camada —
usam `requireFirst`. Se não existirem, a operação falha dentro da transação
com erro controlado, sem desreferenciar um resultado ausente. Não há criação
de valores substitutos nem continuação de escrita incompleta.

O mock local continua um diário incompleto do ORM, com sua única adaptação de
tipo explícita no helper de testes. Não é prova de compatibilidade do driver:
essa conferência cabe ao laboratório com PostgreSQL real. O callback do mock
também preserva o retorno genérico, e suas asserções anteriores foram mantidas.

## Verificação

- Fixture de compilação incluída em `tsc` e Knip: rejeita dinheiro numérico,
  enum inválida, escrita pela fronteira de leitura, campo não selecionado,
  resultado de writer desconhecido e perda do retorno genérico da transação.
  A função da fixture nunca é executada nem conecta ao banco.
- Teste de correção financeira agora distingue resultado novo de replay antes
  de acessar a competência; a propriedade não existe no retorno de replay.
- Seis regressões de resultado ausente cobrem cancelamento, perda, ajustes
  positivo/negativo, camada não retornada e venda inexistente, com rollback.
- 60 testes focados de finanças/lifecycle e 566 testes Node completos
  aprovados, além de tipos, lint, formato e Knip (quatro achados contextuais
  conhecidos, nenhum novo). Build, ensaio conectado e CI registrados na PR
  após sua execução.

Sem mudança de schema, migration, fatos compartilhados, RBAC, credenciais ou
publicação. O incremento não conclui homologação real de perfis nem libera
operação. Referências: [roadmap](ROADMAP-CODEX.md),
[arquitetura](ARCHITECTURE.md), [workflow](DEVELOPMENT-WORKFLOW.md).
