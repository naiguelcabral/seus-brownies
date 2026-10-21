# Cadastro técnico — pacote para autorização

Estado: **autorizado, ensaiado externamente, aplicado e conferido na original**.
Alvo exclusivo proposto: `steep-brook-51659857` /
`br-lingering-wind-acwh5wap` / `neondb`.
Branch Git: `feat/input-catalog-kg-purchases`.

## Resultado da execução

Autorização humana explícita recebida após a apresentação deste pacote.
Workbook/receita/ficha reconferidos, incluindo oito ovos em unidades.
Backup novo sem compute `br-solitary-unit-ac3lawit`, LSN `0/21275A0`, preservado.
Criação da segunda branch recusada por quota; para o ensaio, reutilizada
`br-aged-violet-ac5aap1s`, cópia privada anterior do backup de custos exatos,
após igualdade de todos os digests das 38 tabelas e journal e das nove seções
de definições do schema com a original atual. Não deriva do backup novo;
a equivalência foi comprovada antes de qualquer inclusão. Nenhuma branch
apagada/resetada, nenhum endpoint realocado e nenhum restore executado.

Mesmo SQL abaixo aplicado na cópia e, após sucesso, na original revalidada,
via 144 instruções por transação gerenciada pelo MCP, preservando o corpo do
SQL e substituindo apenas BEGIN/COMMIT pelo envelope transacional da ferramenta.
Leituras independentes confirmam todos os valores/vínculos, 43 auditorias,
preservação integral dos registros anteriores e schema inalterado.
Original confirmada às `2026-10-18T15:03:03.883098Z`; compute do ensaio idle.

Recibo: [technical-catalog-execution-2026-10-18.json](../../evidence/technical-catalog-execution-2026-10-18.json).
Readbacks: [original](../../evidence/technical-catalog-original-readback-2026-10-18.json)
e [ensaio](../../evidence/technical-catalog-rehearsal-readback-2026-10-18.json).
Ambos passam `node scripts/verify-technical-catalog-readback.mjs <arquivo>`.
Nenhum fato operacional criado. Bombom/kit e QA autenticado continuam pendentes.
Os procedimentos prospectivos abaixo são o plano histórico já executado com
a adaptação de topologia explicitamente documentada acima.

## Pacote concreto

SQL: [technical-catalog-apply-2026-10-18.sql](../../evidence/technical-catalog-apply-2026-10-18.sql).
SHA-256: `01fdc56d23954ef5ba9a92de501cb65834cab2ef36cecb2ee5aeac1d5332a645`.
Manifesto: [technical-catalog-package-2026-10-18.json](../../evidence/technical-catalog-package-2026-10-18.json).
Referência **consumida na base real; não repetir**: `TECH-CATALOG-2026-10-18-001`.

| Cadastro | Inclusões |
| --- | ---: |
| Ovos Grandes, ingrediente ativo, unidade `unit`, sem preço de venda/saldo | 1 |
| Receita-base versão 1 | 1 |
| Linhas físicas, mantendo óleo em ml e papel em m | 7 |
| Requisitos de energia e mão de obra | 2 |
| Tarifas de energia R$ 0,85/kWh e trabalho R$ 12,50/h, desde 01/01/2026 | 2 |
| Perfis de referência, com 14 vínculos de embalagem explícitos | 17 |
| Recheios por unidade final: seis de 20 g e seis de 40 g | 12 |
| Recibo de carga | 1 |
| Eventos de auditoria, inclusive do recibo | 43 |

Ovos não têm conversão para kg. Custos históricos fracionários ficam como
texto bruto no JSONB de origem; as colunas monetárias `historical_cost`
permanecem NULL. Não representam custo realizado ou valor de estoque.

Bombom `PROD001` e kit `PROD017` preservam rendimentos de referência 77 e
19,25 e recebem metadados explícitos de incompletude. Embalagem/cobertura
continuam pendentes. O metadado não implementa bloqueio na aplicação: esses
perfis não devem ser usados para homologar produção até completar suas regras.
Bordinhas continua coproduto, sem perda automática.

## Fontes e preflight

Workbook disponível reaberto com o extrator offline; SHA-256
`25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`,
igual à cópia já aceita. Zero issues. Fonte revalidada em
[technical-catalog-source-revalidated-2026-10-18.json](../../evidence/technical-catalog-source-revalidated-2026-10-18.json).
Manifesto v4, candidato e catálogo anterior têm hashes verificados pelo
compilador. Os 17 PLAN foram contados e excluídos, sem usar o importador antigo.

Nova consulta MCP em transação explicitamente READ ONLY confirmou catálogo
igual aos 36 SKUs anteriores, zero receitas/itens/requisitos/tarifas/perfis/
componentes, zero compras/movimentos/lotes/vendas, 33 recibos de schema e
referência/hash novos disponíveis. Evidência resumida em
[technical-catalog-readonly-refresh-2026-10-18.json](../../evidence/technical-catalog-readonly-refresh-2026-10-18.json).
A leitura atual confirmou contagem do journal; o SQL de aplicação verifica
cada hash/timestamp e cada uma das nove colunas JSONB de custo exato.

