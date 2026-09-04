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

O Wrangler 4.125.0 ainda emite, durante `vite build`, um aviso nominal de
`Missing required secrets` para os secrets remotos ausentes do processo local.
O script define `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false`, portanto não
lê `.env*`, e direciona logs sanitizados do Wrangler ao diretório temporário;
o aviso não contém valores e não impede o deploy quando os nomes já existem no
Worker. Não silenciar esse diagnóstico com valores fictícios ou copiando
secrets para o build. Reavaliar somente em atualização futura e aprovada do
Wrangler.

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

`AUTH_RATE_LIMITER` permanece pendente porque o namespace é uma identificação
numérica positiva definida pela conta e não existe valor aprovado para HML. A
decisão precisa definir namespace exclusivo, limite e janela permitida (10 ou
60 segundos). A API Cloudflare é apenas volumétrica e eventualmente
consistente; o contador persistente de cinco falhas no Neon continua sendo a
fonte de verdade para cooldown e desafio adicional.

## Origens permitidas de autenticação

Sem wildcard de preview, toda configuração de callback, trusted origin ou
trusted domain usada pelo Neon Auth deve aceitar somente:

- `http://localhost:3000`
- `https://cacau-v1-hml.naiguelcabral.workers.dev`

O hostname HML também deve ser adicionado ao widget Turnstile `cacau-v1-hml`,
preservando `localhost`. O sitekey é client-safe, mas continua fora do Git; o
secret permanece somente no Worker.

## Ordem segura do próximo gate

1. Investigar a resposta `403` atual do hostname `workers.dev` antes de novo
   deploy; o upload e a versão ativa foram confirmados, mas a aplicação ainda
   não respondeu publicamente.
2. Configurar e-mail e Rate Limiting; registrar o
   namespace HML real de rate limit na configuração versionada.
3. Validar o Worker HML sem criar Admin ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap do Admin.

## Smoke e gate externo atual

As origens confiáveis do Neon Auth HML e o hostname do widget Turnstile HML
foram atualizados para incluir a URL estável, preservando `localhost` e sem
wildcard. O deployment ativo e os cinco nomes de secrets também foram
confirmados sem expor valores.

Em 4 de setembro de 2026, um GET sem sessão à URL estável retornou
`403 Forbidden`, `text/plain;charset=UTF-8`, corpo de 9 bytes e
`cf-ray: a359fcdd3da0bba0-GRU`. O painel do Worker confirma `workers.dev`
habilitado e público, sem Cloudflare Access. A versão
`892dcad0-9d21-4701-8b6e-d54bc346c192` está ativa a 100%, com handler `fetch`,
`compatibility_date: 2025-09-02`, `nodejs_compat`, sem rota e sem custom
domain. Um `wrangler tail` sanitizado, filtrado para GET e para essa versão,
não registrou invocação durante um GET correlacionado que também retornou 403.

O diagnóstico é, portanto, bloqueio na borda antes do Worker, com alta
confiança; não é evidência de middleware TanStack, CSRF, RBAC, Neon Auth ou
Turnstile. Não fazer novo deploy às cegas. O próximo gate humano é abrir
chamado com o suporte Cloudflare, informando somente a URL HML, o horário UTC,
o `cf-ray` e que o Worker público habilitado não recebeu a invocação. Não
anexar cookies, tokens, headers de autorização ou valores de secrets.

O aviso pós-upload `Could not apply service and environment tags` não tem, até
o momento, evidência de falha funcional: a versão HML publicada permaneceu
ativa a 100% com o handler, a data de compatibilidade, a flag e os nomes dos
secrets esperados. Ele é tratado como limitação de metadados/agrupamento visual
até que o dashboard mostre impacto concreto; não justifica redeploy. O
`fetch failed` observado após o upload também não invalida o deploy, mas o 403
do smoke é uma falha externa real que precisa ser resolvida antes de prosseguir.
Não atualizar o Wrangler automaticamente; reavaliar apenas com aprovação.

Após o 403 estar resolvido, ainda será necessária a aprovação do namespace e da
política de `AUTH_RATE_LIMITER` antes de criar o binding HML.
