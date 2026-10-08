# Log sanitizado de autonomia — Cacau v1

## A21 — concorrência de memória local, 8 de outubro de 2026

- CI da PR #20 falhou no teste concorrente com ENOTEMPTY durante cleanup.
  Inspeção identificou exists/mkdir antes da trava no código de memória.
- Branch independente `codex/auto-a21-memory-concurrency`, main `f61e9a28`: mkdir
  idempotente e checagem de symlink após criação; teste aguarda todos os
  processos e preserva falhas em AggregateError. Fixture determinística
  simula outro criador entre checagens. Nenhuma memória real lida.
- Validação: 12 testes de memória, 372 testes da suíte, lint/typecheck,
  sintaxe Python, Prettier/diff/guard verdes. Build não aplicável.
- CI da PR #20 passou na reexecução, preservando a falha inicial como
  evidência; esta correção permanece independente. Sem HML, produção,
  secrets ou mudanças de retenção.

## WP-D metas e cenários — 14 de setembro de 2026

- G2-F1 foi publicado na branch `codex/workbook-parity` sem force push; a CI
  de push `34908140443` passou para o SHA
  `e53d42d2cf1050dc1b7bfd61b3ced5578f16cd4b`. O workflow revisado executou
  somente checkout, instalação, testes, lint, typecheck e build HML isolado.
- A branch `codex/wp-d-scenarios` partiu exatamente de `e53d42d`; a PR #5 foi
  aberta em rascunho contra `codex/workbook-parity`, sem merge ou rebase.
- Checkpoints `15959e0` e `0d4f62d` implementam cálculo exato, migrations
  aditivas `0027`/`0028`, versões imutáveis, revisão concorrente, ativo único,
  mix original e normalizado, RBAC, auditoria transacional e `/cenarios`.
- O workbook foi usado apenas como evidência do algoritmo e do mix original de
  103%. Nenhuma meta, peso, produto ou cenário foi semeado; a tela inicia com
  premissas vazias e exige decisão do Dono.
- O checkpoint final `95ff45f` passou localmente em 349 testes, lint,
  typecheck, Prettier direcionado, `git diff --check` e build HML isolado. A CI
  de push `35040598956` confirmou o mesmo SHA. Nenhuma migration, banco, `.env`, HML,
  deploy, Cloudflare, Neon, DNS, secret, importação ou backfill foi alterado.

## Retomada G2 — 14 de setembro de 2026

- Decisão humana adicional: o resgate de crédito consome somente o saldo, sem
  novo efeito em receita ou caixa. Ela foi incorporada às regras canônicas.
- Checkpoint `8403fe1`: venda paga registra caixa no writer da venda; o
  cancelamento pago pré-entrega registra o reembolso na mesma transação do
  estorno FIFO. O ledger de crédito liga resgates imutáveis à emissão, suporta
  consumo parcial exato, bloqueia excesso/competência fechada e expõe saldo em
  `/financeiro`. A migration aditiva `0026` foi gerada e não aplicada.
- G2-F1 foi concluído localmente após 327 testes, lint, typecheck, Prettier
  direcionado, `git diff --check` e build HML isolado verdes. Nenhum banco,
  `.env`, deploy ou recurso externo foi alterado. WP-D passa a `ready`.
- Checkpoint `f2af82c`: `/financeiro` passou a calcular receita líquida, CMV
  FIFO e margem bruta pela competência dos fatos, agrupando e reconciliando
  produto, lote/origem sem lote e local/canal. O fechamento e a correção de
  período congelam também os agregados de CMV e margem.
- Validação do checkpoint: 315 testes, lint, typecheck, Prettier direcionado,
  `git diff --check` e build HML isolado verdes. O `npm run check` global segue
  vermelho em 92 arquivos históricos fora do diff. Nenhuma migration, banco,
  `.env`, deploy ou recurso externo foi alterado.
- O commit manual `a4f3c72` foi retomado com fechamento, correções e a rota
  financeira ainda sem checkpoint de validação canônico. A coerção de tipo que
  bloqueava o lint foi removida.
- A atualização otimista do snapshot fechado passou a exigir linha retornada;
  conflito agora provoca rollback da correção, coberto por teste transacional.
