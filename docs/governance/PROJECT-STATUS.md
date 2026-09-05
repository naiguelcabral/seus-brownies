# Estado canônico do projeto — Cacau v1

Atualizado em 5 de setembro de 2026.

Este documento é a referência canônica de alto nível para o estado atual do sistema. Registros históricos de homologação, importação e decisões específicas permanecem válidos como evidência, mas não substituem este resumo.

## Produto

- Negócio: Seus Brownies
- Sistema: Cacau v1
- Objetivo atual: painel operacional rastreável para catálogo, compras, estoque, produção, vendas, despesas e relatórios.

## Stack oficial

- TypeScript
- React
- TanStack Start
- TanStack Router
- Drizzle ORM / Drizzle Kit
- PostgreSQL no Neon
- Tailwind CSS
- Zod
- Cloudflare Workers
- Node test runner
- Playwright
- Git / GitHub

## Estado entregue

### Operação principal

- Categorias: implementado.
- Produtos: implementado.
- Compras: implementado com entrada de estoque transacional.
- Estoque: implementado por razão de movimentações; saldo não é editável diretamente.
- Vendas: implementado; vendas confirmadas ou pagas movimentam estoque quando aplicável.
- Despesas: implementado.
- Produção: fluxo real implementado com rascunho e conclusão transacional.
- Relatórios: implementados em nível operacional inicial.

### Custos e estoque

- Custo médio ponderado usado onde previsto no fluxo atual.
- Estrutura FIFO/CMV existe e foi homologada em ambiente de desenvolvimento.
- Camadas, alocações, lifecycle e reconciliação FIFO possuem testes e documentação própria.
- Energia e mão de obra são custos operacionais, nunca itens de estoque.
- Bordinhas é coproduto, não perda automática.

### Dados e migrações

- Catálogo e histórico de 2026 já foram importados no ambiente informado.
- Prévia somente leitura existe para catálogo, histórico e produção.
- Migrations Drizzle já foram aplicadas no ambiente autorizado até as versões documentadas nos registros históricos.
- Não repetir cargas ou homologações já consumidas sem autorização explícita.

### Qualidade

- Testes determinísticos em `test/`.
- Testes E2E em `e2e/`.
- `lint`, `build`, `test` e `test:e2e` são verificações oficiais.
- G1 possui ADR aceito, matriz de menor privilégio e contratos locais de
  autorização/principal/auditoria. A migration `0014` foi aplicada somente no
  branch Neon de homologação `g1-auth-hml`: criou a allowlist de acesso, o
  controle de tentativas e a auditoria, sem criar usuários nem alterar FIFO.
  O adaptador Neon Auth/TanStack, CSRF e guards das 30 Server Functions estão
  preparados e falham fechados até a configuração externa. O Worker HML
  `cacau-v1-hml` foi publicado exclusivamente em `workers.dev`, com os cinco
  secrets HML confirmados somente por nome. Trusted origins do Neon Auth e o
  hostname Turnstile HML foram configurados sem wildcard. O smoke público ainda
  retorna 403 antes de invocar o Worker, apesar de `workers.dev` público e da
  versão HML ativa; rate limiting e a investigação externa da borda permanecem
  pendentes. A primeira identidade Neon Auth verificada possui um único
  vínculo ativo `app_user_access` com papel `admin`, criado no branch HML por
  bootstrap manual autorizado e acompanhado de evento `role_changed`.
- O fluxo local de recuperação por link/token está preparado em
  `/login/redefinir-senha`: solicitação não enumerável, senha entre 8 e 128
  caracteres, token mantido somente em memória durante a submissão e removido
  da URL/histórico. A auditoria sanitizada é obrigatória: intenção persistida
  antes do provedor e resultado persistido depois; sem evento final, a rota
  devolve falha controlada. Cadastro envia a mesma resposta e segue para OTP
  tanto para identidade nova quanto já existente. Os endpoints públicos possuem
  limite local por identidade HMAC e o login usa cooldown durável após cinco
  falhas quando `AUTH_LOGIN_HASH_PEPPER` e o banco estão disponíveis. A UI de
  Turnstile está preparada e falha fechada sem site key/token; limite
  distribuído, homologação do widget e confirmação de revogação de sessões
  permanecem pendentes de gate/configuração externa.

## Ainda não entregue

- Validação integrada de autenticação.
- RBAC operacional homologado.
- Auditoria integrada de todos os eventos de autenticação.
- Validação integrada de recuperação de senha e gestão de sessão.
- Proteções específicas de login, incluindo limite de tentativas e desafio adicional quando aplicável.
- Provisionamento do Neon Auth, secrets de autenticação, provedor de e-mail e
  configuração de compatibilidade do Worker.
- WhatsApp Cloud API e webhook.
- Processamento idempotente completo para mensageria externa.
- OCR e armazenamento de documentos/notas.
- Pagamentos online.
- Regras completas de entrega.
- Deploy definitivo de produção e secrets finais do Worker.
- Relatórios gerenciais avançados, margem por produto/lote e análises adicionais.

## Restrições atuais

- Dados HML existentes são trilha de auditoria e não devem ser limpos ou reutilizados.
- Cenários FIFO já consumidos não podem ser repetidos com a mesma referência.
- Nenhuma migration destrutiva pode ser aplicada automaticamente.
- Nenhum deploy de produção pode ser feito por agente sem aprovação humana explícita.
- `.env` e outros arquivos de segredo não devem ser lidos, alterados, versionados ou compartilhados por agentes.

## Próxima macrofase

1. Governança agent-friendly do repositório.
2. Segurança, autenticação e RBAC.
3. Consolidação de CMV/margem e rastreabilidade.
4. Dashboard gerencial avançado.
5. WhatsApp com idempotência e confirmação.
6. OCR/documentos.
7. Operação de produção e deploy definitivo.
8. Autonomia progressiva do Codex.
