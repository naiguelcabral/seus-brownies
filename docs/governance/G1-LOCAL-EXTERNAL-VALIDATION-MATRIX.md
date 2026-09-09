# G1 — matriz local e homologação externa

Atualizada em 9 de setembro de 2026. Teste local com fakes não homologa
Cloudflare, Neon Auth, e-mail ou navegador reais.

| Controle                | Local confirmado                                                                   | Homologação externa pendente                                                   |
| ----------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Rate limit distribuído  | chave HMAC opaca por escopo; binding antes do limite local; falha bloqueia         | namespace, política e binding `AUTH_RATE_LIMITER` em HML                       |
| Turnstile e replay      | token server-side; HTTP/JSON inválido falha fechado; fakes cobrem aceitar/rejeitar | desafio humano, Siteverify real e replay em memória sem registro               |
| Identidades e navegador | Playwright recusa iniciar sem opt-in e não grava artefatos                         | Dono, sem vínculo, inativa, não verificada e papel insuficiente já autorizados |
| Cookies e sessão        | adaptador copia `Set-Cookie` com HttpOnly, Secure e SameSite                       | atributos reais, recarga, logout e revogação pelo provedor                     |
| OTP e reset             | resposta não enumerável, callback explícito e auditoria em duas etapas             | e-mail, OTP/link único, expiração, revogação e auditoria persistida            |
| Permissões e auditoria  | 30 Server Functions, CSRF e falha fechada por principal/vínculo/papel              | negações reais por papel e evidência sanitizada em HML                         |

O comando segue bloqueado até gate humano:
`CACAU_HML_AUTH_E2E=authorized npx playwright test -c playwright.auth-hml.config.ts`.
Ele requer a entrada transitória e os limites descritos em
`G1-HML-E2E-RUNBOOK.md`; nunca fornecer por Git, `.env`, log, chat ou artefato
credenciais, tokens, cookies, OTP ou links.

Revogação após reset é lacuna explícita: o código local não afirma que Neon
Auth invalida sessões preexistentes. Confirmar essa semântica é gate humano.
