# Atualização delimitada da original — 0016 até 0028

## Ensaio externo aprovado — aceite do método de backup pendente

Usuário aprovou o plano e os valores `0019`/mix novo vazio `0028`. Preflight
READ ONLY confirmou baseline exata `0016`, dois vínculos e sete eventos auth.
Criação do snapshot novo foi recusada: `snapshots limit exceeded` (422).
Snapshot antigo `snap-withered-poetry-achs77uu` permanece intocado.

Preparação reversível alternativa concluída, sem DDL na original: backup
`br-morning-star-ac9j0kkh`, sem compute, ancorado na original em LSN `0/1EA56F0`,
`2026-10-17T19:36:11Z`. Cópia privada derivada `br-misty-surf-acbrzli5`,
endpoint próprio `ep-bold-smoke-acrcoktt`, recebeu o lote de 102 instruções,
com locks e guards adicionais de preservação na mesma transação. São 148
instruções incluindo conferências; o SQL principal aprovado permanece idêntico.

Ensaio passou: 31 recibos, 38 consultas ORM com LIMIT 0, 29 tabelas antigas e
seus nove registros preservados por SHA-256, incluindo os dois acessos e a
auditoria. Catálogo tem SHA-256
`6832cef678c0a00c28f926fc75484ad8c6b1dd1e63a4cd29af4ff0dde30c7642`,
exatamente o laboratório independente: 38 tabelas, 435 colunas, 152 constraints,
112 índices, 21 enums, duas funções/dois triggers, 37 sequences e zero policies.
Baseline/digests anteriores da cópia coincidem com a original; clone a partir
do backup demonstrado. Nenhuma linha de negócio foi exportada.

Original reconfirmada com 17 recibos; `production` continua primary/default e
os endpoints original/G1 permanecem nas mesmas branches. Nenhum restore,
finalização ou realocação de endpoint foi executado. A tentativa de definir
suspensão automática da cópia foi recusada pela política da conta antes de
criar recursos; a cópia foi criada com os parâmetros permitidos, 0,25 CU.

Solicitado somente aceite da substituição do snapshot novo por backup em
branch preservado, mantendo o snapshot antigo. **Não aplicar na original até
essa resposta.** Valores financeiros já aprovados não exigem nova decisão.
Recibo e lote verificado em `evidence/scoped-upgrade-execution-2026-10-17.json`
e `evidence/scoped-upgrade-verified-batch-2026-10-17.json`.

Estado: **PREPARADO E VALIDADO LOCALMENTE; aplicação externa pendente**.
Solicitação de continuar a correção recebida após concessão de Dono/Gerente.
Não autoriza, por inferência, novos parâmetros financeiros ou DDL na principal.

## Problema e escopo

Worker HML `cacau-v1-hml` autentica em G1 e consulta o banco original
`steep-brook-51659857` / `br-lingering-wind-acwh5wap` / `neondb`, endpoint
`ep-late-water-acahd1z1`. O alvo SQL chama-se `production` e é principal/default;
nunca classificá-lo como HML para passar em guardas. Auth de G1 fica preservado.

A original foi inicializada até `0016`, com 17 recibos conferidos, e recebeu
somente os dois vínculos aprovados com auditoria. O schema atual da aplicação
inclui campos posteriores. O painel já depende de `products.reorder_point`,
das colunas novas de vendas e de `sales.delivered_at`, entre outros campos.
Não basta adicionar `delivered_at` isoladamente: é necessário reconciliar
estrutura, constraints, triggers e journal da sequência completa.

## Estratégia preparada

`scripts/migration-chain-scoped-payload.mjs` compila offline **102 instruções**
para uma única transação, a partir da candidata de compatibilidade já testada.
O lote mantém todos os SQLs/hashes originais e não altera `drizzle/`, seus
snapshots ou o journal versionado. O defeito global da cadeia ativa continua
pendente da classificação dos demais históricos; este é um reparo delimitado
ao alvo comprovado em `0016`.

1. Conferir banco, sessão gravável aprovada e os 17 hashes/timestamps exatos.
2. Recusar aplicação parcial, tabela posterior ou coluna de idempotência prévia.
3. Adquirir lock/advisory lock, com timeouts 60s por instrução e 5s por lock.
4. Renomear temporariamente `measurement_unit` para `unit` dentro da transação;
   executar a `0017` original e a sequência `0018–0028`, na ordem original.
5. Restaurar `measurement_unit` e substituir o corpo da função protetora pela
   versão corrigida. A aplicação não observa um schema intermediário commitado.
6. Registrar os 12 recibos originais novos e dois recibos explícitos da ponte.
   Final: **31 recibos**, dos quais 29 correspondem às migrations originais.
7. Verificar hashes/timestamps finais e ausência da coluna transitória `unit`.

