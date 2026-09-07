# G1 — Procedimento de primeira integração em homologação

## Estado e alvo

### Atualização de 6 de setembro de 2026 — transição de papéis

As migrations `0015` e `0016` foram aplicadas e registradas no histórico
Drizzle do mesmo branch HML. Elas adicionam os papéis `owner` e `employee` e
convertem o vínculo legado `admin` para `owner`, com evento de auditoria para a
transição. Um vínculo de Gerente foi criado por operação humana autorizada e
auditada, depois de a respectiva identidade estar verificada.

Identidades ainda sem e-mail verificado não receberam vínculo de acesso. A
próxima liberação só poderá ocorrer depois da verificação OTP e de nova
operação auditada. Essas alterações são exclusivas do banco HML. À época, elas
não resolviam o `403` de borda nem substituíam a publicação HML do código que
reconhece a política atual; posteriormente, o Worker recebeu esse código e o
smoke público confirmou `/login` com `200` e o redirecionamento de `/` sem
sessão. A homologação integrada continua pendente.

Este procedimento é exclusivo para o branch Neon **`g1-auth-hml`**. Em 3 de
setembro de 2026, após confirmação humana do alvo, a migration `0014` foi
aplicada exclusivamente nesse branch não padrão. Não é autorização para
produção, outros branches, criação de usuário, escrita de secret ou nova
operação de banco.

Identificação registrada sem credenciais: projeto `steep-brook-51659857`,
branch `g1-auth-hml`, branch ID `br-patient-lake-ac2t0cvq`, Neon Auth ativo e
branch não padrão.

### Resultado original da aplicação de 0014 (3 de setembro de 2026)

- Histórico Drizzle: 15 migrations, com `0014_puzzling_masque.sql` registrada
  pelo hash local revisado.
- Criadas somente as tabelas `app_user_access`, `auth_login_attempts` e
  `auth_audit_events`, seus dois tipos de enumeração e quatro índices.
- Confirmadas as unicidades de `app_user_access.auth_user_id` e
  `auth_login_attempts.identity_hash`, além dos índices de papel, cooldown,
  ator e data de auditoria.
- As três tabelas estavam vazias imediatamente após a aplicação: nenhum
  usuário, vínculo de acesso, tentativa ou evento de auditoria foi criado.
- As estruturas FIFO existentes permaneceram presentes sem alteração:
  `inventory_cost_layers`, `inventory_cost_allocations` e
  `inventory_cost_reversals` mantiveram suas contagens de colunas auditadas.

O bootstrap manual, único e auditado do primeiro Dono de homologação foi
executado posteriormente sob autorização humana. A migration `0016` o
converteu para Dono e registrou o evento correspondente. Nenhuma identidade
Neon Auth, schema gerenciado ou dado operacional foi alterado nessa operação.
O próximo gate externo é a validação integrada dos fluxos de sessão,
recuperação e controles antiabuso.

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
- `TURNSTILE_SECRET_KEY` — segredo server-side de validação Turnstile no
  Worker HML.
- credenciais do provedor de e-mail escolhido, com nomes definidos no momento
  da configuração humana.

Nenhum valor deve entrar em Git, logs, documentação ou conversa.

## Ordem segura após a aplicação de schema

1. Manter a evidência da aplicação: alvo `g1-auth-hml`, hash revisado,
   histórico de migrations, tabelas, constraints, índices e invariantes FIFO.
2. Provisionar/configurar a integração real e secrets fora do Git, com e-mail e
   callbacks aprovados.
3. Criar a identidade Neon do primeiro Dono por fluxo humano controlado.
4. Inserir **um único** vínculo ativo `app_user_access` com papel `owner`, por
   operação administrativa auditada e autorizada.
5. Executar a suíte integrada de homologação e reconciliar os eventos de
   auditoria antes de liberar qualquer outro convite.

## Bootstrap do primeiro Dono

Não haverá endpoint público de bootstrap nem autoatribuição de papel. Depois
de a identidade Neon existir e o e-mail estar verificado, uma operação manual
única, aprovada e auditada associa o `auth_user_id` dessa identidade ao papel
`owner` em `app_user_access`. O operador deve registrar ator humano, motivo,
timestamp e `request_id` em `auth_audit_events`.

Qualquer mudança posterior de papel exige `access:manage`, principal ativo,
auditoria e teste negativo. Usuário Neon sem allowlist, inativo ou com papel
inválido permanece negado.

## Casos integrados preparados

- sessão Neon sem allowlist → 401;
- allowlist inativa ou papel inválido → 401;
- e-mail não verificado → 403;
- papel insuficiente → 403;
- Dono ativo → acesso conforme matriz;
- quinta falha → auditoria, Turnstile e cooldown;
- reset → resposta sem enumeração;
- tentativa de autoatribuir papel por endpoint público → 403/ausência de rota.

## Evidência publicada posterior

Em 6 de setembro, o Worker HML recebeu o código atual; a versão publicada
reconhece `owner`, `/login` respondeu `200` e `/` sem sessão redirecionou para
`/login`. O Turnstile foi publicado com o widget limitado a `localhost`,
`127.0.0.1` e ao hostname HML; a site key pública foi incluída no bundle HML,
o segredo foi atualizado somente no Worker HML e a validação sanitizada por
Siteverify passou. Essa evidência não substitui os casos integrados preparados:
desafio real, token inválido, replay, login, OTP, reset, logout, cookie, sessão
e negações por papel continuam gates de homologação.
