# Arquitetura canônica — Cacau v1

## Princípios

1. O Neon/PostgreSQL é a fonte de verdade operacional.
2. A aplicação é full-stack em TanStack Start.
3. Acesso ao banco ocorre somente em código de servidor.
4. Drizzle define schema, queries e migrations.
5. Regras críticas de negócio devem ser testáveis fora da interface.
6. Estoque é razão de movimentos, não campo de saldo editável.
7. Operações críticas devem ser transacionais e idempotentes quando houver risco de repetição.
8. Dados históricos e eventos auditáveis não devem ser reescritos silenciosamente.

## Camadas

```text
Navegador
   ↓
TanStack Router / UI React
   ↓
Server Functions / handlers
   ↓
Serviços e regras de domínio
   ↓
Drizzle ORM
   ↓
PostgreSQL / Neon
```

Cloudflare Workers hospeda a aplicação e fornece a borda de execução. Segredos permanecem apenas no ambiente seguro do runtime.

## Organização de código

- `src/routes/`: rotas e composição de páginas.
- `src/components/`: componentes reutilizáveis.
- `src/features/catalog/`: catálogo.
- `src/features/inventory/`: estoque, FIFO e lifecycle.
- `src/features/operations/`: operações comerciais e cálculos compartilhados.
- `src/features/production/`: produção, receitas, perfis e lotes.
- `src/features/reports/`: agregações e relatórios.
- `src/db/`: conexão e schema Drizzle.
- `drizzle/`: migrations versionadas.
- `scripts/`: importações, prévias, backfills e tarefas controladas.
- `test/`: regras determinísticas e contratos.
- `e2e/`: homologações e smoke tests via Playwright.
- `docs/`: documentação canônica e registros históricos.

## Regras arquiteturais obrigatórias

- Não introduzir outro ORM ou banco sem ADR e aprovação humana.
- Não reintroduzir FastAPI/Python como backend principal. Python pode permanecer apenas em scripts auxiliares já justificados.
- Não usar o navegador para acessar `DATABASE_URL` ou segredos.
- Não usar `db:push` em ambiente que contenha dados relevantes sem revisão humana; migrations versionadas são o caminho preferencial.
- Mudança de schema exige migration, teste, impacto documentado e plano de rollback quando aplicável.
- Não persistir valores monetários em ponto flutuante.
- Quantidades e custos devem respeitar as precisões já estabelecidas no schema.

## Integrações futuras

### Autenticação

Planejada como camada transversal antes de abertura do painel para múltiplos usuários. Deve incluir sessão segura, RBAC, rate limiting, proteção de endpoints e auditoria por identidade.

### WhatsApp

Fluxo obrigatório:

```text
Webhook
  ↓
validar assinatura/origem
  ↓
registrar evento idempotente
  ↓
interpretar
  ↓
validar regra de negócio
  ↓
prévia/confirmação quando necessário
  ↓
transação
  ↓
auditoria
```

### OCR/documentos

Documentos de compra devem ser armazenados de forma separada da lógica de estoque. OCR produz dados candidatos; gravação operacional exige validação.

## Autoridade arquitetural

Em conflito entre documentos, prevalece:

1. `AGENTS.md` para regras de atuação do agente.
2. `docs/governance/SECURITY.md` para segurança.
3. este `ARCHITECTURE.md` para arquitetura.
4. `docs/governance/BUSINESS-RULES.md` para regras do negócio.
5. `docs/governance/ROADMAP-CODEX.md` para sequência de execução.
6. documentação histórica específica.
7. código legado ou comentários antigos.
