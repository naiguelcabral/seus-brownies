# Estado canônico do projeto — Cacau v1

Atualizado em 7 de setembro de 2026, após revisão de código, migrations,
testes, rotas, documentação e estado público de HML.

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
- As migrations `0017` (idempotência, autoria e proteção estrutural de
  produto) e `0018` (auditoria operacional) estão preparadas para revisão;
  não foram aplicadas a nenhum banco nesta missão.
- Não repetir cargas ou homologações já consumidas sem autorização explícita.

### Qualidade

- Checkpoint local de 8 de setembro na branch `codex/audit-remediation`:
  `npm test` aprovou 248 casos, `npm run lint` e `npm run typecheck` passaram.
  O build HML isolado passou no HEAD atual com chave pública sintética e sem
  carregamento de arquivo de ambiente; o aviso de secrets operacionais
  ausentes no SSR é esperado nessa prova. Um workflow versionado prepara
  `npm ci`, testes, lint, tipos e esse build isolado, sem deploy ou migration.
- Exportação CSV local de relatórios operacionais está implementada sobre os
  agregados já autorizados. Ela preserva os decimais como texto e neutraliza
  prefixos de fórmula de planilha; não cria endpoint público, arquivo remoto ou
  integração externa. O build HML isolado repetido no checkpoint dessa entrega
  passou com chave pública sintética. A entrega de XLSX permanece fora do
  escopo atual.
- A primeira CI remota falhou porque o modo local `--dry-run` do controlador
  exigia Codex CLI sem utilizá-lo. A correção e sua reprodução sem CLI estão
  aprovadas na CI `34268997522`, que também confirmou a exportação CSV e
  o build isolado.
- Busca textual, período e paginação de 20 itens para o histórico de despesas
  estão implementados sobre a Server Function já autorizada, com estados de
  carregamento/erro. O build isolado e a CI `34270184144` desse checkpoint
  passaram.
- O histórico de compras agora filtra fornecedor e período no servidor,
  pagina 20 itens com ordem estável e preserva a negação de histórico ao
  Funcionário. Testes direcionados, lint, typecheck e build HML isolado
  passaram localmente; a CI desse checkpoint ainda depende de publicação.
- A CI `34278599814` também passou no checkpoint publicado mais recente, com
  suíte, lint, typecheck e build HML isolado. A análise completa de dependências
  encontrou 13 vulnerabilidades (cinco altas); nenhuma atualização automática
  foi aceita, pois as cadeias Drizzle e Wrangler só têm proposta incompatível.
- O runbook de resiliência operacional documenta backup, restauração em branch
  descartável, RPO/RTO, rollback, observabilidade e retenção. Não há estratégia
  externa configurada nem ensaio de restauração: esses são gates humanos.

- Rodada manual local de 7 de setembro: seis casos individuais adicionais
  de cooldown/desafio passaram; suíte de 37 arquivos e lint verdes. A07-R2
  está concluído no checkpoint humano `c28c267`, confirmado no Git local.
  A falha anterior de escrita em `.git` permanece no log. Build não executado;
  nenhuma evidência nova de publicação/HML.
  Detalhes e retomada em `AUTONOMY-HANDOFF.md`.

- A suíte determinística contém 34 arquivos de teste e passou integralmente na
  revisão de 6 de setembro; `lint` e `build` também passaram. O build emite
  apenas o aviso não bloqueante do Wrangler por não poder escrever logs fora do
  workspace.
- `npm run check` não está verde para o repositório inteiro: o Prettier aponta
  dívida de formatação em 92 arquivos, inclusive artefatos históricos e
  snapshots gerados. Os arquivos alterados nesta revisão foram formatados
  isoladamente; essa pendência não foi escondida com uma reescrita em massa.
- Há 11 specs Playwright, incluindo uma de rotas públicas de autenticação.
  Parte delas é intencionalmente `skip` ou requer autorização/referência
  exclusiva; a execução E2E completa de autenticação ainda depende de ambiente
  local autorizado que não carregue `.env` e de identidades de teste próprias.
- O código versionado possui 13 módulos de rota, CSRF global para métodos
  mutáveis e middleware estrutural de autorização aplicado às 30 Server
  Functions operacionais. A permissão é resolvida no servidor.

### Autenticação e acesso (G1)

- A base versionada contém login por e-mail/senha, cadastro, OTP, logout,
  recuperação por link/token, rate limit local, cooldown durável quando os
  bindings existem, Turnstile fail-closed e auditoria sanitizada de reset.
  A rota de reset é pública, mantém o token só em memória e o remove da URL.
- A experiência local foi exercitada para recuperação e login: a tela distingue
  sessão ausente, identidade sem allowlist e e-mail não verificado; este último
  segue para o OTP com reenvio de código.
- As migrations `0014`, `0015` e `0016` estão registradas no histórico Drizzle
  do branch Neon HML. Elas criam a infraestrutura de acesso e auditam a
  transição de `admin` para `owner`. Há um vínculo ativo de Dono e um de
  Gerente, ambos auditados e com e-mail verificado. Em 6 de setembro, o Dono
  concluiu manualmente recuperação de senha, OTP, login e acesso operacional
  completo em HML.
- A política atual é Dono, Gerente e Funcionário. Funcionário pode apenas ler
  catálogo e registrar compras/vendas; não recebe dashboard, relatórios,
  estoque, despesas, produção ou administração. Papéis anteriores permanecem
  somente como compatibilidade de transição, sem concessão a novas contas.
- O Worker HML `cacau-v1-hml` permanece publicado exclusivamente em
  `workers.dev`. Em 6 de setembro, o código atual foi publicado e o `403` de
  navegação pública foi corrigido: `/login` responde `200` e `/` sem sessão
  redireciona para `/login`. Uma leitura pública sanitizada em 7 de setembro
  reconfirmou esse comportamento, sem enviar cookie ou ler corpo. A
  homologação end-to-end ainda depende de login, OTP, sessão e autorização por
  papel reais.

## Ainda não entregue ou não homologado

- Decisão humana sobre a necessidade e a identidade do segundo Gerente; se
  aprovado, criar o vínculo auditado somente após a verificação de e-mail.
- Homologação integrada/E2E de login, logout, OTP, reset, cookie, sessão,
  autorização por papel e negações de acesso.
- Rate limit distribuído HML, desafio Turnstile real com rejeição de replay,
  confirmação de revogação de sessão e auditoria de todos os eventos de
  autenticação.
- Gestão de identidades/papéis por interface autorizada; hoje os vínculos HML
  foram operações administrativas auditadas.
- Auditoria de autoria para todas as mutações operacionais e, se desejado,
  desenho de dupla aprovação. A confirmação de certos ajustes de estoque já
  existe na UI, mas não é uma política geral de quatro olhos.
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

1. Fechar a homologação segura de G1 e o acesso HML.
2. Consolidar CMV/margem e rastreabilidade.
3. Evoluir dashboard e gestão sobre dados já autorizados.
4. Iniciar mensageria, OCR e pagamentos somente após os gates anteriores.
5. Formalizar observabilidade, backup e deploy definitivo antes de produção.
