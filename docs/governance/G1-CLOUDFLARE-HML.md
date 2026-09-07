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

## Evidência atual reconciliada

Em 6 de setembro, o Worker HML recebeu o código atual. O smoke público
confirmou `/login` com HTTP `200` e `/` sem sessão redirecionando para
`/login`; a versão publicada reconhece o papel `owner`. O Turnstile foi
publicado. Seu widget é limitado a `localhost`, `127.0.0.1` e ao hostname HML;
a site key pública foi incluída somente no bundle HML, o segredo foi atualizado
somente no Worker HML e a validação sanitizada por Siteverify passou.

Esses fatos encerram o `403` como bloqueio atual de navegação pública, mas não
homologam autenticação de ponta a ponta. Permanecem pendentes o desafio real,
a rejeição de replay, rate limiting distribuído e os testes integrados de
login, OTP, reset, logout, cookie, sessão e negações por papel.

### Leitura pública sanitizada A06 — 7 de setembro de 2026

Sob autorização humana, duas requisições GET anônimas, sem cookie, corpo ou
redirect seguido, reconfirmaram a navegação pública às `19:27:54Z`:

- `/` retornou HTTP `307` com `location: /login`; `cf-ray`:
  `a3781b58aa52cabb-GIG`;
- `/login` retornou HTTP `200` com `content-type: text/html; charset=utf-8`
  (`cf-ray: a3781c6f0a68ece8-GIG`).

Essa leitura não acessou autenticação, e-mail, banco, Neon, Cloudflare API ou
configuração. Ela não substitui nenhuma homologação integrada de G1.

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

| Área             | Binding/configuração                                                                      | Estado                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Banco HML        | secret `DATABASE_URL`, exclusivo de `g1-auth-hml`                                         | configurado; valor não inspecionado                                                               |
| Neon Auth        | `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET`                                          | configurados; valores não inspecionados                                                           |
| Tentativas       | secret `AUTH_LOGIN_HASH_PEPPER`, diferente do cookie secret                               | configurado; valor não inspecionado                                                               |
| Turnstile        | secret `TURNSTILE_SECRET_KEY` e variável pública `VITE_TURNSTILE_SITE_KEY`                | publicado; widget/site key HML e Siteverify sanitizado validados; desafio real e replay pendentes |
| Rate Limiting    | binding `AUTH_RATE_LIMITER` HML com `namespace_id` numérico exclusivo e política aprovada | não declarado até existir namespace real; nunca usar placeholder                                  |
| E-mail/callbacks | origem confiável, callback, verificação e provedor no Neon Auth HML                       | gate externo separado                                                                             |

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

O widget Turnstile `cacau-v1-hml` está limitado a `localhost`, `127.0.0.1` e
ao hostname HML. O sitekey é client-safe, foi incluído somente no bundle HML e
continua fora do Git; o secret permanece somente no Worker HML. A publicação e
a validação sanitizada por Siteverify não substituem a homologação integrada,
o desafio real nem a validação de replay, que continuam gates separados.

## A07 — tentativa de homologação Turnstile em HML (bloqueada)

Em 7 de setembro de 2026, houve autorização humana para A07. A execução foi
interrompida antes de qualquer navegação ou requisição HML porque não havia
navegador disponível nesta sessão. Portanto, não houve resolução de CAPTCHA,
login, envio de token, validação de token inválido, replay, alteração externa
ou evidência integrada nova.

O pré-requisito restante é uma sessão de navegador habilitada, com operador
humano para resolver o desafio Turnstile no momento da execução e uma
identidade HML já autorizada. O token emitido deve ser validado uma vez e a
tentativa de reutilizá-lo deve seguir somente o mecanismo de replay aprovado;
se ele não estiver disponível, a execução deve parar sem forçar requisições.
Qualquer evidência futura permanece limitada a caso, resultado, horário e
identificador sanitizado quando visível — nunca token, credencial, cookie,
corpo, cabeçalho de autorização ou segredo.

## Ordem segura do próximo gate

1. Preservar o diagnóstico histórico do `403` sem redeploy: a publicação atual
   corrigiu a navegação pública e o smoke de 6 de setembro confirmou `/login`
   com `200`.
2. Configurar e-mail e Rate Limiting; registrar o namespace HML real de rate
   limit na configuração versionada.
3. Homologar o desafio Turnstile real, token inválido e replay sem criar Dono,
   Gerente, Funcionário ou dados de negócio.

