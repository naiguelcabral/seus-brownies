# M44 — preparação segura da auditoria read-only das migrations

Revalidação de metadados: 16 de outubro de 2026 UTC. Estado:
`VALIDATION-BLOCKED-NO-READONLY-AUDIT`.

Este registro acrescenta evidência à M42; não a substitui. O conector Neon
continua administrativo e não foi usado para SQL, catálogo, journal, hashes ou
contagens. Esta missão não abriu conexão PostgreSQL externa, não leu `.env`,
DSN, senha, token, cookie ou secret, e não fez migration, backfill, seed,
backup, snapshot, restore, deploy ou mudança de Worker.

## GitHub revalidado

- `origin/main` e a árvore local estavam em
  `6eed5053dc9ae3f4d156440551f64c3acdb6b25e`, sem mudanças locais, staging
  ou operação Git pendente antes da M44.
- A PR #42, `docs(database): close migration external evidence gates`, está
  fechada e integrada nesse SHA.
- A CI de push pós-merge `38544956647` (workflow `CI`, tentativa 1) terminou
  `success` para esse SHA em 14 de outubro de 2026 UTC.
- A busca por PRs M43 e M44 não retornou mudança pendente a preservar no
  momento da consulta. O resultado não substitui a revisão do diff da PR M44.

## Inventário Neon somente de metadados

O MCP confirmou PostgreSQL 17 nos dois projetos e retenção de histórico de
21.600 segundos (seis horas) em ambos. A permissão efetiva deste MCP é
administrativa (`ADMIN`); essa capacidade **não** é autorização de auditoria
read-only. A API de permissões por projeto retornou lista vazia; isso não prova
propriedade, acesso externo, uso pelo Worker nem segurança de uma credencial.

| Projeto                | Branch / parent                              | Estado atual | Banco / owner nominal     | Roles listadas | Endpoint / estado                                   | Classificação atual           |
| ---------------------- | -------------------------------------------- | ------------ | ------------------------- | -------------- | --------------------------------------------------- | ----------------------------- |
| `cool-base-25902164`   | `production` / —                             | `archived`   | `neondb` / `neondb_owner` | `neondb_owner` | `ep-raspy-resonance-ac4rhkwk`, `read_write`, `idle` | produção — não acessar        |
| `cool-base-25902164`   | `development` / `br-empty-frog-acy6xycn`     | `archived`   | `neondb` / `neondb_owner` | `neondb_owner` | `ep-young-cloud-acftfl9s`, `read_write`, `idle`     | candidata HML, não comprovada |
| `steep-brook-51659857` | `production` / —                             | `ready`      | `neondb` / `neondb_owner` | `neondb_owner` | `ep-late-water-acahd1z1`, `read_write`, `idle`      | produção — não acessar        |
| `steep-brook-51659857` | `Development` / `br-lingering-wind-acwh5wap` | `ready`      | `neondb` / `neondb_owner` | `neondb_owner` | `ep-tiny-night-ac0pjhlr`, `read_write`, `idle`      | evidência insuficiente        |
| `steep-brook-51659857` | `g1-auth-hml` / `br-bitter-dew-ac31uci9`     | `ready`      | `neondb` / `neondb_owner` | `neondb_owner` | `ep-old-sound-acmcy3e9`, `read_write`, `idle`       | candidata HML, não comprovada |

As três branches de `steep-brook-51659857` mudaram de `archived` (M42) para
`ready`. `ready` descreve somente o estado de controle do Neon: não comprova
homologação, associação ao Worker, conteúdo, journal, backup, restauração ou
permissão de auditoria.

Nenhum snapshot foi listado em qualquer projeto. A configuração pública de rede
retornada em ambos foi: `allowed_ips.ips=[]`,
`allowed_ips.protected_branches_only=false`, `block_public_connections=false` e
`block_vpc_connections=false`. Isso é inventário de control plane, não prova
de exposição efetiva, backup ou possibilidade de recuperação.

## Gate de SQL externo

Permanece proibido executar SQL usando este MCP administrativo, inclusive
`SELECT`, `BEGIN READ ONLY`, catálogo, journal, hashes e agregados. Também
permanecem proibidos criar role, alterar grants, ownership, RLS, `PUBLIC`,
funções, branches, snapshots ou configuração.

Só promover este gate após o responsável fornecer uma credencial transitória
com ticket, responsável, validade curta e plano de revogação, cuja prova
sanitizada estabeleça todos os itens abaixo:

- role exclusiva de auditoria, diferente de `neondb_owner`, sem `SUPERUSER`,
  `CREATEDB`, `CREATEROLE`, `REPLICATION` ou `BYPASSRLS`;
- sem membership, herança gravável ou ownership de banco, schema, tabelas,
  sequences ou funções; sem `CREATE`, DML, `REFERENCES` ou `TRIGGER`;
- `default_transaction_read_only=on`, identidade/session role coincidentes e
  privilégios efetivos incluindo `PUBLIC` comprovadamente não mutáveis;
- destino comprovadamente HML, não produção, vinculado pelo operador e ainda
  dentro da validade no início e fim da auditoria.

Até então, o estado é exatamente `VALIDATION-BLOCKED-NO-READONLY-AUDIT`.

## Controles preparados e laboratório

