# Estado canônico do projeto — Cacau v1

## Integrações consolidadas — 8 de outubro de 2026

O lote que compõe #19, #20, #24, #26 e #27 preserva o writer transacional,
diagnósticos somente leitura e precisão monetária. Não inclui migration,
infraestrutura, segredo, banco compartilhado ou correção automática de
estoque/FIFO/CMV. A PR #32 foi integrada em `main` com CI verde. A PR #31 de
relatórios/FIFO também foi integrada com CI `37804204150` verde.

O lote plataforma/governança compõe #14, #21, #22, #23, #25, #28 e #29 sem
migrations, deploy, escrita externa ou mudança de política. Telemetria é
allowlisted, memória local continua privada/atômica, hooks permanecem locais e
o smoke público bloqueia tráfego externo no modo isolado.

## Entrega local em revisão — A25, 8 de outubro de 2026

Conclusão de produção com sete cenários determinísticos do writer real usando
Drizzle fake: conclusão única, custos/saídas/FIFO, insuficiência de insumo e
rollback em falhas posteriores. A extração do writer preserva o corpo da
transação, a validação e a autorização do servidor. A prova local não substitui
homologação PostgreSQL, operação física ou aprovação de produção.

Atualizado em 6 de outubro de 2026, após revisão de código, migrations,
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
- Auditoria local de produção distingue quantidades planejadas e realizadas
  por saída, diferença física exata e custo alocado informado. Lacunas não
  viram produção realizada; homologação visual permanece pendente.
- Checklist `PRODUCTION-READINESS.md` preparado para revisão humana; não
  declara produção pronta nem comprova schema ou homologação no ambiente.

### Observabilidade local

- Telemetria de auth em JSON estrutura evento/nível/requestId e aplica
  allowlist em runtime. Campos extras, motivos inválidos e IDs arbitrários
  não são serializados. Nenhuma política de sessão foi alterada.

### Ambientes — evidência de 8 de outubro de 2026

- `ENVIRONMENT-MATRIX.md` registra SELECT 1 e introspecção no alvo exato
  `development`/`neondb`: relações consultadas de produção/FIFO/G2/cenários
  ausentes. Não substitui homologações históricas em outro branch.
- Settings somente leitura de `cacau-v1-hml` não retornam o binding de
  rate limit versionado; última publicação observada de 7 de setembro.
  Associação Worker × database e publicação continuam gates humanos.

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
  passaram localmente e na CI `34295688527`; a homologação de interface depende
  de ambiente autorizado.
- O ranking local de top 10 produtos por unidades usa ID de catálogo quando
  disponível, preserva itens históricos sem vínculo em grupo explícito e
  ordena quantidades exatas. O modelo ainda não oferece sabor canônico para
  um ranking por sabor; a interface aguarda homologação.
- O histórico de vendas agora filtra cliente, status e período no servidor,
  pagina 20 itens com corte final inclusivo de data em UTC e preserva a negação
  de histórico ao Funcionário. Testes direcionados, lint, typecheck e build
  HML isolado passaram localmente e na CI `34296133493`; a homologação de
  interface depende de ambiente autorizado.
- O catálogo agora filtra nome/SKU, tipo e situação no servidor, pagina 20
  produtos em ordem estável e mantém os controles de escrita fora do papel
  Funcionário. Testes direcionados, lint, typecheck e build HML isolado
  passaram localmente e na CI `34296485813`; a homologação de interface depende
  de ambiente autorizado.
- Em 5 de outubro, a PR #9 foi integrada na `main` pelo commit
  `428bcd0f9b5b17e9cde5f1dbbcf863664ffac4aa`. A CI da PR (`37374731288`) e a
  CI pós-merge (`37385292264`) passaram: `main` usa exclusivamente o build de
  CI arquivado/isolado, enquanto `build:hml` permanece bloqueado para execução
  direta nela. Não houve deploy, migration, acesso a segredo ou mudança de
  negócio.
- O follow-up documental de segurança/qualidade registra retenção segura de
  artefatos Playwright, vulnerabilidades conhecidas e gates de sessão,
  auditoria e Turnstile. Artefatos históricos rastreados foram preservados sem
  inspeção de conteúdo; novos `playwright-report/` e `test-results/` são
  ignorados. A PR #10 foi integrada por merge commit
  `60ae6ec3049500cc7cad0171ddaccf03f75c8cb0`; sua CI (`37460962766`) e a CI
  pós-merge da `main` (`37461237980`) passaram. A próxima reconciliação
  prevista é a PR #11, que exige revisão isolada de migrations e regras
  financeiras antes de qualquer integração.
