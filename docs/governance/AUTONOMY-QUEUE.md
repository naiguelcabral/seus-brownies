# Fila executável de autonomia — Cacau v1

Reconciliada em 8 de outubro de 2026. Esta fila é a fonte de verdade para a
seleção de pacotes pelo controlador. Ela não substitui os gates de
`AGENTS.md`, `SECURITY.md` ou `HUMAN-APPROVALS.md`.

## Estados

- `ready`: único estado que o controlador pode selecionar.
- `running`: pacote já congelado; requer leitura do handoff antes de retomar.
- `blocked`: há impedimento técnico a registrar, sem contorná-lo.
- `needs-human`: depende de decisão, identidade ou autorização humana.
- `ready-after-<ID>`: depende de pacote anterior concluído; ainda não é
  selecionável pelo controlador.
- `done`: saída aceita e documentada.
- `stale`: classificação histórica substituída por decisão ou entrega posterior.

## Pacotes

| ID     | Pacote                                              | Tipo                     | Estado      | Escopo e saída esperada                                                                                                               |
| ------ | --------------------------------------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| A01    | Reconciliar evidências HML mais recentes            | documental               | done        | Reconciliação concluída: estado atual, pendências e diagnóstico histórico do 403 preservados.                                         |
| A02    | Classificar dívida de `npm run check`               | documental               | done        | Classificação reproduzível em `FORMATTING-DEBT.md`, sem formatação em massa.                                                          |
| A03    | Auditar eventos locais de auth e negações por papel | auditoria-leitura        | done        | Matriz reproduzível em `AUTH-COVERAGE-AUDIT.md`, sem tocar HML.                                                                       |
| A04    | Implementar testes locais prioritários de auth      | codigo                   | done        | Eventos prioritários emitidos ao writer tipado e negações preservadas, sem alterar RBAC.                                              |
| A05    | Preparar E2E G1 não destrutivo                      | codigo                   | done        | Spec e runbook opt-in/fail-closed prontos; execução real requer gates humanos.                                                        |
| A06    | Validar HML por leituras públicas seguras           | auditoria-leitura        | done        | GETs anônimos confirmaram `/` → `/login` e `/login` 200, sem alteração externa.                                                       |
| A07    | Homologar Turnstile real e replay                   | auditoria-leitura        | blocked     | Reparo A07-R1 concluído localmente; aguarda revisão/publicação, identidade exclusiva, navegador/CAPTCHA e replay em memória aprovado. |
| A07-R1 | Propagar desafio durável do A07                     | codigo                   | done        | Quinta falha, cooldown ativo e cooldown expirado usam contrato tipado; fakes cobrem token válido e replay sem HML.                    |
| A08    | Configurar rate limit distribuído HML               | codigo-build-obrigatorio | needs-human | Requer namespace e política Cloudflare aprovados.                                                                                     |
| A09    | Definir segundo Gerente                             | auditoria-leitura        | needs-human | Requer decisão e identidade do Dono.                                                                                                  |
| A10    | Fechar CMV realizado e vínculo venda–lote           | documental               | done        | Decisão G2 aprovada em 11/09; CMV e vínculo foram integrados pela PR #11. Aplicação de migrations e HML são gates separados.          |

## Regra de seleção

### Extensão autorizada para a rodada manual local

