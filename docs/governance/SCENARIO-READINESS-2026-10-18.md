# Ensaio de fechamento do cenário — 18/10/2026

Usuário solicitou continuar a revisão antes de retirar o cenário do rascunho.
Esta etapa faz cálculos locais e prepara a coleta mínima faltante; não cria
compra, produção, venda, importação, tarifa ou ativação na base compartilhada.

## Base mantida

Meta de lucro após custos R$ 10.000, incluindo todos os produtos e Bordinhas;
fixos R$ 2.200, incluindo R$ 600 de MO e energia nos demais R$ 1.600. Quatro
dias de produção de 14–16 receitas cada (56–64 receitas/mês). Mix 100% e
referências físicas/custos confirmadas na revisão anterior. Os custos de
Bordinhas ainda conservam rateio histórico não validado por peso recuperado.

## Sensibilidade ilustrativa de taxas sobre o faturamento

Percentuais abaixo não são cobranças conhecidas, recomendações fiscais ou
premissas aprovadas. Aplicam-se uniformemente à receita somente para testar
sensibilidade com as funções atuais. Taxas reais podem ter bases e canais
diferentes. Candidato de revisão permaneceu com o valor herdado, sem alteração
ou aplicação de qualquer uma dessas alternativas.

| Reserva ilustrativa | Vendas para a meta | Unidades/mês | Lucro calculado | Receitas equivalentes/mês |
| --- | ---: | ---: | ---: | ---: |
| 0% | R$ 15.881,00 | 1.477 | R$ 10.058,27 | 61,495 |
| 3% | R$ 16.549,00 | 1.540 | R$ 10.064,90 | 64,044 |
| 5% | R$ 17.002,00 | 1.583 | R$ 10.053,06 | 65,786 |
| 8% | R$ 17.783,00 | 1.657 | R$ 10.062,35 | 68,705 |

Receitas equivalentes = soma racional de quantidade/rendimento histórico,
excluindo Bordinhas como produção independente; sem calendário de lotes
inteiros ou perdas medidas. Não é ensaio físico nem homologação de capacidade.
A 3%, a conta já fica praticamente no limite superior de 64, antes de perdas.
Se aumentar dias de produção, revisar também a MO de R$ 150 por dia adicional
e o restante do orçamento, evitando acrescentar capacidade gratuitamente.

Todas as simulações fecharam mix em 10.000 e meta de lucro pelas funções
nativas. Diagnóstico de capacidade usa frações independentes. Dados em
[evidence/scenario-fee-sensitivity-2026-10-18.json](evidence/scenario-fee-sensitivity-2026-10-18.json).

Busca em todas as abas por taxa/imposto/peso/massa assada só encontrou reserva
0 em `01_Parametros!A11:C11`, sem percentuais operacionais ou peso final da
massa. O peso ausente também foi identificado na auditoria de completude.
Não tratar silêncio da fonte como inexistência de taxas ou massa recuperada.

## Medição mínima de uma receita para o custo das Bordinhas

Na próxima produção real, anotar sem gerar lote sintético:

1. Quantas receitas-base foram usadas e o peso total da massa assada antes
   de recheio/cobertura/embalagem.
2. Peso da mesma massa destinado aos brownies e bombons regulares.
3. Peso recuperado para Bordinhas, separado de descarte não aproveitável.
4. Quantos pacotes completos de 100 g foram montados e o destino rastreável
   da sobra menor que 100 g. Ex.: 730 g permitem sete pacotes e deixam 30 g;
   é exemplo aritmético, não rendimento atribuído à operação.

Reconciliação física a validar: massa assada = massa nos produtos regulares
+ massa recuperada + perda descartada + saldo de massa ainda não utilizado.
Não contar recheio, cobertura ou embalagem como massa-base recuperada.

Para preparar um rateio por peso, custo-base por 100 g = custo físico da
receita × 100 ÷ peso assado total. Isso é fórmula proposta para revisão, não
regra de rateio aprovada nem implementada. Os preços do saquinho/adesivo
(R$ 0,27 históricos somados) entram uma vez por pacote. MO/energia já nos
fixos do planejamento não entram novamente nessa parcela variável; o custo
realizado de lote continua com suas regras próprias e auditáveis.

## Preparação técnica e bloqueios restantes

- Adesivos e cobertura não podem ser gravados como `filling`; o enum de
  componente atual só admite recheio. Preparar extensão aditiva revisada e
  ensaio de consumo, não contornar validação com classificação incorreta.
- O writer atual exige Bordinhas a partir da capacidade remanescente e um
  rendimento de perfil; isso não implementa recuperação variável de massa
  fora do padrão. A definição do usuário exige revisar esse caminho com
  conservação física, custo, perda e testes antes da homologação produtiva.
- Não vincular o saquinho de Bordinhas a outro SKU só porque custa R$ 0,11.
  Identidade de embalagem ainda não consta nominalmente na fonte.
- Para fechar a projeção, obter taxas reais e peso/base de rateio das Bordinhas;
  valores mestre são referências de planejamento solicitadas pelo usuário,
  não afirmações de preço de mercado ou fatos realizados.
- Nenhum deploy é necessário nesta etapa documental. Cenário ID 1 permanece
  draft/revisão 1; esta análise não dá causa a criar outra cópia ou ativar.
