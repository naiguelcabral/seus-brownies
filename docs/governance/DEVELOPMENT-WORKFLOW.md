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
5. Verificar `git status`.
6. Não usar `.env` como fonte de contexto.

## Durante a tarefa

- Manter escopo pequeno.
- Não misturar refactor não relacionado com feature/fix.
- Preferir funções de domínio testáveis.
- Toda alteração crítica de estoque, dinheiro, produção ou idempotência precisa de teste.
- Não executar `npm run desligar` automaticamente porque esse script pode realizar commit/sincronização.

## Verificações padrão

Executar conforme aplicabilidade:

```bash
npm test
npm run lint
npm run build
npm run check
```

`npm run test:e2e` deve ser usado quando o fluxo exigir homologação E2E e o ambiente estiver autorizado. Testes que escrevem em base compartilhada exigem atenção às regras de HML e referências idempotentes.

## Migrations

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

## Regra para o Codex

O agente pode preparar branch, código, testes, documentação, commit e PR quando autorizado. Merge, deploy, escrita crítica em ambiente compartilhado ou qualquer gate listado em `HUMAN-APPROVALS.md` permanece humano.