| ID          | Pacote                                              | Tipo                     | Estado      | Escopo e saída esperada                                                                                                                                                                                      |
| ----------- | --------------------------------------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A07-R2      | Revisar limites e falhas dos componentes Turnstile  | codigo                   | done        | Checkpoint humano c28c267 confirmado no Git com os sete arquivos; falha anterior de escrita preservada no log.                                                                                               |
| A07-R3      | Validar composição de login e falha de gravação     | codigo                   | needs-human | Testes locais concluídos; falha posterior pode ocorrer após `Set-Cookie`. Política de concorrência/rollback de sessão aguarda decisão.                                                                       |
| A11         | Comprovar viabilidade de build local sem segredos   | documental               | done        | Archive isolado, inputs explícitos e build cliente/SSR com chave pública sintética comprovados.                                                                                                              |
| AR-E1       | Tornar checks reproduzíveis no CI                   | codigo                   | done        | `typecheck`, Node 22 e workflow de suíte/lint/tipos/build isolado aprovados local e remotamente em `34268997522`.                                                                                            |
| AR-D1       | Exportar relatórios CSV seguros                     | codigo                   | done        | CSV local de agregados autorizados, precisão decimal e proteção de fórmula aprovados na CI `34268997522`; XLSX segue fora do escopo.                                                                         |
| AR-E2       | Corrigir preflight da CI e lint CSV                 | codigo                   | done        | `--dry-run` sem Codex CLI e regex sem controles literais aprovados na CI `34268997522`; falhas anteriores preservadas no log.                                                                                |
| AR-D2       | Filtrar e paginar histórico de despesas             | codigo                   | done        | Busca textual, período, 20 itens e estados de carregamento/erro aprovados na CI `34270184144`; preserva `expenses:read`.                                                                                     |
| AR-E3       | Preparar resiliência operacional                    | documental               | done        | Runbook de backup, restauração descartável, RPO/RTO, rollback, observabilidade e retenção preparado; decisões e ensaio humano pendentes.                                                                     |
| AR-E4       | Revisar vulnerabilidades de dependências            | qualidade                | needs-human | Em 2026-10-05, `npm audit` confirmou 16 vulnerabilidades (10 com `--omit=dev`); o dry-run sem `--force` parou em conflito de peers do Better Auth. Drizzle, Neon Auth e Wrangler exigem estratégia aprovada. |
| AR-D3       | Filtrar e paginar histórico de compras              | codigo                   | done        | Busca de fornecedor, período, paginação e estados explícitos aprovados na CI `34295688527`; homologação de interface permanece pendente.                                                                     |
| AR-D4       | Filtrar e paginar histórico de vendas               | codigo                   | done        | Cliente, status, período, paginação e estados explícitos aprovados na CI `34296133493`; homologação de interface permanece pendente.                                                                         |
| AR-D5       | Filtrar e paginar catálogo de produtos              | codigo                   | done        | Nome/SKU, tipo, situação, paginação e estados explícitos aprovados na CI `34296485813`; homologação de interface permanece pendente.                                                                         |
| AR-D6       | Preservar precisão na ordenação dos relatórios      | codigo                   | done        | Comparações exatas para agregados e inventário aprovadas nas CIs `34299895120` e `34299897403`; não altera fatos financeiros.                                                                                |
| AR-E5       | Permitir build CI em checkout detached              | codigo                   | done        | Fallback restrito e negativa de deploy aprovados nas CIs `34299895120` e `34299897403`; build PR deixou de confundir detached com `main`.                                                                    |
| AR-G1-L2    | Cobrir binding distribuído e Turnstile              | codigo                   | done        | Cinco escopos e falhas HTTP/JSON do provedor cobertos localmente; CI confirmada. HML/replay real seguem como gate separado.                                                                                  |
| AR-G1-L3    | Sinalizar falha local de auditoria de auth          | codigo                   | done        | Telemetria permitida de persistência falha, sem dados sensíveis; testes locais, lint e tipos passaram. Política de sessão emitida e HML permanecem humanas.                                                  |
| AR-G1-HML-1 | Homologar alcance e conexões técnicas HML           | auditoria-leitura        | done        | Endpoint público, CI, Neon Auth/domínio e contratos locais confirmados; binding efetivo, navegador, CAPTCHA e identidades continuam bloqueados em `G1-HML-TECHNICAL-VALIDATION-2026-09-10.md`.               |
| AR-G2-D1    | Preparar decisão de CMV e reversões                 | documental               | done        | Proposta histórica em `G2-CMV-DECISION.md`; decisão aprovada em `HUMAN-APPROVALS.md` e implementada pela PR #11. A antiga pendência de decisão é stale.                                                      |
| AR-E6       | Classificar vulnerabilidades do lockfile            | documental               | done        | Caminhos, contexto de uso, exploração condicionada e impacto de correção em `DEPENDENCY-AUDIT-2026-09-09.md`; sem atualização automática.                                                                    |
| AR-G1-HML-2 | Declarar Rate Limiting HML e publicar com segurança | codigo-build-obrigatorio | blocked     | Binding `AUTH_RATE_LIMITER`, namespace `2026091001`, 20/60 s e fail-closed HML passaram localmente e na CI `34468924703`; deploy bloqueado sem site key pública HML injetada, sem usar valor sintético.      |

