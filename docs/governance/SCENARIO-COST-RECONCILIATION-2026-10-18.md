# Revisão dos custos e premissas do cenário — 18/10/2026

Usuário escolheu revisar custos/premissas antes de ativar. A alternativa de
ativar como referência provisória não foi aceita. O cenário 1 permanece draft,
versão 1, revisão 1. Nenhuma escrita compartilhada foi realizada.

## Fonte e dados atuais

Workbook original reconferido em leitura: SHA-256
`25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`, igual à auditoria anterior.
Preços/custos/rendimentos: `02_Cadastro_Produtos!F5:K21`; receita:
`03_Cadastro_Insumos!A29:D40`; tarifas: `C24:F25`; premissas:
`01_Parametros!A4:C11`. Arquivo original preservado.

Leitura independente do banco confirmou sete linhas físicas, incluindo oito
ovos, requisitos de 1 kWh e duas horas, tarifas de R$ 0,85/kWh e R$ 12,50/h,
17 perfis e 14 embalagens individuais. Bombom, Bordinhas e Kit continuam sem
vínculo de embalagem. Sem compras, lotes ou movimentos: ainda não há custo
realizado ou preço atual de aquisição para substituir referências históricas.

## Bordinhas — custo do saquinho confirmado pelo usuário

Usuário informou “A embalagem das bordinhas custam 0,11 centavos por unidade”.
No contexto da referência de R$ 0,11 já discutida e presente no workbook,
normalizado e explicitado ao usuário como **R$ 0,11 (11 centavos) por saquinho**.
Essa confirmação substitui a ressalva de preço apenas inferido para o saquinho;
a reconciliação original da fonte permanece abaixo como histórico.

Cada pacote de 100 g vendido a R$ 6,00 usa um saquinho R$ 0,11 e um adesivo
com referência R$ 0,16: acabamento **R$ 0,27 por pacote**. Os números da
simulação não mudam, pois já usavam esse complemento; não somá-lo novamente.
Confirmação de preço não significa que o saquinho compartilhe estoque com
embalagem de brownie ou bombom só pelo mesmo preço. Definir identidade de
catálogo no pacote aditivo. Peso/rateio da massa e taxas de venda ainda faltam;
nenhuma alteração de banco nesta etapa.

## Embalagens e adesivos de Bombom/Kit fechados

Usuário confirmou “Sim, um adesivo por embalagem vendida”. Bombom avulso:
uma embalagem INS011 e um adesivo INS006. Kit: uma embalagem INS012 e um
adesivo INS006 no total; os quatro bombons internos não recebem embalagens
ou adesivos individuais.

Reconstrução variável de referência, sem MO/energia já nos fixos e sem
somar novamente complementos antigos:

| Apresentação | Massa de referência | Cobertura | Embalagem | Adesivo | Total variável exibido |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bombom | R$ 0,38 | R$ 2,00 | R$ 0,11 | R$ 0,16 | R$ 2,65 |
| Kit de quatro | R$ 1,54 | R$ 8,00 | R$ 0,20 | R$ 0,16 | R$ 9,90 |

Massa calculada com R$ 29,605555… físicos/receita ÷ rendimento histórico de
77 bombons, quatro parcelas para o Kit. Componentes mantidos sem arredondamento
intermediário: campos planejados a três casas, **R$ 2,654** e **R$ 9,898**.
Não confundir o total variável com custo produtivo completo ou realizado.
A estimativa de 50 g e o rendimento histórico ainda não são medição de lote.
Composição física esclarecida; representação executável/material no banco
precisa do pacote aditivo e ensaio próprios, sem reutilizar importação anterior.

Simulação revisada: R$ 15.881 de faturamento, 1.477 unidades/mês e
R$ 10.058,27 de lucro, mantendo reserva 0% **somente para comparação**.
Conta independente conferida, sem atualizar cenário. Perguntas enviadas sobre
taxas/impostos e peso da massa assada para ratear Bordinhas de 100 g.

## Kit — quatro bombons sem embalagem individual

