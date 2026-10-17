# Redefinição de senha em HML — 17 de outubro de 2026

## Estrutura inicializada e teste real pendente

Após recuperação autorizada do incidente de restore, ensaio de `0000–0016`
passou na cópia privada e o mesmo pacote foi aplicado na original conforme
aprovação condicional. Journal verificado: 17 hashes/timestamps reais, sem
`0017+`. Três tabelas auth presentes; catálogo gerenciado preservado por digest;
zero vínculos de usuário. Snapshot/cópias preservados, nenhum secret alterado.
Usuário orientado a solicitar novo reset uma vez. Nova telemetria confirmou
início de chamada, sucesso do provedor e `completed` às `18:31:53.931Z`.
O bloqueio da auditoria foi superado e a solicitação foi aceita; entrega,
existência de conta compatível e consumo do token não são comprovados por
essa resposta genérica. Nenhum acesso de Dono concedido.
Detalhes e evidência no plano de execução e registro do incidente.

## Inventário ampliado e preparação da baseline

Usuário autorizou o SQL de inventário ampliado. Execução no mesmo alvo,
role administrativa sob transação READ ONLY confirmada, retornou zero relações
dos tipos `r`, `p`, `v`, `m`, `S` em `public`/`drizzle`, e zero dos dois enums
auth. Nenhuma linha de usuário ou negócio foi consultada. Isso caracteriza
ausência da instalação da aplicação nessas estruturas, não banco inteiro vazio.

Plano de inicialização canônica, restrito a `0000–0016`, preparado em
`AUTH-BASELINE-0016-EXECUTION-PLAN.md`, com manifesto de 17 hashes. Dois ensaios
locais PostgreSQL 17 passaram: baseline/fluxo de auditoria/reaplicação e rollback
de falha forçada, preservando marcador de schema gerenciado. Nenhum snapshot
existe na listagem atual do projeto. Criação/restore de snapshot, branch de
ensaio e DDL no alvo original ainda dependem de autorização explícita do plano.
Nenhuma instalação, importação, credencial ou vínculo foi alterado no Neon.

## Resultado do catálogo autorizado — 17 de outubro de 2026

Após autorização humana explícita de exceção M45, `run_sql_transaction` usou
projeto `steep-brook-51659857`, branch `br-lingering-wind-acwh5wap`, database
`neondb`, role administrativa `neondb_owner`. Primeira instrução
`SET TRANSACTION READ ONLY`, timeouts 5s/1s, sem DDL/DML ou linhas de aplicação.
Resultado confirmou `transaction_read_only=on`, `search_path="$user", public`:

| Estrutura | Resultado |
| --- | --- |
| `public.auth_audit_events` | ausente |
| `auth_audit_events` visível | ausente |
| `public.auth_login_attempts` | ausente |
| `public.app_user_access` | ausente |
| `drizzle.__drizzle_migrations` | ausente |
| Relações com os três nomes em outros schemas | nenhuma |
| Colunas das três relações | nenhuma |

A ausência das três tabelas na base declarada é comprovada; não é somente
diferença de search_path. O SQLSTATE do Worker é consistente com essa ausência.
A consulta pelo MCP não revela o destino do secret do Worker; a associação
continua atestada pelo operador, sem leitura de segredo.

Impactos no código: login consulta `auth_login_attempts` antes de chamar Neon;
reset exige insert em `auth_audit_events` antes de solicitar e-mail; sessão
precisa de vínculo ativo em `app_user_access`. Assim, criar apenas a tabela de
auditoria não conclui a recuperação de acesso. Não há evidência de senha
incorreta ou falha SMTP nesses erros de pré-requisito.

Journal ausente não prova banco vazio nem autorização para instalar tudo.
Migrations `0014`/`0015` contêm os DDLs canônicos de autenticação; `0016` altera
papéis/dados e permanece gate próprio. Não aplicar `0000–0028`, criar journal
fictício, usar db:push ou conceder owner automaticamente.

Próximo pacote de investigação preparado em
`SQL-AUTH-BASELINE-INVENTORY-2026-10-17.sql`, ainda **não autorizado/executado**:
somente nomes/tipos de relações de `public`/`drizzle` e labels dos dois enums
de autenticação. Distingue base não inicializada, legado e DDL parcial antes
de preparar aplicação canônica. Não lê tabelas do provedor, usuários, eventos,
estoque, vendas ou dinheiro. Alteração de schema exigirá plano revisado,
recuperação validada e aprovação posterior, separada da inspeção.

