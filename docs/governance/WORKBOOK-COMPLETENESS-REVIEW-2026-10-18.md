# Revisão detalhada de completude do workbook

Data: 18/10/2026. Branch: `feat/input-catalog-kg-purchases`, início limpo em
`34f2197`. Escopo: análise somente leitura do arquivo e da original
`steep-brook-51659857` / `br-lingering-wind-acwh5wap` / `neondb`.

## Resultado

O cadastro aplicado corresponde ao manifesto aprovado e preservou os dados.
A revisão de composição encontrou lacunas além das duas fichas já ressalvadas:
adesivo sem vínculo de consumo, acabamento de Bordinhas indefinido e custos
históricos de energia/mão de obra incompatíveis com as próprias tarifas do
workbook. Esses pontos precisam de decisão explícita antes da homologação de
custo e consumo produtivo. Nenhuma nova regra foi aplicada por esta análise.

A conferência anterior validou carga versus manifesto; não reconciliou o
resíduo de adesivo presente nos custos armazenados. Os metadados
`operationallyComplete=true` dos demais perfis não comprovam ficha física
completa. O pacote foi aplicado corretamente no escopo apresentado, mas o
manifesto não deve ser tratado como inventário definitivo de todo material.

## Fonte, método e limites

- Arquivo disponível: `Workbook_Gerenciamento_Seus_Brownies.xlsx`, em Downloads.
- SHA-256: `25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`.
- Todas as 15 abas e todas as linhas preenchidas foram lidas, incluindo
  tabelas, comentários de origem, campos vazios e XML das células.
- Zero fórmulas de célula, zero células com erro Excel gravado, todas as abas
  visíveis e nenhum vínculo externo de workbook. Fórmulas de validação de
  lista e referências de gráficos não são fórmulas de cálculo das células.
- Os quatro comentários em `00_Instrucoes!A13:A16` apenas identificam arquivos
  de origem. Não contêm regras adicionais de consumo.
- Quantidades e reconciliações monetárias foram calculadas com Decimal;
  diferenças de representação binária da fonte não foram tratadas como uma
  nova regra financeira. Resultados monetários são exibidos com duas casas.
- Nova transação READ ONLY no banco às `2026-10-18T15:42:03.213795Z` conferiu
  catálogo, parâmetros, perfis, vínculos e contagens; outra confirmou receita,
  requisitos, tarifas e ausência de vínculo do adesivo.
- Não foram fornecidos os quatro arquivos originais citados na aba de
  instruções: precificação, despesas, custo da receita e saídas. Assim, a
  auditoria cobre o consolidado V2 disponível; não comprova identidade com
  outra versão de arquivo nem recupera fórmulas ausentes das fontes anteriores.
- Não houve alteração do workbook, de cadastros, estoque, operações, schema,
  secrets ou deploy. Esta revisão não é homologação autenticada da interface.

Evidências:
[cálculos e achados](../../evidence/workbook-completeness-analysis-2026-10-18.json)
e [leitura atual do banco](../../evidence/workbook-completeness-db-readonly-2026-10-18.json).

## O que foi conferido e está presente

Os 17 produtos finais coincidem em SKU, nome, categoria, atividade e preço
praticado. Os 19 insumos físicos `INS001–INS019` e Ovos Grandes estão presentes.
Os oito parâmetros de `01_Parametros!A4:B11` coincidem com o registro atual:
meta R$ 10.000, custos fixos R$ 2.200, 20 dias, quatro semanas, tolerâncias
3%/8%, margem mínima 70% e reserva zero.

Receita física em `03_Cadastro_Insumos!A30:D36`, conferida no banco:

| Item | Quantidade por receita | Unidade |
| --- | ---: | --- |
| Ovos Grandes | 8 | unidades |
| Açúcar | 500 | g |
| Óleo da massa | 200 | ml |
| Chocolate vinculado a `INS003` | 300 | g |
| Farinha de trigo | 240 | g |
| Óleo para untar | 15 | ml |
| Papel manteiga | 0,8 | m |

