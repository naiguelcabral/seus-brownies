# G1 — validação técnica HML de 10 de setembro de 2026

Esta evidência é de leitura e testes locais. Não houve deploy, escrita em
Cloudflare/Neon, migration, criação de identidade, login, CAPTCHA, e-mail, OTP,
reset, cookie ou token real.

## Atualização AR-G1-HML-2 — binding preparado, publicação bloqueada

Em 10 de setembro, o commit `99c30d7` passou na CI `34468924703`. Ele declara
somente no environment `hml` o binding Cloudflare `AUTH_RATE_LIMITER`, com
namespace positivo `2026091001`, limite simples de 20 chamadas por 60 segundos
e `AUTH_RATE_LIMITER_REQUIRED=true`. O namespace não existia na configuração
versionada do Worker HML antes desta alteração; ele é exclusivo desse Worker
HML na configuração proposta. O limite é volumétrico por chave HMAC opaca e
escopo, não substitui o cooldown durável de cinco tentativas por identidade,
nem CAPTCHA ou validação de identidade. A consistência eventual do contador da
Cloudflare impede tratá-lo como fonte financeira ou contador global exato.

Quando essa variável exige o binding e o runtime não o resolve, os cinco
fluxos públicos falham fechados antes do fallback local. A presença do binding
continua a ser aplicada antes do limite local para login, cadastro, envio e
verificação de OTP, e solicitação e conclusão de reset. Os contratos locais
cobrem os dois caminhos e não reduzem as validações existentes.

O deploy autorizado não foi executado: a sessão não recebeu
`VITE_TURNSTILE_SITE_KEY` como variável explícita. O script oficial isola o
build e exige essa chave pública; a chave sintética usada para validar o build
não pode ser publicada porque quebraria o widget Turnstile real. Não houve
tentativa de ler `.env`, consultar o valor da chave, alterar secret, binding
remoto ou deployment. A versão HML ativa anterior permanece inalterada. Para
publicar, um operador deve iniciar uma sessão com a chave pública HML já
aprovada injetada no ambiente e executar `npm run deploy:hml` no HEAD limpo
`99c30d7` (ou no commit documental posterior), sem registrar seu valor.

## Conexões e publicação

- GitHub: PR #2 permanece aberta contra `g1-auth-adr`; PR #3 permanece em
  rascunho contra `main`. Ambas estavam limpas. As CIs de push e pull request
  para `dfb7e1f` passaram.
- Cloudflare: autenticação Wrangler foi reconhecida para a conta conectada. O
  deployment HML mais recente listado estava a 100% e foi criado em 7 de
  setembro. Não há associação verificável entre essa versão publicada e
  `dfb7e1f`; não se inferiu que o endpoint execute o HEAD da branch.
- Worker: em `2026-09-10T08:04:23Z`, `GET /` e `GET /relatorios` sem sessão
  retornaram `307` para `/login`; `GET /login` retornou `200` com HTML. Os
  headers relevantes foram `server: cloudflare`, `content-type: text/html` no
  login e ausência de header Cloudflare Access. Não foram retidos cookies,
  corpos, valores de `cf-ray` ou headers de autorização.
- Neon: `g1-auth-hml` estava `ready`; Neon Auth estava ativo e o domínio público
  HML constava como confiável. Nenhuma string de conexão, URL privada, segredo
  ou dado de tabela foi consultado ou registrado.

## Configuração e limites

Na evidência anterior, `wrangler.jsonc` declarava `cacau-v1-hml`, `workers_dev:
true`, `compatibility_date: 2025-09-02` e `nodejs_compat`, mas ainda não
declarava `AUTH_RATE_LIMITER`. O commit `99c30d7` corrige essa lacuna somente
na configuração versionada HML; a aplicação efetiva aguarda deploy. A consulta
somente leitura de detalhes da versão ativa com
`wrangler versions view <versão> --env hml --json` falhou por conectividade
temporária da API Wrangler e tentativa de log em diretório somente leitura.
Logo, a ausência efetiva do binding no Worker ativo é **não confirmada por API**,
mas a ausência na configuração versionada anterior é confirmada.

O binding remoto continua `validation-blocked` até um deploy HML com a chave
pública legítima. A ação pendente não requer criar recurso separado: o
namespace numérico é declarado pelo deployment do Worker. Não reutilizar o
namespace em outro Worker e não alterar produção.

## Testes executados

- Local: `npm test` passou com 271 casos; inclui login, logout, sessão/cookies
  por contrato, OTP, reset, CSRF, RBAC, Turnstile, limite local/distribuído fake,
  auditoria e negações por vínculo/papel/verificação.
- Qualidade: lint, typecheck e `git diff --check` passaram.
- Build: `build:hml` passou no commit `99c30d7` com uma site key sintética
  explícita. O aviso de
  nomes de secrets ausentes é esperado no build isolado e comprova que nenhum
  arquivo de ambiente foi carregado; não é prova dos secrets remotos.
- Playwright: a configuração recebeu o opt-in de execução, mas recusou antes de
  abrir browser ou rede porque a entrada transitória de cinco identidades HML
  autorizadas não foi fornecida. Esse é o comportamento fail-closed esperado.
- Browser: esta sessão não disponibiliza navegador habilitado. Não foram
  testados widget real, envio sem token, token inválido, replay, login, sessão,
  logout, RBAC por navegador, OTP ou reset.

## Estado

Validado em HML: alcance público, redirecionamento sem sessão, login público,
Worker acessível e Neon Auth/domínio HML declarados. Validado localmente: todos
os contratos automatizáveis, incluindo o binding obrigatório. Bloqueado:
publicação efetiva do binding pela ausência da chave pública explícita no
ambiente; navegador/CAPTCHA; identidades e caixa de e-mail autorizadas; replay
e revogação de sessão reais. Nenhuma regressão local foi encontrada.
