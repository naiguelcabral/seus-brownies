# G1 — Configuração externa pendente para Neon Auth em HML

## Estado

As migrations `0014`, `0015` e `0016` já existem exclusivamente em
`g1-auth-hml`. O código possui adaptadores, CSRF e guards que falham fechados,
e os fluxos locais de recuperação e login foram exercitados. Em 6 de setembro,
o Worker HML recebeu o código atual, `/login` respondeu `200`, e `/` sem sessão
redirecionou para `/login`; a versão publicada reconhece `owner`. O Turnstile
foi publicado: o widget foi limitado a `localhost`, `127.0.0.1` e ao hostname
HML, a site key pública entrou somente no bundle HML, o segredo foi atualizado
somente no Worker HML e a validação sanitizada por Siteverify passou. A
homologação integrada de autenticação, o desafio real e a rejeição de replay
continuam pendentes. Nenhum valor deve ser registrado neste documento, em Git,
em logs ou no chat.

### Recuperação de senha por link/token

O código local encaminha a solicitação pelo proxy server-side do Neon Auth e
usa a rota pública `/login/redefinir-senha`. Em desenvolvimento, o retorno é
fixado em `http://localhost:3000/login/redefinir-senha`; no Worker HML, em
`https://cacau-v1-hml.naiguelcabral.workers.dev/login/redefinir-senha`.
O token e a senha não são registrados, persistidos pelo Cacau ou incluídos em
eventos de auditoria. Antes de chamar o provedor, o Cacau exige um evento
sanitizado com estado `blocked` e motivo `provider_outcome_pending`; após a
resposta do provedor, exige um segundo evento com `success` ou `failure` e o
mesmo `request_id`. Não há transação distribuída com o Neon Auth: se a
gravação inicial falhar, a chamada ao provedor não é feita; se a gravação final
falhar, a rota devolve falha controlada e o evento pendente permanece como
evidência de resultado indeterminado. Portanto, o Cacau nunca responde sucesso
de reset sem o evento final, e nunca inventa `actor_auth_user_id`.

Ao carregar a rota, o token é copiado apenas para memória do componente e a
query string é substituída sem o token. A rota emite `Referrer-Policy`
`no-referrer` via meta tag. Isso reduz a exposição no navegador, mas não remove
o token da URL que o provedor, o navegador ou a borda já receberam antes da
resposta da aplicação.

Ainda falta validar, em uma execução integrada controlada e sem expor valores:

- entrega do e-mail e consumo único/expiração do token;
- limite de taxa específico para recuperação;
- desafio Turnstile real, rejeição de token inválido e rejeição de replay;
- comportamento de revogação de sessões após a redefinição, que não deve ser
  presumido sem confirmação explícita do Neon Auth;
- presença dos eventos `password_reset_requested` e
  `password_reset_completed`, sem token, senha, e-mail bruto ou cookie.

### Controles locais já preparados

- Login, cadastro, OTP e reset usam limite por identidade HMAC em memória por
  isolate. Nenhum e-mail, token, senha ou cookie é usado como chave ou log.
- O login grava o estado durável em `auth_login_attempts` e entra em cooldown
  após cinco falhas consecutivas, quando `DATABASE_URL` e
  `AUTH_LOGIN_HASH_PEPPER` estão disponíveis.
- Ao exceder o limite local, um token Turnstile válido passa a ser obrigatório.
  A UI renderiza o widget somente quando há uma `VITE_TURNSTILE_SITE_KEY`
  pública; sem site key, secret ou token quando o desafio é exigido, a operação
  falha fechada. O widget e a site key já foram publicados em HML; a
  homologação real e de replay continuam externas.
- Esses controles não substituem o binding `AUTH_RATE_LIMITER` distribuído da
  Cloudflare; esse continua requisito externo antes da abertura operacional.

## Bindings e configurações necessários