Usuário confirmou “Quatro bombons direto na embalagem do kit”. Montagem:
**quatro bombons e uma embalagem de kit**, sem quatro embalagens individuais.
Com cerca de 50 g de cobertura por bombom, estimativa de 200 g de cobertura
por kit, **R$ 8,00** pela referência mestre de R$ 40/kg, antes de massa e
embalagem. Não duplicar cobertura/massa consumindo ao mesmo tempo os bombons
prontos e seus componentes para a mesma saída.

A relação histórica de rendimento 77 bombons e 19,25 kits é compatível com
77 ÷ 4, mas a produção física resulta em kits inteiros e sobra rastreável;
não tratar 0,25 kit como um pacote completo vendável. Quantidade de adesivos
no kit e embalagem/adesivo do bombom avulso perguntadas, ainda sem resposta.
Sem aplicação de ficha, preço ou cenário nesta etapa.

## Bombom — cobertura estimada confirmada

Usuário informou “Uns 50 gramas por chocolate de bombom” e confirmou
“50 g só de chocolate de cobertura”. Referência de planejamento: **cerca de
50 g de cobertura por bombom**, distinta do peso total. Manter a natureza
aproximada da informação, sem declarar consumo realizado exato.

`03_Cadastro_Insumos!C23:F23` informa cobertura INS019 a R$ 40/1.000 g.
50 g × R$ 40 ÷ 1.000 = **R$ 2,00 de cobertura por bombom**, sem massa ou
embalagem. É preço de referência mestre, não compra atual ou custo total.
INS019 permanece distinto do chocolate em pó INS003 da receita-base.

A cobertura antiga inferida de 25 g/R$ 1 não deve ser conservada como consumo
válido: a estimativa física agora é 50 g. Na reconstrução, substituir a parcela
antiga, não acrescentar R$ 2 sobre um custo que já inclui cobertura. O resíduo
histórico de R$ 1,27 ainda exige separar embalagem/adesivo de forma rastreável.

Perguntado se os quatro bombons do Kit vão diretamente na embalagem do Kit
ou recebem embalagens individuais. Quantidades de adesivos e confirmação da
montagem continuam pendentes; a resposta de gramagem não as define.
Sem alteração de banco, histórico ou projeção aplicada nesta etapa.

## Chocolate da massa e recheios comprados — definição recebida

Usuário definiu chocolate “maleken 50% em pó” e recheios comprados conforme o
workbook. Histórico `07_Base_Compras_Despesas!F27:J27` e `F34:J34` identifica
**Harald Melken 50% em pó**. INS003 passa a ter essa especificação operacional
na revisão, preservando a identificação e quantidade da receita. O rótulo
original “Chocolate Meio Amargo” em `03_Cadastro_Insumos!A33:D33` fica como
origem histórica, não como instrução para usar barra. Planejar ajuste rastreável
de descrição sem trocar SKU ou apagar metadados da fonte.

Custo-base de referência: `03_Cadastro_Insumos!C7:F7` = R$ 60/1.000 g;
300 g por receita = **R$ 18,00**. Histórico mostra preços diferentes para
pacotes de 1,01 kg; não substituir a referência mestre por compra histórica
não importada ou afirmar preço atual de mercado. Não há recálculo de insumo
necessário pela mudança de descrição, pois a quantidade/tarifa mestre não mudou.

Recheios comprados prontos: referências `03_Cadastro_Insumos!A17:F22`.

| Recheio | Preço da apresentação | Quantidade |
| --- | ---: | ---: |
| Brigadeiro | R$ 45,00 | 1.000 g |
| Doce de Leite | R$ 80,00 | 2.500 g |
| Leite Ninho | R$ 150,00 | 2.600 g |
| Creme de Avelã | R$ 30,00 | 1.000 g |
| Goiabada | R$ 17,00 | 1.000 g |
| Maracujá | R$ 30,00 | 1.000 g |