Esses pacotes decorrem da missão manual de até 20 pacotes. A07 continua
`blocked`; A08/A09 continuam `needs-human`; A10 foi concluído após aprovação G2. Não há promoção de nível permanente.

### Próxima reconciliação de PR

| ID    | Pacote                                                            | Tipo                             | Estado | Escopo e saída esperada                                                                                                                                                                                  |
| ----- | ----------------------------------------------------------------- | -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-11 | Reconciliar e revisar `codex/workbook-parity-main-reconciliation` | revisão de integração/migrations | done   | Integrada por `baf9c4c`; CI da PR e CI pós-merge `37528365304` verdes. `0019`–`0026` somente versionadas, sem aplicação.                                                                                 |
| WP-D  | Reconciliar `codex/wp-d-scenarios`                                | revisão de integração/migrations | done   | PR #12 integrada por `4590ca4`; CI pós-merge `37671827440` verde. `0027`/`0028` seguem somente versionadas; autorização controlada e homologação HML por papel permanecem humanas. PR #5 fica congelada. |

PR-11 e WP-D foram concluídas. A próxima ação humana é autorizar a aplicação
controlada de `0027`/`0028` em HML com backup, janela e rollback, seguida de
homologação por navegador; não há autorização automática para aplicação ou
deploy.

O controlador escolhe somente o primeiro pacote com estado exatamente `ready`.
Antes de editar, o agente registra no handoff objetivo, não objetivos, arquivos
previstos, critérios de aceite e comandos de validação. Um pacote não pode
alterar seu próprio estado para `done` com checks vermelhos ou gate pendente.
O tipo define a matriz de validação de `AUTONOMY-RUNBOOK.md`; um pacote que
exija build usa `codigo-build-obrigatorio` e fica bloqueado até existir método
isolado comprovado.

## Reconciliação do roadmap e contratos novos — 7 de outubro de 2026

A classificação abaixo usa os estados operacionais em minúsculas; eles
correspondem a READY, READY_AFTER_ID, BLOCKED, NEEDS_HUMAN, DONE e STALE desta
missão. `ready` autoriza apenas código/documentação local e PR. Não autoriza
aplicar migrations ou homologar HML. A PR #13 está aberta, com CI
`37698011783` verde e evidência `GITHUB_MCP_AFTER_KEYRING_LAUNCH=OK` na
descrição; seu merge continua humano. PRs #4 e #5 seguem como referências
históricas em rascunho, sem retarget ou integração automática.

