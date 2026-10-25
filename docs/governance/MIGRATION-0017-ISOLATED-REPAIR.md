# Reparo isolado da 0017 — 17 de outubro de 2026

## Original atualizada até 0028 — 17 de outubro de 2026

Usuário aceitou explicitamente o backup em branch no lugar do snapshot novo
recusado pela quota. Plano/valores `0019` e mix novo vazio `0028` já estavam
aprovados. Backup `br-morning-star-ac9j0kkh`, sem compute, e snapshot anterior
preservados; cópia `br-misty-surf-acbrzli5` mantida com compute suspenso/idle.

Preflight revalidou a original `br-lingering-wind-acwh5wap` como `production`,
primary/default, endpoint `ep-[redacted:26398d41]`, baseline exata de 17 recibos
e ausência de aplicação parcial. Lote ensaiado aplicado em transação única:
102 instruções principais mais locks e verificações de preservação/ORM,
148 instruções no total. SHA-256 do lote verificado:
`a6a7e3f77a9a7f48f984c4e61ff819c75d2e3cc8b4bc77fcfc98f542aaa17783`.

Conferência posterior READ ONLY às `2026-10-17T19:43:46.671Z`: **31 hashes e
timestamps idênticos** ao manifesto (29 migrations originais e duas pontes),
38 consultas ORM com LIMIT 0 aprovadas; todos os registros anteriores das
29 tabelas, nove linhas incluindo acessos/auditoria, preservados por digests
antes/depois e guard dentro da transação. Dono e Gerente permanecem ativos.

Catálogo independente da original coincide exatamente com cópia e laboratório:
SHA-256 `6832cef678c0a00c28f926fc75484ad8c6b1dd1e63a4cd29af4ff0dde30c7642`.
São 38 tabelas, 435 colunas, 152 constraints, 112 índices, 21 enums, duas
funções/dois triggers, 37 sequences e zero policies públicas. Configuração
financeira confere com a aprovação; mix novo tem zero linhas. Nenhuma data de
entrega antiga foi inventada e nenhum backfill ou importação foi executado.

Auth G1 mantém seu endpoint; original conserva nome/default/primary. Worker
HML segue em `1ea59a90-c289-4c99-bf8f-a0bbd82d6b37`, 100%, sem novo deploy,
secrets alterados ou flags diagnósticos ativos. Login público renderizado em
navegador anônimo. Usuário orientado a sair/entrar para confirmar o painel;
**a sessão protegida ainda aguarda confirmação humana**. Homologações reais de
venda/produção/FIFO/finanças continuam tarefas separadas.

Recibo final: `evidence/scoped-upgrade-execution-2026-10-17.json`.
A cadeia ativa versionada e seu preflight não foram modificados; a correção
localizada do alvo não encerra a classificação global da cadeia para outras
bases/novas instalações. Não reaplicar o lote nem resetar/apagar backups por
inferência. Em resposta incerta, conferir journal antes de qualquer ação.

## Atualização 0016–0028 — correção delimitada preparada

Continuidade autorizada para corrigir o painel após a liberação de acesso.
Preparado lote offline de 102 instruções, mantendo todos os SQLs e hashes
originais; ponte de compatibilidade corrige a `0017` dentro de uma transação.
Final esperado: 31 recibos (29 originais + dois da ponte), com schema completo
compatível com as 38 tabelas ORM. Não reescreve a cadeia ativa nem presume o
histórico de outras bases. `npm run db:migrate` e os gates globais permanecem.

Validação: 481 testes gerais, 26 cenários anteriores PostgreSQL 17 e cinco
casos novos aprovados, incluindo rollback, drift de hashes, aplicação parcial,
proteções de produto/idempotência e equivalência do catálogo com migrador
independente. Dinheiro, quantidades, acessos e auditoria preservados nas fixtures.
Tipos, lint e formatação aprovados. Nenhum SQL externo ou DDL nesta rodada.

Plano revisável em `SCOPED-UPGRADE-0016-0028-PLAN.md`, com payload exato,
consultas LIMIT 0 e evidências versionadas. Antes da aplicação: aprovar valores
iniciais da `0019`, mix novo vazio na `0028`, snapshot novo e restore em cópia
isolada com `finalize:false` explícito; somente após ensaio positivo aplicar
na original. Não promove branch nem muda endpoint, secret ou cadastro.
A autorização anterior até `0016` não cobre automaticamente esse pacote.

Estado: **VALIDATED-LOCAL / EXTERNAL-HISTORY-BLOCKED**. Continuidade da tarefa
#36 em `codex/migration-0017-isolated-repair`, derivada de `6e3493e`.
Não altera `drizzle/`, journal, snapshots, dados compartilhados ou permissões
externas. Não aprova aplicação, merge ou deploy.