## Retomada e SQLSTATE confirmado — 17 de outubro de 2026

Retomada autorizada pelo usuário às `18:09 UTC`. Franquia oficial renovada:
100% principal, 57% semanal restante; reset principal Unix `1792278554`.
`./LIGARTUDO --prepare-only` concluiu o preflight; árvore root conserva somente
a alteração preexistente de ambiente, portanto atualização remota adiada.
Encerramento anterior confirmou push da branch de release no GitHub.

Evento posterior à versão `f168418a`: timestamp epoch ms `1792254990423`,
requestId `793886b0-8990-47f0-8541-6fca6b1233e2`, stage `initial_audit_failed`,
auditErrorCode **`42P01`**. PostgreSQL define esse código como
`undefined_table`. A consulta da auditoria recebe uma resposta SQL e falha por
relação inexistente; não atribuir essa tentativa a senha do usuário ou SMTP.
Não prova o projeto/branch SQL do secret nem o nome exato da relação ausente.
O writer acessa `auth_audit_events` sem qualificação explícita de schema;
presença e search_path ainda precisam de catálogo para distinguir os casos.

Estruturas esperadas: `0014_puzzling_masque.sql` cria `auth_audit_events`,
`auth_login_attempts` e `app_user_access`. `0015` acrescenta papéis canônicos;
`0016` migra admin para owner e registra fatos. A falha está nesse pré-requisito
de autenticação, não há evidência de causalidade da `0017`. Não aplicar a
cadeia, criar vínculo de Dono ou migrar papéis automaticamente.

Inventário de roles por metadados continua com `neondb_owner`, `authenticator`,
`anonymous` e `authenticated`. Nenhuma role transitória exclusivamente de
auditoria foi identificada. O contrato atual de `run_sql_transaction` permite
selecionar `role_name`, mas isso não comprova ACLs das roles existentes.

Preparado SQL mínimo de catálogo em
`SQL-AUTH-CATALOG-PREFLIGHT-2026-10-17.sql`: transação READ ONLY, timeouts,
presença/resolução das três relações, colunas/tipos, e somente presença do
journal. Não lê dados de autenticação/negócio nem executa DDL/DML. Ainda não
executado externamente. Gate: autorização excepcional e explícita para esse
SQL pelo MCP administrativo, sem criar role/grants, ou provisionamento humano
de acesso não gravável conforme M45. A exceção, se aprovada, limita-se a este
catálogo e não libera auditoria ampla, migrations ou escrita em produção.

Próximo passo após catálogo: se tabelas ausentes, preparar correção auditável
dos pré-requisitos existentes, com histórico/backup e autorização de DDL; se
presentes, conferir resolução de schema e correspondência do destino SQL.
Não substituir secret nem copiar dados de outra branch por inferência.

## Nova evidência após a correção do callback

Usuário repetiu a recuperação e não recebeu e-mail. Consulta sanitizada de
observabilidade após `16:20:20Z` encontrou três eventos `initial_audit_failed`,
zero `runtime_config_missing`, zero `provider_request_started`, zero resultados
do provedor e zero `completed`. Isso comprova bloqueio na gravação da auditoria
antes do envio nas três solicitações observadas. Não atribuir a spam/SMTP.

`createDatabaseAuthAuditWriter().append()` constrói evento sanitizado e executa
insert em `auth_audit_events` por `getDb()`. A exceção capturada não informa
código atualmente; não há evidência suficiente para distinguir conexão,
autorização, schema ou constraint. Não aplicar migration nem liberar acesso
por suposição. Consulta de erros do Worker não retornou falha de driver
classificável. A interface continua genérica por proteção contra enumeração.