| Nome/configuração                          | Local de criação                          | Finalidade                                                                        | Exposição                               |
| ------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`                             | secret do Worker HML                      | acesso do Cacau ao banco do branch `g1-auth-hml`, inclusive allowlist e auditoria | somente servidor                        |
| `NEON_AUTH_BASE_URL`                       | secret/variável server-side do Worker HML | endpoint do Neon Auth exclusivo do branch HML                                     | somente servidor                        |
| `NEON_AUTH_COOKIE_SECRET`                  | secret do Worker HML                      | assina o cookie de dados de sessão do proxy; mínimo de 32 caracteres              | somente servidor                        |
| `VITE_NEON_AUTH_URL`                       | variável de build HML                     | dispensado enquanto Neon Auth for mediado pelo servidor                           | não configurar sem necessidade de UI    |
| `TURNSTILE_SECRET_KEY`                     | secret do Worker HML                      | validação server-side de desafios Turnstile                                       | somente servidor                        |
| `VITE_TURNSTILE_SITE_KEY`                  | variável de build HML                     | renderização do widget Turnstile                                                  | client-safe, não é segredo              |
| origem confiável/callbacks                 | Neon Auth Console, branch HML             | permite apenas as origens e URLs de retorno HML aprovadas                         | configuração externa                    |
| verificação de e-mail obrigatória          | Neon Auth Console, branch HML             | impede principal não verificado de avançar                                        | configuração externa                    |
| provedor de e-mail, remetente e credencial | Neon Auth Console/serviço escolhido       | entrega de verificação e recuperação                                              | server-only; nomes dependem do provedor |
| `AUTH_RATE_LIMITER`                        | Cloudflare, ambiente HML                  | limite volumétrico por chave; exige namespace e política HML aprovados            | configuração externa                    |

`AUTH_LOGIN_HASH_PEPPER` é recomendado caso o Cacau persista hash de e-mail
para `auth_login_attempts`; ele deve ser um secret server-side distinto, usando
HMAC, nunca um hash simples de e-mail. A estratégia ainda precisa ser ligada ao
fluxo real de login no próximo gate.

## Ordem segura do gate

1. Confirmar que todos os bindings pertencem ao Worker e banco de
   `g1-auth-hml`, nunca a production.
2. Confirmar os secrets server-side HML somente por nome; nenhum valor deve
   entrar no build, Git ou chat.
3. Configurar no Neon Auth HML, sem wildcard, as origens confiáveis e callbacks
   `http://localhost:3000` e
   `https://cacau-v1-hml.naiguelcabral.workers.dev`, além da verificação de
   e-mail e do provedor escolhido.
4. Configurar Turnstile e `AUTH_RATE_LIMITER` de HML, limitados às rotas de
   auth. O namespace deve ser inteiro positivo exclusivo; a política deve
   declarar limite e janela de 10 ou 60 segundos. Isso não substitui o contador
   persistente de cinco falhas no banco.
5. Executar testes integrados sem bootstrapar acesso Cacau: sessão sem
   allowlist, vínculo inativo, papel inválido e e-mail não verificado devem
   permanecer negados.
6. Solicitar um gate separado para criar a identidade e o único vínculo do
   primeiro Dono, com auditoria.

## Validação sem expor valores

- Executar uma checagem de presença/forma que reporte apenas os nomes ausentes
  ou inválidos, jamais conteúdo.
- Usar o endpoint e callbacks HML em teste controlado; confirmar resposta
  genérica de recuperação e cookies com atributos esperados, sem registrar os
  valores de cookie.
- Confirmar que sessão Neon sem `app_user_access` ativo recebe negação em cada
  Server Function protegida.
- Verificar os eventos de auditoria por ação/resultado/timestamp, sem senha,
  token, e-mail bruto, cookie ou segredo.
- Confirmar, no desafio real, que o widget permanece limitado a `localhost`,
  `127.0.0.1` e `cacau-v1-hml.naiguelcabral.workers.dev`; validar o token
  exclusivamente no servidor, inclusive contra replay.

## Provedor de e-mail

A escolha do fornecedor é decisão humana por custo e operação. Se o fornecedor
for API, a credencial deve ficar apenas na configuração do Neon Auth/Worker;
se for SMTP, host, porta, usuário e senha também devem permanecer fora do Git.
O remetente e os domínios de retorno precisam ser aprovados antes de ativar
recuperação de senha.