- Checkpoint `47074c6`: 309 testes, lint, typecheck, `git diff --check` e build
  HML isolado verdes. O aviso nominal de secrets ausentes no SSR foi esperado;
  nenhuma migration, banco, `.env`, deploy ou recurso externo foi alterado.
- O próximo pacote elegível é WP-D: metas e cenários com premissas versionadas,
  sem aplicar migrations ou escrever em ambientes compartilhados.

## G2 financeiro — 11 de setembro de 2026

- As dez decisões financeiras aprovadas pelo Dono foram registradas em
  `HUMAN-APPROVALS.md`, `BUSINESS-RULES.md` e `G2-CMV-DECISION.md`, preservando
  a evidência anterior como histórico e removendo o gate de decisão.
- Migrations aditivas `0023`–`0026`, não aplicadas, modelam entrega, períodos e
  fatos imutáveis com efeitos exatos e separados de competência e caixa.
- Entrega registra receita na data de competência; venda paga registra caixa
  separadamente. Compensação pós-entrega registra reembolso ou crédito auditado
  e não restaura alimento nem CMV. Cancelamento após entrega falha fechado.
- Normalização proporcional do mix, indicadores financeiros separados,
  autorização de compensação e cálculo cumulativo de compensações parciais
  foram cobertos por testes. O subpacote passou em 303 testes, lint, typecheck,
  `git diff --check` e build HML isolado no checkpoint `e2bf666`; a primeira
  tentativa de build recusou corretamente a ausência da chave pública e a
  prova seguinte usou apenas a chave sintética documentada. CI ainda será
  registrada após a publicação da branch.

## Missão de paridade do workbook — 10 de setembro de 2026

- Estado recuperado em `codex/audit-remediation` no SHA `241099a`, árvore
  limpa; criada `codex/workbook-parity` sem reescrever histórico. PR #2 e PR
  #3 foram somente consultadas. O binding `AUTH_RATE_LIMITER` já estava
  versionado; o deploy HML continua bloqueado pela chave pública não injetada.
- Workbook original inspecionado somente no caminho autorizado. Foram
  confirmadas 15 abas, 12 tabelas, 3 gráficos, 1 validação, 4 comentários e
  zero fórmulas executáveis; totais e divergências foram documentados de forma
  sanitizada na matriz canônica.
- WP-A/B/C/G/H implementados localmente. Migrations aditivas `0019` e `0020`
  foram geradas e não aplicadas. Nenhuma política de margem, competência,
  reversão, crédito ou vínculo venda–lote foi definida unilateralmente.
- Validação local: 283 testes passaram; lint, typecheck, Prettier direcionado e
  `git diff --check` ficaram verdes. O build isolado primeiro recusou a árvore
  suja e depois passou no commit funcional limpo `712e0ca`; o aviso de secrets
  ausentes no SSR foi o esperado, sem carregar `.env`.
- Branch publicada sem deploy. A CI de push `34544769430` passou no SHA
  `b1b6792`; a PR #4 foi aberta em rascunho contra `codex/audit-remediation`.
  A CI de pull request `34552154672` estava na fila no último registro.
- WP-F1 concluído localmente enquanto a CI rodava: ponto de reposição exato e
  lote/validade/fornecedor foram conectados ao catálogo, compra e estoque. A
  migration aditiva `0021` foi gerada e não aplicada; cobertura e sugestão de
  compra continuam fora do escopo por falta de histórico/regra.
- Checkpoint `b0b3faf`: 289 testes, lint, typecheck, Prettier direcionado,
  `git diff --check` e build HML isolado verdes. O aviso de secrets ausentes no
  SSR foi esperado; nenhuma variável privada ou arquivo `.env` foi carregado.
- As CIs de push `34552925067` e pull request `34552929383` passaram para o
  checkpoint publicado `98a1d5a`.
- WP-E1 concluído localmente: consulta de lotes reais passou a filtrar no
  servidor por receita, status, produto e período, com 20 itens por página e
  estados de UI.
  Registros PLAN continuam excluídos. O checkpoint funcional `2f9fd2d` passou
  em 292 testes, lint, typecheck, `git diff --check` e build HML isolado; o
  aviso nominal de secrets ausentes permaneceu esperado.
