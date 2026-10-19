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

- Decisão de 18/10/2026: insumos de massa são comprados em kg pelo valor total
  pago pelo item, sem multiplicar esse total pela quantidade. A implementação
  nova está local e depende do pacote de schema exato e rollout aprovado.
  Outras unidades físicas não são convertidas para kg por inferência.

- Para os dez ingredientes do workbook com estoque em g, a compra pode ser
  informada em kg: 1 kg corresponde a 1000 g. Quantidade e preço originais devem
  permanecer rastreáveis; o valor total em centavos não pode ser recalculado
  pelo custo por grama arredondado. A unidade canônica de consumo permanece g.
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

- Decisões de18/10/2026: receita nova com oito ovos/850 g frios por forma;
  5×5:48 simples ou24 recheados;7×7:24 simples ou12 recheados. Bordinhas
  são recuperação variável pesada por lote, sem quantidade automática pela
  capacidade restante. Pacote vendável100 g; saldo não embalado fica separado.
- Na versão de recuperação medida, custo comum é distribuído por massa;
  acabamento direto fica no produto consumidor. MO/energia reais são totais
  informados por lote; referências horárias antigas não os substituem.
- Movimentos e disponibilidade FIFO de lotes concluídos usam o momento da
  conclusão. Data informada de produção permanece metadado separado.

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

- Exceção de precisão aprovada em 18/10/2026 (ADR-0002): custos derivados
  preservam frações exatas internamente, inclusive frações de centavo e
  dízimas. O total lançado não é arredondado. Consumos acumulados mais saldo
  devem igualar exatamente as entradas; saídas e FIFO preservam o custo exato.
  A exibição tem duas casas e arredonda apenas na apresentação, depois da
  soma. Projeções legadas não substituem o custo exato quando ele existe.

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

- Meta é lucro conjunto de todas as vendas, inclusive Bordinhas realizadas.
  Mix é orientativo; não impor cota de aproveitamento. O plano-base revisado
  usa16 produtos e normalização100%, com Bordinhas como recuperação adicional.
- Fixos2288 incluem MO600, energia e MEI88. Custos de referência do plano
  não somam novamente MO/energia. Taxas são separadas por meio; Pix0,49 por
  transação exige quantidade de pagamentos, não quantidade de produtos.

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