## Causa e correção técnica

O schema SQL usa `products.measurement_unit` desde `0000`; `unit` é o nome
da propriedade TypeScript, não dessa coluna PostgreSQL. O SQL manual da
`0017_orange_the_hand.sql` usa `unit` três vezes: `NEW`, `OLD` e `UPDATE OF`.
O PostgreSQL 17 rejeita o trigger com `42703` e a transação não avança.

`corrected0017()` em `scripts/migration-chain-candidates.mjs` já produz a
correção candidata das três referências. A mudança desta rodada permite
testá-la isoladamente até `last: 17`, sem executar `0018–0028`, sem os defaults
financeiros da `0019` e sem a decisão sobre nomes históricos da `0028`.

O helper mantém a proteção original: alterações reais de tipo/unidade de um
produto usado são rejeitadas; renomeação e reenvio dos mesmos valores são
permitidos. Não há mudança de regra de negócio ou precisão.

Para revisar apenas o SQL candidato, sem abrir conexão nem gravar a cadeia:

```bash
node --input-type=module -e 'import { corrected0017 } from "./scripts/migration-chain-candidates.mjs"; process.stdout.write(corrected0017())'
```

Isso imprime SQL para revisão; não é comando de aplicação. O gerador de
candidatas também exige igualdade do manifesto de origem com a fixture
versionada e escreve exclusivamente em diretório temporário.

## Provas PostgreSQL 17

O runner existente agora passa **26 casos**, sendo oito novos de reparo
isolado: substituição e compatibilidade, a partir de `0016` e de base vazia,
com sucesso e falha injetada ao final. As três estratégias completas e as
reproduções negativas anteriores continuam cobertas.

Cada caminho isolado comprova:

- prefixo histórico `0000–0016` preservado, hashes e timestamps conferidos;
- catálogo final equivalente entre estratégias e reaplicação sem duplicação;
- valores legados de vendas, despesas, itens e estoque preservados;
- novos campos de idempotência/autoria legados permanecem nulos;
- ausência das tabelas financeiras e gerenciais posteriores à `0017`;
- rollback de catálogo e journal em instalação vazia e upgrade com dados;
- chaves não nulas repetidas rejeitadas com `23505` em despesas, compras e
  vendas, permitindo registros legados com chave nula;
- proteção `23514` para mudança de unidade, tipo e ambos simultaneamente em
  cada referência: movimento, item de compra, item de venda, alias de
  importação, item de receita, produto de perfil, embalagem de perfil,
  componente de perfil e saída de lote;
- atualização sem mudança de valores, renomeação e edição de produto sem
  referências continuam permitidas.

As fixtures são exclusivas de PostgreSQL local descartável, porta de loopback
5433, sem dotenv e sem uso de DSNs do ambiente. O container desta execução foi
`cacau-0017-repair-lab`, `postgres:17-alpine`, com credenciais sintéticas.
O runner exige confirmação explícita:

```bash
node scripts/test-migration-chain-disposable.mjs --ack-disposable-postgres17
```

Esse comando depende do serviço descartável definido no workflow
`.github/workflows/migration-chain-disposable.yml`. Não apontar a fixture para
Neon nem tratar o nome da branch como prova de segurança. Evidências locais
são emitidas em `/tmp/cacau-chain-evidence`; o workflow as arquiva como
artefatos sintéticos. O resumo sanitizado desta rodada está em
`evidence/migration-0017-isolated-2026-10-17.json`.

PostgreSQL documenta que `UPDATE OF` também dispara quando o valor atribuído
permanece igual; por isso o teste de no-op é necessário. Os erros deliberados
são recuperados por savepoint, e a fixture completa é revertida ao fim.
Referências: [CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html)
e [ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/17/sql-rollback-to.html).

## Evidência externa atualizada

Validação geral: `npm test` passou **464 testes**, `npm run typecheck`,
`npm run lint`, `npm run check` e `git diff --check` passaram. A primeira
execução restrita da suíte foi interrompida após `spawnSync git EPERM` nas
fixtures; a repetição autorizada fora dessa restrição passou integralmente.
O container descartável foi encerrado e removido após os 26 casos PostgreSQL.
`VITE_TURNSTILE_SITE_KEY=synthetic-public-key npm run build:ci-isolated`
passou no HEAD limpo `2e56e59`, com entrada pública sintética, sem dotenv ou
deploy. O build emitiu avisos não bloqueantes de sourcemap CSS e tempo de
plugins; isso não altera a prova SQL. CI remota não foi executada nesta rodada.