Há dois requisitos operacionais, duas tarifas, 17 perfis de referência,
14 vínculos de embalagem e 12 componentes de recheio. Os 20 g/40 g de recheio
vêm da decisão operacional v4, não de uma coluna explícita desta planilha.
Os ovos não faltam mais; não têm preço de venda nem saldo fictício. O preço de
compra atual dos ovos também não pode ser inferido do custo histórico da ficha.

## Achados prioritários de ficha técnica e custos

### W01 — adesivo sem regra de consumo, apesar de indício numérico forte

`03_Cadastro_Insumos!A10:F10` contém `INS006`, Adesivo, R$ 0,16 por unidade.
Ele existe no banco, mas não aparece na receita, nos componentes de perfil ou
no vínculo de embalagem de nenhum produto. O consumo planejado desse material
é, portanto, zero nos cadastros atuais.

Em todos os 14 brownies `PROD003–PROD016`, a subtração do custo da massa, da
embalagem aprovada e dos recheios de 20/40 g deixa R$ 0,16 por unidade, dentro
da precisão numérica armazenada. Isso é compatível com um adesivo por produto.

| Exemplo | Custo sem MO da fonte | Massa | Embalagem | Recheio | Resíduo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Simples 5×5, linha 19 do cadastro de produtos | R$ 0,887615… | R$ 0,617615… | R$ 0,11 | — | R$ 0,16 |
| Simples 7×7, linha 20 | R$ 1,545231… | R$ 1,235231… | R$ 0,15 | — | R$ 0,16 |
| Brigadeiro 5×5, linha 7 | R$ 2,445231… | R$ 1,235231… | R$ 0,15 | R$ 0,90 | R$ 0,16 |
| Brigadeiro 7×7, linha 13 | R$ 4,630462… | R$ 2,470462… | R$ 0,20 | R$ 1,80 | R$ 0,16 |

**Classificação:** vínculo faltante confirmado no sistema; identidade e
quantidade do material são inferência numérica, pois o workbook não traz BOM
explícita de adesivos por SKU. Confirmar a regra física antes de cadastrar.
Se for um adesivo por unidade, 100 unidades consumiriam 100 adesivos; a
referência histórica correspondente é R$ 16,00, sem afirmar custo de compra atual.

### W02 — energia e mão de obra usam bases históricas divergentes

Confronto dentro de `03_Cadastro_Insumos`:

| Recurso | Quantidade da ficha | Tarifa do cadastro | Custo esperado por essas premissas | Custo gravado na ficha |
| --- | ---: | ---: | ---: | ---: |
| Energia, linhas 24 e 37 | 1 kWh | R$ 0,85/kWh | R$ 0,85 | R$ 0,04 |
| Mão de obra, linhas 25 e 39 | 2 horas | R$ 12,50/h | R$ 25,00 | R$ 1,70 |

Os custos físicos históricos somam R$ 29,605555…; a linha 40 grava
R$ 31,345555… com energia/MO antigas. Mantendo os mesmos custos físicos e
aplicando as tarifas explícitas, o total teórico é R$ 55,455555…:
**R$ 31,35 versus R$ 55,46, diferença de R$ 24,11 por receita**.
Esse exemplo não inclui recheios/embalagens individuais e não é custo realizado:
o banco continua sem compras e consumo real.

Todos os 17 custos unitários com/sem MO também são compatíveis com apenas
R$ 1,70 de MO por receita, ao multiplicar a diferença pelo rendimento.
Portanto as margens e metas gravadas usam essa premissa histórica. O sistema
cadastrou as quantidades e tarifas explícitas aprovadas; não arredondou nem
transformou R$ 1,70 em tarifa vigente. Falta confirmar se as duas horas são
por receita, sessão de trabalho ou outra base de rateio. Não trocar a tarifa
nem a quantidade silenciosamente para reproduzir o total antigo.

