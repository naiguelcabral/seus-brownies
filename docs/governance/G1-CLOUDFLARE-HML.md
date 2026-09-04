# G1 — Worker Cloudflare de homologação

## Estado preparado, ainda não implantado

`wrangler.jsonc` declara o environment `hml`, que cria o Worker separado
`cacau-v1-hml` quando for implantado com `--env hml`. O Worker principal
`cacau-v1` permanece como configuração de topo, sem rota, DNS, secret ou
binding alterado.

O environment HML preserva `compatibility_date: 2025-09-02` e
`compatibility_flags: ["nodejs_compat"]` por herança. Ele define
`workers_dev: false`, portanto o primeiro deploy não cria uma rota
`workers.dev`; qualquer trigger/rota HML é um gate posterior e explícito.

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
| Turnstile        | secret `TURNSTILE_SECRET_KEY` e variável pública `VITE_TURNSTILE_SITE_KEY` quando a UI for ativada | pendente de configuração externa                                 |
| Rate Limiting    | binding `AUTH_RATE_LIMITER` HML com `namespace_id` numérico exclusivo e política aprovada          | não declarado até existir namespace real; nunca usar placeholder |
| E-mail/callbacks | origem confiável, callback, verificação e provedor no Neon Auth HML                                | gate externo separado                                            |

Os valores públicos `VITE_NEON_AUTH_URL` e `VITE_TURNSTILE_SITE_KEY` não são
secrets, mas ainda devem ser configurados exclusivamente para HML no pipeline
de build aprovado. Não registrar valores em `wrangler.jsonc` enquanto o alvo
e a origem HML não tiverem sido aprovados.

## Ordem segura do próximo gate

1. Confirmar a conta Cloudflare HML e que `cacau-v1-hml` ainda não existe.
2. Criar os quatro secrets declarados apenas no environment `hml`, sem exibir
   valores, e confirmar a presença pelos nomes.
3. Configurar Neon Auth HML, e-mail, Turnstile e Rate Limiting; registrar o
   namespace HML real de rate limit na configuração versionada.
4. Revisar o diff e executar o primeiro `npm run deploy:hml` somente com
   aprovação humana explícita.
5. Validar o Worker HML sem criar Admin ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap do Admin.
