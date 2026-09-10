# G1 — validação técnica HML de 10 de setembro de 2026

Esta evidência é de leitura e testes locais. Não houve deploy, escrita em
Cloudflare/Neon, migration, criação de identidade, login, CAPTCHA, e-mail, OTP,
reset, cookie ou token real.

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

`wrangler.jsonc` declara `cacau-v1-hml`, `workers_dev: true`,
`compatibility_date: 2025-09-02` e `nodejs_compat`; não declara
`AUTH_RATE_LIMITER`. A consulta somente leitura de detalhes da versão ativa com
`wrangler versions view <versão> --env hml --json` falhou por conectividade
temporária da API Wrangler e tentativa de log em diretório somente leitura.
Logo, a ausência efetiva do binding no Worker ativo é **não confirmada por API**,
mas a ausência na configuração versionada é confirmada.

O binding continua bloqueado por decisão/configuração Cloudflare: criar ou
selecionar um namespace de Rate Limiting exclusivo de HML, aprovar limite e
janela, então declarar no environment HML um binding exatamente chamado
`AUTH_RATE_LIMITER` que aponte para esse namespace. Não usar placeholder e não
reutilizar namespace de produção. Essa ação requer configuração externa e novo
deploy, ambos fora desta execução.

## Testes executados

- Local: `npm test` passou com 270 casos; inclui login, logout, sessão/cookies
  por contrato, OTP, reset, CSRF, RBAC, Turnstile, limite local/distribuído fake,
  auditoria e negações por vínculo/papel/verificação.
- Qualidade: lint, typecheck e `git diff --check` passaram.
- Build: `build:hml` passou com uma site key sintética explícita. O aviso de
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
os contratos automatizáveis. Bloqueado: versão/configuração efetiva do binding
por API Wrangler; navegador/CAPTCHA; identidades e caixa de e-mail autorizadas;
replay e revogação de sessão reais. Nenhuma regressão local foi encontrada.
