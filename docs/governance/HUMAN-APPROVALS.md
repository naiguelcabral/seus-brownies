# Ações que exigem aprovação humana — Cacau v1

## Atualização delimitada até 0028 — plano para decisão

Após a liberação de acessos, usuário pediu continuidade da correção. Preparação
local concluída em `SCOPED-UPGRADE-0016-0028-PLAN.md`, com lote/hash e testes.
A nova gravação na principal e os valores financeiros iniciais exigem aprovação
específica do plano: snapshot novo, cópia privada com `finalize:false`, ensaio
e aplicação na original somente se passar. Não reaproveitar a autorização
limitada a `0000–0016`; não alterar secrets, endpoints/defaults, identidades
ou fazer backfill. Decisão dos valores `0019` e mix novo vazio `0028` pendente.

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

## Reconciliação de vínculos na original — proposta aprovada e aplicada

O diagnóstico autorizado concluiu sem alterar secrets ou contas e foi desligado.
Comprovado Auth em G1 e auditoria SQL na original. Os papéis declarados pelo
usuário já existem ativos em G1; não existem na allowlist do banco original.

Preparado `SQL-ACCESS-RECONCILIATION-2026-10-17.sql`: criar somente dois
vínculos no banco original, para os mesmos UUIDs existentes/verificados:
Dono da conta identificada pelo usuário e Gerente da conta recuperada.
As duas concessões e dois eventos auditáveis pertencem à mesma transação,
com referência nova, sem overwrite e com precondição de allowlist vazia.
Não cria usuários, muda senhas, secrets, origem Auth ou regra RBAC.

Autorização específica concedida depois da proposta, inclusive para o
primeiro vínculo Dono. Aplicação/recibo no registro acima; o diagnóstico
sozinho não autorizava essa gravação. Quatro cenários PostgreSQL descartáveis aprovados.
Antes de executar, revalidar os papéis/verificação na origem e a ausência de
vínculos no alvo. Registrar a decisão humana com a referência real consumida.

## Diagnóstico temporário de destino — autorização de 17 de outubro de 2026

Usuário autorizou publicar e ativar em `cacau-v1-hml` o diagnóstico booleano
revisado em `2a81d4b`, por até 30 minutos, desativando-o após a conferência.
Somente compara o endereço Auth declarado; não revela o secret nem concede
acessos. Não autoriza alterar secrets, origem efetiva, usuários ou migrations.

## Identificação das duas contas — 17 de outubro de 2026

Usuário confirmou a conta de Gerente e identificou sua outra conta como Dono.
Escopo de conciliação restrito a essas duas identidades, sem ampliar permissões
de outras contas ou alterar a política RBAC. Nenhuma identidade encontrada
na original ou cópia; nenhuma concessão executada. E-mails omitidos do Git.

## Solicitação de papel Gerente — 17 de outubro de 2026

Após confirmar a recuperação da senha, o usuário identificou sua conta e
solicitou explicitamente papel **Gerente**. Escopo: localizar essa identidade
existente, confirmar e-mail verificado e conceder somente o papel solicitado,
com vínculo e auditoria na mesma transação. Não inclui criação de identidade,
alteração de senha/verificação, papel Dono, política RBAC ou outras contas.

Consulta direcionada não encontrou a identidade no alvo original. Concessão
não executada; depende da conciliação da conta e do ambiente. E-mail pessoal
omitido deste registro versionado.

## Recuperação de endpoints após restore — 17 de outubro de 2026

Após explicação do incidente e da rejeição automática, o usuário autorizou
explicitamente realocar os endpoints pelo estacionamento, devolver o nome
`production` e default/primary à original `br-lingering-wind-acwh5wap` e
isolar a cópia, conforme `NEON-RESTORE-INCIDENT-2026-10-17.md`.
As três realocações, renomeações e default foram executados e reconfirmados.
Neon Auth e JWKS da original voltaram ao endpoint original. Não restaurar dados
sobre a original, apagar recursos ou ampliar credenciais por essa autorização.

## Baseline até 0016 — autorização de 17 de outubro de 2026

O usuário aprovou o plano `AUTH-BASELINE-0016-EXECUTION-PLAN.md`: snapshot,
cópia privada, ensaio e inicialização canônica da branch original até `0016`
somente se passar. Não inclui `0017–0028`, criação de usuários ou concessão
de Dono. A recuperação da troca acidental de endpoints/nome/default descrita
em `NEON-RESTORE-INCIDENT-2026-10-17.md` exige consentimento explícito após
rejeição automática; nenhuma migration externa foi executada.

## Exceção pontual de catálogo — 17 de outubro de 2026

Após o resultado inicial, o usuário autorizou ampliar somente o inventário de
metadados conforme `SQL-AUTH-BASELINE-INVENTORY-2026-10-17.sql`: relações de
`public`/`drizzle` e labels dos dois enums auth, no mesmo alvo e sob READ ONLY.
Executado sem DDL/DML e sem leitura de dados do provedor/aplicação.
Não autoriza inicializar schema, criar snapshot/branch ou aplicar migrations.

Após proposta do SQL `SQL-AUTH-CATALOG-PREFLIGHT-2026-10-17.sql`, o usuário
autorizou o teste pelo MCP administrativo, em transação READ ONLY, no projeto
`steep-brook-51659857`, branch `br-lingering-wind-acwh5wap`, database `neondb`.
Escopo: presença/schema/colunas das três relações de autenticação e somente
presença do journal. Exceção limitada ao requisito de role não gravável de M45;
não autoriza nova role/grant, escrita, migration, leitura de usuários/negócio
ou inventário ampliado. Executado com `transaction_read_only=on` confirmado.

