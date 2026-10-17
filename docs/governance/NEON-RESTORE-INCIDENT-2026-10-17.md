# Incidente de finalização de restore — 17 de outubro de 2026

## Recuperação concluída após aprovação específica

Usuário aprovou as realocações corretivas depois da rejeição automática.
Executadas em sequência: `ep-holy-grass-acgby01h` para estacionamento,
`ep-late-water-acahd1z1` para original, `ep-holy-grass-acgby01h` para cópia.
Renomeações e default/primary da original reconfirmados. Estado final:

- Original `br-lingering-wind-acwh5wap`: `production`, default/primary,
  endpoint `ep-late-water-acahd1z1`.
- Cópia `br-super-waterfall-ac0mxtnt`: `cacau-baseline-0016-validation-20261017`,
  endpoint `ep-holy-grass-acgby01h`, isolada do Worker.
- Estacionamento `br-dawn-salad-acxz7vha`: sem endpoint, preservado.
- Auth original e JWKS reconfirmados com o endpoint original; origens de
  localhost e HML preservadas. Não foi necessário alterar secrets do Worker.

Nenhum dado foi restaurado sobre a original para corrigir o incidente.
Depois dessas verificações, o plano de migrations já autorizado foi retomado:
ensaio na cópia e aplicação na original passaram, com 17 recibos reais até
`0016`. Resultado em `AUTH-BASELINE-0016-EXECUTION-PLAN.md`.

O inventário abaixo registra o estado durante o incidente, não o estado final.

## Estado e causa

O usuário autorizou snapshot, cópia isolada, ensaio de `0000–0016` e aplicação
na branch original somente após o ensaio passar. Não autorizou substituição
da produção pelo restore da cópia.

Snapshot criado: `snap-withered-poetry-achs77uu`, nome
`cacau-before-baseline-0016-20261017`, source
`br-lingering-wind-acwh5wap`, criado `2026-10-17T18:20:47Z`, expiração
`2026-10-24T18:30:00Z`.

A chamada `restore_snapshot` omitiu `finalize`; o MCP aplica `true` por padrão
nessa modalidade. A operação criou `br-super-waterfall-ac0mxtnt` e finalizou
a troca, movendo computes, nome e default/primary. O agente deveria ter usado
explicitamente `finalize:false`; a omissão foi um erro de execução.
Nenhuma migration foi executada no Neon antes ou depois dessa descoberta.

Documentação oficial: a API nativa usa `finalize_restore:false` por padrão,
mas o wrapper MCP declara outro default. Não confundir os contratos.
[Restore snapshot](https://api-docs.neon.tech/reference/restoresnapshot),
[finalização](https://api-docs.neon.tech/reference/finalizerestorebranch).

## Inventário após a operação

| Recurso | Estado observado |
| --- | --- |
| Branch original `br-lingering-wind-acwh5wap` | preservada, nome `cacau-baseline-0016-validation-20261017 (1)`, não default/primary |
| Cópia `br-super-waterfall-ac0mxtnt` | nome `production`, default/primary, restore finalized |
| Endpoint original `ep-late-water-acahd1z1` | associado à cópia `br-super-waterfall-ac0mxtnt` |
| Endpoint `ep-holy-grass-acgby01h` | associado à branch original |
| Auth da branch original | integração Better Auth preservada; base URL acompanha `ep-holy-grass-acgby01h` |
| Auth da cópia | não retornou integração configurada |

Portanto, o endpoint originalmente usado pelo Worker está na cópia e a
associação de Auth mudou. Não afirmar funcionamento do login ou preservação
de toda atividade concorrente apenas pela existência do snapshot. Dados e
branch originais permanecem disponíveis; nenhuma restauração sobre seus dados
será feita para desfazer a troca.

Para permitir devolver os endpoints sem excluí-los, criada branch privada
sem compute `br-dawn-salad-acxz7vha`, nome
`cacau-baseline-endpoint-parking-20261017`, parent original. Nenhum SQL nela.
Sem remoção de dados, branches, snapshots ou endpoints.

Tentativa de mover `ep-holy-grass-acgby01h` para essa branch foi **rejeitada
pela revisão automática**, que apontou risco de interrupção do Worker/Neon
Auth e falta de autorização explícita para realocação corretiva. A chamada
não efetivou a realocação; não repetir nem contornar a rejeição sem aprovação.

## Recuperação corretiva proposta — aprovação específica pendente

1. Mover `ep-holy-grass-acgby01h` da original para estacionamento
   `br-dawn-salad-acxz7vha`.
2. Mover `ep-late-water-acahd1z1` da cópia para a original
   `br-lingering-wind-acwh5wap`.
3. Mover `ep-holy-grass-acgby01h` do estacionamento para a cópia
   `br-super-waterfall-ac0mxtnt`.
4. Renomear cópia para `cacau-baseline-0016-validation-20261017`; original
   para `production`; definir a original como default/primary novamente.
5. Conferir endpoints e integração Auth da original: devem voltar ao endpoint
   `ep-late-water-acahd1z1`. Conferir configurações públicas de callback/origem.
   Nenhuma mudança de secret, senha, DNS, RBAC ou dados é proposta.

A troca reinicia computes e pode interromper conexões brevemente. A API
permite um read-write compute por branch, daí o estacionamento transitório.
[Manage computes](https://neon.com/docs/manage/computes).
Não excluir o estacionamento ou o snapshot automaticamente.

Somente após recuperação confirmada, retomar o plano de migrations previamente
autorizado na cópia isolada, sem mudar o ID da branch original por inferência.
Se uma etapa falhar, parar e inventariar antes de agir novamente.

## Trabalho local preservado

Compilador offline `scripts/auth-baseline-payload.mjs` verifica os 17 hashes
do manifesto aprovado e inclui precondições de base/schema não inicializados,
search_path público, timeouts e journal transacional com recibos reais.
Quatro cenários em PostgreSQL 17 local passaram: payload exato/rejeição de
repetição, rollback total do payload, Drizzle canônico/reset/reaplicação e
rollback Drizzle. Lint aprovado. Payload não aplicado remotamente.
