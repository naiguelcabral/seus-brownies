# Handoff do login do piloto — 26/10/2026

**Pausa encerrada em 27/10:** franquia renovada a 100%, PR #82 integrada e
diagnóstico publicado no piloto. Este handoff preserva o checkpoint histórico;
seguir o [estado atual](PROJECT-STATUS.md) e o
[recibo](../../evidence/pilot-login-code-publication-2026-10-27.json).

Pausa obrigatória por franquia oficial de **3% restante** na janela curta;
reset exibido `1793068318` (27/10/2026 02:31:58 UTC; 26/10 23:31:58 Brasília).
Retomar somente após o reset e confirmação da renovação, conforme
[política](CODEX-USAGE-POLICY.md). Sem retomada automática configurada.

## Estado comprovado

- Login continua falhando. Reset pelo próprio usuário teve sucesso às 21:25.
  Tentativa com nova senha digitada manualmente às 21:47 passou pelo guard de
  desafio e recebeu novo HTTP 401 do Auth; novo cooldown até 22:02:18 Brasília.
- Solicitação, destinatário do reset e login correspondem à mesma identidade.
  Há um vínculo de credencial válido, senha definida, cadastro verificado e sem
  banimento. Nenhum valor de senha ou hash de credencial foi retornado.
- Piloto continua com código `8261f5e`, versão
  `62efd08b-496b-4868-abe1-9ec10513cfdb`, 100%. PR #81 integrada em `4d40c89`,
  com CI e CodeQL da PR/main aprovados. HML anterior/produção preservados.

## Candidata e validação

PR [#82](https://github.com/naiguelcabral/seus-brownies/pull/82), branch
`codex/pilot-login-rejection-code-20261027`, HEAD de código `71799f3`.
Acrescenta `auth.login.rejection` com somente código normalizado permitido e
status HTTP. Mensagem, resposta bruta, identidade e credenciais excluídas.
Observador opcional não altera resultado nem auditoria se falhar.

Fontes: `functions.ts`, `login-actions.ts`,
`session-provider-telemetry.server.ts`; testes de ações, composição e provedor.
Documentação: investigação, estado e roadmap.

632 testes Node, lint, tipos, formato, Knip (4 conhecidos, 0 novos) e build
isolado aprovados. O harness de composição foi atualizado com a nova
dependência real, sem remover verificações. CI de `71799f3`: 10/12 aprovados;
`connected-postgres-browser` (121943574347) e `browser-fixtures` (121943503641)
ainda instalavam Chromium, sem falha reportada. Três análises CodeQL da
candidata `91a334d58c34e2fcba8be06482318dd594506064` sem resultados/erros/avisos,
zero alertas e nenhuma thread de revisão. O checkpoint documental muda o HEAD;
reconferir CI/CodeQL do HEAD final antes de integrar.

## Próximo passo

1. Confirmar renovação e árvore/branch; preservar a pasta principal.
2. Conferir os checks da PR #82 no HEAD final. Se a instalação falhar por
   infraestrutura, diagnosticar e repetir somente o necessário, sem enfraquecer
   testes. Conferir CodeQL real e alertas antes da integração.
3. Integrar, conferir main e publicar somente no piloto com o build isolado,
   chave pública própria e `--env pilot`, sem combinar `--name`.
4. Conferir versão/headers/seis nomes de secrets. Solicitar uma tentativa real
   somente após publicação e verificar cooldown vigente por leitura.
5. Correlacionar `auth.login.rejection`: distinguir `invalid_credentials`,
   `bad_jwt` ou outra categoria permitida. Não atribuir causa só pelo HTTP 401.

Não redefinir senha por agente, limpar contador, conceder perfil, afrouxar
Turnstile, ler `.env` ou publicar produção/HML anterior. Não repetir reset como
correção presumida. Login autenticado e ensaio de notas continuam pendentes.
