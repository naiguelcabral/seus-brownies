# Publicação conjunta HML — 21/10/2026

## Resultado

PRs [#50](https://github.com/naiguelcabral/seus-brownies/pull/50),
[#51](https://github.com/naiguelcabral/seus-brownies/pull/51),
[#52](https://github.com/naiguelcabral/seus-brownies/pull/52) e
[#53](https://github.com/naiguelcabral/seus-brownies/pull/53) integradas.
Código da main `91658ed73a27c61ef3e4f779381584adf8b0834c` publicado no
[HML](https://cacau-v1-hml.naiguelcabral.workers.dev), somente Worker
`cacau-v1-hml`. A #50 foi incorporada pela #53 e consta como mesclada.

Entrega inclui tipagem de Cenários/finanças/lifecycle, preservando cálculos,
versões, revisões, locks, ativação, permissões e auditoria; ordem do menu do
Funcionário; correção da coleta de aceite; patch launch-editor 2.14.2 e
reconciliação documental. S04 permanece parcial para extrações maiores.

## Recibo e validação

- Deployment `387bddcc-f0ac-4f5d-89fa-30ee2381a505`, criado às
  **18:17:06 UTC / 15:17:06 Brasília**.
- Versão `de9a88e6-a2e0-4224-8c9c-e6f3da8ccb6c`, **100%** do tráfego,
  confirmada por leitura independente dos deployments após a publicação.
- Versão anterior `22733c04-7996-43b1-88e3-3f775db223fc`, antes em 100%,
  preservada como referência de reversão. Não houve rollback.
- `npm run deploy:hml` aprovado: build de `git archive HEAD`, ambiente
  isolado e chave pública real Turnstile conferida no login já publicado.
  Nenhum arquivo local de ambiente foi usado como fonte de configuração.
- 570 testes Node; tipos, lint, formato, Knip sem novos achados; 12 casos
  HTTP/browser/PostgreSQL 17 isolados aprovados, incluindo lifecycle de
  Cenários e rollback dos cinco writers nos dois destinos de auditoria.
  Repetição isolada de permissões também passou os 12 casos; identidades
  sintéticas, banco descartável encerrado.
- Main exata aprovada em [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/39639558961),
  [negócio/browser](https://github.com/naiguelcabral/seus-brownies/actions/runs/39639559227)
  e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39639559207).
  Três análises atuais sem resultados, erros ou avisos; cinco alertas legados
  continuam sem dispensa administrativa.

Smoke após deploy: `/` anônimo respondeu 307 para `/login`; login respondeu
200. Navegador confirmou telas de entrada, primeiro acesso/recuperação e
redefinição de senha, sem submissões. Dashboard e Parâmetros diretos anônimos
retornaram erro RPC de autenticação obrigatória; HTTP 200 é transporte da
serialização, não autorização.

No tablet, usuário confirmou como Dono: **“As duas telas abriram normalmente”**,
após solicitar atualização de Cenários e Financeiro, sem salvar. Os aceites
anteriores dos três perfis, papéis canônicos e Dashboard/Parâmetros diretos
estão no [registro manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md).
O agente não recebeu sessões reais; a repetição automática aconteceu somente
no laboratório isolado. Não ampliar esses relatos para todas as 55 políticas
no HML, mutações, expiração/revogação ou estabilidade.

## Pendências e preservação

Agregação sanitizada de 18:17:06–18:25:00 UTC encontrou **um** evento
`auth.session.provider`, `http_error`, HTTP **429**, na nova versão.
A falha já existia antes da publicação; não há correlação individual ou causa
comprovada. Mesmo com o sucesso das telas relatado, H01/H02 permanecem parciais,
sem alegação de solução permanente. [Investigação](AUTH-HML-SESSION-LIMIT-2026-10-21.md).

Sem migrations, comandos SQL compartilhados, alteração de secrets/DNS,
publicação em produção ou fatos fictícios no HML. Não foram coletados digests
operacionais nesta rodada; não reutilizar provas antigas como nova medição de
invariância. Recuperação, proteção administrativa, cobertura ampliada de auth,
piloto e liberação de produção mantêm seus gates no [roadmap](ROADMAP-CODEX.md).

[Recibo sanitizado](../../evidence/joint-hml-publication-2026-10-21.json).