Nenhum comando deste documento autoriza produção, DNS, rota de produção,
secrets de produção ou bootstrap de papéis.

## Smoke e gate externo atual

### Diagnóstico histórico do `403` (anterior à publicação atual)

Antes da publicação atual, um GET público sem sessão retornou `403` na borda
antes de qualquer invocação do Worker. Esse diagnóstico é preservado como
evidência histórica: ele não descreve mais o estado atual e não justifica
redeploy às cegas.

As origens confiáveis do Neon Auth HML e o widget Turnstile HML foram depois
atualizados sem wildcard. O widget atual limita-se a `localhost`, `127.0.0.1`
e ao hostname HML. O deployment ativo e os cinco nomes de secrets também foram
confirmados sem expor valores.

Em 4 de setembro de 2026, um GET sem sessão à URL estável retornou
`403 Forbidden`, `text/plain;charset=UTF-8`, corpo de 9 bytes e
`cf-ray: a359fcdd3da0bba0-GRU`. O painel do Worker confirma `workers.dev`
habilitado e público, sem Cloudflare Access. A versão
`892dcad0-9d21-4701-8b6e-d54bc346c192` está ativa a 100%, com handler `fetch`,
`compatibility_date: 2025-09-02`, `nodejs_compat`, sem rota e sem custom
domain. Um `wrangler tail` sanitizado, filtrado para GET e para essa versão,
não registrou invocação durante um GET correlacionado que também retornou 403.

O diagnóstico histórico aponta para bloqueio na borda antes do Worker, com alta
confiança; não foi evidência de middleware TanStack, CSRF, RBAC, Neon Auth ou
Turnstile. Caso o sintoma volte, o gate humano é abrir chamado com o suporte
Cloudflare, informando somente a URL HML, o horário UTC, o `cf-ray` e que o
Worker público habilitado não recebeu a invocação. Não anexar cookies, tokens,
headers de autorização ou valores de secrets.

### Leitura da conta pela API Cloudflare (4 de setembro de 2026)

Consulta estritamente de leitura pelo conector autenticado confirmou os fatos
abaixo, sem novo smoke, deploy ou alteração de configuração:

- `cacau-v1-hml` continua com handler `fetch`, assets e módulos habilitados,
  sem rota; o `workers.dev` do script está habilitado.
- A versão `892dcad0-9d21-4701-8b6e-d54bc346c192` continua ativa a 100% no
  deployment mais recente. A configuração continua em `2025-09-02` com
  `nodejs_compat` e modelo `standard`.
- A API de Cloudflare Access retornou que Access não está habilitado para a
  conta. Logo, não há aplicação ou política Access desta conta aplicável ao
  hostname HML.
- A listagem de regras de acesso IP de conta retornou vazia.
- A conta contém somente o ruleset gerenciado `Cloudflare Managed Free
Ruleset`, na fase `http_request_firewall_managed`, com 31 regras ativas de
  ação `block`. A API não forneceu evento, trace, regra correspondente ou
  identificação de match para o `cf-ray` do 403; isso **não atribui** o
  bloqueio ao ruleset.
- Não há consultas salvas de Workers Observability. O conector não expõe um
  trace de borda nem uma correlação de regra para a requisição já observada.

Com isso, Access e regras IP de conta foram descartados com evidência. A causa
histórica do `403` segue **inconclusiva**: o conector não expõe a
política/evento de borda responsável. Como o `403` foi resolvido pela publicação
atual, não há gate de suporte ativo; se o sintoma retornar, abrir chamado com a
URL HML, o horário UTC do smoke, `cf-ray: a359fcdd3da0bba0-GRU` e a evidência
de zero invocações no `wrangler tail`. Não anexar informações de autenticação,
cookies, headers ou secrets.

O aviso pós-upload `Could not apply service and environment tags` não tem, até
o momento, evidência de falha funcional: a versão HML publicada permaneceu
ativa a 100% com o handler, a data de compatibilidade, a flag e os nomes dos
secrets esperados. Ele é tratado como limitação de metadados/agrupamento visual
até que o dashboard mostre impacto concreto; não justifica redeploy. O
`fetch failed` observado após o upload também não invalida o deploy. O `403`
do smoke foi uma falha externa real, posteriormente resolvida pela publicação
atual; não atualizar o Wrangler automaticamente, reavaliando apenas com
aprovação.

Após o 403 estar resolvido, ainda será necessária a aprovação do namespace e da
política de `AUTH_RATE_LIMITER` antes de criar o binding HML.
