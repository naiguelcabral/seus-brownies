# ADR-0002 — Custos exatos e apresentação em centavos

Data: 18 de outubro de 2026.
Estado: requisito humano aprovado; implementação local, aplicação externa pendente.

## Decisão humana

O usuário determinou entrada dos insumos de massa em kg com o **valor total
do produto**, preservação da precisão necessária internamente e apresentação
monetária com somente duas casas. Isso substitui a entrada por preço/kg e
autoriza ampliar a representação interna dos custos. Não autoriza aplicar
migration, backfill, alterar fatos existentes ou publicar nova versão.
Materiais contáveis, óleo e outras unidades incompatíveis com massa conservam
sua unidade física; não se inventa conversão para kg.

## Problema

R$ 12,50 por 1000 g implica R$ 0,0125/g. O custo médio de três casas retornava
R$ 0,013/g e o consumo integral virava R$ 13,00. Arredondar cada consumo
parcial a centavos também é incorreto: quatro consumos de R$ 3,125 não podem
virar R$ 12,52 na soma. Algumas divisões são periódicas: R$ 10,00 / 3 kg não
tem representação decimal finita. Escolher seis, doze ou dezoito casas não
torna essa divisão exata.

## Implementação

- Valor pago é informado em centavos no `totalAmount` do item. O servidor não
  o multiplica pela quantidade; soma os totais informados. Massa exige kg no
  servidor e na interface. A chave idempotente distingue total e preço legado.
- Custos derivados usam frações reduzidas de inteiros `BigInt`, em reais:
  `{numerator, denominator}` como strings em JSONB. Não há ponto flutuante
  nem aproximação decimal no valor autoritativo, inclusive para dízimas.
- O saldo físico conserva quantidade em milésimos da unidade canônica. O
  consumo custa `valor exato disponível × quantidade consumida / saldo`.
  Entrada = consumo acumulado + saldo, exatamente. O último consumo não
  precisa corrigir centavos criados por arredondamentos anteriores.
- Consumos, lote, energia/mão de obra, saídas, razão, camadas, alocações FIFO e
  reversões transportam o valor exato. O rateio entre saídas é proporcional
  às quantidades, preservando a política existente; os custos exatos somam o
  total do lote. Margens e valores de estoque somam frações antes de exibir.
- As colunas legadas de centavos e custo unitário permanecem como projeções
  compatíveis para leitura/auditoria anterior; não são a fonte de novos
  cálculos quando existe valor exato. Essas projeções não alteram a fração.
  Na leitura de fatos legados sem a representação nova usa-se o valor
  registrado, sem inventar precisão histórica perdida.
- Só a apresentação monetária arredonda metade para longe de zero para duas
  casas, usando inteiros. Exemplo: R$ 3,125 aparece como R$ 3,13, mas quatro
  fatos exatos aparecem no total como R$ 12,50. A soma dos valores exibidos
  individualmente pode diferir do total exibido; o total usa os fatos exatos.

## Migration e rollout

Pacote gerado por Drizzle em `drizzle/pending-exact-costs/`: nove colunas JSONB
nullable em oito tabelas, sem backfill ou transformação dos fatos anteriores.
SQL, snapshots e journal candidatos estão versionados para revisão.

A cadeia ativa está congelada pelos gates da issue #36 e pelo reparo específico
já aplicado. Seu journal, SQLs, snapshots e manifestos fixados permanecem
intactos. O pacote novo fica fora dessa cadeia; não deve ser executado pelo
migrador genérico nem misturado às pontes anteriores por inferência.

Antes da publicação: revisar o alvo e seus recibos, elaborar plano específico,
backup/recuperação, ensaiar com schema completo e aprovar a aplicação das nove
colunas; conferir schema antes do deploy. A versão nova consulta essas colunas
e depende delas. Não publicar somente o código sobre schema anterior.

Para rollback, interromper mutações e preservar as colunas/fatos exatos. Uma
versão antiga não pode continuar gravando depois da introdução de custos
fracionários, pois desconhece essa fonte de verdade. Preferir correção aditiva;
remoção de colunas ou reprocessamento não são autorizados.

## Validação

Testes de dízimas, múltiplas entradas, consumos sucessivos/integral, rateio,
FIFO/reversão e agregação financeira. Mock transacional verifica rollback de
produção com fração de centavo. Ensaio PostgreSQL 17 usa somente destino local
sintético fixo e vazio: migrations aditivas/preservação, compra pelo total,
replay/conflito, quatro conclusões, razão e FIFO, falha tardia de auditoria de
compra e falha tardia de produção. Não usa arquivos de ambiente ou conexão Neon.

Referência técnica: [PostgreSQL — Numeric Types](https://www.postgresql.org/docs/18/datatype-numeric.html).
