# Seus Brownies — Cacau v1

Painel operacional para organizar produtos, compras, estoque, produção, vendas,
despesas e relatórios dos Seus Brownies.

## Estado atual

O núcleo operacional está integrado na `main` e publicado em homologação. A
liberação definitiva de produção depende dos aceites humanos listados no
[roadmap único](docs/governance/ROADMAP-CODEX.md). O
[estado canônico](docs/governance/PROJECT-STATUS.md) registra entregas,
pendências e evidências; este README não acompanha checkpoints.

| Área | Entrega atual |
| --- | --- |
| Acesso | Neon Auth, login/cadastro/OTP/reset, sessão SSR, RBAC no servidor, CSRF, Turnstile e limiter distribuído |
| Catálogo e estoque | Produtos, insumos, embalagens, compras em kg/consumo em g, movimentos auditáveis, custos exatos e FIFO |
| Produção | Receitas/perfis versionados, rascunho e conclusão transacional, custos por lote, Bordinhas medidas e perdas justificadas |
| Vendas e financeiro | Confirmação, recebimento, entrega, CMV, lucro por competência separado do caixa, taxas, reembolso/crédito e fechamento auditado |
| Gestão | Dashboard, meta conjunta, cenários versionados, relatórios, diagnósticos de integridade e CSV seguro |
| Qualidade | TypeScript 7, Oxlint/Oxfmt, Knip, CodeQL, testes Node, laboratório PostgreSQL e navegador isolado/conectado |

**Ainda não implementado:** assistente no WhatsApp/IA conversacional e leitura
de notas por imagem/OCR. Existem apenas como evoluções planejadas no roadmap.

## Executar localmente

Use Node **22.23.2** (`.nvmrc`) e npm:

```bash
npm ci
npm run ligar
```

O painel abre em `http://localhost:3000`. Para encerrar e registrar o trabalho
no Git, use `npm run desligar`. Agentes seguem [AGENTS.md](AGENTS.md): o
encerramento não é automático durante trabalho normal e nunca roda na `main`.

## Verificações

```bash
npm test
npm run lint
npm run typecheck
npm run check
npm run knip:check
```

Builds de validação seguem o [workflow isolado](docs/governance/DEVELOPMENT-WORKFLOW.md)
e nunca publicam o sistema. Os testes E2E usam os laboratórios restritos do
[protocolo de QA](docs/governance/QA-VALIDATION-PROTOCOL.md) e não devem rodar
contra ambientes compartilhados sem cenário, destino e referências autorizados.
Cobertura do Knip/CodeQL: [KNIP-CODEQL.md](docs/governance/KNIP-CODEQL.md).

## Banco de dados e migrations

O acesso ao PostgreSQL acontece somente no servidor. `npm run db:migrate` é um
**preflight offline bloqueante**; `db:prepare`/`db:review` preparam e revisam
sem executar SQL. Não reaplicar recibos nem usar `db:push` como atalho.
Consulte o [ADR de migrations](docs/governance/MIGRATION-CHAIN-REMEDIATION-ADR.md).

## Importações

Os comandos `import:preview`, `import:history:preview` e `production:preview`
apenas leem o workbook e geram prévias em `docs/`, sem acessar o banco.
Comandos com `--confirm` gravam dados e exigem plano, conferência de destino e
autorização específica; a base original já contém catálogo, receitas e perfis,
e referências consumidas não podem ser repetidas.

## Regras e referências

- [Regras de negócio](docs/governance/BUSINESS-RULES.md)
- [ADR de custos exatos](docs/ADR-0002-CUSTOS-EXATOS-E-EXIBICAO-MONETARIA.md)
- [Homologação de produção real](docs/HOMOLOGACAO-PRODUCAO-REAL.md)
- [Homologação FIFO](docs/HOMOLOGACAO-FIFO-FASE-2.md)
- [Fundação do MVP](docs/MVP-01-FUNDACAO.md)