| ID          | Pendência do roadmap                                                     | Estado      | Evidência ou limite                                                                                                                  |
| ----------- | ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A12         | Reconciliar fila e governança desta missão                               | done        | Roadmap, decisões G2, PR #13 e gates classificados; branch documental independente.                                                  |
| G1-EXT      | Integração externa Neon Auth, e-mail, Turnstile e limiter HML            | needs-human | Requer configuração/identidade, CAPTCHA e homologação reais; sem escrita HML nesta missão.                                           |
| G1-LOCAL    | Cobertura local adicional de auth, CSRF, negações e auditoria sanitizada | done        | Fakes existentes auditados, sanitização A19 e smoke público isolado A27/PR #29 verdes; integração real permanece G1-HML.             |
| G1-SESSION  | Política após falha de persistência posterior ao `Set-Cookie`            | needs-human | Decisão de sessão pendente em A07-R3.                                                                                                |
| G1-HML      | E2E integrado de login, OTP, reset, logout e replay real                 | needs-human | Identidade exclusiva e operações reais não autorizadas nesta missão.                                                                 |
| G1-RATE     | Binding distribuído HML e deploy para homologação                        | needs-human | A08/AR-G1-HML-2 dependem de configuração/publicação controlada.                                                                      |
| G1-MANAGE   | Gestão de identidades/papéis e segundo Gerente                           | needs-human | RBAC/identidade exigem decisão humana; A09 preservado.                                                                               |
| G2-CMV      | Política de competência, CMV FIFO, vínculo item–camada/lote e reversões  | done        | Aprovada em `HUMAN-APPROVALS.md`; código local integrado pela PR #11.                                                                |
| G2-RECON    | Reconciliação estoque × FIFO × CMV e divergências somente leitura        | done        | Diagnóstico estoque/FIFO A13/PR #15 e cobertura entrega/CMV A28/PR #30 implementados e testados localmente. Sem correção de fatos.   |
| G2-HML      | Aplicar `0019`–`0028`, backfill e homologação financeira                 | needs-human | Migrations apenas versionadas; nenhuma escrita compartilhada autorizada.                                                             |
| G3-KPI      | Comparações temporais de receita, volume e ticket médio                  | done        | Comparação operacional adjacente A14/PR #16: receita, unidades e ticket exatos, separada da competência financeira.                  |
| G3-TOP      | Produtos e sabores mais vendidos                                         | done        | Top produtos por unidades A15/PR #17; sabor não existe como taxonomia canônica, separado em G3-FLAVOR.                               |
| G3-MARGEM   | Margem por produto, lote e período/canal                                 | done        | Cálculo local sobre fatos e FIFO integrado; homologação é G2-HML.                                                                    |
| G3-PARCEIRO | Margem e comparação temporal por parceiro                                | blocked     | Fonte de parceiro e regra de atribuição ainda não comprovadas no modelo disponível.                                                  |
| G3-LOSS     | Perdas e coproduto Bordinhas no relatório                                | done        | Perda declarada e Bordinhas A16/PR #18: agregados exatos, incompletude explícita, custo não somado novamente.                        |
| G3-STOCK    | Estoque crítico e cobertura estimada                                     | blocked     | Ponto de reposição local existe; cobertura exige histórico confiável/regra de projeção.                                              |
| G3-HISTORY  | Histórico real de produção, filtros, paginação e estados                 | done        | Implementação local integrada; homologação visual externa pendente.                                                                  |
| G3-EXPORT   | CSV seguro dos agregados                                                 | done        | Local integrado. XLSX sem contrato aprovado permanece `needs-human` se solicitado.                                                   |
| G3-SETTINGS | Metas, cenários e parâmetros gerenciais                                  | done        | Código local integrado pela PR #12; uso HML depende de G2-HML.                                                                       |
| G4          | WhatsApp e mensageria externa                                            | needs-human | Integração, serviço, privacidade e custo fora do escopo autônomo.                                                                    |
| G5          | OCR, upload e armazenamento externo                                      | needs-human | Serviço, retenção e privacidade exigem decisão.                                                                                      |
| G6-UX       | UX diária e checklist local de produção                                  | done        | Rendimento/custo A17, alerta A18 e checklist A22 preparados; aceitação física/UI real continua humana.                               |
| G6-REPORT   | Rendimento, perdas e custo por lote                                      | done        | Rendimento e custo por saída A17/PR #19; perdas/custos de lote já existem; não inventa eficiência percentual.                        |
| G6-ALERT    | Alerta de insumo insuficiente                                            | done        | Prévia de insuficiência A18/PR #20, sem reserva ou baixa, CI verde após repetição da falha preexistente de memória.                  |
| G6-COST     | Revisar consistência custo físico ponderado × FIFO final                 | done        | Diagnóstico de origem e distribuição A24/PR #26 e composição transacional A25/PR #27, somente local; PostgreSQL real não homologado. |
| G7-ENV      | Documentar ambientes e validar configuração versionada                   | done        | Matriz e evidência somente leitura A23/PR #25; alvo development exato não tem schema esperado; não associa DSN sem decisão.          |
| G7-LOG      | Logs estruturados, request_id, sanitização e health local                | done        | Telemetria com allowlist e correlação A19/PR #21; readiness e hooks locais A26/PR #28, sem serviço/endpoints.                        |
| G7-MONITOR  | Monitoramento/alertas remotos e backup externo real                      | needs-human | Infraestrutura, custo, RPO/RTO e ensaio compartilhado dependem de decisão.                                                           |
| G7-DEPS     | Atualização incompatível de Drizzle/Neon Auth/Wrangler                   | needs-human | Audit e conflito de peers registrados; sem `npm audit fix --force`.                                                                  |
| G7-PROD     | Deploy definitivo e produção                                             | needs-human | Fora do escopo desta missão.                                                                                                         |
| G8-RUNNER   | Continuar após pacote bloqueado e registrar próximo `ready`              | done        | A20/PR #23: loop segue após gate limpo, não promove dependências, mantém código final do gate; regressões e CI verdes.               |
| G8-LEVEL    | Promoção permanente de autonomia/multiagente                             | needs-human | Níveis e proteção da `main` dependem de revisão humana.                                                                              |

