# Fila executável de autonomia — Cacau v1

Atualizada em 8 de setembro de 2026. Esta fila é a fonte de verdade para a
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

| ID     | Pacote                                             | Tipo       | Estado      | Escopo e saída esperada                                                                                                                        |
| ------ | -------------------------------------------------- | ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A07-R2 | Revisar limites e falhas dos componentes Turnstile | codigo     | done        | Checkpoint humano c28c267 confirmado no Git com os sete arquivos; falha anterior de escrita preservada no log.                                 |
| A07-R3 | Validar composição de login e falha de gravação    | codigo     | needs-human | Testes locais concluídos; falha posterior pode ocorrer após `Set-Cookie`. Política de concorrência/rollback de sessão aguarda decisão.         |
| A11    | Comprovar viabilidade de build local sem segredos  | documental | done        | Archive isolado, inputs explícitos e build cliente/SSR com chave pública sintética comprovados.                                                |
| AR-E1  | Tornar checks reproduzíveis no CI                  | codigo     | done        | `typecheck`, Node 22 e workflow de suíte/lint/tipos/build isolado aprovados local e remotamente em `34268997522`.                              |
| AR-D1  | Exportar relatórios CSV seguros                    | codigo     | done        | CSV local de agregados autorizados, precisão decimal e proteção de fórmula aprovados na CI `34268997522`; XLSX segue fora do escopo.           |
| AR-E2  | Corrigir preflight da CI e lint CSV                | codigo     | done        | `--dry-run` sem Codex CLI e regex sem controles literais aprovados na CI `34268997522`; falhas anteriores preservadas no log.                  |
| AR-D2  | Filtrar e paginar histórico de despesas            | codigo     | done        | Busca textual, período, 20 itens e estados de carregamento/erro aprovados na CI `34270184144`; preserva `expenses:read`.                       |
| AR-E3  | Preparar resiliência operacional                   | documental | done        | Runbook de backup, restauração descartável, RPO/RTO, rollback, observabilidade e retenção preparado; decisões e ensaio humano pendentes.       |
| AR-E4  | Revisar vulnerabilidades de dependências           | qualidade  | needs-human | `npm audit` confirmou 13 vulnerabilidades; `js-yaml` permite correção não forçada a revisar, Drizzle/Wrangler exigem estratégia sem `--force`. |
| AR-D3  | Filtrar e paginar histórico de compras             | codigo     | done        | Busca de fornecedor, período, paginação e estados explícitos aprovados na CI `34295688527`; homologação de interface permanece pendente.       |
| AR-D4  | Filtrar e paginar histórico de vendas              | codigo     | done        | Cliente, status, período, paginação e estados explícitos aprovados na CI `34296133493`; homologação de interface permanece pendente.           |
| AR-D5  | Filtrar e paginar catálogo de produtos             | codigo     | running     | Nome/SKU, tipo, situação, paginação e estados explícitos validados localmente; CI e homologação de interface aguardam publicação.              |

Esses pacotes decorrem da missão manual de até 20 pacotes. A07 continua
`blocked`; A08–A10 continuam `needs-human`. Não há promoção de nível permanente.

O controlador escolhe somente o primeiro pacote com estado exatamente `ready`.
Antes de editar, o agente registra no handoff objetivo, não objetivos, arquivos
previstos, critérios de aceite e comandos de validação. Um pacote não pode
alterar seu próprio estado para `done` com checks vermelhos ou gate pendente.
O tipo define a matriz de validação de `AUTONOMY-RUNBOOK.md`; um pacote que
exija build usa `codigo-build-obrigatorio` e fica bloqueado até existir método
isolado comprovado.
