# Publicação HML — 26/10/2026

## Complemento A05 — prova de redação em 26/10, 17h07 UTC

GET público com marcador sintético em `token`, seguindo o redirecionamento
legado até `/login/redefinir-senha`, retornou 200/no-store/no-referrer. O cliente
confirmou o envio do marcador na query final. Consulta temporária aos logs
encontrou exatamente o evento pelo Ray ID `a50b0f349f58b289`, na versão publicada
`42da8a96`: URL armazenada sem query e marcador ausente do evento inteiro.
Readback manteve redação habilitada, logs persistidos e 100% nessa versão.

[Recibo sanitizado](../../evidence/hml-query-redaction-2026-10-26.json).
Sem credenciais/tokens reais, chamadas mutáveis ou alteração remota. Fecha a
prova de query strings de A05 nesse caminho Auth; não é aceite de serviços
reais ou de todas as fontes de logging. A publicação original abaixo é
histórica: a captura por marcador, então pendente, foi concluída aqui.

## Resultado e autorização

Após a CI aprovada da PR #75, usuário autorizou: **“Pode seguir com a
atualização e publicação”**. PR #75 integrada por merge commit em
`82eebfcd4c9b7737e1ac857da61e7d9c7626679f`, preservando os commits do HEAD
`82629b0e5cbc8fbea1475655939b1f90282005c7` e a proteção da main.

Essa main foi publicada somente no Worker `cacau-v1-hml`, usando
`npm run deploy:hml`: archive do HEAD limpo, ambiente de build isolado e chave
pública real obtida do bundle público anterior, sem arquivo de ambiente.
Entrega os botões “Esqueci a senha” e “Primeiro acesso” em linhas separadas
e o código/configuração de segurança já integrado nas PRs anteriores.
S02/A04 conserva apenas a decisão de aprovação por Gerente; fluxo ainda pendente.

## Recibo

- Deployment: `5db64ef3-0fb4-482b-8539-87d722abef81`.
- Publicado: **26/10/2026 14:13:17 UTC / 11:13:17 Brasília**.
- Versão: `42da8a96-c5ed-4573-9d58-c5c8030f0df7`, **100% do tráfego**,
  confirmada por readback da API.
- Versão anterior: `997f47bb-6be0-4a78-b1fe-f46ea1fef512`, deployment
  `41ec1f4b-91be-4be6-947e-b5979b697d99`, preservada como referência de reversão.
- Site key pública: mesmo SHA-256 antes/depois; valor não incluído no recibo.
- Os cinco nomes de bindings `secret_text` permanecem presentes. Não houve
  comandos de alteração de secrets; valores não foram lidos ou comparados.
- Readback confirma limiter existente 20/60s e os bindings de origem 60/60s e
  agregado 600/60s nos namespaces HML versionados, origem confiável e
  `AUTH_RATE_LIMITER_REQUIRED=true`. Contagens são aproximadas por localidade.
- `observability.redact_query_string=true` confirmado; logs explícitos
  permanecem habilitados, traces/issues desabilitados. Prova de redação por
  marcador sintético nos logs ainda pendente em A05.

## Validação e limites

Os três workflows da main passaram: [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/40331179301),
[negócio/navegador](https://github.com/naiguelcabral/seus-brownies/actions/runs/40331172866)
e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/40331172870).
As três análises reais do CodeQL dessa main têm zero resultados/erros/avisos;
zero alertas abertos. Árvore do merge igual ao HEAD aprovado; pasta principal
preservada. O primeiro job conectado atingiu 15 minutos após instalação lenta
do Chromium. Somente esse job foi repetido no mesmo SHA e passou; não houve
alteração do código, testes ou timeout para obter aprovação.

Conferência pública às 14:15:20 UTC: raiz307 para login, login200 e reset200;
headers no-store/no-referrer nas páginas Auth, DENY/nosniff, HSTS e CSP
report-only conferidos. Navegador limpo em 1280, 375 e 320px confirmou os dois
botões em linhas distintas, sem overflow, e abertura de ambos os fluxos.
Zero erros de página e zero requisições mutáveis; nenhuma credencial usada.

Isso não valida sessão autenticada, OTP/reset/Turnstile reais, celular físico
ou uso diário. H01–H03/H06, A04/A05/A07/A08 e decisões operacionais conservam
as pendências delimitadas no roadmap. Sem SQL/migrations compartilhados,
concessões, fatos operacionais, DNS ou produção. O fechamento documental não
exige republicar a aplicação.

[Evidência sanitizada](../../evidence/hml-publication-2026-10-26.json).
