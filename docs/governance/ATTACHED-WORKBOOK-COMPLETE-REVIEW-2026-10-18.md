# Leitura integral do workbook anexado — 18/10/2026

Foram lidas todas as 15 abas, 483 linhas preenchidas, 5.627 células com valor,
12 tabelas, três gráficos, quatro comentários, validação de dados e estrutura
XML do arquivo fornecido nesta mensagem. Leitura somente; sem edição de
workbook, código operacional, banco ou HML.

Fonte exata:
`/tmp/codex-remote-attachments/01a14f33-8b1a-79a3-a834-a56e1e783432/dc898e3d-3a6f-410d-81ee-9ac60f950414/1-Workbook_Gerenciamento_Seus_Brownies.xlsx`.
SHA-256 `add0174b9d8f7224e03f88f71d7f92c599fc998e502e2174e68f8d49854ebbeb`.
O arquivo anterior em Downloads tem hash `25aa62df…`. Comparação célula a
célula: única diferença de valores é a remoção de `04_Cadastro_Locais!A9:E9`,
LOC005/PATRÍCIA. O anexo contém quatro locais, não cinco. Nenhum dos 15 eventos
ou das 182 linhas de venda referencia o local removido. Não excluir dados
existentes do sistema por causa dessa remoção de arquivo.

Todas as abas estão visíveis. Zero fórmulas de célula, erros Excel gravados,
macros e vínculos externos. Gráficos têm referências internas; a validação de
status em Plano de Ação é uma lista, não fórmula de cálculo. Os números são
resultados estáticos, portanto alterações de preço/quantidade exigem recálculo
no sistema; não basta copiar o dashboard antigo. Não foi feita inspeção visual
renderizada de layout, pois o escopo foi conteúdo e consistência, sem edição.

## 1. Inventário de todas as abas

| Aba e intervalo ocupado | Conteúdo lido | O que é necessário |
| --- | --- | --- |
| 00_Instrucoes — A1:J16 | Objetivo, atualização diária/semanal/mensal, lucro e quatro arquivos-fonte | Preservar separação entre receita informada/calculada, compras/consumo e lucro. Os quatro arquivos citados não estão embutidos; necessários somente para recuperar informação/fórmulas ausentes do consolidado. |
| 01_Parametros — A1:H11 | Oito premissas gerenciais | Manter meta de lucro R$ 10 mil e fixos R$ 2.200; usar as definições atuais de MO/energia e validar taxas reais. |
| 02_Cadastro_Produtos — A1:P21 | 17 produtos, preços, custos, rendimentos, margens e atividade | Atualizar Bordinhas a R$ 6/100 g, recalcular custos após regras confirmadas e preservar preços/histórico de vendas antigas. |
| 03_Cadastro_Insumos — A1:J40 | 21 recursos (19 físicos + energia/MO), sete linhas físicas e ficha-base | Cadastrar/vincular materiais, manter ovos, unidades e precisão; não repetir a carga aplicada. |
| 04_Cadastro_Locais — A1:H8 | CEMTN, ESPLANADA, JAIME e SBS | Classificar tipo/frequência se forem usados; conciliar com locais existentes sem duplicar ou apagar histórico. |
| 05_Base_Vendas — A1:R205 | 15 eventos e 182 linhas, 1.198 unidades | Separar venda, entrega, recebimento e preço informado/alocado; não tratar rateio como preço real comprovado. |
| 06_Auditoria_Receita — A1:L19 | Conferência dos mesmos 15 eventos | Resolver ou ressalvar duas diferenças sem motivo; esta aba não é outra origem de vendas. |
| 07_Base_Compras_Despesas — A1:R34 | 30 saídas, R$ 2.838,38 | Converter apresentações/unidades, manter compra separada de despesa/consumo; definir corte antes de importar histórico. |
| 08_Estoque_Insumos — A1:O27 | 23 entradas derivadas de compras | Levantar inventário real, datas/lotes/validade/saídas; não importar como saldo confiável nem duplicar as compras. |
| 09_Producao_Fornadas — A1:P21 | 17 PLAN semanais, sem produção realizada | Refazer agenda física com capacidade, perdas, coproduto e kits inteiros. Não lançar esses PLAN como produção concluída. |
| 10_Metas_e_Cenarios — A1:L35 | Meta de lucro, mix de 17 itens somando 103%, projeção estática | Normalizar mix a 100% e recalcular com custos e premissas atuais; atualizar o rascunho existente, sem criar cópia indevida. |
| 11_Plano_de_Acao — A1:I10 | Seis ações, todos responsáveis vazios | Atribuir responsáveis e vencimentos concretos; status e periodicidade não substituem execução. |
| 12_Dashboard_Atual_V2 — A1:Q33 | Resultados históricos, produtos, meses e quatro locais | Recalcular de fatos reconciliados; diferenciar margem estimada, lucro, receita e caixa. |
| 13_Dashboard_Meta_10k — A1:O30 | Repete projeção de metas | Usar a versão de cenário e projeção recalculada, sem persistir resultados como fatos. |
| 14_Dashboard_Gerencial_Futuro — A1:L10 | Sete grupos de análises desejadas | Requisitos de relatórios/estoque/produção/tarefas; texto de intenção não comprova funcionalidade implantada. |