Não criar sub-receitas de fabricação desses recheios. Consumos já aprovados
permanecem 20 g no recheado 5×5 e 40 g no 7×7. O caso antigo de fruta Maracujá
não comprova equivalência com recheio pronto nem autoriza importar histórico.
A decisão resolve a especificação operacional W05 para o planejamento atual;
a ressalva do alias histórico é preservada.

Chocolate ao leite/branco INS019 para cobertura continua separado do pó
INS003 da massa. Gramagem de cobertura por bombom, montagem do kit com quatro
bombons e embalagem individual dentro do kit ainda não foram definidos;
pergunta reenviada. Sem alteração de receita, catálogo, preços ou cenário na base.

## Bordinhas — custo localizado na fonte original

Usuário orientou: “O custo está no workbook”. Conferência em leitura de todas
as abas por referências a embalagem, adesivo, saquinho e Bordinhas confirmou:

- `02_Cadastro_Produtos!H6 − G6` = R$ 2,740462… − R$ 2,470462… = **R$ 0,27**
  de complemento além da massa, antes de MO.
- `03_Cadastro_Insumos!C10:F10`: adesivo INS006 a **R$ 0,16 por unidade**.
- Com um saquinho e um adesivo confirmados pelo usuário, o resíduo do saquinho
  é **R$ 0,27 − R$ 0,16 = R$ 0,11**. É decomposição calculada, não registro
  nominal de “saquinho de Bordinhas” na fonte.

R$ 0,11 coincide com duas embalagens do cadastro (Simples 5×5, linha 11,
e Bombom Unitário, linha 15); o workbook não define qual delas é o saquinho
usado em Bordinhas. Não escolher SKU por preço coincidente. A revisão pode
preservar **R$ 0,27 de acabamento histórico por pacote** com essa ressalva,
sem pedir novamente ao usuário valores que a fonte permite reconciliar.
Não afirmar compra recente ou preço atual sem essa evidência.

O complemento já está embutido no custo antigo: não acrescentar novamente
saquinho/adesivo ao total histórico. A parte de massa, anteriormente rateada
por rendimento isolado 12, ainda não está validada para pacote de 100 g de
aproveitamento variável. Portanto este achado fecha a referência histórica do
acabamento, mas não certifica custo total ou margem das Bordinhas.

Hash da fonte reconferido, inalterado; nenhum arquivo original, cadastro ou
cenário modificado. Próxima definição solicitada: cobertura por bombom,
montagem de quatro unidades por kit e embalagem individual dentro do kit.

## Bordinhas — saquinho e adesivo confirmados

Usuário confirmou “Um saquinho e um adesivo” por pacote de Bordinhas de
100 g vendido a R$ 6,00. Regra física: uma unidade de saquinho e uma unidade
de adesivo por pacote vendido. Não inferir que o saquinho seja a embalagem de
brownie simples de R$ 0,11 ou outra embalagem já existente no catálogo.

Solicitado preço por pacote de compra e quantidade de saquinhos para calcular
custo unitário, além de confirmar se o adesivo ainda custa R$ 0,16. Embalagem
física definida; identidade do item e preço atual ainda pendentes. Ao reconstruir
o custo, separar massa aproveitada, saquinho e adesivo sem duplicar resíduos
já embutidos nos custos históricos. Rateio da massa continua pendente e não
foi alterado no writer. Sem cadastro novo nem preço aplicado ao sistema.

## Bordinhas — aproveitamento de massa fora do padrão

Usuário esclareceu: “As bordas são massas que não tem qualidade para ser o
brownie só, aí para não ter desperdício viram bordas”. Trata-se de massa
aproveitada que não atende ao padrão de venda como brownie regular. A origem
não se limita necessariamente às aparas geométricas de um corte.

O rendimento de Bordinhas é variável e depende da massa efetivamente
aproveitada; não assumir doze unidades adicionais por receita ou produção
independente obrigatória. Registrar peso recuperado e pacotes completos de
100 g a partir do que for medido em cada lote. Qualquer sobra menor que 100 g
precisa permanecer rastreável; a forma de armazenamento/uso ainda não foi
definida. A capacidade declarada de receitas/dia não garante massa recuperada.

