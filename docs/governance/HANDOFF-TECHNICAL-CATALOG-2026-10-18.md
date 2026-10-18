# Handoff — preparação do cadastro técnico

## Checkpoint atual — cadastro aplicado e conferido

Autorização humana explícita recebida para reconferir workbook, receita e ficha,
incluir ovos, ensaiar e prosseguir somente após sucesso. Tudo confirmado na
original em 18/10/2026 às `15:03:03.883098Z`. São 37 produtos, Ovos Grandes em
unidades, receita de sete linhas/8 ovos, dois requisitos/tarifas, 17 perfis,
14 embalagens e 12 recheios. Recibo e 43 auditorias conferidos. Referência
**consumida** `TECH-CATALOG-2026-10-18-001`; nunca repetir a carga.

Backup atual `br-solitary-unit-ac3lawit`, LSN `0/21275A0`, sem compute, preservado.
Quota recusou segunda branch. Reutilizada cópia privada anterior
`br-aged-violet-ac5aap1s` após igualdade completa dos 39 digests (38 tabelas e
journal) e nove seções de schema; ensaio e readback independente passaram.
Original revalidada antes das mesmas 144 instruções, corpo SQL SHA-256
`01fdc56d23954ef5ba9a92de501cb65834cab2ef36cecb2ee5aeac1d5332a645` inalterado.
Leitura independente original também passou. Compute do ensaio suspenso/idle;
original conserva endpoint/default/primary e todos os backups anteriores.

Evidências: `technical-catalog-execution-2026-10-18.json` e dois readbacks em
`evidence/`; verificador offline versionado em
`scripts/verify-technical-catalog-readback.mjs`. Status/roadmap/plano e
HUMAN-APPROVALS atualizados. Pacote anterior: 507 testes e 16 casos PG17 verdes;
verificador aprovou os dois readbacks reais e checks finais locais passaram.
Nenhuma fonte/runtime da aplicação, migration, segredo ou deploy alterado.
Não repetir suíte/build da aplicação apenas por essa documentação/evidência.

Próximo passo: preparar estoque rastreável e cenário QA isolado antes da
homologação autenticada compra → produção → venda. Original ainda tem zero
compras/movimentos/lotes/vendas; não criar saldo fictício. Bombom/kit permanecem
fichas incompletas quanto à embalagem/cobertura. Os ovos não têm conversão para
kg. Custos históricos fracionários são somente metadados brutos.
Não há gate de cadastro técnico deste pacote pendente. Operações reais e novas
regras mantêm seus gates próprios. Não há retomada automática agendada.

## Histórico anterior à autorização

## Checkpoint anterior — pacote SQL ensaiado

Retomada autorizada em 18/10/2026, após consulta oficial confirmar renovação:
100% restantes na janela de cinco horas e 74% na semanal. LIGARTUDO em modo
prepare-only executado, branch limpa e pull --ff-only sem mudanças.
Aviso de keyring no preflight não bloqueou os tools conectados utilizados.

Concluído: workbook reaberto e hash preservado; SQL separado compilado com
guards e readbacks, sem PLAN históricos. Inclui somente o catálogo técnico
apresentado em TECHNICAL-CATALOG-EXECUTION-PLAN-2026-10-18.md. Custos históricos
fracionários são metadados brutos e bombom/kit continuam incompletos.
Nova consulta READ ONLY real confirma catálogo/domínio/referência disponíveis.

Arquivos novos: três scripts `*technical-catalog*.mjs`,
`test/technical-catalog-package.test.ts`, plano de execução e evidências
`technical-catalog-{apply,package,source-revalidated,test,readonly-refresh}-2026-10-18.*`.
Status/roadmap e plano de preparação atualizados. Nenhuma fonte da aplicação,
schema ou migration alterados; nenhuma escrita compartilhada ou publicação.

