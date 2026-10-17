# Reparo isolado da 0017 — 17 de outubro de 2026

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
Build isolado do commit preparado continua como última verificação local.

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

A preferência permanece substituir as três referências da `0017` **somente
após comprovar que `0017+` não foi aplicada em nenhuma base relevante**.
Até isso, a candidata continua separada da cadeia ativa. Compatibilidade
também precisa de classificação prévia do histórico; não é um fallback para
alvo desconhecido. Nova linha consolidada continua indivisível até `0028`.

O reparo isolado reduz o escopo técnico da próxima proposta; não autoriza
aplicação parcial nem remove os gates da cadeia completa. `npm run db:migrate`
permanece um preflight offline bloqueado, sem conexão ou aplicação implícita.

O próximo passo externo é fornecer evidência delimitada, não repetir laboratório:

1. Operador confirma privadamente o destino do Worker com
   `node scripts/hml-worker-destination.mjs`, sem gravação de terminal, e
   entrega somente JSON sanitizado, versão ativa, responsável e UTC.
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
