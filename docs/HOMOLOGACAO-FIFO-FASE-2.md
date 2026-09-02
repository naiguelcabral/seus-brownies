# Homologação FIFO — fase 2

Este roteiro é um plano local e não autoriza conexão, migration, criação de
dados, deploy ou acesso a production. `0013_fifo_lifecycle.sql` foi revisada
estaticamente: é incremental após `0012`, não contém DML/backfill/HML/IDs ou
dados específicos e cria apenas estruturas de ciclo de vida FIFO.

## Gates

**Gate 1 — fechado.** Não conectar a `development`, aplicar `0013` ou criar
dados até autorização explícita para migration.

**Gate 2 — fechado por cenário.** Depois da migration, cada cenário requer
autorização própria. Não avançar enquanto a reconciliação do anterior não for
aprovada. Nunca reutilizar lote HML `#18`, vendas `#1/#2` ou suas alocações.

## Pré e pós-auditoria de migration

Antes de `npm run db:migrate`, registrar em relatório somente leitura:

- target confirmado como `development`, backup lógico aprovado e SHA da revisão;
- migrations aplicadas, enums/tabelas/colunas ausentes, FKs/checks/índices e
  unicidades previstos;
- contagens e totais de `stock_movements`, camadas e alocações existentes;
- amostra imutável de saldo/valor FIFO, incluindo os fatos HML protegidos.

Após aplicar **somente** `npm run db:migrate`, repetir a auditoria e exigir:

- `inventory_cost_layer_origin`, `inventory_cost_allocation_event_type`,
  colunas `origin`, `event_type`, referências de evento e
  `inventory_cost_reversals` presentes;
- FKs `RESTRICT`, checks `quantity > 0`/`restored_cost >= 0`, índices e
  unicidades de `0013` presentes;
- zero linhas novas nas tabelas de negócio e totais pré/pós idênticos;
- `npm test`, `npm run lint` e `npm run build` aprovados novamente.

## Matriz isolada de cenários

Todos os prefixos abaixo são exclusivos e devem ser usados em `source_key`,
referência e notas. Criar somente o conjunto mínimo de compra/produção/venda
necessário por UI real, depois capturar os IDs reais no relatório.

| Cenário | Prefixo | Dados iniciais mínimos | Esperado | Parar se |
|---|---|---|---|---|
| Cancelamento integral | `HML2-CANCEL-<run>` | produto final novo, camada `4.000`/`R$ 10,01`, venda confirmada `2.000` | movimento `return` `+2.000`, reversões das alocações da venda; camada volta a `4.000`/`10,01`; venda cancelada | qualquer fato original for editado ou total não reconciliar |
| Devolução parcial | `HML2-RETURN-PART-<run>` | camada `3.000`/`R$ 7,00`, venda `2.000` | retorno `1.000`, custo proporcional em centavos, saldo/custo restaurados só na alocação original | retorno exceder disponível ou custo não fechar |
| Devolução total | `HML2-RETURN-FULL-<run>` | camada `2.000`/`R$ 5,01`, venda `2.000` | retorno total, camada volta ao original e CMV líquido da venda zera | reversão não apontar à alocação original |
| Devolução acima do permitido | `HML2-RETURN-OVER-<run>` | venda com parte já devolvida | erro específico; zero movimento/reversão/camada adicional | houver commit ou saldo mudar |
| Perda multicamada | `HML2-LOSS-MULTI-<run>` | duas camadas `1.000`/`1,00` e `2.000`/`3,01` | saída `2.000`, duas alocações FIFO, CMV/perda `R$ 2,51`; remanescente na segunda | ordem, centavos ou saldo divergirem |
| Ajuste negativo | `HML2-NEG-<run>` | camada positiva isolada | movimento `adjustment` negativo e alocação `adjustment_negative` | motivo/referência ausente ou camada negativa |
| Ajuste positivo | `HML2-POS-<run>` | produto isolado | movimento positivo e camada `adjustment` com custo/origem explícitos | custo/origem não forem preservados |
| Repetição idempotente | mesmo prefixo do cenário | cenário anterior reconciliado | erro/`noop` sem novos fatos | qualquer nova linha aparecer |
| Falha transacional | `HML2-FAIL-<run>` | cenário com falha induzida autorizada | rollback completo, sem commit nem mutação parcial | houver movimento, alocação ou reversão parcial |
| Duplo clique UI | `HML2-DOUBLE-<run>` | cenário de saída isolado | um único POST efetivo/uma transação; botão fica pendente | mais de uma mutation for criada |

Antes/depois de cada cenário, guardar: IDs, quantidade/custo original e
remanescente de cada camada, movimentos, alocações, reversões, receita bruta,
descontos/devoluções, receita líquida, CMV, perdas, margem e estoque FIFO.
Dados HML ficam preservados como trilha auditável; não apagar dados de teste.

## Playwright e auditoria técnica

`e2e/fifo-lifecycle-scenarios.spec.ts` fica fora de `npm test`. Execute apenas
um cenário autorizado com `--grep` do nome do cenário, Vite isolado em
`127.0.0.1` e diretório de saída `/tmp/seus-brownies-playwright`. O teste deve
aguardar o marcador de hidratação, registrar console/requisições/respostas,
trace/vídeo/screenshot e falhar diante de POST extra ou resposta não exitosa.
Os casos vêm intencionalmente com `test.skip(true)` enquanto o Gate 2 estiver
fechado; remova-o apenas no caso autorizado, mantendo todos os demais fechados.

`scripts/audit-fifo-lifecycle-runtime.ts` aceita explicitamente uma URL de
runtime e de endpoint de auditoria somente leitura; não lê arquivos de ambiente
nem abre conexão própria. Os endpoints futuros devem retornar dados
sanitizados de schema, camadas, alocações, reversões, movimentos e relatórios.

## Consultas exigidas no endpoint read-only

- catálogo: migrations, enums, tabelas, colunas, FKs, checks, índices e
  unicidades de `0013`;
- fatos: camadas, alocações, reversões, movimentos e seus vínculos;
- reconciliação: soma de reversões por alocação não excede quantidade/custo
  alocado; nenhuma camada possui quantidade/custo negativo ou maior que o
  original;
- resultados: receita, devoluções, receita líquida, CMV, perdas, margem e
  estoque por custo remanescente;
- duplicidade: `source_key`, pares camada/movimento e pares
  alocação/movimento de retorno únicos.

## Rollback operacional

Se houver divergência: parar a execução, preservar artefatos e IDs, desativar
as ações de lifecycle/UI e reimplantar a versão anterior. Não apagar migrations,
movimentos, alocações, reversões ou dados HML. Corrigir e repetir somente em um
novo prefixo/cenário após autorização.
