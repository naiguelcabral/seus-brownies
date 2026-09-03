# G1 — Procedimento de primeira integração em homologação

## Estado e alvo

Este procedimento é exclusivo para o branch Neon **`g1-auth-hml`**. Não é
autorização para produção, outros branches, criação de usuário, escrita de
secret ou aplicação de migration. A execução começa somente após a confirmação
humana do identificador/endpoint exato do branch alvo.

## Revisão de migration 0014

`drizzle/0014_puzzling_masque.sql` é schema-only e contém exclusivamente:

- `app_user_access`: allowlist Cacau, papel canônico e estado ativo;
- `auth_login_attempts`: hash de identidade, contador consecutivo e cooldown;
- `auth_audit_events`: eventos sanitizados de autenticação.

Ela não contém DDL FIFO, `DROP`, `TRUNCATE`, `DELETE`, backfill, DML de usuário
ou foreign key para o schema gerenciado `neon_auth`. As constraints únicas e os
índices de papel, cooldown, ator e data de auditoria sustentam o uso previsto.

Retenção e cleanup continuam operacionais: eventos de auditoria não são
apagados automaticamente; tentativas antigas só poderão ser removidas por job
com retenção aprovada, migration/consulta revisada e autorização humana.

Rollback: não remover tabelas nem eventos. Se a integração falhar, desabilitar
o caminho de autenticação implantado, manter os fatos para auditoria e criar
uma migration corretiva somente após revisão humana.

## Variáveis/configurações necessárias — somente nomes

- `DATABASE_URL` — exclusivo do branch `g1-auth-hml` durante a aplicação
  autorizada da migration.
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`
- `VITE_NEON_AUTH_URL`
- segredo server-side de validação Turnstile, com nome a definir no Worker.
- credenciais do provedor de e-mail escolhido, com nomes definidos no momento
  da configuração humana.

Nenhum valor deve entrar em Git, logs, documentação ou conversa.

## Ordem segura após confirmação humana

1. Confirmar que o alvo é exatamente o branch Neon `g1-auth-hml`, nunca
   production, e registrar o identificador sem expor URL privada.
2. Confirmar backup/rollback e que `0014` ainda não aparece no histórico do
   alvo.
3. Revisar o hash local de `0014_puzzling_masque.sql` e executar somente a
   aplicação autorizada.
4. Consultar o histórico de migrations e as três tabelas criadas; confirmar a
   ausência de alteração FIFO.
5. Provisionar/configurar Neon Auth e secrets fora do Git, com e-mail e
   callbacks aprovados.
6. Criar a identidade Neon do primeiro Admin por fluxo humano controlado.
7. Inserir **um único** vínculo ativo `app_user_access` com papel `admin`, por
   operação administrativa auditada e autorizada.
8. Executar a suíte integrada de homologação e reconciliar os eventos de
   auditoria antes de liberar qualquer outro convite.

## Bootstrap do primeiro Admin

Não haverá endpoint público de bootstrap nem autoatribuição de papel. Depois
de a identidade Neon existir e o e-mail estar verificado, uma operação manual
única, aprovada e auditada associa o `auth_user_id` dessa identidade ao papel
`admin` em `app_user_access`. O operador deve registrar ator humano, motivo,
timestamp e `request_id` em `auth_audit_events`.

Qualquer mudança posterior de papel exige `access:manage`, principal ativo,
auditoria e teste negativo. Usuário Neon sem allowlist, inativo ou com papel
inválido permanece negado.

## Casos integrados preparados

- sessão Neon sem allowlist → 401;
- allowlist inativa ou papel inválido → 401;
- e-mail não verificado → 403;
- papel insuficiente → 403;
- Admin ativo → acesso conforme matriz;
- quinta falha → auditoria, Turnstile e cooldown;
- reset → resposta sem enumeração;
- tentativa de autoatribuir papel por endpoint público → 403/ausência de rota.