- As CIs de push `34553608287` e pull request `34553610770` passaram para o
  checkpoint WP-E1 publicado `ca4cec8`.
- WP-F2 concluído localmente: saldos e razão de estoque ganharam filtros URL e
  paginação no servidor, preservando uma lista independente de produtos para
  ações FIFO. O dashboard deixou de converter saldo para `Number` e passou a
  usar o ponto de reposição exato, com zero apenas como fallback não
  configurado. O checkpoint funcional `85e7532` passou em 296 testes, lint,
  typecheck, `git diff --check` e build HML isolado.
- WP-A2 iniciado: fornecedor padrão opcional foi acrescentado ao catálogo como
  informação validada, sem entidade própria, automação de compra ou
  recomendação. A migration aditiva `0022` foi gerada e não aplicada.
- As CIs de push `34554168480` e pull request `34554171049` passaram para o
  checkpoint WP-F2 publicado `bbf6db3`.
- WP-A2 concluído localmente: schema, migration, Server Functions, formulário,
  teste e matriz preservam o fornecedor padrão como referência informativa e o
  fornecedor efetivo em cada compra. O checkpoint funcional `56f0149` passou
  em 297 testes, lint, typecheck, `git diff --check` e build HML isolado; `0022`
  permanece não aplicada.
- As CIs de push `34554627169` e pull request `34554629415` passaram para o
  checkpoint WP-A2 publicado `b9241ae`.
- WP-I1 concluído localmente: a rota de relatórios deixou de converter valores
  monetários para `Number` durante a exibição. O formatador exato e seus testes
  preservam centavos fora do inteiro seguro e valores negativos. O checkpoint
  funcional `123009d` passou em 299 testes, lint, typecheck, `git diff --check`
  e build HML isolado.
- As CIs de push `34554990879` e pull request `34554994350` passaram para o
  checkpoint WP-I1 publicado `aa593c3`. Não restou pacote de paridade local
  independente: os próximos itens dependem de decisão G2, migration e
  homologação autorizadas ou histórico confiável de consumo.

## Retomada local de 7 de setembro de 2026

- Checkpoint humano `c28c267868e6aa8b80272862dcd6ba558e325cab` confirmado
  como HEAD de `codex/autonomy-runner`, árvore limpa e sete arquivos exatos.
  A07-R2 concluído; não houve recriação de teste/pacote/commit. A falha de
  escrita da rodada anterior continua registrada abaixo como fato histórico.
- A07-R3 selecionado conforme definição existente, com dependência A07-R1
  satisfeita e contrato no handoff. A11 lido e ainda não iniciado. A07 segue
  bloqueado; nenhuma evidência local comprova publicação ou Turnstile real.

## Rodada manual local de 7 de setembro de 2026

- A07-R2: seis testes individuais novos verdes; suíte local de 37 arquivos
  verde; lint, Prettier direcionado e `git diff --check` verdes; revisão de
  `d55f1fe` documenta limites da evidência. Sem alteração de
  aplicação, build ou acesso externo. Commit local previsto:
  `test(auth): cover durable challenge boundaries and failures`.
- Checkpoint A07-R2 bloqueado: `git add` retornou 128, impossibilidade de
  criar `.git/index.lock` por `Read-only file system`. Rodada interrompida
  conforme a missão; zero commits novos, zero pacotes integralmente fechados,
  um pacote implementado e validado aguardando checkpoint. Sem escalada,
  repetição do comando ou início de outro pacote. Arquivos preservados.

Este é o histórico resumido de ciclos. A saída JSONL bruta fica apenas em
`.codex-local/autonomy/`, ignorada pelo Git, e não deve conter `.env`, credenciais,
tokens ou URLs privadas.