### Pacotes executáveis independentes

Esta tabela usa IDs `A` numéricos para o seletor atual do controlador. A
missão manual pode avançar entre eles mesmo quando outro pacote aguarda CI ou
revisão; a melhoria de continuidade está entregue na PR #23, ainda não integrada.
Nenhum pacote autoriza merge/deploy automático.

| ID  | Pacote                                    | Tipo   | Estado | Escopo e aceite                                                                                           |
| --- | ----------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------- |
| A13 | Ampliar reconciliação FIFO de diagnóstico | codigo | done   | PR #15, 36b2fef, CI 37700505229 verde; vínculos inválidos/precisão diagnosticados sem escrita.            |
| A14 | Comparação temporal de receita e volume   | codigo | done   | PR #16, 677bccd, CI 37700972317 verde; períodos operacionais adjacentes, valores exatos.                  |
| A15 | Top produtos/sabores por unidades         | codigo | done   | PR #17, 9afe969, CI 37701341356 verde; ranking por produto, legado separado, sabor não inferido.          |
| A16 | Relatório de perdas e Bordinhas           | codigo | done   | PR #18, 40f433b, CI 37762373436 verde; perdas declaradas/coproduto e incompletude explícita.              |
| A17 | Relatório de rendimento/custo por lote    | codigo | done   | PR #19, a576b4c, CI 37762731976 verde; planejado/realizado/custo por saída sem regra nova.                |
| A18 | Prévia de insumos insuficientes           | codigo | done   | PR #20, b90a36b, CI 37763029556 verde; diferença exata de insumo insuficiente.                            |
| A19 | Logs estruturados locais com correlação   | codigo | done   | PR #21, 413633d, CI 37763964658 verde; JSON estruturado com allowlist runtime e UUID sanitizado.          |
| A20 | Continuidade do controlador após blocker  | codigo | done   | PR #23, 3419f05, CI 37764843241 verde; continuidade após gates limpos; árvore suja/falha real interrompe. |

Ao iniciar cada pacote, congelar objetivo, não objetivos, arquivos, aceite e
verificações no handoff. Não marcar `done` por mera implementação local quando
o aceite exige HML ou decisão humana. Novos pacotes podem ser criados após
revisão do roadmap, mas não podem transformar um gate externo em `ready`.

## Fechamento da rodada manual — 8 de outubro de 2026

