# Governança do Cacau v1

Esta pasta contém a documentação canônica usada por humanos e agentes para decidir **o que o projeto é hoje, quais regras valem e o que pode ser feito em seguida**.

## Ordem de leitura

1. [`PROJECT-STATUS.md`](PROJECT-STATUS.md) — estado real entregue e pendências.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — arquitetura oficial e limites técnicos.
3. [`SECURITY.md`](SECURITY.md) — política de segurança e proteção de dados/ambientes.
4. [`BUSINESS-RULES.md`](BUSINESS-RULES.md) — invariantes de catálogo, estoque, vendas, produção, custos e importação.
5. [`ROADMAP-CODEX.md`](ROADMAP-CODEX.md) — backlog executável e prioridades.
6. [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md) — critérios obrigatórios para concluir uma tarefa.
7. [`HUMAN-APPROVALS.md`](HUMAN-APPROVALS.md) — gates que o agente não pode ultrapassar sozinho.
8. [`DEVELOPMENT-WORKFLOW.md`](DEVELOPMENT-WORKFLOW.md) — branch, testes, migrations, commits e PR.

O arquivo raiz [`AGENTS.md`](../../AGENTS.md) é a porta de entrada do Codex e aponta para todos estes documentos.

## Relação com a documentação histórica

Nada em `docs/governance/` apaga ou substitui evidências históricas como homologações, prévias de workbook, registros FIFO, handoffs e relatórios de execução. Esses documentos continuam válidos para auditoria e contexto específico.

A diferença é de função:

- **governance/**: qual é a regra atual;
- **documentos históricos**: como chegamos até ela e quais evidências foram produzidas.

## Regra de manutenção

Quando uma entrega mudar o estado canônico do sistema, atualizar pelo menos:

- `PROJECT-STATUS.md`, se a capacidade entregue mudou;
- `ROADMAP-CODEX.md`, se uma tarefa foi concluída, bloqueada ou replanejada;
- `ARCHITECTURE.md` ou `SECURITY.md`, se a decisão correspondente mudou;
- ADR específico quando houver decisão estrutural relevante.
