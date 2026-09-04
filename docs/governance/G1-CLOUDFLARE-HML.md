# G1 — Worker Cloudflare de homologação

## Estado preparado, ainda não implantado

`wrangler.jsonc` declara o environment `hml`, que cria o Worker separado
`cacau-v1-hml` quando for implantado com `--env hml`. O Worker principal
`cacau-v1` permanece como configuração de topo, sem rota, DNS, secret ou
binding alterado.

O environment HML preserva `compatibility_date: 2025-09-02` e
`compatibility_flags: ["nodejs_compat"]` por herança. Ele define
`workers_dev: true`, portanto o primeiro deploy cria somente o hostname isolado
`cacau-v1-hml.<conta>.workers.dev`. Não há rota, DNS nem custom domain
declarado; qualquer um deles continua sendo um gate posterior e explícito.

## Scripts preparados

```bash
# Desenvolvimento local selecionando a configuração HML.
# Não executa deploy. Forneça bindings apenas pelo mecanismo local aprovado.
npm run dev:hml

# Primeiro deploy HML — NÃO executar até aprovação humana explícita.
npm run deploy:hml

# Adiciona um único secret ao Worker HML — NÃO executar até aprovação humana.
npm run secret:hml -- NOME_DO_SECRET
```

`deploy:hml` fixa `CLOUDFLARE_ENV=hml` no build do plugin Vite e usa
`wrangler deploy --env hml`; nunca chama o Worker sem environment. `secret:hml`
fixa `--env hml`, portanto não altera `cacau-v1`.

## Bindings e configurações exigidos antes do deploy

| Área             | Binding/configuração                                                                               | Estado                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Banco HML        | secret `DATABASE_URL`, exclusivo de `g1-auth-hml`                                                  | nome declarado; valor não gravado                                |
| Neon Auth        | `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET`                                                   | nomes declarados; endpoint/secret pendentes                      |
| Tentativas       | secret `AUTH_LOGIN_HASH_PEPPER`, diferente do cookie secret                                        | nome declarado; valor não gravado                                |
| Turnstile        | secret `TURNSTILE_SECRET_KEY` e variável pública `VITE_TURNSTILE_SITE_KEY` quando a UI for ativada | pendente de configuração externa                                 |
| Rate Limiting    | binding `AUTH_RATE_LIMITER` HML com `namespace_id` numérico exclusivo e política aprovada          | não declarado até existir namespace real; nunca usar placeholder |
| E-mail/callbacks | origem confiável, callback, verificação e provedor no Neon Auth HML                                | gate externo separado                                            |

`VITE_TURNSTILE_SITE_KEY` é client-safe e não integra `secrets.required`.
`VITE_NEON_AUTH_URL` fica dispensado enquanto a integração permanecer mediada
pelo servidor. Não registrar valores públicos em `wrangler.jsonc` sem uma
necessidade concreta da UI e uma revisão do pipeline HML.

`secrets.required` documenta nomes para tipagem e avisa sobre ausências no
desenvolvimento local; não é um bloqueio de deploy nem cria valores no
Worker. O primeiro deploy HML pode ocorrer sem os cinco valores porque o
resolvedor de principal retorna anônimo quando a configuração Neon Auth está
ausente e os guards das Server Functions falham fechados antes de consultar o
banco. Não habilita operação, login ou acesso a dados até o gate de secrets.

## Ordem segura do próximo gate

1. Revisar o diff e autorizar o primeiro deploy isolado de `cacau-v1-hml`.
2. Registrar o hostname `workers.dev` resultante, sem criar custom domain.
3. Configurar o hostname no Neon Auth HML e no widget Turnstile, preservando
   `localhost`.
4. Criar os cinco secrets declarados apenas no environment `hml`, sem exibir
   valores, e confirmar a presença pelos nomes.
5. Configurar e-mail e Rate Limiting; registrar o
   namespace HML real de rate limit na configuração versionada.
6. Validar o Worker HML sem criar Admin ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap do Admin.
