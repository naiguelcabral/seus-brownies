# Fila executável de autonomia — Cacau v1

Atualizada em 10 de setembro de 2026. Esta fila é a fonte de verdade para a
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
| A10    | Fechar CMV realizado e vínculo venda–lote           | documental               | needs-human | Requer decisão de negócio/contabilidade antes de G2.                                                                                  |

## Regra de seleção

### Extensão autorizada para a rodada manual local

| ID          | Pacote                                              | Tipo                     | Estado      | Escopo e saída esperada                                                                                                                                                                                 |
| ----------- | --------------------------------------------------- | ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A07-R2      | Revisar limites e falhas dos componentes Turnstile  | codigo                   | done        | Checkpoint humano c28c267 confirmado no Git com os sete arquivos; falha anterior de escrita preservada no log.                                                                                          |
| A07-R3      | Validar composição de login e falha de gravação     | codigo                   | needs-human | Testes locais concluídos; falha posterior pode ocorrer após `Set-Cookie`. Política de concorrência/rollback de sessão aguarda decisão.                                                                  |
| A11         | Comprovar viabilidade de build local sem segredos   | documental               | done        | Archive isolado, inputs explícitos e build cliente/SSR com chave pública sintética comprovados.                                                                                                         |
| AR-E1       | Tornar checks reproduzíveis no CI                   | codigo                   | done        | `typecheck`, Node 22 e workflow de suíte/lint/tipos/build isolado aprovados local e remotamente em `34268997522`.                                                                                       |
| AR-D1       | Exportar relatórios CSV seguros                     | codigo                   | done        | CSV local de agregados autorizados, precisão decimal e proteção de fórmula aprovados na CI `34268997522`; XLSX segue fora do escopo.                                                                    |
| AR-E2       | Corrigir preflight da CI e lint CSV                 | codigo                   | done        | `--dry-run` sem Codex CLI e regex sem controles literais aprovados na CI `34268997522`; falhas anteriores preservadas no log.                                                                           |
| AR-D2       | Filtrar e paginar histórico de despesas             | codigo                   | done        | Busca textual, período, 20 itens e estados de carregamento/erro aprovados na CI `34270184144`; preserva `expenses:read`.                                                                                |
| AR-E3       | Preparar resiliência operacional                    | documental               | done        | Runbook de backup, restauração descartável, RPO/RTO, rollback, observabilidade e retenção preparado; decisões e ensaio humano pendentes.                                                                |
| AR-E4       | Revisar vulnerabilidades de dependências            | qualidade                | needs-human | `npm audit` confirmou 13 vulnerabilidades; `js-yaml` permite correção não forçada a revisar, Drizzle/Wrangler exigem estratégia sem `--force`.                                                          |
| AR-D3       | Filtrar e paginar histórico de compras              | codigo                   | done        | Busca de fornecedor, período, paginação e estados explícitos aprovados na CI `34295688527`; homologação de interface permanece pendente.                                                                |
| AR-D4       | Filtrar e paginar histórico de vendas               | codigo                   | done        | Cliente, status, período, paginação e estados explícitos aprovados na CI `34296133493`; homologação de interface permanece pendente.                                                                    |
| AR-D5       | Filtrar e paginar catálogo de produtos              | codigo                   | done        | Nome/SKU, tipo, situação, paginação e estados explícitos aprovados na CI `34296485813`; homologação de interface permanece pendente.                                                                    |
| AR-D6       | Preservar precisão na ordenação dos relatórios      | codigo                   | done        | Comparações exatas para agregados e inventário aprovadas nas CIs `34299895120` e `34299897403`; não altera fatos financeiros.                                                                           |
| AR-E5       | Permitir build CI em checkout detached              | codigo                   | done        | Fallback restrito e negativa de deploy aprovados nas CIs `34299895120` e `34299897403`; build PR deixou de confundir detached com `main`.                                                               |
| AR-G1-L2    | Cobrir binding distribuído e Turnstile              | codigo                   | done        | Cinco escopos e falhas HTTP/JSON do provedor cobertos localmente; CI confirmada. HML/replay real seguem como gate separado.                                                                             |
| AR-G1-L3    | Sinalizar falha local de auditoria de auth          | codigo                   | done        | Telemetria permitida de persistência falha, sem dados sensíveis; testes locais, lint e tipos passaram. Política de sessão emitida e HML permanecem humanas.                                             |
| AR-G1-HML-1 | Homologar alcance e conexões técnicas HML           | auditoria-leitura        | done        | Endpoint público, CI, Neon Auth/domínio e contratos locais confirmados; binding efetivo, navegador, CAPTCHA e identidades continuam bloqueados em `G1-HML-TECHNICAL-VALIDATION-2026-09-10.md`.          |
| AR-G2-D1    | Preparar decisão de CMV e reversões                 | documental               | done        | Alternativas, exemplo, recomendação técnica e testes em `G2-CMV-DECISION.md`; decisão financeira permanece humana.                                                                                      |
| AR-E6       | Classificar vulnerabilidades do lockfile            | documental               | done        | Caminhos, contexto de uso, exploração condicionada e impacto de correção em `DEPENDENCY-AUDIT-2026-09-09.md`; sem atualização automática.                                                               |
| AR-G1-HML-2 | Declarar Rate Limiting HML e publicar com segurança | codigo-build-obrigatorio | blocked     | Binding `AUTH_RATE_LIMITER`, namespace `2026091001`, 20/60 s e fail-closed HML passaram localmente e na CI `34468924703`; deploy bloqueado sem site key pública HML injetada, sem usar valor sintético. |

