# Redefinição de senha em HML — 17 de outubro de 2026

## Concessões aprovadas e aplicadas — 17 de outubro de 2026

Após apresentação do SQL e dos quatro ensaios, usuário autorizou explicitamente
criar na original somente os vínculos Dono e Gerente das duas contas indicadas.
Preflight revalidou as duas identidades verificadas e os mesmos papéis ativos
em G1; original `br-lingering-wind-acwh5wap`, endpoint
`ep-late-water-acahd1z1`, `neondb`, tinha zero vínculos e 17 migrations.

Plano `SQL-ACCESS-RECONCILIATION-2026-10-17.sql` executado via MCP numa única
transação. SHA-256 do SQL: `91403fbb43dcb8ec130a64cd9a0bce5864297dc1c7fe219dab36bd3a2684775d`.
Referência **consumida**, não reutilizar:
`access-reconciliation:20261017:300f24ea-2e14-4b1c-9e4c-b791856d1266`.

Verificação em nova transação READ ONLY confirmou exatamente um `owner` ativo,
um `manager` ativo e dois eventos `role_changed/success`, com motivo
`operator_approved_access_reconciliation`, às `2026-10-17T19:19:01.429Z`.
Journal continua com 17 recibos. Nenhuma identidade, senha, secret, schema,
regra RBAC, vínculo de origem ou outra conta foi alterado. O ator de sessão
permanece NULL; aprovação humana administrativa está identificada no metadata,
sem atribuir ao operador uma sessão da aplicação inexistente.

Usuário orientado a sair e entrar novamente no login HML para validar o painel.
Concessão confirmada no banco; acesso pela interface ainda aguarda confirmação.
Diagnósticos temporários permanecem desligados. `0017+` e homologação integral
continuam fora desta concessão. Evidência em
`evidence/access-reconciliation-2026-10-17.json`.

## Limite operacional após a concessão

Revisão do carregamento do painel encontrou incompatibilidade de schema:
`getDashboard`, em `src/features/operations/functions.ts`, faz `select()` de
`sales` usando o schema atual, que inclui `delivered_at`. Consulta READ ONLY
a `information_schema.columns` confirmou a ausência dessa coluna na original.
Ela é adicionada em `drizzle/0023_strange_union_jack.sql`; o journal permanece
com os 17 recibos até `0016`. Portanto a concessão resolve a allowlist, mas
não comprova painel operacional: esse caminho de consulta depende da cadeia
posterior ainda não aplicada. Não aplicar `0023` isoladamente nem enfraquecer
a consulta para esconder incompatibilidade. Retomar o reparo seguro de `0017`
e os gates separados de migrations posteriores antes de homologação integral.
Nenhuma linha de negócio foi consultada para esse diagnóstico de catálogo.


## Diagnóstico executado — causa comprovada e correção preparada

Publicação autorizada a partir de `410665b`, em build isolado sem arquivos de
ambiente, com chave Turnstile pública real. Primeira comparação: versão
`148a0a88-25e2-47a2-a687-7088ff64b53b`, deployment
`22699057-f691-4f07-902c-529041779f59`, a 100%, retorno `matchesExpected=false`
para o Auth declarado da branch original. Diagnóstico desativado em seguida
(`81a4a309-69b5-4140-92c1-7c5999c07d0d`).

Busca restrita aos dois e-mails confirmados localizou ambas as identidades
verificadas em `g1-auth-hml` (`br-patient-lake-ac2t0cvq`), com vínculos ativos
`owner` e `manager` já existentes nessa branch. Segunda comparação, usando
metadados públicos do Auth dessa branch e a mesma expiração UTC, confirmou
`matchesExpected=true` na versão `fab87c0e-611f-4003-a73a-5cb205a86cc8`.
Nenhum secret foi revelado/alterado; e-mails e UUIDs pessoais omitidos do Git.

Destino de auditoria do Worker atestado por correlação: request_id
`048a6f17-94e1-4776-b8b8-ad3ab7ecb999`, observado na telemetria HML como reset
concluído, tem os eventos SQL `password_reset_requested` blocked/success na
original, às `18:31:52.360Z`/`18:31:53.867Z`. As duas identidades não possuem
vínculo nessa original. Auth em G1 + consulta de acesso no banco original
explicam a aceitação da senha seguida de negação de acesso. A arquitetura
permite identidades externas: `app_user_access.auth_user_id` não tem FK para
o schema gerenciado; não é necessário duplicar identidades nem trocar secrets
para conceder vínculos, se a continuidade desse destino for aprovada.

Encerramento confirmado: versão `1ea59a90-c289-4c99-bf8f-a0bbd82d6b37`,
deployment `e22b130f-6e70-4f90-a02e-dc7c70a9f3a3`, 100%, criado
`2026-10-17T18:58:09.806473Z`. Zero bindings `AUTH_DESTINATION_*`; probe SQL
continua sem ativação. Cinco secrets preservados por nome/tipo, sem leitura
de valores. Demais bindings e observabilidade preservados.

Proposta pronta, ainda NÃO aplicada: `SQL-ACCESS-RECONCILIATION-2026-10-17.sql`.
Após revalidar identidades verificadas e papéis ativos na origem, associar os
mesmos dois UUIDs ao banco original: um `owner`, um `manager`, ambos ativos.
Transação única com timeout, lock, precondição de allowlist vazia, referência
nova e dois eventos de auditoria. Aprovação humana fora de sessão da aplicação
é identificada no metadata; ator de sessão permanece NULL, sem fingir sessão
administrativa. Nenhuma identidade, senha, secret, schema ou regra RBAC muda.
Falha/repetição/conflito impedem a concessão, preservando dados e auditoria.

