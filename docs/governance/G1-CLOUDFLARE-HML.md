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

Em 4 de setembro de 2026, uma tentativa de `npm run deploy:hml` executada a
partir de uma cópia temporária do `HEAD`, sem arquivos locais não versionados,
terminou o build e parou antes do upload por ausência de autenticação
Cloudflare. A sessão OAuth foi confirmada posteriormente. A documentação atual
do Wrangler estabelece que `secrets.required` também valida os nomes no deploy;
portanto, o primeiro deploy permanece bloqueado até os cinco secrets HML serem
gravados. `cacau-v1-hml` ainda não foi criado nem atualizado e `cacau-v1` não
foi tocado.

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

`secrets.required` documenta nomes para tipagem, limita o carregamento local e
valida ausências no deploy; não cria valores no Worker. Assim, os cinco secrets
devem ser gravados antes do primeiro deploy. Enquanto estiverem ausentes, o
resolvedor de principal retorna anônimo e os guards das Server Functions falham
fechados antes de consultar o banco, mas esse comportamento não substitui a
validação do Wrangler.

## Ordem segura do próximo gate

1. Criar os cinco secrets declarados apenas no environment `hml`, sem exibir
   valores, e confirmar a presença pelos nomes.
2. Executar o primeiro deploy isolado de `cacau-v1-hml`.
3. Registrar o hostname `workers.dev` resultante, sem criar custom domain.
4. Configurar o hostname no Neon Auth HML e no widget Turnstile, preservando
   `localhost`.
5. Configurar e-mail e Rate Limiting; registrar o
   namespace HML real de rate limit na configuração versionada.
6. Validar o Worker HML sem criar Admin ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap do Admin.

## Gate externo atual: secrets exclusivos de HML

A sessão OAuth do Wrangler está confirmada. Um humano deve inserir cada valor
somente no prompt interativo, sem colá-lo no chat, shell history, `.env` ou Git.
Depois da confirmação de todos os cinco nomes, o Codex pode repetir
`npm run deploy:hml` a partir da cópia Git isolada.