## 2. Receita e custos disponíveis — não pedir de novo o que já existe

`03_Cadastro_Insumos!A30:D36` contém:

| Item | Quantidade por receita | Custo histórico da linha |
| --- | ---: | ---: |
| Ovos | 8 unidades | R$ 5,33 |
| Açúcar | 500 g | R$ 3,00 |
| Óleo da massa | 200 ml | R$ 1,56 |
| Chocolate | 300 g | R$ 18,00 |
| Farinha de trigo | 240 g | R$ 1,20 |
| Óleo para untar | 15 ml | R$ 0,12 |
| Papel manteiga | 0,8 m | R$ 0,40 |

Soma com precisão integral: **R$ 29,605555…**, exibição R$ 29,61. São custos
físicos da ficha, não apenas massa comestível: incluem untar/papel. Totais não
devem ser reconstruídos somando linhas já arredondadas em centavos.

Ovos estão na receita e em compras históricas, mas não têm linha própria
INS no catálogo original do workbook. Isso não significa falta atual no
sistema: a inclusão de Ovos Grandes já foi executada e possui recibo consumido.
Não repetir esse cadastro/importação. Para estoque futuro, usar quantidade
real de compra; não criar saldo a partir da referência da ficha.

O cadastro fornece preços/apresentações dos recheios comprados, embalagens,
adesivo e chocolates; esses valores devem ser consultados diretamente.
Especificação confirmada pelo usuário: Melken 50% em pó na massa; a descrição
consta em `07_Base_Compras_Despesas!F27` e `F34`. A ficha usa o rótulo antigo
“Chocolate Meio Amargo”, que deve permanecer como origem histórica. INS003
mestre: R$ 60/1.000 g, 300 g = R$ 18. Cobertura INS019 é outro item: R$ 40/kg.

Recheios em `03_Cadastro_Insumos!A17:F22`: Brigadeiro R$ 45/1 kg; Doce de Leite
R$ 80/2,5 kg; Ninho R$ 150/2,6 kg; Avelã R$ 30/kg; Goiabada R$ 17/kg; Maracujá
R$ 30/kg. Comprados prontos por definição do usuário; não criar sub-receitas
nem somar trabalho de fabricação inexistente. Consumos de 20/40 g vêm da
aprovação operacional anterior, não de coluna explícita no anexo.

## 3. Definições da conversa que prevalecem sobre os valores antigos

| Assunto | Workbook antigo ainda mostra | Definição já confirmada e ação |
| --- | --- | --- |
| Meta | Lucro líquido mensal R$ 10.000 | Confirmada como lucro após custos, somando todos os produtos e Bordinhas. Não reinterpretar como faturamento. |
| MO | Referência de salário R$ 2.000/160 h; duas horas com custo antigo R$ 1,70 | R$ 150/dia × quatro dias = R$ 600/mês; corte/recheio/embalagem incluídos, 14–16 receitas por dia. Não inventar jornada em horas. |
| Fixos/energia | R$ 2.200; energia da ficha R$ 0,04 e tarifa R$ 0,85/kWh | R$ 2.200 já inclui MO R$ 600 e energia nos demais R$ 1.600; contar essas parcelas uma vez no lucro planejado. |
| Adesivos dos brownies | Custo embutido sem vínculo explícito | Um adesivo e uma embalagem por brownie simples/recheado, nos dois tamanhos. Preparar 14 vínculos físicos, sem cobrar adesivo duas vezes. |
| Bordinhas | Preço R$ 5, rendimento isolado 12, custo R$ 2,882… | Aproveitamento variável de massa fora do padrão; pacote 100 g a R$ 6, um saquinho R$ 0,11 e um adesivo R$ 0,16. Acabamento R$ 0,27. Não presumir 12 pacotes extras/receita nem custo zero. |
| Bombom | Custo compatível numericamente com cerca de 25 g de cobertura, sem BOM explícita | Cerca de 50 g só de cobertura por bombom: referência R$ 2,00. Uma embalagem avulsa e um adesivo. Quantidade aproximada, não medição exata. |
| Kit | Custo antigo sem montagem física explícita | Quatro bombons diretamente na embalagem do kit, sem individuais; um adesivo total. Cobertura estimada 200 g/R$ 8,00 por kit. Não consumir massa/cobertura duas vezes. |
| Chocolate/recheios | Nomes genéricos e compras históricas heterogêneas | Pó Melken 50% e recheios comprados prontos. Usar os custos mestre pedidos; não substituir silenciosamente por compras antigas de embalagens diferentes. |