Preparada telemetria local que admite somente códigos fixos de driver/SQLSTATE,
inclusive em `cause` do Drizzle, com profundidade limitada. Não lê mensagem,
SQL, parâmetros, DSN ou credenciais. Código é omitido quando desconhecido e
passa por nova allowlist na emissão. Mantém bloqueio antes do provedor e após
falha da auditoria final. Testes cobrem causa encapsulada, ciclos, injeção de
conteúdo em código e ausência de segredos na telemetria.
Referência: [códigos PostgreSQL](https://www.postgresql.org/docs/current/errcodes-appendix.html).

Commit do diagnóstico: `6f67aed`. Validação: 476 testes, typecheck, lint sem
avisos, formatação, diff check e build HML isolado aprovados. Release limpa
preparada em `/tmp/cacau-worker-sql-probe-release-20261017`, sem publicação.
Uso oficial no checkpoint: 6% restante; reserva 5%; reset Unix `1792259495`.
Não executar encerramento por reserva antes de confirmar o limiar obrigatório.

Próximo passo proposto: publicar essa telemetria em `cacau-v1-hml`, usuário
solicitar novamente uma única vez, ler somente código/etapa e então preparar
correção específica. Publicação desse diagnóstico foi autorizada e executada;
não altera banco, roles, secrets nem política de sessão.

## Handoff por reserva — 17 de outubro de 2026

Franquia principal: 5% restante, reserva obrigatória atingida. Reset oficial:
`2026-10-17 17:51:35 UTC` / `14:51:35 America/Sao_Paulo`.
Pausar expansão; retomar somente após confirmar renovação conforme política.

Publicação em andamento foi concluída: fonte `6f67aed`, deployment
`3cfb0309-1dac-4840-9bc1-671b883368f6`, criado em
`2026-10-17T16:34:47.641218Z`, versão
`f168418a-fa85-40d2-96ca-32f27aa6dfdb`, 100% do tráfego, CLI/MCP confirmados.
Bindings preservados por nome; probe SQL desativado. Nenhuma migration ou
correção de dados executada. Diagnóstico ainda não recebeu tentativa nova
correlacionada após esse deploy.

Próximo passo exato: usuário solicita recuperação uma vez; após renovação da
franquia, ler eventos `auth.password-reset` posteriores ao deploy e projetar
somente stage, requestId e auditErrorCode permitido. MCP de observabilidade
falha ao interpretar alguns eventos; alternativa API consultada e válida:
POST `/accounts/{account_id}/workers/observability/telemetry/query`, dry=true,
view=events, timeframe em epoch ms. Não imprimir eventos inteiros; mensagem
está em `source`, não necessariamente no topo. Se o código for desconhecido,
continuar diagnóstico sem inventar schema, permissão ou credencial inválida.

476 testes, tipos, lint, formatação, diff check e build isolado passaram antes
da publicação. Teste integrado de envio/entrega/troca de senha ainda pendente.
Não contornar auditoria. Alteração preexistente `.env.example` permanece fora
dos commits. Encerramento oficial será executado no checkout limpo de release,
branch `codex/worker-sql-probe-release-20261017`, para não incluir essa alteração
não revisada no `git add --all` do script. Resultado do encerramento será
informado ao operador; root continua em `codex/worker-sql-connection-check`.

## Relato e alvo

### Correção aplicada após aprovação

Usuário autorizou as duas alterações externas explicitamente. MCP adicionou
somente a origem HTTPS exata de HML no Neon Auth de
`br-lingering-wind-acwh5wap`; nova listagem confirmou localhost preservado
e a origem adicionada, sem wildcard.

Fonte `bb1717d`, previamente validada, publicada do checkout limpo pelo script
isolado. CLI e MCP confirmaram deployment
`5d0fe2cb-f1ab-44d0-a629-b82b0fc011f4`, criado em
`2026-10-17T16:20:19.999376Z`, versão
`9ec9856d-85c0-40af-adfe-7d5132df6dd0`, 100% do tráfego.
MCP confirmou `PASSWORD_RESET_REDIRECT_ORIGIN` com a origem pública correta,
bindings secretos preservados por nome/tipo, rate limit e observabilidade
preservados. Probe SQL continua desativado. Nenhum SQL, schema, senha ou
identidade foi alterado pelo agente.

Página pública `/login` respondeu HTTP 200 após a publicação.
Usuário orientado a atualizar a página de login e solicitar uma vez novo
link. Entrega, evento de auditoria, consumo do token e login ainda pendentes;
não declarar o fluxo integralmente homologado antes dessa confirmação.

Usuário relatou falha de senha em `cacau-v1-hml` e ausência do e-mail de
**redefinição**, não do código de confirmação de cadastro. Mensagem exata
do login ainda solicitada. Não concluir que a senha está incorreta nem que
o provedor rejeitou a entrega sem evidência da requisição específica.

Worker ativo no diagnóstico inicial: versão
`6b737c00-e80b-4217-9b03-6d84829035e4`, 100%.
Alvo Neon declarado pelo operador: projeto `steep-brook-51659857`, branch
`br-lingering-wind-acwh5wap`, nome `production`. Inspeção de configuração
somente leitura; sem consultas SQL, alteração de identidade, senha ou RBAC.

## Bloqueios comprovados

1. MCP de settings do Worker não lista `PASSWORD_RESET_REDIRECT_ORIGIN`.
   `readPasswordResetRedirectTo` exige origem explícita fora do desenvolvimento.
   Em `requestPasswordResetFn`, configuração ausente interrompe o fluxo antes
   da auditoria e da chamada ao Neon. A resposta genérica não comprova envio.
   Essa condição é suficiente para bloquear o reset quando a solicitação
   chega à etapa de configuração; proteções anteriores também podem rejeitá-la.
2. MCP `list_auth_trusted_domains` e configuração redigida do Neon confirmam
   apenas `http://localhost:3000`. A origem HTTPS de HML não está autorizada.
   Portanto, corrigir apenas o callback do Worker não basta: o destino do
   link também precisa ser permitido pelo Neon na branch correta.
3. A causa individual do erro de login ainda não está comprovada. O código
   usa mensagem genérica para credenciais recusadas e determinados bloqueios.
   Banco de tentativas, rate limit, sessão e vínculo de acesso são etapas
   distintas; não redefinir senha, liberar usuário ou mexer nas migrations
   para contornar erro não identificado.

Consulta agregada de observabilidade, restrita ao Worker na última hora,
retornou zero ocorrências de `runtime_config_missing`. Não houve correlação
com a tentativa do usuário; esse resultado não invalida os dois bloqueios de
configuração nem prova entrega. Nenhum log bruto de requisição foi exibido.

O Neon informa autenticação por e-mail/senha habilitada, cadastro desabilitado,
sem exigência de verificação de e-mail e provedor de e-mail compartilhado.
Nenhuma dessas opções foi modificada. O SMTP compartilhado suporta reset;
sua presença, sozinha, não explica o não envio.
[Requisitos de e-mail](https://neon.com/docs/auth/production-checklist),
[origens confiáveis](https://neon.com/docs/auth/guides/configure-domains).

## Correção preparada e limites

`wrangler.jsonc`, exclusivamente em `env.hml.vars`, declara
`PASSWORD_RESET_REDIRECT_ORIGIN=https://cacau-v1-hml.naiguelcabral.workers.dev`.
O runtime mantém HTTPS obrigatório e não deriva destino de headers do cliente.
Teste de configuração lê o arquivo real e resolve a rota pública
`/login/redefinir-senha`; deve falhar se o callback voltar a faltar no deploy.
Raiz de produção do Worker e arquivos locais de ambiente preservados.

Verificações direcionadas: 19 testes aprovados, typecheck, lint e formatação
aprovados. Suíte completa: 475 testes aprovados. Build HML isolado do commit
`bb1717d` aprovado, sem publicação. `git diff --check` aprovado.

## Plano aprovado e verificação integrada pendente

1. Aprovado e aplicado: publicar a correção no Worker `cacau-v1-hml` e adicionar somente
   `https://cacau-v1-hml.naiguelcabral.workers.dev`, sem wildcard, às origens
   confiáveis do Neon Auth de `br-lingering-wind-acwh5wap` / `production`.
   A aprovação específica está registrada em `HUMAN-APPROVALS.md`.
2. Preservar os demais bindings e origens; não alterar secrets, cadastro,
   verificação de e-mail, usuário, senha ou papéis. Publicar de checkout limpo.
3. Usuário solicita novamente a recuperação pela interface. Confirmar etapas
   sanitizadas do provedor/auditoria e recebimento pelo usuário. Se o banco
   impedir auditoria, registrar o bloqueio sem aplicar schema automaticamente.
4. Usuário conclui pessoalmente a troca de senha. Não compartilhar token/link
   no chat. Validar login e acesso existente antes de retomar diagnóstico SQL.

Rollback da configuração proposta: retirar a origem exata adicionada no Neon
e restaurar a versão anterior do Worker conforme autorização operacional.
Não executar rollback de banco nem apagar eventos de autenticação.