### W03 — Bordinhas também tem acabamento não explicado

`02_Cadastro_Produtos!G6:I6` apresenta custo sem MO R$ 2,740462… e massa
R$ 2,470462…, diferença R$ 0,27. O perfil atual não tem embalagem nem componente
adicional. R$ 0,27 é compatível com R$ 0,11 + R$ 0,16, mas a fonte não informa
qual embalagem, quantidade ou apresentação comercial se aplica a Bordinhas.

Também falta definir fisicamente a relação entre as Bordinhas e o rendimento
dos brownies: sobra de corte por receita, unidade/peso de venda e rateio.
O código atual sugere Bordinhas pela capacidade restante; isso não comprova
rendimento físico das bordas quando uma fornada é inteiramente usada em brownies.
Não interpretar o rendimento isolado 12 como perda automática ou produção
adicional obrigatória de 12 junto de qualquer outro rendimento.

No writer, componentes/embalagens são avaliados nas saídas principais e
Bordinhas é acrescentada por um ramo próprio. Depois de decidir seu
acabamento, testar explicitamente o consumo associado ao coproduto; apenas
preencher embalagem no perfil não comprova cobertura desse caminho.

### W04 — bombom e kit têm sinais de cobertura, sem receita completa

Existem `INS011` (embalagem de bombom), `INS012` (embalagem de kit) e `INS019`
(chocolate ao leite/branco). Os perfis `PROD001` e `PROD017` não os consomem.

Os valores permitem esta reconstrução possível, sem comprovar a regra:

| Produto | Custo além da massa | Composição numericamente compatível |
| --- | ---: | --- |
| Bombom | R$ 1,27 | R$ 0,11 embalagem + R$ 0,16 adesivo + R$ 1,00 cobertura |
| Kit | R$ 4,36 | R$ 0,20 embalagem + R$ 0,16 adesivo + R$ 4,00 cobertura |

Ao preço de referência R$ 0,04/g de `INS019`, esses resíduos seriam compatíveis
com 25 g por bombom e 100 g por kit. **As gramagens são hipóteses**, não valores
explicitamente encontrados. A regra de montagem também precisa esclarecer
se o kit é produzido da massa ou montado com bombons já prontos, quais
embalagens individuais entram e como evitar consumo/custo em duplicidade.
Rendimento 77/19,25 é compatível com quatro bombons por kit, sem resolver
produção inteira, sobras ou montagem. Não cadastrar cobertura por inferência.

### W05 — recheios prontos versus fabricados e identidade do chocolate

O catálogo e os perfis tratam os recheios como ingredientes prontos consumidos
em g. O histórico também contém leite condensado, creme de leite e uma compra
descrita apenas como fruta “MARACUJÁ”. O consolidado não contém sub-receitas
de fabricação dos recheios, seus rendimentos ou perdas. Se algum sabor é
caseiro, esses ingredientes ficam sem transformação produtiva definida.

O alias histórico já documentado associa a fruta ao SKU “Maracujá (Recheio)”.
Isso não demonstra equivalência física entre fruta comprada e recheio pronto.
É preciso confirmar o significado antes de eventual importação do histórico.
Do mesmo modo, a receita chama “Chocolate Meio Amargo”, o cadastro chama
“Chocolate” e compras citam chocolate em pó 50%; confirmar especificação do
ingrediente sem remapear SKUs aprovados silenciosamente.

## Inconsistências de preço, metas e indicadores

### W06 — preço sugerido equivale a margem de cerca de 60%, com mínimo de 70%

Nas 17 linhas, os valores de `02_Cadastro_Produtos!J5:J21` são compatíveis com
2,5 vezes o custo de `I5:I21`. Essa relação implica margem sobre venda de 60%,
enquanto `N5:N21` e `01_Parametros!B10` indicam 70%. É uma divergência entre
premissas, não autorização de reajuste. Os preços praticados foram importados
corretamente e não foram substituídos pelos preços sugeridos.

