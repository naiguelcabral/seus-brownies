# Redefinição de senha em HML — 17 de outubro de 2026

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

Próximo passo proposto: publicar essa telemetria em `cacau-v1-hml`, usuário
solicitar novamente uma única vez, ler somente código/etapa e então preparar
correção específica. Publicação desse diagnóstico aguarda autorização própria;
não altera banco, roles, secrets nem política de sessão.

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