O verificador `scripts/hml-evidence-verifier.mjs` é biblioteca sem driver,
rede, dotenv, CLI ou DSN. Antes de catálogo/journal, ele exige alvo aprovado,
abre `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, confirma a sessão e
verifica identidade, ownership, memberships, capacidades administrativas,
`CREATE`, DML/DDL, sequences, grants, funções, dados estrangeiros, large
objects, tablespaces e parâmetros. Agora também rejeita explicitamente
`neondb_owner`, mesmo se um chamador tentar apresentá-lo como role aprovada.

O coletor usa `search_path` local, timeout curto, `ROLLBACK` garantido, recusa
alvo de produção, relations não-planas/RLS e evidência ausente ou ambígua. Só
emite fingerprints/digests, estado de histórico e contagens agregadas
permitidas; exceções são reduzidas a estados estáticos. Não aceita DSN por
linha de comando porque não possui CLI de conexão.

O laboratório PostgreSQL 17 descartável permanece marcado `LAB-ONLY`: cria
`fixture_audit`, aplica apenas `USAGE`/`SELECT`, remove `TEMP` e mutadores de
large object herdados de `PUBLIC`, e prova falha de DML em `READ ONLY` e em
`READ WRITE`, grants de coluna, execução de função mutável, membership e
drift. Seu SQL não é instrução nem autorização para Neon.

Após o gate humano, o procedimento futuro coleta somente identidade e
privilégios efetivos, fingerprint sanitizado de banco/branch, catálogo e
colunas esperadas, journal Drizzle, hashes, sinais de parcialidade, objetos
esperados e as contagens agregadas permitidas. Ele não será executado nesta
missão.

## Worker → banco

O GET sanitizado do Cloudflare confirmou `cacau-v1-hml`, deployment
`8268b409-34bc-4881-9694-52c292da2da3`, versão
`e241b715-99bf-4a83-82ba-eef24fedadaa`, 100% do tráfego, e binding
`DATABASE_URL` de tipo `secret_text`. O valor do binding não foi lido,
exportado, usado em conexão ou registrado. Logo Worker → Neon continua
`unverified`; nome/tipo do binding não identifica a base.

## Backup e restauração — matriz pendente

| Base presumida            | Finalidade/classificação | Responsável     | Backup/retenção                                    | Último restore  | RPO/RTO         | Destino independente | Evidência exigida                           | Estado     |
| ------------------------- | ------------------------ | --------------- | -------------------------------------------------- | --------------- | --------------- | -------------------- | ------------------------------------------- | ---------- |
| cool-base / production    | produção presumida       | `PENDING-HUMAN` | snapshot nenhum listado; histórico 6h não é backup | `PENDING-HUMAN` | `PENDING-HUMAN` | `PENDING-HUMAN`      | política, ponto, retenção e restore isolado | unverified |
| cool-base / development   | HML apenas candidata     | `PENDING-HUMAN` | snapshot nenhum listado; histórico 6h não é backup | `PENDING-HUMAN` | `PENDING-HUMAN` | `PENDING-HUMAN`      | mesma evidência, finalidade confirmada      | unverified |
| steep-brook / production  | produção presumida       | `PENDING-HUMAN` | snapshot nenhum listado; histórico 6h não é backup | `PENDING-HUMAN` | `PENDING-HUMAN` | `PENDING-HUMAN`      | política, ponto, retenção e restore isolado | unverified |
| steep-brook / Development | finalidade desconhecida  | `PENDING-HUMAN` | snapshot nenhum listado; histórico 6h não é backup | `PENDING-HUMAN` | `PENDING-HUMAN` | `PENDING-HUMAN`      | origem, classificação e prova de restore    | unverified |
| steep-brook / g1-auth-hml | HML apenas candidata     | `PENDING-HUMAN` | snapshot nenhum listado; histórico 6h não é backup | `PENDING-HUMAN` | `PENDING-HUMAN` | `PENDING-HUMAN`      | mesma evidência, finalidade confirmada      | unverified |

`not-applicable` não se aplica a nenhuma linha enquanto a finalidade e a
retenção não forem comprovadas.

## Pacote objetivo para decisões humanas

**0019.** O Dono escolhe uma das alternativas: aprovar os oito literais
publicados somente prospectivamente; aprovar valores diferentes com fonte e
desenho corretivo posterior; ou manter bloqueado. Em todos os casos deve
registrar valor, unidade, moeda, precisão/arredondamento, vigência,
competência versus caixa, créditos, reversões, períodos fechados, ausências e
tratamento histórico. Recomendação técnica: parâmetros versionados,
prospectivos e fatos anteriores preservados. Risco das duas primeiras opções
sem fonte/vigência é distorcer margem, metas e relatórios; bloquear evita
invenção, mas mantém a cadeia parada.

**0028.** O Dono escolhe snapshot imutável do nome, referência dinâmica ou
bloqueio até haver fonte. Deve declarar linhas entre `0027`/`0028`, janela de
writers, renomeações, produtos inativos/excluídos, nomes ausentes e eventual
backfill com origem e idempotência. Recomendação técnica: snapshot imutável
comprovado na origem; nunca preencher nome histórico por inferência. Referência
dinâmica perde contexto histórico; backfill sem origem cria fatos falsos;
bloqueio preserva integridade, mas adia a evolução.

Nenhuma opção aprova os SQLs publicados, escrita externa ou aplicação da
cadeia `0017–0028` por si só.
