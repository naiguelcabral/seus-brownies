# Workflow de desenvolvimento — Cacau v1

## Branches

- `main`: estado integrado e revisado.
- Trabalho de agente/humano deve ocorrer em branch dedicada.
- Padrões recomendados:
  - `feat/<escopo>`
  - `fix/<escopo>`
  - `docs/<escopo>`
  - `codex/<escopo>`

## Antes de começar

1. Ler `AGENTS.md`.
2. Ler `docs/governance/PROJECT-STATUS.md`.
3. Ler `docs/governance/ROADMAP-CODEX.md`.
4. Ler `ARCHITECTURE.md`, `SECURITY.md` e `BUSINESS-RULES.md` conforme a tarefa.
5. Ler `docs/governance/CODEX-USAGE-POLICY.md`.
6. Verificar `git status`.
7. Consultar o estado de uso do Codex quando disponível (`/status` na CLI ou `Settings → Usage` no app/web).
8. Não usar `.env` como fonte de contexto.

## Durante a tarefa

- Manter escopo pequeno.
- Não misturar refactor não relacionado com feature/fix.
- Preferir funções de domínio testáveis.
- Toda alteração crítica de estoque, dinheiro, produção ou idempotência precisa de teste.
- Não executar `npm run desligar`/`./DESLIGARTUDO` automaticamente durante trabalho normal, porque o script cria commit/sincroniza Git.
- Exceção obrigatória: ao atingir 5% restante ou menos, em branch de trabalho e após fechar o handoff, executar `./DESLIGARTUDO` conforme `CODEX-USAGE-POLICY.md`.
- Nunca executar o encerramento automático na `main`.
- Em tarefas longas, registrar o consumo de Codex nos checkpoints sempre que o produto disponibilizar o dado.
- Ao atingir 5% restante ou menos da franquia relevante, não iniciar novo trabalho; fechar checkpoint seguro, executar o encerramento controlado e pausar.
- Só retomar no horário de reset exibido pelo Codex ou depois dele, após confirmar a renovação da franquia; preferir 100% quando esse percentual for exibido.
- Não afirmar que haverá retomada automática se nenhuma Automation do Codex estiver configurada.

## Verificações padrão

Executar conforme aplicabilidade:

```bash
npm test
npm run lint
npm run typecheck
npm run check
npm run knip:check
```

Quando a alteração exigir build, em HEAD versionado e árvore limpa use um dos
procedimentos isolados, com chave Turnstile pública de teste explícita:

```bash
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:hml
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build:ci-isolated
```

Escolha HML para conferir o alvo HML e CI isolado para o build da main, conforme
o workflow da CI. Ambos usam `git archive` do HEAD e ambiente limpo. O comando
interno `npm run build` não deve substituir essa validação no checkout que
contém arquivos locais de ambiente. Esses comandos não publicam; deploy exige
autorização específica e chave pública real do alvo. Para revisão somente de
Markdown, use conferência de links/diff; não repita build ou suíte sem mudança
de código/contrato que justifique.

O runtime local e de CI é Node 22 (mínimo `22.12.0`, menor que 23), fixado em
`.nvmrc`. Instale dependências exclusivamente com `npm ci` nos ambientes de
verificação; atualizações de versões seguem revisão separada, sem `npm update`
por conveniência.

O typecheck usa exclusivamente `typescript@7.0.2`, sem alias de compatibilidade
com TS 6. O override de TypeScript mantém também os peers transitivos na versão
7.0.2; o teste de toolchain verifica essa propriedade no lockfile.

`npm run lint` executa Oxlint com informação de tipos e bloqueia avisos;
`npm run lint:fix` aplica somente as correções padrão do linter. `npm run format`
usa Oxfmt e `npm run check` verifica a mesma seleção explícita de código,
testes, scripts, workflows e configurações. A CI executa lint, check e typecheck
separadamente. Migrations, dados importados, evidências geradas e documentação
histórica ficam fora da formatação automática. Os ignores não substituem as
verificações de integridade desses artefatos.

Configurações em `.oxlintrc.json` e `.oxfmtrc.json`; critérios e diferenças de
cobertura em [TYPESCRIPT-7-OXC-MIGRATION.md](TYPESCRIPT-7-OXC-MIGRATION.md).

O [balanço de 17/10/2026](ATUALIZACOES-E-PENDENCIAS-2026-10-17.md) distingue
esta branch da main ainda em TS 6 e da PR informativa de tooling. Não substituir
as regras tipadas locais por configs informativas ao integrar Knip/CodeQL.
O piloto ainda contém uma instrução ativa de Prettier; reconciliá-la e testar
o controlador antes de usá-lo para executar a migração de procedimentos.

Knip executa análise completa com `knip:audit`/`knip:report`; `knip:check` é o
gate da CI contra mudanças não revisadas da baseline. Relatório não zero pode
conter as três referências contextuais revisadas (48 ocorrências iniciais
triadas, 45 resolvidas); não usar `--fix` nem regenerar a baseline para
ocultar uma regressão. Remover entradas resolvidas junto com a correção.
CodeQL cobre JS/TS, Python e Actions em jobs próprios. Consulte
[KNIP-CODEQL.md](KNIP-CODEQL.md) para cobertura, limites e triagem.