### Missão de paridade do workbook

| ID        | Pacote                                    | Tipo                     | Estado      | Escopo e saída esperada                                                                                                     |
| --------- | ----------------------------------------- | ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| WP-MATRIX | Inventariar workbook e matriz de paridade | documental               | done        | 15 abas, estruturas, relações, indicadores, ausência de fórmulas e divergências sanitizadas em `WORKBOOK-SYSTEM-PARITY.md`. |
| WP-A      | Centralizar parâmetros gerenciais         | codigo-build-obrigatorio | done        | Persistência exata, versão otimista, servidor, UI e auditoria locais; `0019` não aplicada e homologação pendente.           |
| WP-B      | Capturar e auditar receita                | codigo-build-obrigatorio | done        | Informado/calculado, motivo, limites, rateio exato, autoria e idempotência locais; `0019` não aplicada.                     |
| WP-C      | Gerir locais e canais                     | codigo-build-obrigatorio | done        | CRUD protegido, inativação, filtros, paginação e vínculo à venda; homologação pendente.                                     |
| WP-G      | Ampliar dashboard atual                   | codigo-build-obrigatorio | done        | Volume, ticket, preço médio, divergência e métricas por local; margem/lucro continuam bloqueados por G2.                    |
| WP-H      | Estruturar plano de ação humano           | codigo-build-obrigatorio | done        | CRUD, filtros, autoria, concorrência e histórico append-only; `0020` não aplicada e homologação pendente.                   |
| WP-D      | Implementar metas e cenários              | codigo-build-obrigatorio | needs-human | Parâmetros existem; mix/projeções dependem de definição financeira G2 e não serão inferidos.                                |
| WP-EF     | Completar produção e estoque gerenciais   | codigo-build-obrigatorio | needs-human | Cobertura/sugestão dependem de consumo confiável; custos realizados e integrações adicionais dependem das decisões G2.      |
| WP-F1     | Rastrear compras e alerta de reposição    | codigo-build-obrigatorio | done        | Ponto exato, lote, validade e fornecedor passaram em 289 testes e build local; `0021` não aplicada, homologação pendente.   |
| WP-E1     | Ampliar histórico de produção real        | codigo-build-obrigatorio | done        | Busca, status, produto, período e paginação passaram em 292 testes e build; sem alterar conclusão, FIFO, custo ou PLAN.     |
| WP-F2     | Filtrar saldos e razão de estoque         | codigo-build-obrigatorio | done        | Filtros/paginação e alerta exato passaram em 296 testes e build; sem cobertura, previsão ou recomendação de compra.         |
| WP-A2     | Cadastrar fornecedor padrão opcional      | codigo-build-obrigatorio | done        | Campo informativo validado passou em 297 testes e build; `0022` não aplicada, sem automação de compra ou recomendação.      |

Esses pacotes decorrem da missão manual de até 20 pacotes. A07 continua
`blocked`; A08–A10 continuam `needs-human`. Não há promoção de nível permanente.

O controlador escolhe somente o primeiro pacote com estado exatamente `ready`.
Antes de editar, o agente registra no handoff objetivo, não objetivos, arquivos
previstos, critérios de aceite e comandos de validação. Um pacote não pode
alterar seu próprio estado para `done` com checks vermelhos ou gate pendente.
O tipo define a matriz de validação de `AUTONOMY-RUNBOOK.md`; um pacote que
exija build usa `codigo-build-obrigatorio` e fica bloqueado até existir método
isolado comprovado.
