# Handoff Codex — FIFO fase 2 / G6--G9 concluídos

## Estado atual comprovado

- A migration `0013_fifo_lifecycle` já está aplicada em HML: a auditoria
  runtime classificou o schema como `aplicada`, com 14 migrations.
- O prefixo autorizado `HML2-POS-G6-20260902` contém exclusivamente o
  movimento `#22` e a camada FIFO `#3` de `PROD003`, ambos `24.000` /
  `R$ 60,48`.
- A pré-checagem G6 GET-only foi aprovada em `2026-09-02` após a correção da
  UI. Playwright navegou somente por GET nas telas locais e confirmou:
  - checkbox explícito de ajuste positivo visível;
  - botão inicialmente desabilitado e desabilitado sem confirmação;
  - campos: produto, quantidade, custo total, origem do custo, motivo,
    referência e confirmação;
  - ausência de erros de banco, console ou hidratação;
  - 2 camadas, 2 alocações e 0 reversões FIFO;
  - invariantes HML: camada #1 remanescente `10.000` / `37.77`, camada #2
    remanescente `6.000` / `22.67`, vendas #1/#2 confirmadas e lote #18
    concluído.
- Artefatos da última G6:
  `/tmp/seus-brownies-playwright/g6-positive-recheck/`.

## Regras permanentes

- Nunca acessar `production`.
- Nunca rodar migrations, criar dados, apagar dados ou executar cenários sem
  autorização explícita do usuário para o cenário e a escrita.
- Nunca ler, imprimir, editar ou versionar `.env` ou `.env.local`.
- Preservar artefatos Playwright somente em
  `/tmp/seus-brownies-playwright`.
- Não reutilizar o lote #18, vendas #1/#2 ou as alocações existentes.
- Não executar testes de cenário em lote; um único cenário autorizado por vez.

## Modelo obrigatório de continuidade

Ao retomar este trabalho, o Codex deve abrir a resposta com a confirmação de
estado abaixo, ajustando somente o nome do gate quando aplicável:

> Li o handoff e confirmei as regras. G6, G7, G8 e G9 documental estão concluídos; não
> executarei teste POST de idempotência ou qualquer nova escrita sem
> autorização explícita e escopo auditável.
> Também preservarei os limites definidos: sem production, `.env`, migrations
> ou dados não autorizados; um único cenário por vez, artefatos apenas em
> `/tmp/seus-brownies-playwright`, e sem reutilizar os registros FIFO existentes.
> Gate atual: G9 concluído documentalmente. O prefixo
> `HML2-POS-G6-20260902` já foi consumido pelo único ajuste autorizado; G9
> consolidou documentação e artefatos comprovados. Nenhuma nova escrita está
> autorizada.

Em seguida, organizar o trabalho em uma única etapa ativa por vez, sempre
declarando:

1. **Objetivo da etapa** — qual gate ou auditoria será executado.
2. **Pré-condições comprovadas** — autorização recebida, prefixo e valores
   reais, quando houver escrita.
3. **Ações permitidas** — somente as operações estritamente necessárias para a
   etapa; para G6, somente GET; para G7, somente o POST autorizado.
4. **Evidências a preservar** — resposta sanitizada, requests/responses,
   console, screenshot, trace e vídeo quando Playwright for usado.
5. **Condição de parada** — qualquer POST não autorizado, falha HTTP, erro de
   banco/schema/console/hidratação, divergência visual ou invariante FIFO
   alterado fora da escrita esperada.

Não antecipar etapas, criar dados de preparação, escolher valores, nem trocar
de cenário sem uma nova autorização explícita.

## Histórico da autorização de escrita concluída

G7 executou **um único ajuste positivo** com a referência exata
`HML2-POS-G6-20260902`: `PROD003`, quantidade `24.000`, custo total
`R$ 60,48`, origem `Ficha Técnica — Receita Base` e motivo `registro da
fornada padrão`. Esses dados são histórico do cenário concluído, não
autorização para nova escrita.

A confirmação visível na UI é uma proteção local e não substitui a validação
do writer no servidor. O payload não deve incluir o checkbox.

## Próxima operação que requer nova autorização

1. Não reutilizar a referência `HML2-POS-G6-20260902`.
2. Para qualquer teste POST de idempotência ou novo cenário, receber antes
   autorização explícita que identifique a operação, seus dados reais e a
   auditoria exigida.
3. Repetir a auditoria GET-only antes de toda escrita autorizada e parar diante
   de POST extra, falha HTTP, divergência visual ou alteração dos invariantes.

## Alterações locais relevantes

- `src/features/inventory/positive-adjustment-form.tsx`: confirmação explícita
  e habilitação condicionada ao contrato local.
- `src/features/inventory/lifecycle-ui.ts`: guard de UI; não altera o writer.
- `test/inventory-lifecycle-ui.test.ts`: cobertura da confirmação e do estado
  do botão.
- `e2e/fifo-g7-positive-adjustment.spec.ts`: evidência histórica de G7,
  explicitamente ignorada para não reenviar o POST da referência consumida.
- Validações já concluídas: `npm test`, `npm run lint` e `npm run build`.

## Atualização de estado — G7--G9 concluídos

O prefixo `HML2-POS-G6-20260902` não está mais vazio: contém somente o
movimento `#22` e a camada FIFO `#3` de `PROD003`, ambos `24.000` / `R$ 60,48`.
G8 reconciliou por GET o saldo `34.000` de `PROD003`, `3` camadas, `2`
alocações e `0` reversões, preservando os fatos HML anteriores.

G9 está concluído documentalmente. O próximo passo não é G7: teste POST de
idempotência ou qualquer novo cenário permanece bloqueado até autorização
específica, referência nova e auditoria própria.
