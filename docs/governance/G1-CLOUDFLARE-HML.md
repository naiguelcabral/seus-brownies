# G1 — Worker Cloudflare de homologação

## Estado publicado em HML

`wrangler.jsonc` declara o environment `hml` para o Worker separado
`cacau-v1-hml`. O Worker principal `cacau-v1` permanece como configuração de
topo, sem rota, DNS, secret ou binding alterado.

O environment HML preserva `compatibility_date: 2025-09-02` e
`compatibility_flags: ["nodejs_compat"]` por herança. Ele define
`workers_dev: true`, portanto o primeiro deploy cria somente o hostname isolado
`cacau-v1-hml.<conta>.workers.dev`. Não há rota, DNS nem custom domain
declarado; qualquer um deles continua sendo um gate posterior e explícito.

O primeiro deploy foi concluído exclusivamente em HML em 4 de setembro de
2026, após a gravação dos cinco secrets por prompt seguro. A URL estável é:

```text
https://cacau-v1-hml.naiguelcabral.workers.dev
```

O deploy ativo mantém `compatibility_date: 2025-09-02`,
`compatibility_flags: ["nodejs_compat"]` e os cinco secrets somente pelos
nomes. Não há rota, DNS, custom domain ou alteração em `cacau-v1`.

## Scripts preparados

```bash
# Desenvolvimento local selecionando a configuração HML.
# Não executa deploy. Forneça bindings apenas pelo mecanismo local aprovado.
npm run dev:hml

# Rebuild e redeploy isolado de HML. Exige branch de trabalho e árvore limpa.
npm run deploy:hml

# Adiciona um único secret ao Worker HML — NÃO executar até aprovação humana.
npm run secret:hml -- NOME_DO_SECRET
```

`build:hml` e `deploy:hml` criam uma cópia temporária do `HEAD`, sem arquivos
não versionados, e iniciam os processos com ambiente reduzido. Assim, não
consultam `.env*` nem passam secrets server-side ao build. `deploy:hml` fixa
`CLOUDFLARE_ENV=hml` e usa `wrangler deploy --env hml`; nunca chama o Worker
sem environment. `secret:hml` fixa `--env hml`, portanto não altera `cacau-v1`.

## Bindings e configurações exigidos antes do deploy

| Área             | Binding/configuração                                                                               | Estado                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Banco HML        | secret `DATABASE_URL`, exclusivo de `g1-auth-hml`                                                  | configurado; valor não inspecionado                              |
| Neon Auth        | `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET`                                                   | configurados; valores não inspecionados                          |
| Tentativas       | secret `AUTH_LOGIN_HASH_PEPPER`, diferente do cookie secret                                        | configurado; valor não inspecionado                              |
| Turnstile        | secret `TURNSTILE_SECRET_KEY` e variável pública `VITE_TURNSTILE_SITE_KEY` quando a UI for ativada | secret configurado; sitekey/UI pendentes                         |
| Rate Limiting    | binding `AUTH_RATE_LIMITER` HML com `namespace_id` numérico exclusivo e política aprovada          | não declarado até existir namespace real; nunca usar placeholder |
| E-mail/callbacks | origem confiável, callback, verificação e provedor no Neon Auth HML                                | gate externo separado                                            |

`VITE_TURNSTILE_SITE_KEY` é client-safe e não integra `secrets.required`.
`VITE_NEON_AUTH_URL` fica dispensado enquanto a integração permanecer mediada
pelo servidor. Não registrar valores públicos em `wrangler.jsonc` sem uma
necessidade concreta da UI e uma revisão do pipeline HML.

`secrets.required` documenta nomes para tipagem, limita o carregamento local e
valida ausências no deploy; não cria valores no Worker. Assim, os cinco secrets
devem ser gravados antes do primeiro deploy. Enquanto estiverem ausentes, o
resolvedor de principal retorna anônimo e os guards das Server Functions falham
fechados antes de consultar o banco, mas esse comportamento não substitui a
validação do Wrangler.

## Origens permitidas de autenticação

Sem wildcard de preview, toda configuração de callback, trusted origin ou
trusted domain usada pelo Neon Auth deve aceitar somente:

- `http://localhost:3000`
- `https://cacau-v1-hml.naiguelcabral.workers.dev`

O hostname HML também deve ser adicionado ao widget Turnstile `cacau-v1-hml`,
preservando `localhost`. O sitekey é client-safe, mas continua fora do Git; o
secret permanece somente no Worker.

## Ordem segura do próximo gate

1. Configurar as duas origens explícitas no Neon Auth HML e no Turnstile,
   preservando `localhost` e sem wildcard.
2. Investigar a resposta `403` atual do hostname `workers.dev` antes de novo
   deploy; o upload e a versão ativa foram confirmados, mas a aplicação ainda
   não respondeu publicamente.
3. Configurar e-mail e Rate Limiting; registrar o
   namespace HML real de rate limit na configuração versionada.
4. Validar o Worker HML sem criar Admin ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap do Admin.

## Smoke e gate externo atual

O deployment ativo e os cinco nomes de secrets foram confirmados sem expor
valores. Contudo, o GET sem sessão à URL estável retornou `403 Forbidden` na
borda antes de HTML, cookie ou execução visível da aplicação. Não fazer novo
deploy às cegas: o próximo passo é confirmar no dashboard se o acesso a
`workers.dev` está desabilitado ou protegido por Cloudflare Access no nível da
conta/Worker. Essa configuração externa precisa ser ajustada antes do smoke de
auth e do bootstrap do primeiro Admin.
