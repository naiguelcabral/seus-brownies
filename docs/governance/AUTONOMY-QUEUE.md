# Fila executável de autonomia — Cacau v1

Atualizada em 7 de setembro de 2026. Esta fila é a fonte de verdade para a
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

| ID  | Pacote                                              | Tipo                     | Estado      | Escopo e saída esperada                                                                       |
| --- | --------------------------------------------------- | ------------------------ | ----------- | --------------------------------------------------------------------------------------------- |
| A01 | Reconciliar evidências HML mais recentes            | documental               | done        | Reconciliação concluída: estado atual, pendências e diagnóstico histórico do 403 preservados. |
| A02 | Classificar dívida de `npm run check`               | documental               | done        | Classificação reproduzível em `FORMATTING-DEBT.md`, sem formatação em massa.                  |
| A03 | Auditar eventos locais de auth e negações por papel | auditoria-leitura        | done        | Matriz reproduzível em `AUTH-COVERAGE-AUDIT.md`, sem tocar HML.                               |
| A04 | Implementar testes locais prioritários de auth      | codigo                   | done        | Eventos prioritários emitidos ao writer tipado e negações preservadas, sem alterar RBAC.      |
| A05 | Preparar E2E G1 não destrutivo                      | codigo                   | done        | Spec e runbook opt-in/fail-closed prontos; execução real requer gates humanos.                |
| A06 | Validar HML por leituras públicas seguras           | auditoria-leitura        | done        | GETs anônimos confirmaram `/` → `/login` e `/login` 200, sem alteração externa.               |
| A07 | Homologar Turnstile real e replay                   | auditoria-leitura        | needs-human | Requer navegador, desafio real e identidade autorizada.                                       |
| A08 | Configurar rate limit distribuído HML               | codigo-build-obrigatorio | needs-human | Requer namespace e política Cloudflare aprovados.                                             |
| A09 | Definir segundo Gerente                             | auditoria-leitura        | needs-human | Requer decisão e identidade do Dono.                                                          |
| A10 | Fechar CMV realizado e vínculo venda–lote           | documental               | needs-human | Requer decisão de negócio/contabilidade antes de G2.                                          |

## Regra de seleção

O controlador escolhe somente o primeiro pacote com estado exatamente `ready`.
Antes de editar, o agente registra no handoff objetivo, não objetivos, arquivos
previstos, critérios de aceite e comandos de validação. Um pacote não pode
alterar seu próprio estado para `done` com checks vermelhos ou gate pendente.
O tipo define a matriz de validação de `AUTONOMY-RUNBOOK.md`; um pacote que
exija build usa `codigo-build-obrigatorio` e fica bloqueado até existir método
isolado comprovado.
