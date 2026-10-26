# Ambientes e evidência somente leitura — Cacau v1

## Configuração Auth e piloto — 26/10/2026

Usuário autorizou “Pode configurar”. #77 integrada em `c6ff2b6`; diretórios restritos configurados no HML/Auth e no piloto, duas cópias Neon e seis secrets próprios do novo Worker preparados. Originais preservadas. Testes finais, publicação e aceite real pendentes. [Recibo e próximos passos](PILOT-CONFIGURATION-2026-10-26.md).

## Publicação autorizada — 26/10/2026

Somente Worker `cacau-v1-hml`: código integrado `82eebfc`, deployment
`5db64ef3-0fb4-482b-8539-87d722abef81`, versão
`42da8a96-c5ed-4573-9d58-c5c8030f0df7`, 100% às 14:13:17 UTC.
[Recibo e readback](HML-PUBLICATION-2026-10-26.md). Três bindings de limite,
origem confiável e redação de query confirmados; nomes/tipos dos cinco secrets
mantidos, sem leitura/comparação de valores. Site key pública igual à anterior.

Sem comandos SQL/migrations, mudança de secrets/DNS ou ambiente Neon. A
classificação da original como production e os destinos históricos abaixo
permanecem; publicar o Worker HML não cria laboratório nem autoriza dados
sintéticos compartilhados. A versão de 22/10 abaixo passa a ser histórica.

## Recuperação HML — 22/10/2026

Leituras atuais confirmam o banco operacional em
`steep-brook-51659857/br-lingering-wind-acwh5wap/neondb` e as identidades em
`br-patient-lake-ac2t0cvq` (`g1-auth-hml`). Os três computes estão ativos.
O destino SQL foi confrontado em memória com a variável então visível no
Worker, sem emitir credenciais: corresponde à original, com pooling. A
classificação de produção dessa base é preservada; não é laboratório.

Após autorização de reparo, `DATABASE_URL` voltou a `secret_text` e
`NEON_AUTH_BASE_URL` foi reconstruído da branch de identidades. Demais
bindings/observabilidade preservados. HML agora está em `997f47bb`, 100%;
raiz307/login200, sessão inválida recuperada de500 para200. Os quatro acessos
correspondem a identidades verificadas; entrada com senha real ainda sem
confirmação neste checkpoint. [Registro](NEON-AUTH-RECOVERY-2026-10-22.md).
Esta seção prevalece sobre os retratos históricos abaixo.

## Reconciliação atual — 21/10/2026

Main `b82e044`; último HML registrado `bb76764`/`22733c04`. O
[inventário sanitizado](../../evidence/environment-metadata-2026-10-21.json)
reconfirma dez branches no projeto steep-brook, original production
primary/default, Development e g1-auth-hml com IDs distintos. Metadados não
provam schema atual, role não gravável ou vínculo Worker. Sem SQL externo,
alteração de classificação, endpoint ou compute nesta rodada.

Restore dos bytes baixados do Drive comprovado em PostgreSQL 17 sem rede:
38 tabelas, 36 recibos exatos e catálogo independente 0033.
[Recibo](../../evidence/offsite-restore-2026-10-21.json). Não torna a original
production um laboratório nem autoriza migração genérica. Laboratório
interface/HTTP/PostgreSQL entregue com identidade sintética; aceites reais
seguem separados. Ver [procedimento T02](MIGRATION-OPERATOR-PROCEDURE.md).
Esta seção prevalece sobre versões/dependências antigas abaixo.

## Reconciliação atual — 20/10/2026

Esta seção prevalece sobre o retrato histórico de 08/10 abaixo. Inspeção atual
limitada a metadados Neon e configurações/deployment do `cacau-v1-hml`; nenhum
SQL, string de conexão, secret, identidade pessoal ou conteúdo operacional
compartilhado foi consultado nesta reconciliação.

- HML publicado: código `3f0ba59`, versão `e2aba61f-ca72-4459-a0d7-95867cdb2e67`,
  100% de tráfego, deployment `846b959a-1c69-4508-83bd-c823a6d8ce3a`,
  de20/10/2026 16:34:55 UTC. Correção de sessão após investigação do500
  preexistente; oito GETs/tail normais e readback de14 eventos sem500.
  Não comprova sessão autenticada ou causa upstream histórica.
- Settings confirmam `AUTH_RATE_LIMITER` e os nomes de bindings de autenticação,
  banco e recuperação. Valores não foram exibidos. `observability.logs.enabled`,
  `persist` e `invocation_logs` estão verdadeiros; o campo pai `enabled:false`
  não deve ser confundido com ausência de logs quando existe a configuração
  explícita `logs.enabled:true`. Traces/issues estão desabilitados; alertas e
  resposta a incidentes seguem como trabalho próprio em I03.
