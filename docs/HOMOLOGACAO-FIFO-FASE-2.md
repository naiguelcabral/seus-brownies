# Homologação FIFO — fase 2

Este roteiro é um plano local e não autoriza conexão, migration, criação de
dados, deploy ou acesso a production. `0013_fifo_lifecycle.sql` foi revisada
estaticamente: é incremental após `0012`, não contém DML/backfill/HML/IDs ou
dados específicos e cria apenas estruturas de ciclo de vida FIFO.

## Restrições permanentes

- Nunca acessar, consultar, migrar ou alterar `production`.
- Nunca ler, imprimir, editar ou versionar `.env`/`.env.local`.
- Nunca usar Vite com `--debug`, nem fazer deploy, push, alterar secrets,
  Cloudflare ou infraestrutura.
- Preservar todos os artefatos Playwright somente em
  `/tmp/seus-brownies-playwright`.
- Não avançar um gate sem evidência verificável anexada ao relatório do gate.

## Pipeline de 10 gates

| Gate | Objetivo | Estado | Evidência ou condição de avanço |
|---|---|---|---|
| G0 | Working tree e revisão estática | concluído localmente | árvore preservada; código, schema, `0012` e `0013` revisados |
| G1 | Validações locais | concluído localmente | `npm test`, `npm run lint` e `npm run build` aprovados |
| G2 | Portabilidade da migration | concluído localmente | `0013` incremental, schema-only, sem HML/DML/backfill/IDs |
| G3 | Auditoria GET-only pré-migration | concluído | histórico `13`, schema lifecycle ausente; invariantes HML registrados |
| G4 | Aplicação única da migration | concluído | journal reparado; `npm run db:migrate` retornou código `0` |
| G5 | Auditoria GET-only pós-migration | concluído | runtime confirmou 14 migrations e schema lifecycle completo |
| G6 | Pré-checagem de cenário HML isolado | concluído | aprovação GET-only registrada em 2026-09-02 |
| G7 | Execução UI/Playwright de um cenário | concluído | um ajuste positivo autorizado e reconciliado |
| G8 | Reconciliação, idempotência e duplicidade | concluído (GET-only) | duplicidade e invariantes auditados; sem teste POST de idempotência |
| G9 | Fechamento, artefatos e rollback | concluído documentalmente | fatos comprovados de G7/G8 consolidados; nova escrita exige nova autorização |

### Evidência comprovada de G4/G5 — 2026-09-02

Após reparar o journal com a entrada `0013_fifo_lifecycle`, a aplicação única
de `npm run db:migrate` retornou código `0`. A auditoria runtime GET-only
posterior confirmou `14` registros em `__drizzle_migrations`,
`inventory_cost_reversals` presente, os dois enums, as quatro colunas de ciclo
de vida, `2` FKs, `2` checks, `2` índices e `2` unicidades. A tabela de
reversões tinha `0` linhas, comprovando que a migration não criou fatos de
negócio.

G6 foi aprovado, G7 executou o cenário autorizado e G8 o reconciliou somente
por GET. Esta aplicação não criou cenários FIFO, vendas, compras, devoluções,
perdas ou ajustes além do único ajuste positivo documentado na atualização
factual ao fim deste arquivo.

### Invariantes HML preservados

A leitura comprovou `2` camadas e `2` alocações FIFO existentes: camada `#1`
preservada em `12.000`/`45.33` original e `10.000`/`37.77` remanescente;
camada `#2` preservada em `6.000`/`22.67`; alocações `#1/#2` de
`1.000`/`3.78` ligadas aos movimentos `#20/#21`; vendas `#1/#2` confirmadas a
`12.00`; lote `#18` concluído com `18.000` e custo `68.00`. A auditoria também
confirmou `0` reversões.

## Checklists por gate

### G0--G2 — locais e estáticos

- Registrar `git status --short`, sem reverter mudanças de terceiros.
- Revisar README, AGENTS, schema, `0012`, `0013`, contratos, writers, UI e
  testes.
- Confirmar que `0013` é posterior a `0012`, não possui DML, HML, backfill ou
  IDs/dados de development e contém somente estrutura, FKs, checks, índices,
  unicidades e comentários.
- Anexar o diff e resultados de `npm test`, `npm run lint` e `npm run build`.

### G3--G5 — migration e auditoria GET-only

- G3: registrar histórico, catálogo, contagens e invariantes antes da escrita.
- G4: obter backup aprovado e confirmação humana de que o alvo é
  `development`; executar somente uma vez `npm run db:migrate`; registrar
  código de saída sanitizado.