Na própria base histórica, quatro produtos ficam abaixo de 70%:

| Produto | Margem gravada |
| --- | ---: |
| Bordinhas | 42,36% |
| Bombom unitário | 66,46% |
| Kit | 66,73% |
| Ninho 7×7 | 68,94% |

São margens históricas estimadas, não margens realizadas atuais. A lista
`12_Dashboard_Atual_V2!G26:K31`, intitulada produtos para revisar, contém também
Brigadeiro 7×7 (71,93%) e Doce de Leite 7×7 (74,99%), acima do limiar.
O recorte parece listar os seis menores; a regra exata não está documentada.

### W07 — mix de 103%, projeção estática e arredondamento semanal

`10_Metas_e_Cenarios!F19:F35` soma 103%. O sistema tem normalização aprovada,
mas a base atual não contém cenário nem mix. A normalização deve preservar
pesos originais e fechar em 100%; não copiar os resultados estáticos da fonte.

As quantidades mensais são numericamente compatíveis com distribuir a margem
necessária entre produtos e dividir pelo lucro unitário, com arredondamento
para cima. Portanto “Mix de Vendas” é ambíguo quanto à base: participação no
lucro/contribuição, nas unidades ou no faturamento. O cálculo atual do sistema
distribui contribuição, coerente com essa reconstrução; a UI deve explicitar isso.

Os totais gravados reconciliam: 1.535 unidades/mês, 391 na soma semanal,
faturamento de referência R$ 16.307 e lucro projetado R$ 10.441,92. Quatro
semanas de 391 somam 1.564, 29 acima do mensal. Essa diferença é compatível
com arredondamento semanal individual por produto, não com desaparecimento
de 29 unidades. As metas dependem dos custos antigos de MO/energia.

### W08 — rótulos gerenciais não substituem fatos financeiros

`12_Dashboard_Atual_V2!I5` corresponde a faturamento informado menos custo
estimado dos produtos vendidos. Não há classificação completa das despesas
variáveis que permita certificar uma margem de contribuição gerencial final.
“Base caixa informado” tampouco comprova recebimento: as vendas não trazem
datas de recebimento/entrega nem forma de pagamento. No sistema, caixa,
competência e CMV têm fatos próprios e não devem nascer desses rótulos.

As somas históricas principais fecham: 15 eventos, 182 linhas, 1.198 unidades,
R$ 12.479 informado e R$ 12.914 calculado. O total alocado das linhas fecha com
o informado na precisão monetária; não houve duplicidade de IDs detectada.

## Informações faltantes na fonte e escopo histórico

### W09 — duas divergências de receita sem causa registrada

`06_Auditoria_Receita!A6:K6` e `A11:K11` registram VEND0002 e VEND0007, com
diferenças de -R$ 216 e -R$ 219, total -R$ 435. Os motivos estão vazios.
As notas sugerem revisar desconto/combo/preço, mas não dizem qual ocorreu.
Não classificar automaticamente como desconto, brinde, fraude ou erro.

### W10 — dados comerciais e de reposição ausentes no próprio workbook

| Campo | Ausência verificada | Situação atual |
| --- | --- | --- |
| Fornecedor padrão e ponto de reposição | vazios nas 21 linhas de recursos/insumos, inclusive os 19 físicos | também não configurados no banco |
| Fornecedor e forma de pagamento das saídas | 30/30 vazios em `07_Base_Compras_Despesas!O5:P34` | não recuperáveis da planilha |
| Forma de pagamento das vendas | não há coluna na base de vendas, apesar da instrução em `00_Instrucoes!B7` | não inferir recebimento |
| Classificação/frequência dos cinco locais | “A classificar” / “A definir” | base atual tem apenas OneCoffee, fora desses cinco |
| Responsável das ações | 6/6 vazios em `11_Plano_de_Acao!G5:G10` | seis sugestões não são tarefas assumidas por alguém |
| Prazo das ações | Diário/Semanal/Quinzenal, sem data concreta | faltam vencimento e aceite operacional |