- Projeto `steep-brook-51659857`: a original `br-lingering-wind-acwh5wap` está
  `production`, primary/default, endpoint `ep-[redacted:26398d41]`. O histórico
  de reparo/HML usou essa original sob autorizações específicas; isso não
  muda sua classificação nem autoriza testes sintéticos ou migrador genérico.
- `Development` agora corresponde a `br-bitter-dew-ac31uci9`; `g1-auth-hml` a
  `br-patient-lake-ac2t0cvq`. Nomes/IDs de antes do incidente de restauração
  não devem ser reutilizados como prova de destino. Branches de backup e
  validação existentes foram preservadas, sem promoção, reset ou remoção.
- Projeto `cool-base-25902164`: `production/br-empty-frog-acy6xycn` e
  `development/br-lively-term-ac9i0mvr` estão arquivadas. Não foram reativadas.
- **Atualização de 22/10/2026 (resposta a incidente de credencial):**
  - a senha do `neondb_owner` da `production` foi rotacionada pelo Dono;
    `g1-auth-hml` e `Development` usam senha diferente da exposta;
  - as branches de validação `cacau-baseline-0016-validation-20261017`,
    `cacau-baseline-endpoint-parking-20261017`,
    `cacau-upgrade-0028-validation-20261017` e
    `cacau-exact-costs-validation-20261018` foram removidas pelo Dono;
  - as branches de backup `cacau-pre-upgrade-0028-backup-20261017`,
    `cacau-exact-costs-backup-20261018` e `backup-technical-catalog-2026-10-18`
    seguem preservadas e **sem compute**, portanto inacessíveis por conexão.
    Ao criar compute para restaurar uma delas, resetar a senha do
    `neondb_owner` antes de qualquer uso;
  - o projeto `cool-base-25902164` (arquivado) foi apagado; o operacional é
    só `steep-brook-51659857`;
  - IDs de endpoint e hostnames Neon passaram a ser versionados só como hash
    (`ep-[redacted:<8 hex>]` = início do SHA-256 do ID original).
- A identidade atual Worker → banco não é comprovada por um binding secreto
  chamado `DATABASE_URL`. A revisão genérica continua bloqueando a original
  conhecida como produção; falta evidência independente do destino para
  qualquer aplicação futura. Não renomear/reclassificar por inferência.

Topologia de QA autorizada: Node/fakes e arquivos temporários; PostgreSQL 17
local/CI com dados sintéticos; navegador com rede limitada ao loopback. Nenhum
novo projeto, branch ou compute compartilhado foi criado. Contrato em
[QA-VALIDATION-PROTOCOL.md](QA-VALIDATION-PROTOCOL.md). O acompanhamento único
continua no roadmap; as restrições históricas abaixo descrevem aquela missão.

## Evidência histórica — 08/10/2026

Preparado em 8 de outubro de 2026. Esta matriz documenta o estado observado
e os limites desta missão; não cria ambiente, secret, compute ou autorização
de publicação. [HUMAN-APPROVALS.md](HUMAN-APPROVALS.md) e
[SECURITY.md](SECURITY.md) continuam obrigatórios.

## Matriz operacional

| Contexto                    | Alvo/seleção                                                | Evidência e limite                                                                                                      |
| --------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Local                       | Testes e fakes; código versionado                           | Não conectar automaticamente a banco compartilhado ou carregar arquivos secretos para teste/build                       |
| CI                          | Checkout do commit; suíte/lint/tipos/build isolado          | Chave pública sintética explícita; sucesso não implica deploy ou homologação HML                                        |
| HML autorizado nesta missão | Neon `seus-brownies` / `development`; Worker `cacau-v1-hml` | MCP somente leitura; aplicação de migrations, correção de dados e alterações de infraestrutura continuam humanas        |
| HML histórico de G1         | Plano registra outro projeto/branch `g1-auth-hml`           | Evidência histórica preservada; esse branch não recebeu SQL nesta missão e não é substituto automático de `development` |
| Staging                     | Não há `env.staging` na configuração versionada             | NEEDS_HUMAN para decidir topologia, recursos e custo; não criar por inferência                                          |
| Produção                    | Fora do escopo; nenhum alvo externo consultado              | NOT_ACCESSED; configuração raiz do Worker não prova ambiente nem autoriza publicação                                    |

`main` é uma branch Git, não um banco ou ambiente. `build:ci-isolated`
valida o bundle sem carregar credenciais e sem publicar. O workflow atual
usa build HML isolado nas PRs/branches de trabalho; ele também não publica.
Não usar o comando de deploy como validação de build.

## Resolução do alvo Neon

O catálogo retornou dois projetos com nome `seus-brownies`. A seleção foi
resolvida pelo nome **exato** da branch autorizada:

- projeto `cool-base-25902164`, branch `development`, ID
  `br-lively-term-ac9i0mvr`, não padrão: alvo consultado;