Somente as APIs de metadados Neon foram consultadas nesta rodada:

| Projeto | Branches | Estado retornado | Roles listadas | Snapshots no projeto |
| --- | --- | --- | --- | --- |
| `cool-base-25902164` | `production`, `development` | ambas `archived` | somente `neondb_owner` | 0 |
| `steep-brook-51659857` | `production`, `Development`, `g1-auth-hml` | todas `archived` | somente `neondb_owner` | 0 |

As três branches `steep-brook` estavam `ready` no registro M45; a API agora
retorna `archived`. Não foi solicitado despertar, restore ou modificação.
Esse estado não comprova banco vazio, ausência de migrations ou backup.
Nenhum SQL externo foi executado; Worker → banco continua sem nova atestação.

## Decisão técnica e próximo passo

### Alvo informado pelo operador — 17 de outubro, 13:32 UTC

O usuário informou nesta conversa que o Worker acessa o projeto
`steep-brook-51659857`, branch `br-lingering-wind-acwh5wap`, e forneceu a URL
JWKS pública do endpoint `ep-[redacted:26398d41]`. Essa declaração identifica
o alvo informado; não é autorização de escrita nem leitura do secret.

Os metadados MCP confirmaram independentemente:

- branch `production`, principal e padrão, estado `ready`;
- Neon Auth `better_auth`, branch exata e banco `neondb`;
- `jwks_url` cadastrado exatamente igual ao informado;
- roles listadas: `neondb_owner`, `authenticator`, `anonymous`, `authenticated`.
  Esses nomes não comprovam ACLs de auditoria somente leitura.

A API Cloudflare confirmou novo deployment HML `475d3a10-79e5-462d-aa70-1890afdee0a3`,
de `2026-10-17T13:25:50.059862Z`, versão
`d8673fd9-0c06-4caf-ae94-0a13ca7f2d94`, 100% do tráfego. A versão lista
`DATABASE_URL` como `secret_text`; somente nomes/tipos foram retornados.

Portanto, Worker → projeto/branch está **informado pelo usuário**; a associação
Auth → branch está **confirmada por metadados**. O destino SQL do runtime,
schema, journal, histórico compartilhado e recuperação ainda não receberam
prova técnica nesta rodada. A tentativa de abrir o JWKS pelo navegador de
pesquisa não foi suportada; não é evidência de indisponibilidade do serviço.

O alvo deixa de ser HML presumido: chama-se `production` e é a branch principal.
Não executar contra ele os coletores que recusam produção nem mudar sua
classificação para contornar a recusa. A próxima proposta deve delimitar a
auditoria desse alvo e seu acesso não gravável antes de qualquer SQL externo.
Não pedir novamente a identificação já fornecida; solicitar prova adicional
somente quando necessária ao gate específico. Não houve SQL, migration,
criação de role/grant, backup, restore, deploy ou alteração de secret.

A preferência permanece substituir as três referências da `0017` **somente
após comprovar que `0017+` não foi aplicada em nenhuma base relevante**.
Até isso, a candidata continua separada da cadeia ativa. Compatibilidade
também precisa de classificação prévia do histórico; não é um fallback para
alvo desconhecido. Nova linha consolidada continua indivisível até `0028`.

O reparo isolado reduz o escopo técnico da próxima proposta; não autoriza
aplicação parcial nem remove os gates da cadeia completa. `npm run db:migrate`
permanece um preflight offline bloqueado, sem conexão ou aplicação implícita.

O próximo passo externo é fornecer evidência delimitada, não repetir laboratório:

1. Usar a identificação já fornecida pelo usuário e delimitar a auditoria da
   branch principal `production`. O utilitário HML
   `scripts/hml-worker-destination.mjs` recusa produção; não o executar contra
   esse alvo nem alterar sua classificação. Uma comprovação adicional do
   destino SQL deve respeitar o escopo aprovado, sem revelar credenciais.
2. Responsável identifica backups, retenção e ensaio de recuperação e declara
   a abrangência de bases/cópias relevantes.
3. Aprova e disponibiliza acesso transitório estritamente read-only conforme
   `M45-EXTERNAL-AUDIT-GATES.md`; não enviar senha, DSN ou token na conversa.
   Os SQLs `.lab.sql` são de laboratório e não devem ser executados no Neon.
4. Sob autorização delimitada, coletar catálogo/journal/hashes, classificar
   histórico e só então preparar a alteração ativa apropriada para revisão.

`HUMAN-APPROVALS.md` exige concluir o trabalho reversível, registrar o gate e
não contorná-lo. A solicitação de resolver a cadeia autoriza esta preparação;
não fornece os fatos ausentes nem aprova manipular histórico desconhecido.
