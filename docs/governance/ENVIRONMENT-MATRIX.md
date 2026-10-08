# Ambientes e evidência somente leitura — Cacau v1

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
