# Redefinição de senha em HML — 17 de outubro de 2026

## Relato e alvo

Usuário relatou falha de senha em `cacau-v1-hml` e ausência do e-mail de
**redefinição**, não do código de confirmação de cadastro. Mensagem exata
do login ainda solicitada. Não concluir que a senha está incorreta nem que
o provedor rejeitou a entrega sem evidência da requisição específica.

Worker ativo: versão `6b737c00-e80b-4217-9b03-6d84829035e4`, 100%.
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

## Aplicação externa pendente de autorização específica

1. Aprovar publicar a correção no Worker `cacau-v1-hml` e adicionar somente
   `https://cacau-v1-hml.naiguelcabral.workers.dev`, sem wildcard, às origens
   confiáveis do Neon Auth de `br-lingering-wind-acwh5wap` / `production`.
   A autorização anterior cobria o diagnóstico SQL, não esta alteração da
   configuração de autenticação de produção. Gates em `HUMAN-APPROVALS.md`.
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