Os preços e tamanhos comerciais de embalagem dos insumos estão na fonte
(`03_Cadastro_Insumos!C5:F25`), mas não constituem compras atuais ou saldo.
O catálogo operacional não é uma tabela de preços de compra de referência;
ausência de compra no banco é ausência de custo realizado, não autorização de
preencher estoque a partir desses preços. Definir eventual cadastro comercial
separado sem transformar referência em fato contábil/operacional.

### W11 — a aba de estoque não informa saldo físico confiável

As 23 linhas de `08_Estoque_Insumos!A5:O27` não têm data, saldo, validade,
lote nem fornecedor. Todas as saídas são zero. As entradas muitas vezes
representam número de pacotes, mesmo exibindo unidade física: a linha de
óleo mostra 12 “ML”, mas a compra corresponde a 12 garrafas de 900 ml,
ou 10.800 ml. Cartelas de ovos têm o mesmo problema de dimensão.

Essa aba deriva das 23 compras e não é uma segunda origem de estoque. Não
comprova inventário atual, porque não registra consumo de produção. Importar
essas compras sem resolver o corte e os consumos antigos não prova o saldo
físico disponível hoje. A exceção histórica de maracujá (845 g diretos) está
no manifesto; não multiplicar duas vezes quantidade e quantidade-base.

### W12 — ano das compras e ano das vendas têm proveniências diferentes

As 30 saídas têm apenas dia e mês; o ano 2026 vem da decisão histórica
documentada no manifesto, não de uma coluna da fonte. As vendas têm datas
seriais Excel que resolvem para 2026. Preservar essa diferença de proveniência
em qualquer carga futura. Sem entrega/recebimento, não inventar competência
ou baixa financeira só porque a data da venda é conhecida.

### W13 — nove cadastros adicionais pertencem ao histórico, não à receita-base

Depois da inclusão dos ovos, os aliases de compras históricas ainda exigem
nove SKUs ausentes da base atual:

- Sacola Kraft PP, P, M e 12 × 8,5 × 16 cm, quatro produtos distintos;
- Bisnaga para molho 200 ml;
- Leite condensado e creme de leite;
- Recheios Alispec avelã forneável e não forneável, dois produtos distintos.

Os dez itens das prévias antigas incluíam ovos; essa pendência caiu para nove.
O extrator offline ainda lista dez porque compara com o cadastro original do
arquivo, não com o banco atual. Nenhum dos nove é linha ausente da receita-base
de sete componentes já cadastrada. Não cadastrar/carregar todo o histórico por
inferência desta revisão.

### W14 — planejamento e ficha de fabricação continuam incompletos

As 17 linhas `PLAN` não têm data de produção real, quantidade realizada ou
perdas; “Planejamento semanal” não é data. Fornadas inteiras arredondadas e
quantidade prevista nem sempre coincidem com capacidade integral. Esses
registros não comprovam produção, estoque ou perda e foram corretamente
excluídos da carga técnica.

Para uso como ficha de fabricação completa, o consolidado também não informa
modo de preparo, temperatura/tempo de forno, peso final da massa, dimensões
da forma/espessura, peso da unidade, rendimento físico de bordas, fabricação
dos recheios ou validade do produto acabado. Os rendimentos dos recheados
são metade dos simples de mesmo corte, indício de montagem com duas bases;
o procedimento físico não é explicitado. Esses dados precisam vir da operação
ou dos arquivos de origem, sem transformar hipóteses em consumo obrigatório.

### W15 — dados históricos deixados fora intencionalmente

