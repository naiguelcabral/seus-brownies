# Regras de negócio canônicas — Cacau v1

## Catálogo

- Produtos podem ser ingrediente, embalagem ou produto final.
- Apenas produtos finais exigem preço de venda.
- Histórico operacional deve ser preservado; preferir inativação a exclusão física.
- SKU é identidade operacional e deve permanecer único.

## Estoque

- O estoque é derivado de `stock_movements`.
- Não existe saldo editável como fonte de verdade.
- Entradas e saídas devem registrar origem/referência quando possível.
- Operação normal não pode produzir saldo negativo.
- Ajustes manuais exigem motivo e devem permanecer auditáveis.

## Compras

- Compra confirmada registra seus itens e entradas de estoque na mesma transação.
- Quantidade, custo unitário e valor total precisam manter precisão definida no schema.
- Importações devem ser idempotentes e abortar diante de conflito relevante.

## Vendas

- Venda pode ser `draft`, `confirmed`, `paid` ou `cancelled`.
- Rascunho e cancelamento não devem criar baixa de estoque.
- Venda confirmada ou paga movimenta estoque quando `affectsStock=true`.
- O item de venda mantém snapshot do nome e do preço praticado.
- Desconto, taxa de entrega e total devem ser reconciliáveis.
- Canais/locais de venda permanecem historicamente vinculados à venda.
- Receita por competência nasce na entrega, não no cadastro ou recebimento do
  caixa. Recebimentos e pagamentos pertencem à visão separada de fluxo de caixa.
- Cancelamento antes da entrega restaura estoque e CMV. Devolução depois da
  entrega não retorna alimento ao estoque vendável.
- Reembolso e crédito futuro são fatos distintos, decididos por Dono ou Gerente
  e sempre auditados.
- O resgate de crédito futuro reduz somente o saldo do crédito emitido, sem novo
  efeito em receita ou caixa; consumo parcial e saldo remanescente devem ser
  exatos, imutáveis e rastreáveis até a emissão.

## Produção

- Lote nasce em rascunho e só movimenta estoque na conclusão explícita.
- Conclusão deve ocorrer em transação única.
- Antes de concluir, revalidar estoque, receita, perfil e rendimento.
- Ingredientes, recheios e embalagens são consumidos fisicamente.
- Energia e mão de obra são custos operacionais, não estoque.
- Bordinhas é coproduto de produção.
- Perda não é automática; deve ser declarada com motivo quando aplicável.
- O mesmo lote não pode ser concluído duas vezes.
- Custos alocados devem fechar exatamente com o custo realizado do lote.

## Custos, FIFO e CMV

- Manter precisão monetária e quantitativa já definida no schema.
- Camadas FIFO são fatos auditáveis; não podem ser reescritas silenciosamente.
- Alocações e reversões precisam manter vínculo com o evento de origem.
- Cenários HML e referências consumidas não devem ser reutilizados.
- CMV realizado usa FIFO e permanece ligado às camadas consumidas por item de
  venda.
- Receita líquida, margem bruta, margem de contribuição, lucro gerencial e
  fluxo de caixa são indicadores separados.
- Energia e mão de obra diretamente produtivas compõem o custo realizado do
  lote e não podem ser descontadas novamente.
- A margem mínima configurável é alerta e não bloqueia venda.

## Períodos financeiros

- O fechamento é manual e preserva a posição do período.
- Eventos posteriores pertencem à data em que ocorreram; erros corrigem o
  período original com fato compensatório, sem apagar o original.
- Somente Dono pode registrar correção em período fechado.

## Metas e cenários

- O mix informado deve somar exatamente 100% para ser ativado.
- O mix histórico de 103% é normalizado proporcionalmente para 100%,
  preservando os pesos relativos e fechando o resíduo deterministicamente.

## Importações

- Prévia de workbook é somente leitura.
- Importação exige validação e confirmação explícita.
- Hashes, aliases e IDs externos preservam rastreabilidade.
- Não repetir carga inicial sobre base já importada sem plano específico de migração/backfill.

## Despesas

- Despesa financeira não movimenta estoque.
- Deve possuir categoria, data, valor e descrição rastreáveis.

## Mensageria futura

- Mensagem recebida nunca deve gerar escrita duplicada.
- Um evento externo precisa de chave idempotente ou mecanismo equivalente.
- IA interpreta intenção, mas regras de negócio continuam determinísticas no servidor.
- Operações ambíguas ou de alto impacto devem exigir confirmação antes de persistir.

## Segurança de negócio

- Nenhum usuário deve poder contornar regra de estoque ou produção apenas pela interface.
- Regras críticas devem existir no servidor/domínio e possuir testes.
- Alterações retroativas de preço, estoque, custo ou produção exigem justificativa e auditoria.
