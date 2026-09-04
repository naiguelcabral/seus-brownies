# G1 — Configuração externa pendente para Neon Auth em HML

## Estado

A migration `0014` já existe exclusivamente em `g1-auth-hml`. O código possui
adaptadores, CSRF e guards que falham fechados, mas a integração real permanece
inativa até este gate humano. Nenhum valor deve ser registrado neste documento,
em Git, em logs ou no chat.

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
| rate limit volumétrico                     | Cloudflare, ambiente HML                  | camada complementar por rota de login/recuperação                                 | configuração externa                    |

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
4. Configurar Turnstile e rate limiting de HML, limitados às rotas de auth.
5. Executar testes integrados sem bootstrapar acesso Cacau: sessão sem
   allowlist, vínculo inativo, papel inválido e e-mail não verificado devem
   permanecer negados.
6. Solicitar um gate separado para criar a identidade e o único vínculo do
   primeiro Admin, com auditoria.

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
- Adicionar `cacau-v1-hml.naiguelcabral.workers.dev` ao widget Turnstile
  `cacau-v1-hml`, preservando `localhost`; validar o token exclusivamente no
  servidor.

## Provedor de e-mail

A escolha do fornecedor é decisão humana por custo e operação. Se o fornecedor
for API, a credencial deve ficar apenas na configuração do Neon Auth/Worker;
se for SMTP, host, porta, usuário e senha também devem permanecer fora do Git.
O remetente e os domínios de retorno precisam ser aprovados antes de ativar
recuperação de senha.