A decisão de aproveitamento não define custo zero. A massa já teve custo e
não deve ser contada simultaneamente como brownie regular e Bordinhas, nem
receber duas vezes o mesmo custo de consumo. O critério de rateio continua
pendente para manter conservação de custo entre saídas e eventual perda.
Não alterar o writer nem a regra de FIFO por inferência desta explicação.

A pergunta de rendimento fixo foi substituída pela necessidade de pesar o
aproveitamento real. Próxima pergunta enviada somente sobre embalagem e
adesivo do pacote de 100 g a R$ 6,00. Sem escrita no sistema nesta etapa.

## Bordinhas — apresentação e preço informados

Usuário informou “100 gramas a cada 6 reais para as bordinhas”. Referência
atual da revisão: **um pacote de 100 g vendido por R$ 6,00**, SKU PROD002,
substituindo o preço histórico de R$ 5,00 na proposta em preparação.
Não altera automaticamente o catálogo ou o cenário enquanto as premissas
estão sendo reconciliadas; atualização de preço deve abranger ambos de forma
rastreável no pacote final, preservando histórico.

Peso líquido do pacote e unidade comercial são distintos: um pacote corresponde
a 100 g. Não converter silenciosamente a unidade do SKU existente ou supor
que o rendimento histórico 12 represente 12 pacotes de 100 g. Falta confirmar
qual embalagem, adesivo por pacote, rendimento físico de pacotes por receita
e rateio de custo de coproduto. Nenhuma margem atual é certificável sem isso.
Pergunta enviada sobre embalagem, adesivo e rendimento de pacotes de 100 g.

## Embalagem e adesivo dos brownies — confirmação recebida

Usuário respondeu “Sim” à pergunta se cada brownie simples ou recheado,
nos dois tamanhos, leva uma embalagem e um adesivo. Regra física confirmada
para **PROD003–PROD016 (14 SKUs)**: uma embalagem específica já vinculada ao
perfil e **um adesivo INS006 por unidade de brownie**. Não ampliar essa resposta
para Bordinhas, Bombom ou Kit, cujas apresentações ainda serão definidas.

A evidência agora contém os 14 vínculos adicionais preparados por SKU,
quantidade 1/unidade final, mantendo as embalagens existentes. Nenhum vínculo
foi gravado no banco nesta etapa, nem referência de importação reutilizada.
Aplicar em pacote aditivo próprio após revisar o restante das fichas e o ensaio.
A decisão física deixa de ser inferência; o preço atual do adesivo continua
não confirmado por compra recente. R$ 0,16 é referência histórica já compatível
com o resíduo embutido dos brownies, e não deve ser somado novamente.

Próxima pergunta: peso por pacote, embalagem, rendimento de pacotes por receita
e adesivo de Bordinhas. Não assumir que o rendimento isolado 12 implique
12 pacotes adicionais a qualquer fornada de brownies.

## Energia também incluída nos fixos — resposta recebida

Usuário respondeu “Sim, está incluso” à inclusão de energia nos R$ 1.600
restantes dos fixos. Assim, os **R$ 2.200 mensais já incluem MO e energia**.
Para uma projeção por orçamento mantendo esse total, não somar novamente as
mesmas parcelas nos custos variáveis por produto. O comparativo atualizado
parte dos valores completos da fonte e retira `(1,70 + 0,04) ÷ rendimento`,
ou seja, a MO e energia históricas que já estavam embutidas. O custo físico
base fica R$ 29,61/receita (inclui materiais da receita), antes de recheios e
embalagens específicos. Referência histórica, não custo de aquisição atual.

Cálculo preparatório por SKU está na evidência; ainda não foi salvo no cenário.
Somar um adesivo de novo ao valor histórico, se ele já estiver embutido, também
duplicaria custo: o vínculo físico precisa ser confirmado sem somar o resíduo
pela segunda vez. A confirmação financeira de energia nos fixos não define
consumo por ciclo ou por receita. Essa medição continua necessária para
custeio físico de lotes futuros, preservando a regra produtiva de energia/MO
no custo realizado. Nenhuma tarifa, requisito ou lógica de FIFO foi alterada.