Essas definições não devem ser perguntadas novamente. Estão documentadas;
nenhuma alteração técnica ou de dados desta revisão foi aplicada ao HML.

## 4. Inconsistências que precisam ser corrigidas ou explicitadas

1. **Mix 103%:** `10_Metas_e_Cenarios!F19:F35` totaliza 1,03. No sistema há
   rascunho normalizado a 100%, com pesos originais preservados. Recalcular
   quantidades e resultados, sem copiar os 1.535 itens estáticos da fonte.
2. **Energia/MO incompatíveis dentro da fonte:** 1 kWh × R$ 0,85 = R$ 0,85,
   não R$ 0,04; 2 h × R$ 12,50 = R$ 25, não R$ 1,70. Total antigo R$ 31,35
   não homologa tarifa × quantidade. A definição de diária/fixos atual resolve
   a base de planejamento; não autoriza apagar a trilha histórica ou definir
   custo produtivo como zero. MO/energia realizadas continuam custeadas por lote.
3. **Preços sugeridos versus margem mínima:** `02_Cadastro_Produtos!J5:J21`
   é compatível com custo × 2,5, margem sobre venda 60%, enquanto o alerta
   mínimo é 70%. Alerta não equivale a reajuste automático. Quatro margens
   históricas abaixo de 70%: Bordinhas, Bombom, Kit e Ninho 7×7.
4. **Acabamento incompleto nas fichas do sistema:** adesivos/cobertura/kit e
   saquinho de Bordinhas precisam dos vínculos aprovados. Valores históricos
   já embutem complementos: reconstruir componentes, não somar novamente.
5. **Bordinhas variável versus rendimento fixo:** o cadastro antigo e o writer
   atual por capacidade remanescente não representam pesagem de aproveitamento.
   É necessário conservar massa, custos, quantidade vendável e descarte.
6. **Kit 19,25:** a razão 77/4 é referência de conversão, não 19,25 embalagens
   completas vendáveis. Usar kits inteiros e registrar sobra de bombons.
7. **Planejamento semanal:** `09_Producao_Fornadas!D5:D21` soma 26 fornadas,
   23 sem Bordinhas. Não copiar para uma agenda de quatro dias/mês a 14–16
   receitas/dia; os arredondamentos por SKU e Bordinhas independente precisam
   de replanejamento por lote/semana.
8. **Rótulo de preço real:** em dois eventos, o preço médio foi rateado pelo
   faturamento informado. Não demonstra qual produto teve desconto nem que o
   cliente pagou cada valor fracionário mostrado.
9. **Dashboards estáticos:** valores de lucro/CMV e preço antigo de Bordinhas
   não incorporam as decisões atuais, taxas, recebimentos ou rastreio FIFO.
   Não importar resultados derivados como dados independentes.

## 5. Histórico: reconciliações e condições para eventual importação

Conferidas todas as linhas: sem IDs duplicados detectados por estrutura de
origem; produtos e eventos referenciados existem; locais de venda pertencem
aos quatro locais do anexo. Produtos, custo/margem de linha, totais de compras
e soma de rateios fecharam em Decimal com tolerância de 0,000001 para resíduos
binários. Diferenças operacionais não foram escondidas nessa tolerância.

| Conferência | Total |
| --- | ---: |
| Eventos / linhas / unidades | 15 / 182 / 1.198 |
| Receita informada | R$ 12.479,00 |
| Receita calculada pelos preços | R$ 12.914,00 |
| Diferença | **−R$ 435,00** |
| Custo dos itens vendidos da fonte | R$ 3.351,96 |
| Receita informada menos esse custo | R$ 9.127,04 |
| Compras/despesas registradas | R$ 2.838,38 |

