# Fila executável de autonomia — Cacau v1

Reconciliada em 7 de outubro de 2026. Esta fila é a fonte de verdade para a
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
| AR-G2-D1    | Preparar decisão de CMV e reversões                 | documental               | done        | Alternativas, exemplo, recomendação técnica e testes em `G2-CMV-DECISION.md`; decisão financeira permanece humana.                                                                                           |
| AR-E6       | Classificar vulnerabilidades do lockfile            | documental               | done        | Caminhos, contexto de uso, exploração condicionada e impacto de correção em `DEPENDENCY-AUDIT-2026-09-09.md`; sem atualização automática.                                                                    |
| AR-G1-HML-2 | Declarar Rate Limiting HML e publicar com segurança | codigo-build-obrigatorio | blocked     | Binding `AUTH_RATE_LIMITER`, namespace `2026091001`, 20/60 s e fail-closed HML passaram localmente e na CI `34468924703`; deploy bloqueado sem site key pública HML injetada, sem usar valor sintético.      |

Esses pacotes decorrem da missão manual de até 20 pacotes. A07 continua
`blocked`; A08–A10 continuam `needs-human`. Não há promoção de nível permanente.

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

| ID          | Pendência do roadmap                                                     | Estado      | Evidência ou limite                                                                                               |
| ----------- | ------------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| A12         | Reconciliar fila e governança desta missão                               | done        | Roadmap, decisões G2, PR #13 e gates classificados; branch documental independente.                               |
| G1-EXT      | Integração externa Neon Auth, e-mail, Turnstile e limiter HML            | needs-human | Requer configuração/identidade, CAPTCHA e homologação reais; sem escrita HML nesta missão.                        |
| G1-LOCAL    | Cobertura local adicional de auth, CSRF, negações e auditoria sanitizada | ready       | Fakes e testes locais, sem mudança de sessão ou RBAC.                                                             |
| G1-SESSION  | Política após falha de persistência posterior ao `Set-Cookie`            | needs-human | Decisão de sessão pendente em A07-R3.                                                                             |
| G1-HML      | E2E integrado de login, OTP, reset, logout e replay real                 | needs-human | Identidade exclusiva e operações reais não autorizadas nesta missão.                                              |
| G1-RATE     | Binding distribuído HML e deploy para homologação                        | needs-human | A08/AR-G1-HML-2 dependem de configuração/publicação controlada.                                                   |
| G1-MANAGE   | Gestão de identidades/papéis e segundo Gerente                           | needs-human | RBAC/identidade exigem decisão humana; A09 preservado.                                                            |
| G2-CMV      | Política de competência, CMV FIFO, vínculo item–camada/lote e reversões  | done        | Aprovada em `HUMAN-APPROVALS.md`; código local integrado pela PR #11.                                             |
| G2-RECON    | Reconciliação estoque × FIFO × CMV e divergências somente leitura        | ready       | Existe base local em `inventory-reconciliation.ts` e `/relatorios`; ampliar detecção e testes sem corrigir dados. |
| G2-HML      | Aplicar `0019`–`0028`, backfill e homologação financeira                 | needs-human | Migrations apenas versionadas; nenhuma escrita compartilhada autorizada.                                          |
| G3-KPI      | Comparações temporais de receita, volume e ticket médio                  | ready       | Agregar dados existentes com precisão exata, sem mudar competência.                                               |
| G3-TOP      | Produtos e sabores mais vendidos                                         | ready       | Consulta agregada, leitura protegida, sem inferir sabor inexistente.                                              |
| G3-MARGEM   | Margem por produto, lote e período/canal                                 | done        | Cálculo local sobre fatos e FIFO integrado; homologação é G2-HML.                                                 |
| G3-PARCEIRO | Margem e comparação temporal por parceiro                                | blocked     | Fonte de parceiro e regra de atribuição ainda não comprovadas no modelo disponível.                               |
| G3-LOSS     | Perdas e coproduto Bordinhas no relatório                                | ready       | Fatos de produção existentes; leitura e apresentação somente.                                                     |
| G3-STOCK    | Estoque crítico e cobertura estimada                                     | blocked     | Ponto de reposição local existe; cobertura exige histórico confiável/regra de projeção.                           |
| G3-HISTORY  | Histórico real de produção, filtros, paginação e estados                 | done        | Implementação local integrada; homologação visual externa pendente.                                               |
| G3-EXPORT   | CSV seguro dos agregados                                                 | done        | Local integrado. XLSX sem contrato aprovado permanece `needs-human` se solicitado.                                |
| G3-SETTINGS | Metas, cenários e parâmetros gerenciais                                  | done        | Código local integrado pela PR #12; uso HML depende de G2-HML.                                                    |
| G4          | WhatsApp e mensageria externa                                            | needs-human | Integração, serviço, privacidade e custo fora do escopo autônomo.                                                 |
| G5          | OCR, upload e armazenamento externo                                      | needs-human | Serviço, retenção e privacidade exigem decisão.                                                                   |
| G6-UX       | UX diária e checklist local de produção                                  | ready       | Melhorias sem mudar regra de conclusão.                                                                           |
| G6-REPORT   | Rendimento, perdas e custo por lote                                      | ready       | Dados locais de lote; leitura e testes determinísticos.                                                           |
| G6-ALERT    | Alerta de insumo insuficiente                                            | ready       | Prévia local sobre saldo existente, sem reserva ou baixa.                                                         |
| G6-COST     | Revisar consistência custo físico ponderado × FIFO final                 | ready       | Diagnóstico e testes somente leitura; ajuste financeiro exige decisão.                                            |
| G7-ENV      | Documentar ambientes e validar configuração versionada                   | ready       | Não ler arquivos de segredo nem alterar ambiente externo.                                                         |
| G7-LOG      | Logs estruturados, request_id, sanitização e health local                | ready       | Sem serviço pago, secrets ou mudança de sessão.                                                                   |
| G7-MONITOR  | Monitoramento/alertas remotos e backup externo real                      | needs-human | Infraestrutura, custo, RPO/RTO e ensaio compartilhado dependem de decisão.                                        |
| G7-DEPS     | Atualização incompatível de Drizzle/Neon Auth/Wrangler                   | needs-human | Audit e conflito de peers registrados; sem `npm audit fix --force`.                                               |
| G7-PROD     | Deploy definitivo e produção                                             | needs-human | Fora do escopo desta missão.                                                                                      |
| G8-RUNNER   | Continuar após pacote bloqueado e registrar próximo `ready`              | ready       | Alterar controlador e testes locais sem liberar gates.                                                            |
| G8-LEVEL    | Promoção permanente de autonomia/multiagente                             | needs-human | Níveis e proteção da `main` dependem de revisão humana.                                                           |