Próxima definição solicitada: uma embalagem e um adesivo por brownie simples
ou recheado nos dois tamanhos. Bombom/Kit/Bordinhas, recheios, chocolate e taxas
continuam pendentes. As comparações anteriores abaixo são históricas e não
podem ser somadas ao orçamento fixo integral de R$ 2.200.

## Mão de obra fechada para a revisão

Confirmação final: “150 reais por cada dia de produção”. Com quatro dias
mensais e inclusão já confirmada nos fixos:

- Diária: **R$ 150,00**; MO mensal: **R$ 600,00**.
- Fixos totais: **R$ 2.200,00**, dos quais **R$ 1.600,00** são outros custos.
- Produção habitual informada: **14–16 receitas completas por dia**;
  planejamento condicionado a **56–64 receitas/mês** nos quatro dias.
- Rateio informativo da MO: **R$ 10,71/receita em 14/dia** ou
  **R$ 9,38/receita em 16/dia**, calculado sem arredondamento intermediário.
- Corte, recheio e embalagem já fazem parte do serviço remunerado pela diária.

A pergunta de inclusão e a de total mensal estão resolvidas. Na projeção
financeira, preservar os R$ 600 uma única vez. Uma projeção por orçamento pode
manter os R$ 2.200 e retirar dos custos variáveis a mesma MO. Se usar custo
unitário completo e R$ 1.600 de outros fixos, conferir que a MO alocada aos
volumes do cenário reconcilia com R$ 600; diferença de volume/ociosidade não
pode desaparecer. Apenas retirar R$ 600 dos fixos não resolve automaticamente
essa reconciliação. Nenhuma mudança do custeio de lotes foi implementada.

Próxima pergunta enviada: energia já incluída nos R$ 1.600 restantes ou à
parte? O 1 kWh a R$ 0,85 é por receita ou por ciclo com várias receitas?
Ficha física, taxas, preços de aquisição e demais premissas seguem abertos.
Cenário 1 continua rascunho; nenhuma tarifa horária ou custo unitário foi salvo.

## Calendário mensal informado — quatro dias

Na sequência, usuário respondeu “150 reais em 4 dias de produção”. Pelo
contexto da pergunta, calendário de quatro dias de produção por mês; com a
faixa habitual de 14–16 receitas, capacidade planejada de 56–64 receitas/mês.
Não equivale a 20 dias de produção nem garante esse volume efetivamente feito.

Solicitada confirmação do valor: R$ 150 por dia em quatro dias dá R$ 600/mês
(incluídos nos R$ 2.200; demais fixos R$ 1.600). Se a resposta significar
R$ 150 no total dos quatro dias, MO mensal R$ 150 e demais fixos R$ 2.050.
A ambiguidade foi resolvida pela confirmação seguinte de R$ 150 por dia;
ver a seção de mão de obra fechada acima. As duas alternativas são preservadas
aqui como histórico da pergunta, sem aplicação da opção não escolhida.

## Diária incluída nos fixos — confirmação mais recente

Usuário confirmou que a diária de R$ 150 **já está incluída nos R$ 2.200**.
Isso resolve a pergunta de inclusão, mas ainda não a composição mensal dos
fixos ou o número de dias pagos de produção. Os 20 dias da fonte são dias de
venda e não estabelecem, por si, 20 dias de produção.

A mão de obra deve aparecer uma única vez no lucro planejado. Se a projeção
mantiver os R$ 2.200 integrais incluindo essa MO, não somar a mesma diária por
fora nem a parcela de MO por unidade novamente. A comparação anterior de custo
unitário completo não pode ser combinada com esses fixos integrais como se
fossem parcelas independentes.

Alternativamente, uma projeção que use custo unitário completo, com MO
produtiva, precisa separar dos fixos a mesma parcela de MO e reconciliar
a alocação aos volumes com o orçamento mensal, inclusive ociosidade. A regra de incorporar MO produtiva ao custo realizado
dos lotes continua válida; o ajuste de apresentação do planejamento não altera
FIFO, estoque ou custo contábil dos lotes. Não mudar o modelo silenciosamente.