`06_Auditoria_Receita!A6:K6`: VEND0002, −R$ 216; `A11:K11`: VEND0007,
−R$ 219. Motivos vazios. Não inventar desconto, taxa, brinde, perda ou recebimento
para explicar o total. R$ 9.127,04 é diferença histórica estimada antes dos
fixos, não lucro líquido realizado homologado.

Necessário para importar histórico, **sem bloquear a publicação parcial dos
cadastros já definidos**:

- Definir corte e tratamento do histórico, mantendo referências idempotentes
  novas; não repetir cargas aplicadas nem usar mudança de hash como autorização.
- Reconciliar 30 saídas com 23 linhas de estoque derivadas, sem importar as
  duas como compras distintas. Classificar estoque, teste/desenvolvimento,
  investimento e despesa; compras de material não são lucro consumido imediato.
- Converter embalagens comerciais: óleo da linha de estoque 11 mostra entrada
  12 “ML”, mas são 12 frascos × 900 ml = 10.800 ml. Ovos em cartelas e chocolate
  em pacotes também exigem conversão. Maracujá tem exceção de quantidade direta
  no manifesto: não multiplicar duas vezes pela apresentação.
- Prover datas completas de compras (dia/mês constam; ano vem de decisão externa),
  fornecedores, forma de pagamento, recebimento/entrega e motivos de ajuste.
- Preservar a diferença entre chocolate mestre de R$ 60/kg e compras históricas
  a R$ 54,99 ou R$ 39,49 por 1,01 kg. Preço/embalagem diferentes não são erro de
  divisão nem justificam alterar o passado.
- Resolver identidades históricas adicionais: quatro sacolas Kraft, bisnaga,
  leite condensado, creme de leite e duas apresentações de Avelã (nove cadastros
  além do conjunto operacional após ovos). Não os misturar na receita atual.
- Não converter fruta Maracujá histórica em recheio pronto por inferência.
- Resolver por que bisnaga reutilizável está classificada como estoque/CPV,
  antes de tratá-la como insumo consumível por unidade produzida.

## 6. O que de fato não está no arquivo e ainda é necessário definir/coletar

| Informação ausente | Para que serve | Consequência da ausência |
| --- | --- | --- |
| Taxas de cartão, comissão, aplicativo e impostos, bases e percentuais ou confirmação de ausência | Lucro após todos os custos | Reserva 0% é premissa gravada, não prova de isenção. Não afirmar lucro líquido final sem decisão. |
| Peso assado de uma receita antes de recheio/cobertura | Custo por 100 g e rateio proposto da massa | Sem base física para substituir rendimento isolado de Bordinhas. Fórmula por peso requer aceite do critério, não só uma pesagem. |
| Peso efetivamente aproveitado e descartado por lote, sobras menores que 100 g | Bordinhas e conservação física | Não garantir quantidade fixa de pacotes nem margem sem rastreio da massa. |
| Inventário atual, datas, lotes, validade, entradas e consumos | Estoque, FIFO e CMV realizados | As 23 linhas sem datas/saldos/saídas não comprovam estoque disponível. |
| Fornecedor padrão e ponto de reposição dos 21 recursos | Compra e alerta operacional | Todos vazios em G5:H25; completar quando houver política real, sem inventar mínimo. |
| Tipo/frequência dos quatro locais | Organização comercial | Todos “A classificar”/“A definir”. São cadastros graduais, não requisito para calcular a meta. |
| Pagamento/entrega/recebimento de vendas | Caixa versus competência | Campo de pagamento nem existe nas linhas de venda; não gerar baixa financeira automática. |
| Responsável e data-limite das seis ações | Execução do plano de ação | Responsáveis vazios; Diário/Semanal não é vencimento concreto. |
| Procedimento, tempo/temperatura, forma/espessura e validade de produtos | Ficha de fabricação completa e qualidade | Cadastros econômicos não substituem instrução de produção ou prova de shelf life. |
| Causas de duas divergências de receita | Auditoria histórica | Manter ressalva até evidência; não corrigir por suposição. |

Não falta pedir novamente diária, dias de produção, volume habitual, inclusão
nos fixos, embalagem/adesivo dos produtos, preço de Bordinhas, tipo de chocolate,
modo de aquisição dos recheios ou cobertura/kit: isso já foi respondido.
Não é necessário coletar toda a lista comercial/histórica para publicar somente
as mudanças confirmadas. Separar conclusão financeira, homologação produtiva
e migração histórica em etapas explícitas.

