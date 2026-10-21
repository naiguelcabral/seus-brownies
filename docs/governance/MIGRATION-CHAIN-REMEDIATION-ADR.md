# ADR — remediação da cadeia de migrations 0017–0028

## Revisão T02 — 20 de outubro de 2026

**Linha adotada para preparação/revisão offline; aplicação compartilhada
continua bloqueada. Nenhuma cadeia ativa foi substituída.** A atualização
delimitada de 17/10 já aplicou os recibos antigos e duas pontes no alvo
autorizado; as extensões até `0033` também já foram aplicadas. Portanto, a
preferência histórica por substituir SQLs ainda não aplicados não pode ser
usada nesse alvo. Os estados antigos abaixo são evidência da investigação,
não descrição atual do HML.

`scripts/migration-chain-forward-candidate.mjs` compõe uma candidata temporária
com os 29 SQLs originais, as duas pontes de compatibilidade já ensaiadas e as
cinco extensões `0029–0033`, conservando hashes e timestamps. SQLs, journal e
snapshots de origem permanecem intactos. O classificador compara todos os
recibos, não apenas o maior timestamp (o migrador Drizzle sozinho não comprova
os hashes antigos). Aceita apenas os checkpoints completos da tabela abaixo.
Ele não conecta, não executa SQL e sempre retorna `application_authorized:false`.
Compatibilidade dos recibos exige ainda catálogo independente; journal vazio
ou ausente não prova banco vazio, nem ausência de aplicação manual/parcial.

| Origem da candidata | Recibos | Prova local até 0033 |
| --- | --- | --- |
| instalação vazia | 0 | instalação e reaplicação sem efeito |
| baseline exata 0016 | 17 | upgrade, preservação de dados e recibos |
| compatibilidade completa até 0028 | 31 | cinco extensões sem repetir a ponte |
| compatibilidade + 0029/0030/0031/0032 | 32/33/34/35 | continuação do prefixo exato |
| compatibilidade + 0033 | 36 | nenhuma migration nova |

Treze ensaios PostgreSQL 17 aprovados: oito origens, catálogo equivalente a
uma referência corrigida independente, hash divergente, aplicação manual
sem recibo, falha tardia com rollback integral de schema/journal/dados e
geração futura. A CLI Drizzle executou sem diff com o schema atual e gerou
uma migration aditiva sintética no índice 36, aplicada e reaplicada sem alterar
os 36 recibos anteriores ou os dados. A prova confere saída positiva e journal;
o exit code sozinho não basta para comprovar geração sem erro.
Todas as origens convergem para SHA-256 de catálogo
`b04d3ce50a8e8e2161522c7a5d3e77cbe508c8601bb266ceda7cdafe38268980`.
As 38 tabelas do ORM atual foram consultadas com LIMIT 0; proteções estruturais
de produtos e idempotência foram exercitadas. Os 26 ensaios anteriores da
cadeia, quatro de baseline auth e cinco de upgrade delimitado também passaram.
O ensaio delimitado passa agora a conferir todas as colunas do snapshot `0028`;
a compatibilidade com o ORM atual é exigida no ensaio novo até `0033`.

Com o serviço sintético de `.github/workflows/migration-chain-disposable.yml`
em loopback na porta 5433, reproduzir sem credenciais externas:

```sh
node --import tsx scripts/test-migration-chain-forward-disposable.mjs --ack-disposable-postgres17
```

O workflow executa esses casos e publica evidências exclusivamente sintéticas.
Resumo versionado: [recibo local](../../evidence/migration-chain-forward-2026-10-20.json).
O bootstrap estrutural preserva os defaults históricos da 0019; ele não
importa o catálogo, receitas, cenários ou a configuração operacional atual do
HML. Provisionamento de outra operação continua separado e rastreável.

Commit de código `c6d0bf8`, [PR #46 em rascunho](https://github.com/naiguelcabral/seus-brownies/pull/46).
CI `39412305542`, PostgreSQL `39412305442` e CodeQL `39412305514` aprovados.
As três análises de segurança retornaram zero resultados; zero alertas abertos
na consulta final. O build HML isolado local também passou, sem publicação.

### Adoção local e gates de aplicação compartilhada

Após “Pode continuar”, a linha com pontes foi adotada para preparação e revisão
offline pelo operador. `npm run db:prepare` monta o pacote temporário;
`npm run db:review -- --evidence evidence/<arquivo>.json` revisa metadados sem
abrir conexão. A candidata completa até 0033 inclui os snapshots originais até 0033,
mantém as lacunas históricas e comprova a continuidade de `drizzle-kit generate`
sem fabricar snapshots para as pontes. Hash do journal candidato e todos os
snapshots copiados são conferidos. A revisão exige seleção explícita da linha
e manifesto exato, sem falsificar recibos existentes.
Históricos sem pontes, checkpoints intermediários da ponte, hashes divergentes
ou objetos manuais exigem plano próprio por estado observado.

As oito referências versionadas em `migration-chain-forward-catalogs.json`
foram reproduzidas com o coletor independente no PostgreSQL 17 local. O digest
canônico ordena chaves JSON e conserva a ordem das linhas do coletor; portanto
é distinto do digest serializado registrado na evidência histórica acima.
No checkpoint 0033, o canônico é
`eaf0bdbe68314126ae27af14c1b01f5a7ecd5fd77859290a9b5e90d6fdcc17ec`.
A revisão exige catálogo completo, recibos exatos, alvo confirmado como HML e
vínculo do Worker atestado, coleta independente somente de leitura com até
30 minutos e recuperação/decisões apenas para as migrations pendentes. O alvo
original conhecido como produção é bloqueado mesmo se rotulado como HML.
Atestações JSON não comprovam por si a autorização: devem ser confrontadas
com os registros independentes do alvo. Resultados nunca habilitam execução.

Antes de qualquer aplicação compartilhada: manter o preflight bloqueante;
completar o inventário e catálogo independente dos alvos relevantes; definir
recuperação e obter autorização
específica para qualquer aplicação compartilhada. Aprovações de valores e de
mix vazio já usadas no alvo original não se estendem automaticamente a outra
base. Não reaplicar referências ou lotes históricos. Esta revisão não exige
deploy, mudança de aplicação, escrita no HML ou acesso ao Neon.

Data inicial: 14 de outubro de 2026 UTC. Revisão: 20/10/2026. Estado:
`accepted-offline-review-only`, bloqueada para qualquer aplicação em ambiente
compartilhado. Este ADR registra provas locais e não autoriza SQL,
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
