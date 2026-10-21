# Handoff — materiais de ficha — 18/10/2026

Estado: pausado por reserva obrigatória de capacidade. Franquia primária oficial:
95% utilizada, 5% restante; secundária 57% utilizada. Reset informado:
2026-10-18 21:31:53 America/Sao_Paulo (1792369913). Confirmar renovação antes
de retomar; executar LIGARTUDO conforme política. Não há retomada agendada.

## Complemento após checkpoint — rendimento confirmado e publicação autorizada

Consulta oficial na nova tentativa de execução: franquia primária 99% usada,
1% restante; secundária 58% usada. Janela ainda não renovou; mesmo reset
1792369913, 18/10/2026 21:31:53 America/Sao_Paulo. Não iniciar implementação
até confirmar renovação, conforme CODEX-USAGE-POLICY.md.

Usuário confirmou que 32 ovos fazem quatro formas de 44 × 31,3 × 3 cm.
Cada forma corresponde à receita-base de oito ovos e pesa 850 g assada/fria,
sem a forma. Quatro formas totalizam 3.400 g. Na mesma forma, corte 5×5 rende
48 simples OU 24 recheados; corte 7×7 rende 24 simples OU 12 recheados.
São alternativas de montagem; não somar os rendimentos como saídas simultâneas
integrais. Recheado usa duas partes da massa. Cortes escolhidos para aproveitar
a forma; no 5×5 a sobra é ínfima. Bordinhas variam conforme corte/lote.

Implementar apontamento do peso efetivamente recuperado por lote, inclusive
zero, pacotes de 100 g e custo alocado preservando o total da fornada. Não
presumir rendimento fixo de Bordinhas nem inventar percentual de recuperação.
As informações obrigatórias de receita/rendimento foram esclarecidas; não
repetir perguntas já respondidas. A medição efetiva de sobras pertence ao
apontamento da produção, não a uma premissa fixa exigida antes de implementar.
A projeção do cenário precisa explicitar sua hipótese de aproveitamento,
sem usar uma quantidade futura não informada como receita garantida.

Última instrução: “Pode fazer tudo e publicar”. Autoriza concluir código,
fichas, premissas financeiras, testes/ensaio, atualização do banco HML e
publicação HML. Não pedir novamente essa autorização. Não autoriza produção,
secrets, limpeza de histórico ou reaplicação de referências consumidas.

## Objetivo e autorização

Usuário autorizou continuar implementação, atualizar banco e publicar no HML.
Implementar decisões confirmadas de fichas/custos/MEI/taxas; preservar cenário
rascunho até resolver massa recuperada e rateio de Bordinhas. Não pedir de novo
as definições já registradas nem repetir importações consumidas.

## Concluído

Commit `ed1a304`: schema permite papéis filling/coating/packaging; servidor
seleciona papel/base, valida tipo e consumo por unidade, impede duplicidade da
embalagem individual e consome materiais na transação de conclusão. Testes
cobrem consumo/insuficiência, rollback, identidade e segunda conclusão.
Complemento final em testes também verifica custos exatos: cobertura R$ 24,
adesivos R$ 1,92 e camadas FIFO totais R$ 30,92 na fixture de 12 saídas.

Migration gerada pelo Drizzle: `drizzle/pending-profile-materials/0031_brave_thor.sql`.
Apenas dois valores de enum. Snapshot 0031 e journal candidatos separados;
baseline 0030 em pending-exact-costs. Cadeia ativa e pacote exato preservados.
Não aplicar o journal candidato nem repetir colunas de custos exatos.

## Verificações

- Suíte completa: 512 testes passaram antes dos três casos finais adicionais.
- 20 testes focados finais passaram, incluindo esses três e os custos FIFO.
- Lint, tipos e Oxfmt finais aprovados; log de formatação em
  `/tmp/cacau-materials-closing-quality.log`.
- Knip final: três achados de baseline, zero novos; sem baseline alterada.
- Builds isolados CI e HML do commit ed1a304 passaram. Alterações posteriores
  somente em testes/documentação; código de runtime permanece esse commit.
