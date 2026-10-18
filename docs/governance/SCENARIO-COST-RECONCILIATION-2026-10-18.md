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

## Comparação condicional, sem aplicação

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

## Decisões solicitadas ao usuário

1. As duas horas cobrem uma receita ou uma sessão com várias? Informar
   receitas por sessão; confirmar se 1 kWh é por receita ou por ciclo do forno.
2. Confirmar adesivo por brownie; apresentação, rendimento e rateio de
   Bordinhas; gramagem de cobertura e montagem/embalagens de bombom/Kit;
   recheios comprados versus fabricados e chocolate em barra versus pó.
3. Confirmar meta de lucro de R$ 10.000, fixos R$ 2.200, 20 dias, quatro
   semanas e limiar de 70%. Detalhar o que compõe os fixos e taxas/impostos
   efetivos. Não contar novamente MO/energia produtiva dentro dos fixos.
   Reserva 0% não está homologada por ausência de informação.

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