| Dias pagos de produção no mês (exemplos) | MO mensal | Restante dentro dos R$ 2.200 |
| ---: | ---: | ---: |
| 4 | R$ 600,00 | R$ 1.600,00 |
| 8 | R$ 1.200,00 | R$ 1.000,00 |
| 12 | R$ 1.800,00 | R$ 400,00 |
| 14 | R$ 2.100,00 | R$ 100,00 |
| 15 | R$ 2.250,00 | −R$ 50,00 |
| 20 | R$ 3.000,00 | −R$ 800,00 |

Exemplos não são calendário aprovado. Acima de 14 dias inteiros, a própria
MO já ultrapassa R$ 2.200. Perguntado quantos dias de produção são pagos e
quanto dos fixos corresponde à MO. Ainda falta saber se energia também está
nos fixos para evitar a mesma duplicidade nesse recurso.

Apenas para preparar uma alternativa coerente com MO inteiramente nos fixos,
o custo variável de referência por receita fica em R$ 30,46 (físicos históricos
mais energia condicional de R$ 0,85), sem a MO já contida nos fixos. Na evidência,
o comparativo por SKU retira a MO histórica de R$ 1,70/rendimento antes de
ajustar energia. Isso não é custo completo do produto nem valor homologado;
não foi gravado no campo planejado do cenário. Os custos completos de
R$ 41,17/R$ 39,83 continuam exemplos econômicos de rateio em 14/16 receitas,
sem autorizar somá-los à mesma MO dentro dos R$ 2.200.

## Produção habitual atualizada — 14 a 16 receitas por dia

Ao ser perguntado sobre a produção habitual, usuário respondeu “14 ou 16”.
Essa informação mais recente passa a orientar a faixa de planejamento;
a referência anterior de até 12 permanece abaixo como histórico. Não inferir
nova capacidade máxima nem duração da jornada. Mantendo R$ 150 como custo
total da diária, o rateio fica:

| Receitas completas por dia | MO por receita | Base com físicos históricos + R$ 0,85 de energia |
| ---: | ---: | ---: |
| 14 | R$ 10,71 | R$ 41,17 |
| 16 | R$ 9,38 | R$ 39,83 |

A conta usa R$ 150 ÷ quantidade sem arredondamento intermediário, com exibição
em centavos. Energia ainda é condicional; custos físicos históricos e lacunas
de ficha permanecem. Não fixar R$ 9,38 para todos os dias ou tratar 16 como
produção garantida. Os dois resumos de comparação estão na evidência; custos por SKU podem ser
recalculados das fontes preservadas após fechar a base mensal.
Na etapa seguinte, a inclusão nos fixos foi confirmada (ver seção acima).
As demais pendências de ficha/taxas continuam abertas.

## Mão de obra diária — definição recebida

Usuário informou: “Um dia de trabalho equivale a 150 reais e podem ser feitas
até 12 receitas com os brownies cortados recheados e embalados”. Referência:
**R$ 150 por dia; capacidade máxima de 12 receitas completas por dia**.
Corte, recheio e embalagem já estão abrangidos nessa diária; não acrescentar
novamente mão de obra desses mesmos serviços. A definição não informa jornada
em horas nem garante produção diária de 12 receitas.

O rateio de planejamento em capacidade máxima é R$ 150 ÷ 12 = R$ 12,50 por
receita. Esse valor é por receita, não por hora. Para um dia de custo integral
R$ 150, o rateio depende da quantidade efetivamente concluída:

| Receitas completas no dia | MO por receita | Base com físicos históricos + R$ 0,85 de energia |
| ---: | ---: | ---: |
| 3 | R$ 50,00 | R$ 80,46 |
| 6 | R$ 25,00 | R$ 55,46 |
| 10 | R$ 15,00 | R$ 45,46 |
| 12 | R$ 12,50 | R$ 42,96 |