- G5: usar rota temporária GET-only, development/loopback-only, sem payload e
  sem APIs Node; exigir 14 migrations, tabela/enums/colunas/FKs/checks/índices/
  unicidades presentes e zero reversões novas pela migration.
- Parar se a contagem do histórico, o schema ou qualquer invariante divergir.

### G6--G8 — cenários isolados

- G6: escolher um único prefixo da matriz, nunca reutilizar lote `#18`, vendas
  `#1/#2` ou suas alocações; registrar saldo/custo inicial e pré-condições.
- G7: Vite loopback isolado e um único Playwright do cenário; aguardar
  hidratação explícita, capturar console, requests, responses, trace, vídeo e
  screenshot em `/tmp/seus-brownies-playwright`; parar diante de POST extra,
  falha HTTP ou confirmação visual divergente.
- G8: reconciliar centavos e milésimos, movimentos, camadas, alocações,
  reversões, receita líquida, CMV, perdas, margem e estoque FIFO; replanejar ou
  repetir conforme contrato e provar ausência de duplicidade.

### Correção local da UI de ajuste positivo — 2026-09-02

A tela de estoque passou a exigir confirmação explícita antes de habilitar o
registro de ajuste positivo. O texto informa que a ação aumenta o estoque e
cria uma camada FIFO com o custo total e a origem declarados. A habilitação do
botão continua condicionada aos campos do contrato local (produto, quantidade,
custo total, origem, motivo e referência) e à confirmação; a confirmação não
é enviada ao writer e não altera a validação ou a autorização no servidor.

Cobertura local verifica a renderização do controle, o estado inicial
desabilitado, a confirmação ausente, os campos inválidos, o estado válido e a
preservação dos demais guards de formulários de estoque. Nenhum cenário G7 foi
executado por esta correção.

### G9 — fechamento e rollback operacional

- Anexar IDs reais, valores antes/depois, payload sanitizado e artefatos.
- Rodar novamente `npm test`, `npm run lint` e `npm run build`.
- Atualizar a documentação somente com fatos comprovados.
- Se houver divergência, parar writers/UI e retornar à versão anterior sem
  apagar migrations, fatos contábeis, alocações, reversões ou dados HML.

## Testes e auditorias preparados para gates posteriores

Os testes locais de contratos, planejadores e writers cobrem validação,
centavos, locks, rollback e duplicidade sem banco real. O helper de auditoria
FIFO tem descoberta de `__drizzle_migrations` nos schemas `drizzle` e `public`,
consultas independentes, erros sanitizados e classificação estrita
`aplicada`/`não aplicada`/`indeterminada`.

### Higiene de metadados Drizzle

O journal recebeu a entrada sequencial de `0013_fifo_lifecycle`. Os snapshots
de `0012` e `0013` continuam ausentes e exigem um plano próprio, revisado e
isolado antes da próxima execução de `drizzle-kit generate`. Eles não impedem
a aplicação da cadeia já existente, que é dirigida pelo journal e pelos SQLs;
não criar snapshots manualmente durante a homologação.

Para G3/G5, registrar temporariamente uma rota que apenas invoque a Server
Function GET-only `getFifoMigrationAudit`; removê-la e regenerar rotas no fim.
Para G6--G8, manter `e2e/fifo-lifecycle-scenarios.spec.ts` com casos
explicitamente ignorados até autorização do cenário, executando um único
`--grep` autorizado. Nenhum teste de cenário deve ser disparado em lote.

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

## Atualização factual — G7 e G8, 2026-09-02

G7 concluiu o único ajuste positivo autorizado para `PROD003`: `24.000`
unidades, custo total `R$ 60,48`, origem `Ficha Técnica — Receita Base`, motivo
`registro da fornada padrão` e referência `HML2-POS-G6-20260902`. Houve
exatamente um POST, HTTP `200`, sem POST extra. Foram criados o movimento `#22`
e a camada FIFO `#3`, origem `adjustment`, ambos com quantidade e custo
originais/remanescentes de `24.000` / `R$ 60,48`.

G8 concluiu somente por GET. A reconciliação confirmou saldo `34.000` de
`PROD003` (`10.000` da camada #1 e `24.000` da camada #3), um único movimento
com a referência autorizada, `3` camadas, `2` alocações e `0` reversões.
Camadas #1/#2, vendas #1/#2 e lote #18 foram preservados. `/estoque` e a
auditoria retornaram HTTP `200`, somente GET, sem falhas de requisição, banco,
console ou hidratação. Nenhum teste POST de idempotência foi executado.

G9 foi concluído documentalmente. Qualquer POST de idempotência continua
dependente de autorização explícita, referência nova e auditoria própria.