O mecanismo preserva as nove proteções de produto usado e a idempotência das
três tabelas. Não executa importações, compensações, backfills de dinheiro ou
estoque, nem altera identidades, acessos, secrets, DNS ou o Worker de produção.
Datas de entrega antigas permanecem nulas; não se inventa competência histórica.

Artefato exato: [payload](evidence/scoped-upgrade-0016-0028-payload-2026-10-17.json).
SHA-256 do array de instruções:
`5ceff1d04b27db07800295e9f57a9f0d775e681f4ae0a0162d18dc11d2ff2711`.
O compilador não abre conexão nem executa SQL. `npm run db:migrate` permanece
bloqueado; não remover ou contornar suas validações/classificação de produção.
A execução proposta usa MCP explicitamente apontado ao alvo, após aprovação
específica, snapshot e ensaio positivo; não usa os coletores LAB-ONLY.

## Decisões para aprovação humana

A `0019` insere uma linha inicial de configuração, versão 1. Aprovar ou corrigir
os valores antes de aplicar o lote:

| Parâmetro | Valor do SQL publicado |
| --- | --- |
| Meta mensal de lucro | R$ 10.000,00 |
| Custos fixos mensais | R$ 2.200,00 |
| Dias de venda por mês | 20 |
| Semanas por mês | 4,00 |
| Tolerância normal de receita | 3% |
| Tolerância crítica de receita | 8% |
| Margem mínima, somente alerta | 70% |
| Reserva de taxas/impostos | 0% |

Esses valores não reescrevem fatos financeiros antigos. Não inferir vigência
histórica a partir do instante de criação da configuração. Se forem rejeitados,
preparar outra candidata e novos recibos/testes antes de aplicar; não editar
silenciosamente os SQLs históricos.

Para `0028`, aprovar **somente criação do mix novo vazio**. A tabela será
criada pela `0027` na mesma transação; nenhuma sessão externa consegue povoá-la
antes do NOT NULL da `0028`. Mix ou tabela posterior preexistente bloqueia a
aplicação. Nenhum nome histórico será deduzido de um cadastro atual.

## Plano externo delimitado — ainda não executado

1. Revalidar por APIs os endpoints, nomes, primary/default e versão do Worker.
   Conferir o journal sob READ ONLY e ausência de aplicação parcial, sem ler
   credenciais. Não tocar outras branches/projetos como consequência implícita.
2. Criar snapshot novo da original, incluindo as concessões/auditorias recentes,
   com expiração explícita de sete dias e nome exclusivo desta atualização.
3. Restaurar esse snapshot em cópia privada nova com **`finalize: false` explícito**,
   sem `target_branch_id`. Não chamar `finalize_branch_restore`, promover cópia,
   mover endpoints, trocar nomes/default ou restaurar dados sobre a original.
   Reconfirmar imediatamente que original e G1 preservam seus endpoints.
   Se a API não permitir esse isolamento, parar antes de DDL.
4. Revalidar baseline na cópia; aplicar o lote exato nela. Conferir journal,
   catálogo, as 38 consultas ORM com LIMIT 0 e preservação de linhas existentes
   por contagens/digests calculados no banco, sem exportar seu conteúdo.
   Conferir especialmente os dois vínculos e a auditoria já consumida.
5. Somente com ensaio positivo e aprovação condicional, revalidar a original e
   aplicar o mesmo lote em uma transação. Divergência não classificada bloqueia.
6. Conferir os 31 recibos, catálogo e consultas sem retornar linhas. Pedir novo
   login e validar painel/casos de acesso; homologação financeira/estoque real
   permanece separada, sem gerar operações comerciais artificiais.

Falha SQL reverte DDL e linhas do journal na transação. Gaps de sequence serial
podem permanecer; não resetar sequences para esconder tentativas revertidas.
Se houver resposta incerta da rede, verificar estado em READ ONLY antes de
qualquer nova ação. Lote reaplicado é rejeitado, não repetido automaticamente.
Depois do commit, não executar rollback destrutivo: eventual recuperação exige
decisão específica e usa a cópia/snapshot preservados. Não apagar recursos ao fim
por inferência. Nenhum secret ou deploy é necessário para essa atualização SQL.

## Provas locais

- 481 testes gerais aprovados; tipos, lint e formatação aprovados.
- 26 casos anteriores PostgreSQL 17 novamente aprovados, sem enfraquecer guardas.
- Cinco casos novos: upgrade completo, rollback tardio, hash divergente,
  aplicação parcial e equivalência com catálogo obtido por migrador independente.
- Consultas ORM das **38 tabelas** executadas com LIMIT 0 no schema atualizado.
- Valores monetários, quantidades, acessos, auditoria e marcador do schema
  gerenciado preservados; reaplicação bloqueada; migrador oficial posterior noop.
- Sources, snapshots e manifesto histórico permanecem intactos.

Resultados: [ensaios](evidence/scoped-upgrade-0016-0028-tests-2026-10-17.json).
Os testes não substituem snapshot, ensaio na cópia ou autorização da original.
