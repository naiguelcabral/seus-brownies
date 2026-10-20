# Revisão de integração — 20/10/2026

Evidência de T01/G01; a fila permanece em `ROADMAP-CODEX.md`. Revisão da
main `32a9e11984d9d3957340d1ab6ae31adb3b2b22f6` e da candidata
`c96b207825f5199d66163b6a2279b8da10cbb053`. A main é ancestral da candidata:
zero commits exclusivos da main e 117 da candidata nesse checkpoint. O diff
agrega as entregas históricas publicadas no HML e as validações recentes;
sucesso de CI não equivale a revisão humana dos domínios ou release definitiva.

## Sobreposição de PRs

| PR | Evidência | Tratamento preparado |
| --- | --- | --- |
| #44 `feat(audit): prepare external readonly gates` | HEAD c1579ab é ancestral da candidata; zero commits exclusivos. Utilitários/testes já estão na linha atual, documentos receberam reconciliações posteriores | Não mesclar uma segunda cópia; conferir inclusão na integração final e só então encerrar como incorporada |
| #45 `chore(tooling): integrar Oxlint, Oxfmt, Knip e CodeQL em modo controlado` | Três commits exclusivos, proposta informativa de ESLint/Prettier e comandos npm exec. Sem lockfile correspondente; workflow preview advisory e regras Oxc iniciais | Não mesclar cegamente: tooling atual já usa TS7/Oxc tipado obrigatório, dependências/lock auditáveis, baseline Knip e CodeQL em três linguagens. Preservar a proposta como evidência e decidir encerramento após revisão |
| #46 | Preparação/revisão offline da cadeia até 0033, base na última linha publicada | Revisão incremental, sem ativar migrador compartilhado |
| #47 | QA, correção de consultas transacionais, gates e sustentação; depende da #46 | Revisão incremental da continuação, sem fatos sintéticos compartilhados |

## Ordem do aceite

Revisar as PRs incrementais e o diff acumulado por domínio: autenticação/RBAC,
estoque/FIFO, produção/custos exatos, vendas/financeiro/lifecycle,
cenários/relatórios/UX, migrations e ferramentas. Os snapshots e o lockfile
explicam parte relevante do tamanho do diff; não removê-los para encurtar a PR.
As 36 migrations já consumidas no alvo histórico não devem ser reaplicadas
quando código for integrado. A instalação genérica permanece protegida pelos
gates próprios de T02.

Antes do merge, conferir checks do SHA final, resultados/alertas CodeQL,
ambientes e evidência funcional aplicável. `SECURITY.md` exige revisão humana
de alterações de major/runtime antes do merge; `DEVELOPMENT-WORKFLOW.md`
preserva o gate humano. A candidata contém a modernização de toolchain já
testada na branch, portanto a integração não é um ato automático de sincronização.
Nenhuma PR foi mesclada/encerrada ou branch removida por esta revisão.

## Revisão de runtime da CI

A CI39431560884 passou com aviso explícito de checkout/setup-node v4 sendo
forçados a Node24 e de migração automática de ubuntu-latest para Ubuntu26.
Foram consultadas as notas oficiais de
[checkout v6](https://github.com/actions/checkout/tree/v6),
[setup-node v6](https://github.com/actions/setup-node/tree/v6) e
[upload-artifact v6](https://github.com/actions/upload-artifact/tree/v6).

Os workflows agora usam essas Actions Node24, mantêm o runtime da aplicação
em Node22 pela `.nvmrc` e fixam Ubuntu24.04. Cache npm continua explícito nos
jobs de build/teste; cache automático desabilitado no job CodeQL. Nenhum job
executa Git autenticado dentro de Docker, situação que tem requisito adicional
na v6 de checkout. Os cinco workflows foram ensaiados no código cf90f4a,
incluindo cadeia PostgreSQL e gates de evidência. Isso é revisão deliberada,
não atualização automática de dependências da aplicação.