O usuário autorizou também publicar o diagnóstico sanitizado de falha da
auditoria do reset em `cacau-v1-hml`, após proposta e validação do commit
`6f67aed`. Não autoriza dispensar auditoria, aplicar migrations ou alterar
secrets, credenciais e papéis para contornar a falha.

## Recuperação de senha HML — 17 de outubro de 2026

Após revisão dos dois bloqueios em `HML-PASSWORD-RESET-2026-10-17.md`, o usuário
autorizou explicitamente publicar a correção do callback no Worker
`cacau-v1-hml` e adicionar somente
`https://cacau-v1-hml.naiguelcabral.workers.dev` às origens confiáveis do Neon
Auth do projeto `steep-brook-51659857`, branch
`br-lingering-wind-acwh5wap` / `production`.
Não autoriza wildcard, mudança de secrets, usuários/senhas, RBAC, SMTP,
cadastro ou requisitos de verificação, schema ou dados de negócio.
A solicitação e conclusão de recuperação serão feitas pelo próprio usuário.

## Diagnóstico SQL temporário — 17 de outubro de 2026

O usuário autorizou nesta conversa publicar em `cacau-v1-hml` para testar a
conexão, após proposta explícita de publicação do diagnóstico, ativação
temporária, teste com sessão administrativa existente e desativação ao fim.
Alvo informado: `steep-brook-51659857` / `br-lingering-wind-acwh5wap`.

Na retomada, autorizou explicitamente acrescentar somente
`workers_scripts:write` ao OAuth do Wrangler para essa publicação, após
explicação de que o scope permite modificar Workers acessíveis à conta.
Consentimento oficial concluído pelo usuário e confirmado pela CLI.
Não autoriza permissão de rotas nem modifica o alvo da publicação.

Escopo: publicar o código revisado do diagnóstico em HML; habilitar
temporariamente `SQL_CONNECTION_PROBE_ENABLED`; executar o probe fixo
`SELECT 1` em READ ONLY, com rollback/fechamento; desabilitar o flag e
registrar versões/resultados sanitizados. Não autoriza migrations, reparos,
backfill, mudança de secrets, criação de identidades, RBAC ou deploy do
Worker `cacau-v1`. A autenticação existente permanece obrigatória.

O Codex pode trabalhar de forma autônoma dentro do repositório, mas os itens abaixo são gates obrigatórios.

## Decisões financeiras aprovadas

### G2 — competência, lifecycle, CMV e mix

Aprovado pelo usuário em 11 de setembro de 2026:

1. receita por competência é reconhecida na entrega; caixa permanece uma visão
   separada;
2. fatos originais não são apagados; erro corrige o período original e evento
   posterior pertence à data em que ocorreu;
3. Dono ou Gerente decide entre reembolso e crédito futuro, sempre com registro
   e auditoria;
4. CMV realizado usa FIFO e as alocações de cada item vendido;
5. cancelamento antes da entrega restaura estoque; devolução após a entrega não
   retorna alimento ao estoque vendável;
6. períodos têm fechamento manual; somente Dono corrige período fechado;
7. receita líquida, margem bruta, margem de contribuição, lucro gerencial e
   fluxo de caixa são indicadores distintos;
8. mão de obra e energia diretamente produtivas integram o custo da produção e
   não são descontadas novamente;
9. margem mínima de 70% é alerta configurável, nunca bloqueio de venda;
10. o mix histórico de 103% é normalizado proporcionalmente para 100%,
    preservando os pesos originais.

Aprovado pelo usuário em 14 de setembro de 2026:

11. o resgate de crédito futuro apenas consome o saldo disponível; não produz
    novo efeito em receita nem em caixa.

Esta aprovação autoriza implementação local, testes e migrations aditivas para
revisão. Não autoriza aplicar migration, corrigir dados compartilhados, fazer
backfill, merge ou deploy.

## Aprovação obrigatória

### Produção e infraestrutura

- deploy de produção;
- alteração de Worker/DNS/domínio de produção;
- alteração de secrets;
- alteração do ambiente de produção do Neon;
- promoção de dados entre ambientes.

### Banco e dados

- migration destrutiva;
- `DROP`, `TRUNCATE` ou exclusão em massa;
- backfill de escrita em ambiente compartilhado;
- reprocessamento de importação já aplicada;
- limpeza de dados HML;
- reutilização de referência idempotente consumida;
- correção manual de FIFO/CMV fora de rotina já aprovada.

### Arquitetura

- troca de framework, ORM, banco, hospedagem ou estratégia principal de autenticação;
- inclusão de serviço externo com custo ou dependência operacional relevante;
- mudança de precisão monetária/quantitativa;
- alteração de regra de negócio com impacto financeiro ou de estoque.

### Segurança

- redução de controles de autenticação;
- mudança de RBAC/permissões;
- alteração de política de sessão;
- exposição pública de rota anteriormente protegida.

## Permitido sem aprovação específica

Desde que dentro de uma branch de trabalho e respeitando o restante da governança:

- ler código e documentação versionada, exceto `.env`;
- criar ou editar código;
- criar testes;
- executar testes locais;
- executar lint/build/check;
- gerar migration para revisão sem aplicá-la em ambiente relevante;
- atualizar documentação;
- criar commits locais/descritivos quando o nível de autonomia permitir;
- preparar PR.

## Regra de parada

Ao encontrar qualquer gate desta lista, o agente deve:

1. concluir tudo o que for seguro e reversível antes do gate;
2. registrar o estado atual;
3. explicar exatamente qual decisão é necessária;
4. não contornar o gate por outro caminho técnico.
