# Recebimentos, lucro conjunto e usabilidade — 18/10/2026

Usuário autorizou “Pode realizar com base nas informações eu enviei”, após
proposta destes cinco pontos. Não há compras ou produção real previstas.
Implementação/ensaios isolados e publicação no HML da conversa; sem produção
principal, alteração de secrets ou fatos sintéticos na base compartilhada.

## Comportamento

Venda paga exige meio de pagamento. Venda confirmada dispõe de recebimento
integral posterior, sem nova baixa de estoque nem receita na entrega repetida.
Valor bruto é informado antes da taxa: débito 1,43%, crédito 3,36%, Pix R$ 0,49
por pagamento e dinheiro sem taxa. Não tratar número de itens como número
de transações. Recebimento registra bruto, taxa e efeito líquido em caixa.
JSON versionado preserva meio/tarifa/data; reenvios mantêm idempotência mesmo
após alteração de parâmetros. Cobrança parcial, parcelamento e pagamento misto
não são representados por este fluxo de quitação integral.

Nova despesa exige classificação fixa, variável ou produção já apropriada aos
lotes. Esta última não reduz lucro novamente: a parcela consumida chega pelo
CMV FIFO, incluindo frações exatas. Insumos/embalagens entram por Compras;
MEI pago entra como despesa fixa. Nenhum gasto recorrente é criado sozinho.
Referência de R$ 2.288 é orçamento, sem dedução automática no realizado.

Dashboard e Financeiro mostram receita de todas as entregas, CMV, taxas,
despesas classificadas, lucro registrado e diferença para a meta conjunta.
Não filtram pelos produtos do mix. Lucro depende dos registros efetivos, não
é garantia nem substitui ausência de lançamentos. Dados antigos sem classe ou
taxa conhecida e FIFO incompleto deixam o lucro indisponível, sem backfill.
Recebimentos líquidos de taxas/reembolsos permanecem separados de lucro;
esse agregado não afirma conciliar todo caixa, compras e contas bancárias.

Compras, Produção, Vendas e Despesas usam modal nativo acessível; fechamento
preserva o preenchimento no estado da página. Produção mantém prévia no modal;
nenhum lote nasce por abrir ou simular. Histórico continua em largura total.

## Schema, preservação e recuperação

Migration `0033_payment_settlement` acrescenta três campos nullable:
`sales.payment_details`, `financial_events.payment_fee`,
`expenses.classification`. Sem enum novo, transformação ou classificação
automática de fatos legados. Pacote auditável em
`evidence/payment-settlement-schema-2026-10-18.json`, referência
`PAYMENT-SETTLEMENT-2026-10-18-001`, exige os 35 recibos/hashes anteriores e
verifica preservação integral das linhas antigas sob locks na mesma transação.

Na cópia privada `br-aged-violet-ac5aap1s`, falha tardia deixou 35 recibos e
zero colunas novas; aplicação chegou a 36 recibos/três colunas e repetição
falhou com REFERENCE_CONSUMED. Nenhum registro de compra/venda/produção de
teste foi inserido no Neon. Backups existentes preservados; não criar nem
apagar backups por conveniência diante das quotas já documentadas.

Recuperação é manter colunas e histórico, reverter código se necessário e
revisar efeitos novos por fatos compensatórios autorizados. Não apagar
recibos, desfazer tarifas de pagamentos antigos ou repetir referências.

## Validação

Fluxo sintético em PostgreSQL17 local: compras em kg, produção e FIFO exato,
venda de múltiplas unidades, recebimento Pix, entrega, corrida de duas
conexões/replay, tarifa alterada posteriormente, quitação em dinheiro,
despesa produtiva sem duplicação e período fechado com rollback passaram.
Quatro testes de navegador local passaram, incluindo preservação do modal,
taxa por pagamento e celular. Lint/tipos/formatação passaram; Knip sem achados
novos. Suíte integral com528 testes passou. Builds e publicação em fechamento; atualizar recibo
após leitura independente e conferência autenticada do HML.
