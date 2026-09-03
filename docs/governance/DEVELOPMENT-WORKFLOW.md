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
- Não executar `npm run desligar` automaticamente porque esse script pode realizar commit/sincronização.
- Em tarefas longas, registrar o consumo de Codex nos checkpoints sempre que o produto disponibilizar o dado.
- Ao atingir 5% restante ou menos da franquia relevante, aplicar imediatamente `CODEX-USAGE-POLICY.md`: não iniciar novo trabalho, fechar um checkpoint seguro e pausar.
- Só retomar no horário de reset exibido pelo Codex ou depois dele, após confirmar a renovação da franquia.
- Não afirmar que haverá retomada automática se nenhuma Automation do Codex estiver configurada.

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

A política de reserva em `CODEX-USAGE-POLICY.md` é obrigatória para trabalhos prolongados: os últimos 5% são destinados a fechamento seguro, documentação e handoff, não a expansão de escopo.
