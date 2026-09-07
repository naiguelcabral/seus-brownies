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

| ID  | Pacote                                              | Estado          | Escopo e saída esperada                                                                                    |
| --- | --------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| A01 | Reconciliar evidências HML mais recentes            | done            | Reconciliação concluída: estado atual, pendências e diagnóstico histórico do 403 preservados.              |
| A02 | Classificar dívida de `npm run check`               | ready           | Separar fonte, histórico, snapshots e relatórios gerados; propor correção mínima, sem formatação em massa. |
| A03 | Auditar eventos locais de auth e negações por papel | ready           | Matriz código × teste × pendência, sem tocar HML.                                                          |
| A04 | Implementar testes locais prioritários de auth      | ready-after-A03 | Testes determinísticos verdes, sem alterar RBAC.                                                           |
| A05 | Preparar E2E G1 não destrutivo                      | ready-after-A03 | Spec e runbook prontos; execução real requer identidades autorizadas.                                      |
| A06 | Validar HML por leituras públicas seguras           | needs-human     | Smoke sanitizado, sem alteração externa.                                                                   |
| A07 | Homologar Turnstile real e replay                   | needs-human     | Requer navegador, desafio real e identidade autorizada.                                                    |
| A08 | Configurar rate limit distribuído HML               | needs-human     | Requer namespace e política Cloudflare aprovados.                                                          |
| A09 | Definir segundo Gerente                             | needs-human     | Requer decisão e identidade do Dono.                                                                       |
| A10 | Fechar CMV realizado e vínculo venda–lote           | needs-human     | Requer decisão de negócio/contabilidade antes de G2.                                                       |

## Regra de seleção

O controlador escolhe somente o primeiro pacote com estado exatamente `ready`.
Antes de editar, o agente registra no handoff objetivo, não objetivos, arquivos
previstos, critérios de aceite e comandos de validação. Um pacote não pode
alterar seu próprio estado para `done` com checks vermelhos ou gate pendente.