- outro projeto contém `Development` e o plano histórico de G1 aponta
  `g1-auth-hml`: nenhum SQL executado nesses branches.

Todos os SELECTs informaram explicitamente projeto, branch e database
`neondb`; nenhum fallback para branch padrão foi usado. A credencial/DSN do
Worker não foi consultada, portanto **não foi comprovado** que o Worker
publicado aponta para esse database. Essa associação exige conferência
operacional autorizada sem expor valores secretos.

### Evidência de catálogo em `development` / `neondb`

`SELECT 1 AS read_only_probe` retornou `1`.

Consulta de `to_regclass` retornou `present=false` para:

| Relação consultada                  | Presente |
| ----------------------------------- | -------- |
| `public.production_batches`         | não      |
| `public.production_batch_outputs`   | não      |
| `public.production_batch_losses`    | não      |
| `public.inventory_cost_layers`      | não      |
| `public.inventory_cost_allocations` | não      |
| `public.inventory_cost_reversals`   | não      |
| `public.financial_events`           | não      |
| `public.management_settings`        | não      |
| `public.management_scenarios`       | não      |
| `drizzle.__drizzle_migrations`      | não      |

Isso demonstra ausência **dessas relações nesse database/schema consultado**,
não ausência de todos os dados no branch nem reversão das homologações
históricas. Sem essas estruturas, o diagnóstico operacional FIFO/CMV não
pode ser executado nesse alvo. Não aplicar schema ou copiar dados de outro
branch para desbloqueá-lo. Estado: **BLOCKED_SCHEMA_ON_AUTHORIZED_TARGET**;
decisão de associação e autorização de aplicação permanecem humanas.

## Worker HML: versionado × publicado

A configuração versionada define `env.hml.name=cacau-v1-hml`,
`AUTH_RATE_LIMITER_REQUIRED`, binding `AUTH_RATE_LIMITER`, namespace
`2026091001` e política `20/60s`. Esses números são configuração existente,
não uma política nova aprovada por este documento.

GET de settings de **somente `cacau-v1-hml`** retornou:

- compatibility date `2025-09-02` e flag `nodejs_compat`;
- nomes/tipos de cinco bindings `secret_text`: `DATABASE_URL`,
  `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `TURNSTILE_SECRET_KEY`,
  `AUTH_LOGIN_HASH_PEPPER`;
- nenhum binding `AUTH_RATE_LIMITER` nem variável
  `AUTH_RATE_LIMITER_REQUIRED` na lista retornada;
- configuração de observability não retornada: estado não comprovado.

Somente nomes/tipos foram projetados pelo MCP. **Nenhum valor** de secret,
binding de texto ou URL privada foi lido/exibido. Presença de um nome não
confirma validade, comprimento, destino ou correspondência entre credenciais.

GET de deployments HML, limitado a um resultado, retornou publicação em
`2026-09-07T03:35:45.376019Z`, deployment
`8268b409-34bc-4881-9694-52c292da2da3`, versão
`e241b715-99bf-4a83-82ba-eef24fedadaa` com 100% do tráfego. Não se inferiu
commit Git dessa versão. Nenhum deploy foi realizado nesta missão.

Estado: **BLOCKED_HML_PUBLISHED_CONFIG_DIFFERS**. O código/configuração local
de rate limit já existe; publicação e validação efetiva exigem gate humano.
Não criar namespace, alterar binding ou executar CAPTCHA/replay real para
fechar a diferença automaticamente.

## Contratos de configuração e próximos passos

Bindings/vars/secrets devem ser conferidos por ambiente. A documentação
oficial estabelece que não são herdados automaticamente por environments;
no Vite plugin, a seleção usa `CLOUDFLARE_ENV`.
[Cloudflare Docs — environments](https://developers.cloudflare.com/workers/wrangler/environments/).

Os nomes obrigatórios do runtime estão no código e em `wrangler.jsonc`.
`PASSWORD_RESET_REDIRECT_ORIGIN` é necessário para o fluxo real fora de
desenvolvimento; sua presença/valor não foi consultada nem alterada. Chave
Turnstile sintética valida build local/CI, não valida CAPTCHA real em HML.

Próximas ações humanas mínimas:

1. Confirmar a associação Worker HML × projeto/branch/database autorizado,
   registrando apenas identificadores e resultado sanitizado.
2. Decidir/revisar/aprovar schema no alvo efetivo, com backup, janela e plano
   de recuperação; não presumir que a autorização histórica vale para outro
   projeto/branch.
3. Revisar publicação HML da configuração versionada e homologação de
   controles/fluxos com identidade e referências inéditas autorizadas.

Até os gates, testes locais e novas tarefas independentes continuam permitidos.
Produção Neon/Cloudflare não foi acessada; nenhuma migration foi aplicada.
