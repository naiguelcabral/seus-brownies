# Preparação para operação de produção — Cacau v1

Estado: **PREPARED**, 8 de outubro de 2026. Checklist documental, sem
homologação de ambiente ou autorização de produção. Cada execução humana
deve registrar responsável, instante UTC, commit, ambiente, resultado e
referência sanitizada da evidência. Não preencher uma etapa com base apenas
no nome de uma PR ou no sucesso de um teste local.

## Autoridade e gates

[HUMAN-APPROVALS.md](HUMAN-APPROVALS.md),
[BUSINESS-RULES.md](BUSINESS-RULES.md) e [SECURITY.md](SECURITY.md) prevalecem.
Merge, aplicação de migrations, alteração de secrets, escrita compartilhada
e deploy exigem as autorizações específicas. Este checklist não as concede.
Dados históricos e referências idempotentes consumidas permanecem preservados.

## Antes de liberar o fluxo

| Verificação         | Evidência esperada                                                                                                               | Estado inicial                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Versão de código    | Commit aprovado, PR revisada e CI correspondente; registrar eventual diferença entre código publicado e avaliado                 | NEEDS_HUMAN                                                   |
| Schema              | Migrations necessárias revisadas e autorização de aplicação por ambiente; introspecção somente leitura confirma a versão efetiva | READY leitura / NEEDS_HUMAN aplicação                         |
| Recuperação         | Responsável, ponto de recuperação, janela, RPO/RTO e ensaio aprovados conforme runbook de resiliência                            | NEEDS_HUMAN                                                   |
| Acesso              | Dono/Gerente autorizado, vínculo ativo e negações verificadas; não criar segundo Gerente para desbloquear teste                  | NEEDS_HUMAN                                                   |
| Receita e perfil    | Receita/versionamento, rendimento por perfil, unidades canônicas e produtos escolhidos conferidos pelo responsável               | NEEDS_HUMAN                                                   |
| Custos vigentes     | Taxas de energia/mão de obra e respectivos períodos revisados; insumos com custo físico rastreável                               | NEEDS_HUMAN                                                   |
| Integridade inicial | Estoque físico/razão, camadas FIFO e CMV reconciliados somente por leitura; divergências registradas sem correção automática     | READY diagnóstico / NEEDS_HUMAN conferência física e correção |
| Homologação de UI   | Prévia, rascunho, conclusão e histórico avaliados em cenário autorizado com referências inéditas                                 | NEEDS_HUMAN                                                   |

Testes locais de cálculos, FIFO, lifecycle e dinheiro são evidência de código.
Eles não confirmam schema aplicado, disponibilidade dos insumos ou o estado
atual do ambiente compartilhado.

## Conferência de cada lote

1. Confirmar receita e versão, perfil, data e quantidades/unidades das saídas.
   Não usar planejado como evidência de quantidade realizada.
2. Revisar a prévia de consumo: disponível, necessário e insumos insuficientes.
   A prévia é informativa; o saldo pode mudar antes da conclusão e deve ser
   revalidado na transação.
3. Conferir custo dos insumos pelo método físico existente e custos produtivos
   de energia/mão de obra. Estes integram o custo realizado do lote e não são
   novamente descontados na margem do produto final.
4. Conferir saídas principais e coprodutos. Bordinhas é coproduto, nunca perda
   automática. Perda manual requer quantidade, produto e motivo auditáveis.
5. Confirmar o lote explicitamente uma única vez. Se houver timeout ou resposta
   ambígua, consultar o estado antes de tentar novamente; não reutilizar uma
   referência consumida nem presumir rollback pelo erro de rede.
6. Após conclusão, conferir status, saídas realizadas, consumos, perdas,
   custos operacionais, custo total e alocação dos custos. Registrar lacunas
   como divergência, sem completar fatos por suposição.

## Invariantes a homologar

| Invariante aprovada | Evidência de aceite                                                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Conclusão única     | Segunda tentativa autorizada não duplica lote, movimento, custo, camada ou auditoria                                                         |
| Atomicidade         | Falha de uma escrita impede confirmação parcial; ensaio somente em fixture/local ou ambiente explicitamente autorizado                       |
| Insumo suficiente   | Saldo insuficiente impede conclusão e não produz efeitos parciais                                                                            |
| Alocação de custo   | Custos alocados das saídas fecham exatamente com o custo realizado; unidade e precisão seguem o schema                                       |
| Saída × FIFO        | Camada do produto final identifica origem auditável e preserva quantidade/custo alocado da saída                                             |
| Venda × camada      | Alocação FIFO por item mantém vínculo e CMV rastreáveis; cancelamento pré-entrega restaura, compensação pós-entrega não retorna alimento/CMV |
| Trilhas             | Fatos originais, motivos e auditoria permanecem disponíveis; ausência de schema/auditoria não simula sucesso                                 |

Os testes existentes em `test/production-calculations.test.ts`,
`test/inventory-fifo.test.ts` e testes transacionais/lifecycle de estoque
apoiam a revisão local. Cobertura de funções puras não substitui ensaio da
composição completa de conclusão com rollback. Essa diferença deve ficar
explícita no registro de homologação.

## Incidente e decisão de liberação

Se houver divergência de estoque, dinheiro, custo, idempotência ou auditoria,
preservar IDs e códigos sanitizados, registrar o impedimento e impedir a
declaração de homologação. Não editar saldo, limpar HML, repetir importação ou
aplicar backfill para fechar o checklist.

Recuperação segue [OPERATIONS-RESILIENCE-RUNBOOK.md](OPERATIONS-RESILIENCE-RUNBOOK.md).
Responsável humano decide a liberação; registrar **APROVADO**, **REJEITADO**
ou **PENDENTE**, com pendências e autorizações específicas. Nenhuma decisão
desse checklist foi executada nesta rodada.

Modelo de evidência (sem dados pessoais ou credenciais):

```text
EXECUTION_ID:
RESPONSIBLE:
UTC:
ENVIRONMENT:
COMMIT:
SCHEMA_EVIDENCE:
CHECK:
RESULT:
DIVERGENCE_CODES:
SANITIZED_EVIDENCE_REFERENCE:
HUMAN_APPROVAL_REFERENCE:
NEXT_SAFE_ACTION:
```