O compilador exige `exactOptionalPropertyTypes` e `noUncheckedIndexedAccess`,
inclusive nos testes/scripts. Declare ausência explicitamente; não acrescente
`!` ou casts para contornar os diagnósticos. Em resultados obrigatórios,
`requireDefined`/`requireFirst` falham de forma controlada; resultados opcionais
devem conservar seu contrato de ausência. O lint também verifica pureza,
imutabilidade, refs e atualizações síncronas de estado em efeitos React.

`npm run test:e2e` deve ser usado quando o fluxo exigir homologação E2E e o ambiente estiver autorizado. Testes que escrevem em base compartilhada exigem atenção às regras de HML e referências idempotentes.

## Migrations

A linha `forward-compatibility-v1` está adotada para **preparação e revisão
offline**, preservando todos os SQLs, snapshots, hashes e timestamps publicados:

```bash
npm run db:prepare
npm run db:review -- --evidence evidence/<metadados-sanitizados>.json
```

O primeiro comando cria um diretório temporário com pacote e manifesto para
inspeção; sua remoção posterior cabe ao operador. O segundo aceita apenas JSON
regular de até 1 MB dentro de `evidence/`, sem caminho oculto, URL ou link
simbólico final. Não incluir dados pessoais, credenciais, strings de conexão
ou conteúdos operacionais. Não converter os exemplos sintéticos dos testes
em evidência de um alvo real.

Contrato de entrada (`test/migration-chain-readiness.test.ts` demonstra somente
fixtures): `line`, `candidate_journal_sha256`, `environment`; `target` com
`project_id`, `branch_id`, `database_name`, `classification` e
`worker_binding_verified`; `collection` com `source:'independent-catalog'`,
`independent:true`, `read_only:true` e `collected_at`; `receipts` com os hashes
e timestamps realmente coletados; `catalog` com todas as nove seções de
`migration-chain-catalog.mjs`. Recuperação atestada em `backup.verified` e
`backup.restore_tested` só é exigida se houver recibos pendentes. Decisões
`decisions.migration_0019`/`migration_0028:'approved'` só são exigidas quando a
respectiva migration estiver pendente; a 0028 também exige confirmação
`scenario_mix_preexisting:false`.

A coleta deve ser independente, somente de leitura e ter até 30 minutos na
avaliação. O alvo deve estar confirmado como HML e vinculado ao Worker; o
identificador original conhecido como produção é recusado mesmo com outro
rótulo. O digest canônico do catálogo completo deve coincidir com o checkpoint
reproduzido em `test/fixtures/migration-chain-forward-catalogs.json`. A ordem
de chaves JSON não interfere; a ordem das linhas segue o coletor ordenado.
Atestações no arquivo são material de revisão, não autenticação nem prova
autossuficiente de autorização. Cabe confrontá-las com a coleta e os registros
do alvo real, sem copiar credenciais para o arquivo.

`READY_FOR_OPERATOR_REVIEW` **não autoriza aplicação**: todos os resultados
mantêm `application_authorized:false` e `execution_enabled:false`. Nenhum dos
comandos conecta ou aplica SQL; `db:migrate` conserva o preflight bloqueante
anterior. Qualquer aplicação compartilhada exige plano próprio, classificação
independente, recuperação e autorização específica. Detalhes no
[ADR da cadeia](MIGRATION-CHAIN-REMEDIATION-ADR.md).

- Alterar `src/db/schema.ts`.
- Gerar migration versionada.
- Ler o SQL gerado.
- Registrar impacto.
- Não aplicar automaticamente em ambiente com dados relevantes se houver qualquer risco de transformação destrutiva.
- Evitar `db:push` como substituto de migration auditável.

## Commits

Usar mensagens semânticas e descritivas.

Exemplos:

```text
feat(auth): add session middleware
fix(inventory): prevent duplicate fifo allocation
test(production): cover insufficient stock rollback
docs(governance): update codex roadmap
refactor(reports): extract margin aggregation
```

Evitar mensagens genéricas como `S`, `s`, `update` ou `fix` sem contexto.

## Pull request

O PR deve conter:

- objetivo;
- escopo alterado;
- migrations, se houver;
- testes executados;
- riscos;
- gates humanos pendentes;
- impacto operacional.

## Checkpoint de uso do Codex

Quando disponível, usar o formato:

```text
Uso Codex
- restante: XX%
- reserva do projeto: 5%
- reset exibido: AAAA-MM-DD HH:MM TZ
- estado: trabalhando | encerrando | pausado por reserva | retomado
```

Se o produto não fornecer percentual exato, registrar somente o indicador real exibido. Não estimar ou inventar percentual.

## Regra para o Codex

O agente pode preparar branch, código, testes, documentação, commit e PR quando autorizado. Merge, deploy, escrita crítica em ambiente compartilhado ou qualquer gate listado em `HUMAN-APPROVALS.md` permanece humano.

A política de reserva em `CODEX-USAGE-POLICY.md` é obrigatória para trabalhos prolongados: os últimos 5% são destinados a fechamento seguro, documentação, handoff e `./DESLIGARTUDO`, não a expansão de escopo.