A referência na capacidade máxima é **R$ 42,96 por receita-base**, em vez dos
R$ 55,46 da hipótese anterior de duas horas por receita. O total mantém os
custos físicos históricos e supõe R$ 0,85 de energia por receita; a base da
energia ainda precisa de confirmação. Não é custo realizado nem ficha completa
por SKU. A tabela não prova viabilidade dos rendimentos de Bordinhas ou Kit.

Produção habitual e inclusão nos fixos foram esclarecidas depois desta
primeira referência: 14 a 16 receitas e diária já nos R$ 2.200. Falta o
calendário mensal e a composição dos fixos, conforme as seções acima.
A antiga parametrização horária não deve ser substituída por horas fictícias
para reproduzir a diária. Aplicação requer representação coerente de diária,
capacidade e rateio; qualquer mudança no modelo financeiro será revisada à parte.

## Comparação anterior: duas horas por receita, sem aplicação

**Hipótese para mensurar o efeito:** uma receita absorve integralmente 1 kWh
e duas horas. Custos físicos, complementos e rendimentos históricos são
mantidos; isso não resolve as lacunas físicas das fichas e não homologa
rendimentos de Bordinhas nem montagem de Kit.

| Parcela por receita | Histórico | Quantidade × tarifa cadastrada |
| --- | ---: | ---: |
| Ingredientes e materiais da receita | R$ 29,61 | R$ 29,61 |
| Energia | R$ 0,04 | R$ 0,85 |
| Mão de obra | R$ 1,70 | R$ 25,00 |
| Total (calculado sem arredondamento intermediário) | **R$ 31,35** | **R$ 55,46** |

A diferença é R$ 24,11 por receita. Na fonte, os 17 custos de massa ×
rendimento reconciliam com R$ 29,645555… (inclui os R$ 0,04 de energia).
As diferenças entre custo com/sem MO × rendimento reconciliam com R$ 1,70.
A reconciliação numérica não comprova composição física dos complementos.

Comparação unitária: custo hipotético = custo original completo +
(0,85 − 0,04 + 25,00 − 1,70) ÷ rendimento histórico. Exibição em centavos;
cálculo Decimal sem arredondamento intermediário. O cenário atual guarda
custos com três casas; esta análise usa a precisão completa da fonte e
guarda também a projeção de três casas na evidência.

| SKU / produto | Preço atual | Custo histórico | Custo hipotético | Margem hipotética antes de taxas |
| --- | ---: | ---: | ---: | ---: |
| PROD001 — Bombom Brownie Unitário | R$ 5 | R$ 1,68 | R$ 1,99 | 60,20% |
| PROD002 — Bordinhas | R$ 5 | R$ 2,88 | R$ 4,89 | 2,17% |
| PROD003 — Brownie Recheado 5x5 (Brigadeiro) | R$ 12 | R$ 2,52 | R$ 3,52 | 70,66% |
| PROD004 — Brownie Recheado 5x5 (Creme de Avelã) | R$ 12 | R$ 2,22 | R$ 3,22 | 73,16% |
| PROD005 — Brownie Recheado 5x5 (Doce de Leite) | R$ 12 | R$ 2,26 | R$ 3,26 | 72,83% |
| PROD006 — Brownie Recheado 5x5 (Goiabada) | R$ 12 | R$ 1,96 | R$ 2,96 | 75,33% |
| PROD007 — Brownie Recheado 5x5 (Leite Ninho) | R$ 12 | R$ 2,77 | R$ 3,77 | 68,55% |
| PROD008 — Brownie Recheado 5x5 (Maracujá) | R$ 12 | R$ 2,22 | R$ 3,22 | 73,16% |
| PROD009 — Brownie Recheado 7x7 (Brigadeiro) | R$ 17 | R$ 4,77 | R$ 6,78 | 60,11% |
| PROD010 — Brownie Recheado 7x7 (Creme de avelã) | R$ 17 | R$ 4,17 | R$ 6,18 | 63,64% |
| PROD011 — Brownie Recheado 7x7 (Doce de Leite) | R$ 17 | R$ 4,25 | R$ 6,26 | 63,17% |
| PROD012 — Brownie Recheado 7x7 (Goiabada) | R$ 17 | R$ 3,65 | R$ 5,66 | 66,70% |
| PROD013 — Brownie Recheado 7x7 (Leite Ninho) | R$ 17 | R$ 5,28 | R$ 7,29 | 57,12% |
| PROD014 — Brownie Recheado 7x7 (Maracujá) | R$ 17 | R$ 4,17 | R$ 6,18 | 63,64% |
| PROD015 — Brownie Simples 5x5 | R$ 6 | R$ 0,92 | R$ 1,43 | 76,24% |
| PROD016 — Brownie Simples 7x7 | R$ 8 | R$ 1,62 | R$ 2,62 | 67,24% |
| PROD017 — Kit 4 Bombons | R$ 18 | R$ 5,99 | R$ 7,24 | 59,77% |