## Proteções transacionais

O lote inteiro usa BEGIN/COMMIT, advisory lock e locks das tabelas públicas
mais journal, com timeout. Confere nomes/tipos/unidades/atividade dos 36
produtos, categoria ativa, domínio técnico e operacional vazios, ausência de
referência/hash/auditoria e histórico de schema exato antes das inclusões.

Cada inclusão tem conferência dos valores e auditoria na mesma transação.
Todas as conferências se repetem antes do COMMIT; registros anteriores de
todas as tabelas públicas e journal são comparados sem exportar seu conteúdo.
As contagens finais permitem somente os acréscimos declarados na tabela acima.
Falha aborta o lote; sequências PostgreSQL podem avançar mesmo após rollback.

O SQL não contém identificação verificável de projeto/branch Neon. O executor
precisa passar os IDs acima explicitamente e revalidar os metadados do alvo;
`current_database()='neondb'` sozinho não comprova o destino correto.
Nenhuma migration persistente ou mudança na cadeia ativa integra o pacote.

## Validação e reprodução

Os 16 cenários do PostgreSQL 17 descartável passaram. Incluem nome/unidade/
atividade/SKU divergentes, cadastro parcial, referência/hash consumidos,
drift do journal, coluna exata ausente, falha na última auditoria, alteração
indevida de registro antigo, corrupção imediata e tardia de nova receita,
sucesso e repetição. Preservados 38 tabelas e 33 recibos; nenhum fato operacional
criado. A fixture usa a baseline/ponte revisadas e o rollout exato já registrado.
É laboratório sintético; não substitui ensaio da cópia real após backup.
Recibo: [technical-catalog-test-2026-10-18.json](../../evidence/technical-catalog-test-2026-10-18.json).

```bash
node scripts/generate-technical-catalog-package.mjs --write-review-package
node scripts/test-technical-catalog-disposable.mjs --ack-disposable-postgres17
```

O segundo comando exige banco novo e descartável na porta local 5438,
usuário `technical_catalog_fixture`, senha sintética `synthetic-catalog-only`,
banco `neondb`, PostgreSQL 17. Recusa base já inicializada e não limpa dados.
A geração é somente offline e não oferece modo de aplicação.

Suíte geral final: 507 testes aprovados, incluindo dois contratos novos do
pacote. Tipos, lint, check Oxfmt e Knip aprovados; três referências contextuais
anteriores mantidas, sem novos achados. A execução inicial da suíte no sandbox
falhou em subprocessos e foi interrompida; a repetição fora da restrição passou.
Build da aplicação não repetido: nenhuma fonte/runtime/configuração da aplicação
mudou. CI/CodeQL remotos deste pacote ainda não executados.

## Gate humano e execução proposta — histórico já autorizado

Conforme [HUMAN-APPROVALS.md](HUMAN-APPROVALS.md), a preparação local não
autoriza escrita na original. Solicitar aceite específico deste SQL e escopo,
incluindo backup novo em branch preservada sem compute, cópia privada de
ensaio e aplicação na original somente após sucesso do ensaio.

Após aceite:

1. Registrar a autorização e reconfirmar projeto, branch, endpoint e banco.
2. Repetir preflight READ ONLY e conferir o SHA-256 do SQL acima. Se mudou,
   parar e reconciliar; não adaptar a carga silenciosamente.
3. Criar backup atual da original em branch sem compute, registrar LSN/UTC e
   mantê-lo preservado. Manter todos os backups/snapshots anteriores.
4. Criar cópia privada derivada do backup, sem promoção/finalização, restore
   sobre a original ou realocação de endpoints; ensaiar o SQL exato nessa cópia.
5. Conferir inclusões e preservação por leitura independente. Havendo falha,
   parar; não aplicar à original. Suspender compute de ensaio ao finalizar.
6. Revalidar a original e aplicar o mesmo SQL em uma transação. Em resposta
   incerta, conferir recibo e conteúdo em READ ONLY antes de qualquer nova ação.
7. Em nova transação READ ONLY, comparar cada cadastro/vínculo/quantidade/
   unidade/tarifa e metadado com as fontes, os 43 eventos com seus IDs de
   entidades, recibo/hash, registros preservados e domínio operacional vazio.
8. Atualizar status/handoff com evidências reais e marcar referência consumida
   somente após confirmação. Não apagar backup nem desfazer por DELETE.

Não inclui compras, saldo inicial, planejamento histórico, lotes, vendas,
backfill, nova regra de embalagem/cobertura, mudanças de auth/RBAC/secrets,
merge ou deploy. Estoque rastreável e QA autenticado continuam etapas próprias.