- SQL exato ensaiado em PostgreSQL 17 Alpine novo, porta loopback 5438,
  credenciais sintéticas: enum inicial filling, novos valores visíveis durante
  transação, rollback e enum original conferidos. Runner versionado em
  `scripts/test-profile-materials-disposable.mjs`. Fixture criada pela tarefa
  encerrada após ensaio. Download da variante postgres:17 cancelado; utilizada
  imagem local postgres:17-alpine. Não parar outros containers do usuário.
- CI/CodeQL remoto não conferido; e2e não executado neste incremento de servidor.

## Banco e HML

Nenhuma escrita compartilhada nem deploy nesta etapa. Read-only confirmou alvo
Neon projeto steep-brook-51659857, branch br-lingering-wind-acwh5wap, neondb:
33 recibos de migration, enum apenas filling. INS006 ID23 packaging/unit;
INS019 ID36 ingredient/g; PROD001 ID1, PROD002 ID2, PROD017 ID17. Nunca presumir
que número do SKU é ID. Cenário anterior ID1/v1/rev1 draft/mix100%; não ativado.

HML continua versão 29df3f6d-48be-4a80-b11c-a3c2b992cd69 do commit e890e3d.
TECH-CATALOG-2026-10-18-001 consumido; não reusar. Há autorização para HML,
mas não para produção, secrets, limpeza ou alteração de histórico financeiro.

## Próximo passo exato

1. Confirmar uso renovado, branch feat/input-catalog-kg-purchases e Git limpo;
   ler este handoff, AGENTS e governança; seguir procedimento de retomada.
2. Revalidar alvo, recibos, backup/recuperação e ausência de drift. Preparar
   aplicação aditiva 0031 com referência NOVA e auditoria; ensaiar o pacote
   completo na cópia autorizada antes da original. DDL deve commitar antes de
   inserir componentes com os novos valores. Não usar db:push/db:migrate geral.
3. Preparar vínculos por SKU/perfil: adesivo INS006 por unidade nos 14 brownies
   PROD003–PROD016, bombom PROD001 e kit PROD017; cobertura INS019 50g/bombom
   e 200g/kit. Kit tem quatro bombons diretos, uma embalagem INS012 e um adesivo,
   sem embalagem individual interna. Preservar os 12 recheios e 14 embalagens
   já cadastrados; não duplicar seus custos. Quantidade base per_finished_unit.
4. Atualizar preço/apresentação Bordinhas 100g/R$6 com auditoria; embalagem0,11
   e adesivo0,16 confirmados, mas SKU da sacola ainda distinto/não presumido.
   Consumo de componentes no código atual abrange perfis principais: Bordinhas
   coproduto ainda precisa solução própria, sem rendimento fixo12 nem custozero.
5. Implementar planejamento fixo2288 (2200+MEI88), MO600 já incluída, energia
   incluída; taxas débito1,43%, crédito3,36%, Pix0,49/transação. Sem mix universal
   por local e sem inventar pagamentos/despesas históricas. Representação atual
   só tem reserva percentual; Pix precisa representação própria.
6. Ensaiar dados/negativos/rollback, aplicar mudanças autorizadas com auditoria,
   publicar HML do HEAD validado e conferir leitura/UI. Cenário fica rascunho
   enquanto custo físico/rateio das Bordinhas não estiver fechado.

Fontes: PROFILE-MATERIALS-2026-10-18.md, MEI-PAYMENT-FEES-2026-10-18.md,
ATTACHED-WORKBOOK-COMPLETE-REVIEW-2026-10-18.md e evidências de reconciliação.
Meta R$10000 é lucro após custos de todos os produtos. Produção normal14–16
receitas/dia, quatro dias/mês a150/dia (600 incluídos), 20 dias são de venda.
Chocolate da massa é Harald Melken50% em pó; papel0,8m; ovos8/receita.

## Checkpoint

Executar DESLIGARTUDO após salvar este handoff em branch de trabalho; confirmar
resultado real de commit/rebase/push. Não alegar publicação HML ou sincronização
sem resultado. Se falhar, preservar estado e registrar motivo sem push forçado.