`done` nesta rodada significa **entrega local testada e publicada para revisão**,
com aceite restrito a código/testes/documentação; não significa merge, deploy,
HML homologada ou aceite físico. Esses gates têm IDs separados abaixo. A fila
reconciliada reside na PR #14 enquanto a main permanece em `f61e9a28`.

| ID          | Pacote                                              | Tipo        | Estado                  | Evidência/limite                                                                                             |
| ----------- | --------------------------------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| A21         | Corrigir corrida de inicialização da memória local  | codigo      | done                    | PR #22, 398998f, CI 37764300062 verde; fixture sintética, sem memória real.                                  |
| A22         | Preparar checklist de produção real                 | documental  | done                    | PR #24, 6f6dcee, CI 37765117144 verde; preparado, não homologado.                                            |
| A23         | Matriz de ambientes e evidência HML somente leitura | documental  | done                    | PR #25, ecdd3a9, CI 37765656425 verde; limites e divergências documentados.                                  |
| A24         | Reconciliar custo de lote e origens FIFO            | codigo      | done                    | PR #26, c4a5ba4, CI 37766351915 verde; diagnóstico protegido sem novos custos.                               |
| A25         | Testar composição transacional da conclusão         | codigo      | done                    | PR #27, 394947a, CI 37767170223 verde; sete cenários do writer real com fake.                                |
| A26         | Readiness e hooks locais sanitizados                | codigo      | done                    | PR #28, 9a8e7ea, CI 37767637508 verde; não configura monitoramento externo.                                  |
| A27         | Smoke público Playwright isolado                    | codigo      | done                    | PR #29, bed1afe, CI 37773346421 verde; Brave headless 1/1 passou, sem HML.                                   |
| A28         | Cobertura de entrega × quantidade FIFO              | codigo      | done                    | PR #30, c24f5f4, CI 37773969240 verde; 376 testes/lint/tipos/build local verdes.                             |
| INTEGRATION | Revisar/integrar PRs #13–#30                        | revisão     | needs-human             | Merge proibido nesta missão. PRs independentes; resolver sobreposições sem perder evidências.                |
| COMBINED    | Revalidar comportamento após integração aprovada    | codigo      | ready-after-INTEGRATION | Depende das decisões de revisão; não criar stack misturando pacotes agora.                                   |
| G3-FLAVOR   | Taxonomia de sabores                                | decisão     | needs-human             | Não existe campo canônico; não inferir sabor por nome nem gerar modelo sem decisão.                          |
| G6-PHYSICAL | Aceite de operação diária e rendimento físico       | homologação | needs-human             | Dono/Gerente conferem operação real; provas locais não bastam.                                               |
| HML-SCHEMA  | Disponibilizar schema no alvo autorizado            | ambiente    | needs-human             | development exato (cool-base-25902164) não contém tabelas esperadas; aplicação/associação exige autorização. |
| HML-LIMITER | Publicar configuração HML aprovada                  | ambiente    | needs-human             | Settings lidos não retornaram AUTH_RATE_LIMITER/REQUIRED; missão não autoriza deploy/binding/secret.         |
| OLD-A10     | Antiga classificação da decisão G2 como pendente    | histórico   | stale                   | Substituída pela aprovação de setembro e integração PR #11; não reabrir decisão aprovada.                    |

A07/AR-G1-HML-2 continuam bloqueados; não falta browser para o smoke **local**,
mas CAPTCHA/identidade/replay real e publicação HML continuam gates humanos.
A07-R3, A09, multitenancy, pagamentos, G4/G5, produção, secrets, atualização
incompatível e backup/restore compartilhado permanecem `needs-human`.

**Pacotes independentes exatamente ready restantes: 0**, no escopo auditado
do roadmap e desta missão. Nenhum gate foi promovido. Backlog não é vazio:
integração e homologação continuam pendentes. Novos fatos, decisão de produto
ou integração aprovada podem revelar novos pacotes; reavaliar a fila então.
Evidências completas: [AUTONOMOUS-RUN-2026-10-08.md](./AUTONOMOUS-RUN-2026-10-08.md).