| Grupo | Na fonte | No banco atual | Interpretação |
| --- | ---: | ---: | --- |
| Locais/canais da fonte | 5 | 0 correspondentes, 1 local preexistente preservado | escopo próprio de cadastro/histórico |
| Vendas | 15 eventos / 182 itens | 0 | não autorizado por carga de catálogo |
| Compras | 23 | 0 | afetam estoque; exigem corte/conferência próprios |
| Despesas | 7 | 0 | exigem classificação e carga próprias |
| Produção realizada | 0 | 0 | não criar por inferência |
| PLAN | 17 | 0 | exclusão intencional |
| Cenário/mix | 1 tabela de projeção / 17 pesos | 0 | custos e mix precisam de revisão |
| Ações | 6 sugestões | 0 | precisam de responsável e prazo |

Zero registros nesses domínios não constitui falha da carga aprovada.

## Conferência por aba

| Aba | Resultado da análise |
| --- | --- |
| 00_Instrucoes | instruções preservadas; quatro fontes anteriores citadas, indisponíveis para rastrear fórmulas; forma de pagamento não aparece nas vendas |
| 01_Parametros | oito valores conferem com o banco |
| 02_Cadastro_Produtos | 17 produtos/preços conferem; custos, markup/margem, adesivo e acabamento precisam de reconciliação |
| 03_Cadastro_Insumos | 19 físicos + 2 recursos; ovos constam só na ficha e agora no banco; tarifas versus ficha divergem |
| 04_Cadastro_Locais | cinco locais sem classificação/frequência; não cadastrados na carga técnica |
| 05_Base_Vendas | 15 eventos/182 itens válidos, 1.198 unidades; dados de entrega/recebimento/pagamento ausentes |
| 06_Auditoria_Receita | duas divergências totalizam -R$ 435; motivo não preenchido |
| 07_Base_Compras_Despesas | 23 compras/7 despesas; ano externo; fornecedor/pagamento vazios |
| 08_Estoque_Insumos | template de entradas derivadas; sem saldo físico/lote/validade; unidades de pacote precisam conversão |
| 09_Producao_Fornadas | 17 PLAN, zero produção comprovada; realizado/perdas ausentes |
| 10_Metas_e_Cenarios | mix 103%; 1.535 unidades/mês, 391/semana; custos históricos precisam revisão |
| 11_Plano_de_Acao | seis sugestões sem responsáveis e sem datas de vencimento |
| 12_Dashboard_Atual_V2 | agregados históricos reconciliados; rótulos de contribuição/caixa e seleção de margens precisam clareza |
| 13_Dashboard_Meta_10k | replica a projeção da aba 10; valores estáticos não homologam o cenário novo |
| 14_Dashboard_Gerencial_Futuro | lista de requisitos futuros, sem novos fatos para importar; cobertura, capacidade e recomendações dependem de base operacional |

## Próximos passos prioritários

1. Confirmar adesivo por produto e apresentação de Bordinhas; definir regras
   explícitas por SKU, sem inferir gramagem/cobertura/embalagem de bombom/kit.
2. Confirmar base de duas horas de MO e consumo de 1 kWh; reconciliar custos
   históricos e preços/metas com as tarifas aprovadas, sem alterar fatos antigos.
3. Esclarecer produção dos recheios, especificação do chocolate, rendimento de
   bordas e montagem do kit. Preparar pacote aditivo e ensaio separado quando
   essas decisões estiverem concretas; o recibo técnico consumido não pode ser repetido.
4. Constituir estoque rastreável por inventário/documentos e definir o corte
   entre começo atual e importação histórica; não usar o template como saldo.
5. Completar fornecedores, reposição, locais e tarefas; versionar cenário com
   mix 100% e premissas atuais. Homologar compra → produção → venda e margens.

Nenhuma correção de banco foi autorizada ou executada nesta análise. Os
achados são insumos de decisão, não novos valores de consumo já aprovados.
