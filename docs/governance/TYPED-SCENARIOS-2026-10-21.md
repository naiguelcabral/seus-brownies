# S04 — contratos tipados de Cenários — 21/10/2026

Seguimento: incremento integrado pelas PRs #52/#53 e publicado no HML em
21/10/2026. O texto abaixo preserva o checkpoint de preparação/validação.
[Publicação e limites](JOINT-HML-PUBLICATION-2026-10-21.md).

Candidata sobre `b83812c` da PR #52, em branch própria
`codex/typed-scenarios-20261021`. Revisão compara somente este incremento;
#51 → #52 → esta candidata formam a sequência empilhada. A PR #50 trata a
coleta/roteiro do aceite real de permissões e exige reconciliação documental.

## Alteração

`src/features/scenarios/functions.ts` substitui `any` por capacidades derivadas
do driver/schema. Consultas usam `DatabaseReader`; a transação genérica local
preserva o retorno dos cinco writers e acrescenta somente `delete`, já usado
na substituição do mix. Finanças/lifecycle conservam sua fronteira anterior.
Seleções inferem enumeração, campos e nulabilidade; snapshots usam `Pick` do
schema do mix, sem cópia manual de tipos. Imports de banco são exclusivamente
de tipo, sem abertura de conexão.

O resultado obrigatório de `max(version)` passa por `requireFirst`. Linha
ausente falha antes da escrita; agregado SQL nulo mantém o fallback anterior.
Nome de produto já validado usa `requireDefined` em vez de asserção não nula.
`archiveReason` normaliza a ausência opcional em `null`; substituir um ativo
continua exigindo motivo. SQL, ordem das consultas/escritas, locks, cálculos,
precisão, revisões, versões, permissão, histórico e auditoria preservados.
Nenhuma migration ou mudança de regra de negócio.

A fixture UI passa a usar o contrato inferido do componente: a enumeração
mais precisa expôs o literal de produto alargado para `string`. Nenhuma
alteração de comportamento ou layout.

## Verificação

- Fixture de compilação cobre dinheiro/custo numérico, status inválido,
  fronteira sem exclusão e retornos id/version/revision dos cinco writers.
- Três regressões Node: fonte ausente, linha agregada ausente e tradução dos
  dois códigos de schema. Mock incompleto somente nesses caminhos de falha;
  compatibilidade do driver cabe ao teste PostgreSQL real.
- 569 testes Node completos, tipos, lint, Oxfmt e Knip aprovados; quatro
  achados contextuais conhecidos, zero novos. A sandbox impediu subprocessos
  de fixtures Git na primeira tentativa; suíte completa repetida no host.
- Dois casos novos conectados HTTP/PostgreSQL 17 aprovados: ciclo completo
  de criação/edição/ativação/versão/substituição/arquivo, projeção constante,
  pesos 103% normalizados em 100%, custos com três casas, revisão obsoleta,
  imutabilidade e autoria; e dez falhas transacionais (cinco writers × dois
  destinos de auditoria), exigindo igualdade de cenários/mix/histórico/auditoria
  antes/depois. Somente banco sintético vazio do runner isolado.
- Build HML isolado de `0fea71f` aprovado com chave pública de teste.
  Doze casos conectados aprovados (dez anteriores + dois novos), incluindo
  dez injeções de falha transacional. Conexão local bloqueada por EPERM na
  sandbox; runner repetido no host, sem configuração ou dados compartilhados.
  [PR #53](https://github.com/naiguelcabral/seus-brownies/pull/53) aberta em
  rascunho. Checks de push e PR do SHA `a5ce6ac` aprovados: CI
  `39632923720`/`39633044977`, negócio/browser `39632923664`/`39633044954`.
  CodeQL `39632923655` aprovado; análises `1998032254` (JS/TS), `1998030129`
  (Python) e `1998029109` (Actions), zero resultados/erros/avisos. Não dispensa
  alertas legados de outros SHAs. PostgreSQL descartável encerrado.

## Limites

Sem fatos sintéticos ou SQL compartilhado, merge ou deploy. S04 permanece
parcial para extrações maiores. H03 real permanece assistido no dispositivo
do usuário e exige chamadas autenticadas; não é concluído pelo laboratório.
Revisão/integração e publicação conjunta HML vêm após a homologação solicitada.

Referências: [roadmap](ROADMAP-CODEX.md), [estado](PROJECT-STATUS.md),
[tipagem anterior](TYPED-TRANSACTIONS-2026-10-21.md),
[permissões manuais](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md),
[aprovações](HUMAN-APPROVALS.md) e [workflow](DEVELOPMENT-WORKFLOW.md).