Na comparação, 11 produtos ficam abaixo de 70%; no histórico eram quatro.
Bordinhas cairia para 2,17% antes de taxas: o rateio de coproduto precisa ser
definido antes de tratar esse custo como válido. Não recomendar reajuste com
base nessa hipótese. Adesivo já parece estar embutido no resíduo histórico:
ao definir o vínculo físico, evitar somar R$ 0,16 novamente ao custo histórico.

## Definições concluídas e pendências

- Concluído: R$ 150/dia × quatro dias = R$ 600/mês de MO incluída nos fixos;
  14–16 receitas completas por dia e energia também incluída nos R$ 2.200.
- Concluído: uma embalagem e um adesivo por brownie PROD003–PROD016.
- Concluído: Bordinhas 100 g a R$ 6 com saquinho e adesivo; cerca de 50 g
  de cobertura por Bombom; quatro bombons sem embalagem individual no Kit;
  uma embalagem própria e um adesivo por apresentação vendida.
- Pendente: peso/rateio da massa aproveitada de Bordinhas e taxas/impostos.
  Referências mestre do workbook são as solicitadas para o planejamento,
  não preço de compra atual realizado.
- Concluído: chocolate da massa Melken 50% em pó; recheios comprados prontos
  nas apresentações mestre, preservados os consumos aprovados de 20/40 g.
- Meta de R$ 10.000 de lucro após custos confirmada, incluindo todos os
  produtos. Herdados para conferir no fechamento: 20 dias de venda, quatro
  semanas e limiar de margem de 70%. O consumo de
  energia por ciclo/receita continua não medido, sem cobrança duplicada no
  planejamento que mantém a energia dentro do orçamento fixo integral.

Se forem várias receitas por sessão, distribuir o recurso pela base física
confirmada; não dividir automaticamente os demais ingredientes ou presumir
que o consumo do forno tenha a mesma base da mão de obra. Recheio caseiro
exige receita, rendimento/perdas e custo próprios; fruta não equivale a recheio.
Preço recente por embalagem/quantidade e fornecedor também precisa ser
confirmado para chamar o custo de atual. Oito ovos têm referência histórica
de R$ 5,33 por receita, sem compra atual que valide o preço.

O mix normalizado de 100% permanece preservado. No cálculo atual do sistema,
os pesos distribuem a contribuição necessária (meta de lucro + fixos); não
garantem os mesmos percentuais de unidades vendidas. Confirmar essa leitura
do planejamento ao revisar as metas finais; não mudar sua semântica nesta análise.

## Continuação após as respostas

Reconstruir o custo por receita e SKU com composição rastreável, calcular
margem antes/depois das taxas, conferir capacidade e metas diárias/semanais
e preparar a revisão do cenário para ativação. Manter a fonte histórica e
o histórico auditável; qualquer alteração de ficha deve ter novo pacote
aditivo e referência própria, sem repetir importações consumidas.

Evidência: [scenario-cost-reconciliation-2026-10-18.json](evidence/scenario-cost-reconciliation-2026-10-18.json).
Esta etapa não altera código, preços, cenário, receita, tarifas, estoque ou
produção. Não requer build nem repetição de testes de código inalterado.
