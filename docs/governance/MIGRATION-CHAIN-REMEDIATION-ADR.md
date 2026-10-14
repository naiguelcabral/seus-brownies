# ADR — remediação da cadeia de migrations 0017–0028

Data: 14 de outubro de 2026 UTC. Estado: `proposed`, bloqueada para qualquer
ambiente compartilhado. Este ADR registra provas locais e não autoriza SQL,
DDL, DML, backfill, migration, deploy ou alteração de infraestrutura externa.

## Fato reproduzido

No PostgreSQL 17 descartável, a instalação oficial até `0016` cria
`products.measurement_unit` e não cria `products.unit`. A migration publicada
`0017_orange_the_hand.sql` referencia `NEW."unit"`, `OLD."unit"` e o gatilho
`BEFORE UPDATE OF ... "unit"`; por isso a cadeia oficial falha com SQLSTATE
`42703`. A transação do migrador foi revertida integralmente: journal e
catálogo ficaram no checkpoint `0016`, sem aplicação parcial. A prova usa
dados sintéticos, fica em `/tmp/cacau-chain-evidence` durante a execução e não
é evidência de nenhum banco externo.

O guard `npm run db:migrate` agora é offline e fail-closed. Ele não abre
conexão nem chama Drizzle, não carrega dotenv, não aceita DSN por argumento e
recusa credenciais no JSON de evidência. Enquanto a `0017` ativa conservar o
defeito, o código `ACTIVE_0017_DEFECT` bloqueia toda execução. Mesmo após uma
correção futura, exigirá identidade HML atestada, histórico exatamente até
`0016`, ausência de parcial, manifesto de hashes, backup/restauração, decisões
`0019` e `0028` aprovadas e autorização explícita do operador.

## Alternativas avaliadas somente em banco descartável

| Alternativa                                      | Prova local                                                                           | Vantagem                                                                               | Limite e risco                                                                                                                 | Estado                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| A — sequência de substituição a partir de `0016` | instalação vazia, upgrade de `0016`, reaplicação e rollback passaram                  | preserva a forma do journal de 29 entradas e corrige somente o identificador da `0017` | só é segura se todas as bases relevantes comprovarem não ter `0017+`, sem parcial; não pode substituir os arquivos publicados  | candidata preferida, não ativada   |
| B — compatibilidade anterior à `0017`            | cenários equivalentes passaram; variante sem recriar função falhou no uso com `42703` | torna explícita a ponte e a limpeza                                                    | renomeia coluna temporariamente, aumenta journal para 31 entradas e amplia risco de writer/rollback; a limpeza é indispensável | experimental, não recomendada      |
| C — linha corretiva reconstruída                 | cenários equivalentes passaram; journal de 18 entradas                                | uma única unidade para o trecho pendente                                               | altera a topologia do journal e exige certeza global de que nenhum histórico `0017+` existe                                    | experimental, não recomendada      |
| D — guard offline fail-closed                    | testes unitários e CLI aprovados                                                      | protege já a cadeia publicada sem alegar repará-la                                     | não recupera nenhuma base; requer decisão posterior                                                                            | implementada e pronta para revisão |

As candidatas preservam o diretório ativo `drizzle/`, hashes publicados,
snapshots e journal. Elas existem em diretórios temporários construídos por
`scripts/migration-chain-candidates.mjs`, com manifesto de origem pinado.

## Cenários que permanecem bloqueados

| Cenário                                                      | Tratamento atual                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| instalação nova ou banco exatamente em `0016`                | candidatos A/B/C comprovados somente em fixture descartável; aplicação externa proibida         |
| banco com histórico desconhecido, hash divergente ou parcial | preflight bloqueia; exigir auditoria independente antes de qualquer desenho de recuperação      |
| banco que possa ser produção                                 | preflight bloqueia; nenhum destino de produção é elegível                                       |
| `0019` sem decisão financeira                                | bloqueio `DECISION_0019_PENDING`                                                                |
| `0028` sem decisão de dados de cenário                       | bloqueio `DECISION_0028_PENDING`; mix sintético entre `0027`/`0028` reproduz `23502` e rollback |
| backup ou restauração não atestados                          | bloqueio `BACKUP_RECOVERY_UNATTESTED`                                                           |

## Recomendação condicionada

Não selecionar uma estratégia corretiva para ambiente compartilhado até obter
inventário revisado de todas as bases, cópias e restaurações; histórico e
catálogo de cada base com papel estritamente não gravável; atestação do destino
do Worker; backup e restauração ensaiados; e os dois aceites humanos. Se esse
inventário comprovar que todas as bases relevantes estão exatamente em `0016`,
a alternativa A deve receber um ADR de ativação separado, revisão de hashes,
plano de janela/rollback e autorização específica. Se houver `0017+`, parcial
ou divergência, a decisão deve ser fix-forward por estado observado, sem editar
ou falsificar journal publicado.

## Estado por migration

| Migration | Estado comprovado nesta missão                                                     |
| --------- | ---------------------------------------------------------------------------------- |
| 0017      | defeituosa na cadeia oficial; `42703` reproduzido localmente; bloqueada            |
| 0018      | SQL não executado pela cadeia oficial devido à 0017; dependente                    |
| 0019      | SQL analisado; valores publicados não aprovados; bloqueada por decisão humana      |
| 0020–0026 | SQL preservado, sem aplicação externa; dependentes da recuperação da cadeia        |
| 0027      | SQL analisado; dados externos entre 0027/0028 não comprovados; bloqueada           |
| 0028      | SQL falha com mix pré-existente em fixture (`23502`); bloqueada por decisão humana |

## Próximo passo permitido

O operador deve preencher a atestação sanitizada e obter uma auditoria privada
de leitura estrita. O Dono deve completar os formulários `0019` e `0028`. Só
então cabe uma revisão humana para escolher uma estratégia e autorizar um plano
externo delimitado. O próximo comando local seguro permanece:

```sh
npm run db:migrate
```

Ele deve terminar bloqueado enquanto a cadeia publicada permanece defeituosa.