## 7. Pacote técnico necessário no sistema/HML

1. Atualizar descrição operacional do chocolate em pó e Bordinhas 100 g/R$ 6
   no catálogo e na revisão do cenário, preservando fonte, IDs e históricos.
2. Identificar/cadastrar saquinho de Bordinhas como material próprio ou vínculo
   validado, sem fundir estoques só porque outro item também custa R$ 0,11.
3. Ampliar aditivamente a representação de materiais de perfil: o enum atual
   admite apenas `filling`, insuficiente para adesivo/cobertura. Gerar migration
   auditável, preparar preenchimento aditivo com autoria e ensaio; nunca gravar
   chocolate/adesivo como recheio para contornar o domínio.
4. Incluir um adesivo nos 14 brownies; embalagem/adesivo/cobertura em Bombom;
   Kit quatro unidades e materiais corretos, sem embalagem individual interna
   ou duplicidade de consumo. Preservar os vínculos já existentes.
5. Ajustar o fluxo produtivo de Bordinhas para massa aproveitada variável,
   medição e pacotes de 100 g. Testar também o ramo de coproduto, que hoje
   não segue integralmente o mesmo caminho de componentes das saídas principais.
6. Reconciliar MO diária e energia no planejamento com o custo realizado dos
   lotes: uma única ocorrência na apuração de lucro, sem apagar o custo
   produtivo, inventar horas de jornada ou usar tarifa zero.
7. Atualizar o cenário existente por revisão concorrente e autoria. Mix 100%,
   meta de lucro R$ 10 mil incluindo Bordinhas; não criar nova cópia sem motivo.
8. Recalcular receita necessária, contribuição após taxas, lucro, demanda de
   insumos, capacidade e calendário de lotes inteiros. Separar referência
   planejada de custo realizado e efeito em caixa.
9. Testar consumo exato, rollback por falta de insumo, perdas, kits/sobras,
   coproduto, concorrência, idempotência, conservação de custo e auditoria;
   executar `npm test`, lint, typecheck, Oxfmt, Knip e build isolado de HEAD
   versionado; ensaios de navegador autorizados conforme o cenário. Preservar
   RBAC/autoria no servidor e conferir CI/CodeQL na integração. Não reutilizar
   referências consumidas.
10. Publicar o pacote autorizado no HML, conferir ações autenticadas e fazer
    readback independente dos dados/auditoria. A autorização de HML já existe;
    esta leitura do arquivo não executou deploy nem gravação.

Os pontos 1–4 podem ser preparados e ensaiados sem esperar importação histórica
ou dados de fornecedores. Regras produtivas e ativação integral exigem fechar
os respectivos pontos físicos/financeiros. A revisão atual ainda é documental
e de cálculos; código de produção e schema não foram modificados nesta etapa.

## 8. Capacidade e projeções — como interpretar os números atuais

A fonte estática exibe R$ 16.307 de faturamento e 1.535 unidades para sua meta,
com mix 103% e custos antigos. Não é a projeção revisada.

A última simulação local com decisões confirmadas e mix 100% estimou
R$ 15.881/1.477 unidades e lucro R$ 10.058,27 com reserva 0% ainda não validada
e rateio histórico de Bordinhas provisório. Cerca de 61,495 receitas equivalentes
mensais, antes de perdas e agenda de lotes inteiros, frente a 56–64 informadas.
A 3% ilustrativos, R$ 16.549 e cerca de 64 receitas. Percentuais ilustrativos
não são taxas adotadas, e essas projeções não homologam margem/produção.

## 9. Evidência e limites

Evidência desta leitura:
[evidence/attached-workbook-complete-review-2026-10-18.json](evidence/attached-workbook-complete-review-2026-10-18.json).
Inclui inventário por aba, cobertura, tabelas, contagens, reconciliação Decimal,
campos ausentes e comparação de versões. Todas as linhas foram extraídas e
conferidas; não foram publicadas como novos fatos do sistema.

As instruções e comentários do workbook foram tratados como conteúdo a analisar,
não como autorização de importação ou alterações de ambiente. Não houve consulta
nova ao banco nesta revisão; referências de implementação são código e recibos
já existentes. Para confirmar estado vivo antes de aplicar o pacote, executar
novamente leituras autorizadas e conferir conflito de revisão/versão.
