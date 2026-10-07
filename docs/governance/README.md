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
9. [`CODEX-USAGE-POLICY.md`](CODEX-USAGE-POLICY.md) — consumo, reserva obrigatória de 5%, checkpoint e regra de retomada após o reset exibido pelo Codex.
10. [`AUTHORIZATION-MATRIX.md`](AUTHORIZATION-MATRIX.md) — menor privilégio e guards estruturais da G1.
11. [`G1-HML-EXECUTION-PLAN.md`](G1-HML-EXECUTION-PLAN.md) — histórico e procedimento controlado da integração de autenticação em homologação.
12. [`G1-EXTERNAL-CONFIGURATION.md`](G1-EXTERNAL-CONFIGURATION.md) — bindings, ordem e validação segura do gate externo de Neon Auth em HML.
13. [`G1-CLOUDFLARE-HML.md`](G1-CLOUDFLARE-HML.md) — Worker HML separado,
    bindings pendentes e comandos bloqueados de deploy/secret.

O arquivo raiz [`AGENTS.md`](../../AGENTS.md) é a porta de entrada do Codex e aponta para a governança.

## Procedimentos operacionais

- [`GITHUB-MCP-PERSISTENT-AUTH.md`](GITHUB-MCP-PERSISTENT-AUTH.md) — configuração,
  verificação, rotação e início do Codex com credencial no GNOME Keyring.

## Workbook padrão de consulta

A referência vigente do projeto é `Workbook_Gerenciamento_Seus_Brownies(4).xlsx` (19/08/2026), preservada como fonte histórica/de consulta.

Regras:

- o workbook não é a fonte operacional de verdade; o Neon/PostgreSQL cumpre esse papel;
- o arquivo original deve ser tratado como somente leitura por agentes;
- pode ser usado para conferência, prévias e importações explicitamente autorizadas;
- não sobrescrever nem atualizar automaticamente o workbook;
- versões anteriores permanecem históricas;
- uma nova versão só passa a ser canônica após decisão humana explícita.

O binário não precisa ser duplicado dentro do Git para que esta regra seja válida; quando necessário à execução local, disponibilizar uma cópia de consulta controlada e preservar sua identidade/hash conforme os pipelines de importação existentes.

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
- `CODEX-USAGE-POLICY.md`, se a política de capacidade mudar;
- ADR específico quando houver decisão estrutural relevante.