- A PR #11 foi integrada por merge commit
  `baf9c4ceb97a1f66bb583f0fc6364cebf5867a6e`, partindo da `main`
  `968e9a93fe0c67611c8afcd47eb419203bccdcd8`. Sua CI de PR
  (`37524206463`) e a repetição verde da CI de push (`37524202791`) aprovaram
  o SHA `249bdd9`; a CI pós-merge da `main` (`37528365304`) aprovou testes,
  lint, typecheck e `build:ci-isolated`, sem `npm run build`. A entrega inclui
  paridade do workbook, G2-F1, entrega por competência com caixa separado,
  fatos financeiros e reconciliação somente leitura. As migrations
  `0019`–`0026` continuam apenas versionadas e não foram aplicadas. PRs #4 e
  #5 permanecem abertas e inalteradas. A próxima tarefa é criar
  `codex/wp-d-main-reconciliation` da `main` atualizada para uma nova PR WP-D
  em rascunho.
- A reconciliação WP-D foi concluída e integrada pela PR #12. A branch
  `codex/wp-d-main-reconciliation` foi criada da `main`
  `51f9657938d2b168c963341c6246a625514dd8a8`; a origem congelada
  `codex/wp-d-scenarios` (`c54f65bfa49607793b4d5e5eec7369585e42c6d3`) foi
  incorporada pelo merge de reconciliação `f155b94`. O merge commit da PR em
  `main` é `4590ca4e235f540d6552ab499e1140434355ce1f`; a CI pós-merge
  `37671827440` aprovou instalação, testes, lint, typecheck e
  `build:ci-isolated`. Os conflitos de reconciliação foram exclusivamente
  documentais e a `main` foi preservada como autoridade. As migrations
  `0027`/`0028` continuam somente versionadas, sem aplicação. A homologação
  HML de Dono, Gerente, Funcionário e negações por papel permanece pendente;
  requer autorização humana e navegador antes de uso operacional.
- A CI `34278599814` também passou no checkpoint publicado mais recente, com
  suíte, lint, typecheck e build HML isolado. A análise completa de dependências
  de 5 de outubro encontrou 16 vulnerabilidades (sete altas); ao omitir
  desenvolvimento, dez permanecem. Nenhuma atualização automática foi aceita:
  o dry-run encontrou conflito de peers do Better Auth e as cadeias Drizzle,
  Neon Auth e Wrangler exigem compatibilidade/revisão humana. O registro
  detalhado está em `SECURITY-QUALITY-FOLLOWUP-2026-10-05.md`.
- O build HML isolado agora reconhece checkout detached somente durante CI de
  build, usando a referência explícita da branch de trabalho; deploy nesse modo
  continua bloqueado. As CIs `34299895120` e `34299897403` passaram com essa
  proteção e com ordenação exata dos agregados de relatórios.
- A revisão local G1 cobre os cinco escopos do binding distribuído e rejeita
  respostas HTTP/JSON inválidas do Turnstile. A homologação com binding HML,
  desafio real, replay, e-mail, cookies, sessão e revogação permanece externa
  e está explicitamente separada na matriz de validação G1.
- Uma comparação operacional local de faturamento confirmado, unidades e
  ticket médio usa o período anterior de mesma duração em UTC e diferenças
  decimais exatas. É baseada na data da venda e rotulada separadamente da
  receita por competência de `/financeiro`; aguarda homologação de interface.
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
- O acesso ao banco valida `DATABASE_URL` com Zod no runtime server-side, sem
  carregar arquivos de ambiente nem incluir valores na mensagem de falha.

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
- Em 7 de setembro, o widget Turnstile HML existente foi limitado a
  `localhost`, `127.0.0.1` e ao hostname HML; seu segredo foi atualizado
  somente no Worker e a site key pública foi incluída no bundle HML. A
  verificação descartável de Siteverify confirmou o segredo sem expô-lo.

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
- Adoção multitenant: plano em `MULTITENANCY-ADOPTION.md`; depende de decidir
  memberships, escopo de chaves e mapeamento auditável dos fatos históricos
  antes de gerar uma migration aplicável.

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