### Pacotes executáveis independentes

Esta tabela usa IDs `A` numéricos para o seletor atual do controlador. A
missão manual pode avançar entre eles mesmo quando outro pacote aguarda CI ou
revisão; o controlador legado ainda executa um pacote por ciclo e nunca faz
push/deploy por conta própria.

| ID  | Pacote                                    | Tipo   | Estado | Escopo e aceite                                                                                           |
| --- | ----------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------- |
| A13 | Ampliar reconciliação FIFO de diagnóstico | codigo | ready  | Detectar vínculos órfãos/inválidos e erros de precisão por testes determinísticos; saída somente leitura. |
| A14 | Comparação temporal de receita e volume   | codigo | ready  | KPI sobre fatos existentes, sem redefinir competência ou caixa.                                           |
| A15 | Top produtos/sabores por unidades         | codigo | ready  | Agregado protegido e desempate estável; não inventar sabor.                                               |
| A16 | Relatório de perdas e Bordinhas           | codigo | ready  | Separar perda declarada de coproduto, usando dados existentes.                                            |
| A17 | Relatório de rendimento/custo por lote    | codigo | ready  | Leitura de lotes concluídos e testes de precisão.                                                         |
| A18 | Prévia de insumos insuficientes           | codigo | ready  | Alertas locais sem reservar ou movimentar estoque.                                                        |
| A19 | Logs estruturados locais com correlação   | codigo | ready  | Eventos sanitizados e testes sem alterar sessão/autorização.                                              |
| A20 | Continuidade do controlador após blocker  | codigo | ready  | Classificar gate e selecionar outra tarefa segura, com testes de regressão.                               |

Ao iniciar cada pacote, congelar objetivo, não objetivos, arquivos, aceite e
verificações no handoff. Não marcar `done` por mera implementação local quando
o aceite exige HML ou decisão humana. Novos pacotes podem ser criados após
revisão do roadmap, mas não podem transformar um gate externo em `ready`.