Validação: 507 testes, 16 casos PG17, tipos/lint/check/Knip verdes. Suite no
sandbox falhou em subprocessos e foi interrompida; repetição permitida fora
dele passou. Na primeira fixture PG17, o guard de produto usado rejeitou a
própria montagem do conflito; a fixture foi corrigida para outro insumo, sem
enfraquecer o guard, e os ensaios finais completos passaram. Contêiner PG17
encerrado; sequências podem avançar após falhas, sem fatos persistidos.
Build não repetido por não haver mudança de runtime. CI/CodeQL deste pacote,
backup novo/cópia real de ensaio, aplicação real e QA autenticado não executados.

Próximo passo exato: obter autorização específica do pacote/SQL com SHA-256
`01fdc56d23954ef5ba9a92de501cb65834cab2ef36cecb2ee5aeac1d5332a645`, incluindo
backup atual em branch sem compute e ensaio em cópia privada; aplicar na
original somente após passar. Revalidar alvo e preflight; seguir o plano de
execução. Referência `TECH-CATALOG-2026-10-18-001` não consumida na base real.
Não repetir importadores antigos, criar estoque sintético ou presumir gate
resolvido por esta preparação. Sem retomada automática agendada.

## Histórico da preparação anterior

Tarefa: próxima etapa O01–O04 após custos exatos publicados em HML.
Branch: `feat/input-catalog-kg-purchases`; início limpo em `b7da33e`.

## Concluído

- Conferência READ ONLY de catálogo e contagens na original; 36 produtos e
  nenhum cadastro de receita/perfil/tarifa ou fato de estoque/produção.
- Cruzamento do manifesto v4 com catálogo e prévia histórica versionada.
- Candidato offline: um insumo faltante, uma receita, sete linhas físicas,
  dois requisitos, duas tarifas, 17 perfis e 12 componentes de recheio.
- Identificada necessidade de lote separado: importador antigo carrega 17
  planejamentos históricos fora do escopo; não executá-lo com confirmação.
- Bombom/kit sem regra explícita completa de embalagem/cobertura, sem inferência.

## Arquivos

- `evidence/technical-catalog-preflight-2026-10-18.json`
- `evidence/technical-catalog-candidate-2026-10-18.json`
- `docs/governance/TECHNICAL-CATALOG-PREPARATION-2026-10-18.md`
- Este handoff e os checkpoints de status/roadmap.

## Verificações

Assertions de geração passaram: 36 SKUs distintos, domínio técnico vazio,
sete itens físicos com apenas Ovos Grandes ausente, unidades existentes
compatíveis, 17 produtos finais disponíveis, 14 regras de embalagem e 12
componentes aprovados de 20/40 g. Candidato JSON válido e hash do manifesto
registrado. Não houve alteração de código, importação, SQL de escrita,
migration ou deploy; não foi repetida a suíte de código não afetado.

Ainda não executados: SQL de aplicação, testes transacionais do novo lote,
revalidação do workbook, backup/ensaio para cadastro e homologação autenticada.

## Retomada

Ler o plano de preparação acima; construir/testar o SQL separado de cadastro
técnico, começando pelo insumo Ovos Grandes e pelos vínculos já aprovados.
Conservar o custo exato implementado; não usar custos históricos para estoque.
Não repetir catálogo ou recibos anteriores. Autorização humana específica de
escrita somente após pacote concreto e ensaiado. Sem decisão nova para recheios
ou tarifas já documentados; não inventar embalagem/cobertura de bombom e kit.

## Capacidade

Última leitura oficial: 3% restantes na janela de cinco horas, 74% na semanal;
reserva operacional 5%. Reset exibido: 18/10/2026, 10:29:36 America/Sao_Paulo.
Estado: pausado por reserva; encerramento oficial com DESLIGARTUDO a seguir.
Na retomada confirmar o saldo oficial e seguir CODEX-USAGE-POLICY.md; não há
retomada automática agendada por esta tarefa. Ao alcançar 5%, fechar checkpoint
e executar `./DESLIGARTUDO` em branch de trabalho, conforme a política.

Tentativa de retomada em 18/10/2026 às 10:29 America/Sao_Paulo: árvore limpa,
branch correta e consulta oficial ainda com 3% restantes antes do reset.
Nenhuma implementação iniciada; próximo passo e gates acima preservados.
Encerramento oficial repetido conforme a reserva obrigatória.