| Data       | Ciclo                 | Pacote | Resultado                                   | Checks                                                                              | Gate/bloqueio                                                                                                        |
| ---------- | --------------------- | ------ | ------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 2026-09-07 | preparação            | —      | controlador criado; nenhum pacote executado | 182 testes, lint e build verdes; `check` global tem dívida histórica                | piloto ainda requer revisão humana                                                                                   |
| 2026-09-07 | 1                     | A01    | validation-failed                           | ver JSONL local                                                                     | Codex CLI saiu com 2                                                                                                 |
| 2026-09-07 | 1                     | A01    | validation-failed                           | ver JSONL local                                                                     | Codex CLI saiu com 2                                                                                                 |
| 2026-09-07 | 1                     | A01    | validation-failed                           | ver JSONL local                                                                     | Codex CLI saiu com 1                                                                                                 |
| 2026-09-07 | 1                     | A01    | validation-failed                           | ver JSONL local                                                                     | Codex CLI saiu com 1                                                                                                 |
| 2026-09-07 | piloto A01            | A01    | blocked                                     | dry-run selecionou apenas A01; 8 testes do controlador verdes                       | CLI não iniciou app-server em sistema de arquivos somente leitura; sem ação externa                                  |
| 2026-09-07 | diagnóstico runtime   | —      | blocked                                     | Codex CLI 0.153.4; escrita temporária local permitida                               | execução aninhada confirmada por Bash filho de `codex-linux-sandbox`; caminho do app-server não preservado           |
| 2026-09-07 | 1                     | A01    | validation-failed                           | ver JSONL local                                                                     | resultado do agente                                                                                                  |
| 2026-09-07 | recuperação manual    | A01    | done                                        | Prettier direcionado; `npm test` (35 arquivos/185 testes); lint; `git diff --check` | pacote documental: build não aplicável após evidência de carregamento automático de `.env.local`; sem ação externa   |
| 2026-09-07 | política de validação | —      | done                                        | testes do controlador, Prettier direcionado e `git diff --check`                    | matriz por tipo: documental sem build/check global; build obrigatório bloqueado sem mecanismo isolado                |
| 2026-09-07 | 1                     | A02    | validation-failed                           | ver JSONL local                                                                     | Codex CLI saiu com 1                                                                                                 |
| 2026-09-07 | recuperação manual    | A02    | done                                        | `npm run check`: 103 caminhos; Prettier direcionado; `git diff --check`             | classificação documental concluída sem formatar arquivos; falha do controlador preservada                            |
| 2026-09-07 | auditoria local       | A03    | done                                        | leitura estática, `npm test`, Prettier direcionado e `git diff --check`             | matriz de fluxos, negações e auditoria concluída; sem HML ou mudança de código                                       |
| 2026-09-07 | cobertura local       | A04    | done                                        | testes de auth, `npm test`, lint, Prettier direcionado e `git diff --check`         | login, logout e confirmação de e-mail escrevem eventos sanitizados ao writer tipado; sem ação externa                |
| 2026-09-07 | preparação E2E local  | A05    | done                                        | contrato estático, `npm test`, lint, Prettier direcionado e `git diff --check`      | spec HML opt-in/fail-closed e runbook preparados; nenhuma execução HML, browser ou ação externa                      |
| 2026-09-07 | leitura pública HML   | A06    | done                                        | GET `/`: 307 para `/login`; GET `/login`: 200; headers sanitizados                  | sem cookie, corpo, autenticação, escrita ou configuração externa                                                     |
| 2026-09-07 | homologação Turnstile | A07    | blocked                                     | autorização humana registrada; sem validação executada                              | sessão sem navegador; não houve rede HML, CAPTCHA, token, replay ou ação externa                                     |
| 2026-09-07 | diagnóstico Turnstile | A07    | blocked                                     | limiar, fluxo UI e lacuna A05 documentados localmente                               | quinta falha grava cooldown sem `requiresChallenge`; sexta no mesmo isolate sinaliza widget; decisão humana pendente |
| 2026-09-07 | correção Turnstile    | A07    | blocked                                     | `npm test` (36) e lint verdes; sinal durável propagado localmente                   | aguarda revisão/publicação e os pré-requisitos seguros para homologação HML/replay                                   |
| 2026-09-07 | reparo A07-R1         | A07-R1 | done                                        | `npm test` (36) e lint verdes; cooldown e tokens fake cobertos                      | A07 continua bloqueada até identidade exclusiva e método seguro de replay no navegador                               |