Quatro ensaios em PostgreSQL 17 descartável passaram: sucesso/auditoria e
referência consumida, rollback integral por falha tardia de auditoria,
preservação de allowlist preexistente e rejeição de alvo/identidade inválidos.
Journal e marcador gerenciado preservados em todos. Script explícito:
`node scripts/test-access-reconciliation-disposable.mjs --ack-disposable-postgres17`.
Tipos, lint, formatação e diff-check aprovados; a suíte de 479 testes e build
isolado do diagnóstico já haviam passado. Nenhuma concessão externa executada.
A nova escrita no banco original, incluindo seu primeiro Dono, exige aprovação
específica do plano acima; após aplicação, exigir novo login e validar acesso.

## Diagnóstico de destino preparado — aguardando publicação HML

Usuário confirmou a página `https://cacau-v1-hml.naiguelcabral.workers.dev/login`.
Preparado `src/features/auth/destination-diagnostic.server.ts`, chamado somente
no servidor ao resolver configuração de autenticação. Não cria endpoint nem
altera sessão, RBAC, cadastro ou vínculo. Emite exclusivamente JSON com evento
fixo `auth.destination-diagnostic` e booleano `matchesExpected`.

Desligado por padrão. Ativação requer as três variáveis não secretas:
`AUTH_DESTINATION_DIAGNOSTIC_ENABLED=true`,
`AUTH_DESTINATION_EXPECTED_BASE_URL` com o endereço Neon Auth já declarado
pelo operador e `AUTH_DESTINATION_DIAGNOSTIC_UNTIL` com expiração UTC de no
máximo 30 minutos à frente. Ausência, expiração ou configuração inválida
silenciam o diagnóstico. Nenhum endereço efetivo, e-mail, UUID, senha, token,
header, cookie ou erro bruto é registrado. Falha do logger não interrompe auth.

Plano delimitado para aprovação: publicar somente em `cacau-v1-hml`, ativar
as três vars por até 30 minutos, acessar a página de login para disparar leitura
de configuração e consultar somente o evento sanitizado. Depois desativar as
vars e reconfirmar o estado. Preservar secrets, demais bindings, observabilidade
e controles. Não habilitar probe SQL, aplicar migrations, criar usuários ou
conceder papéis por inferência. Coincidência do Auth não atesta o destino SQL.
Divergência não autoriza reescrever o secret sem decisão posterior.

Validação local: nove testes direcionados aprovados, tipos, lint, formatação,
`git diff --check` e build HML em archive + três arquivos de fonte/teste,
sem arquivos de ambiente e com chave pública sintética, aprovados. Testes de
isolamento Git falharam com `EPERM` no sandbox e os três passaram na execução
permitida fora dessa restrição. Suíte geral repetida com a permissão necessária: 479 testes aprovados,
zero falhas. A execução inicial restrita não substitui esse resultado.
Nenhuma publicação executada. Diff preserva `.env.example` fora do escopo.

## Contas Dono/Gerente — conciliação do destino

O usuário confirmou que o e-mail de Gerente é o mesmo que recebeu a
recuperação e identificou também a conta de Dono. E-mails pessoais omitidos
neste registro. Papéis solicitados: `owner` e `manager`, respectivamente.

Consulta READ ONLY, restrita aos dois e-mails indicados, não encontrou
nenhuma identidade na original `br-lingering-wind-acwh5wap`. Catálogo
confirmou que `neon_auth.user` não possui RLS habilitado/forçado e a sessão
não tem filtro RLS ativo nessa relação; portanto essa política não explica
a ausência. A mesma busca limitada na cópia `br-super-waterfall-ac0mxtnt`
retornou zero correspondências para ambas as contas.

Metadados do Worker HML confirmam que `NEON_AUTH_BASE_URL` e `DATABASE_URL`
são secrets; seus valores não foram lidos. O callback de recuperação aponta
para HML, mas não comprova o destino efetivo do provedor. Código usa
`config.baseUrl` derivado do binding para o reset. Divergência de destino é
hipótese a verificar, não causa comprovada. Solicitada URL da página de
bloqueio, sem query/token. Nenhuma identidade criada, vínculo concedido,
credencial alterada ou evento de concessão gravado.

## Confirmação do usuário e pendência de autorização

Usuário confirmou recebimento do e-mail e alteração pessoal da senha; informou
que a aplicação ainda exige autorização administrativa. Solicitou papel
Gerente para sua conta. Duas consultas READ ONLY no alvo original, restritas
ao e-mail indicado, retornaram nenhuma identidade, inclusive normalizando
espaços e caixa. Contagem de `app_user_access`: zero. Nenhum dado de sessão,
credencial ou outra identidade foi consultado; nenhum acesso foi concedido.

Próximo passo: confirmar o e-mail efetivamente usado e a URL da página antes
de resolver o UUID, verificar o e-mail e criar vínculo/auditoria atomicamente.
Não criar identidade duplicada nem alterar `emailVerified` para contornar a
pendência. Confirmação do usuário não prova acesso operacional ou conexão SQL
do Worker. Nenhuma migration `0017+` autorizada por essa solicitação.

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
