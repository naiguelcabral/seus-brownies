# Prévia de importação do workbook

Gerado em modo somente leitura pelo comando `npm run import:preview -- <caminho-do-workbook>`. Nenhum dado foi gravado no banco, nenhuma migration foi executada e o workbook não foi alterado.

## Fonte analisada

- Arquivo: `Workbook_Gerenciamento_Seus_Brownies.xlsx`
- Abas: `02_Cadastro_Produtos` e `03_Cadastro_Insumos`

## Contagens

| Grupo | Encontrados | Prontos para futura importação | Pendentes/ignorados |
| --- | ---: | ---: | ---: |
| Categorias de produtos finais | 4 | 4 | 0 |
| Produtos finais | 17 | 17 | 0 |
| Insumos cadastrados | 21 | — | — |
| Insumos físicos | 19 | 19 | 0 |
| Itens excluídos de estoque | 2 | 0 | 2 |

## Normalizações e regras auditáveis

- IDs/SKUs: espaços removidos e texto convertido para maiúsculas (`PROD001`, `INS001`).
- Nomes/categorias: Unicode NFC e espaços internos normalizados; a grafia original é preservada.
- Status: `Sim`, `S`, `Ativo`, `true` e `1` viram ativo; `Não`, `N`, `Inativo`, `false` e `0` viram inativo.
- Unidades: `unidade`, `unidades`, `un` e `und` viram `unit`; `g`, `kg`, `ml`, `l` e `m` são preservadas.
- Produtos finais: `Preco_Praticado` é validado como preço de venda de duas casas; a unidade é `unit`.
- Classificação física: `packaging` quando o nome contém uma palavra-chave explícita (embalagem, adesivo, papel manteiga, caixa, etiqueta, fita); os demais insumos físicos são `ingredient`.

## Categorias detectadas

Bombom, Bordinha, Brownie, Kit

## Produtos finais mapeados

| ID fonte | SKU | Nome | Categoria | Preço fonte | Status |
| --- | --- | --- | --- | --- | --- |
| PROD001 | PROD001 | Bombom Brownie Unitário | Bombom | 5.00 | ativo |
| PROD002 | PROD002 | Bordinhas | Bordinha | 5.00 | ativo |
| PROD003 | PROD003 | Brownie Recheado 5x5 (Brigadeiro) | Brownie | 12.00 | ativo |
| PROD004 | PROD004 | Brownie Recheado 5x5 (Creme de Avelã) | Brownie | 12.00 | ativo |
| PROD005 | PROD005 | Brownie Recheado 5x5 (Doce de Leite) | Brownie | 12.00 | ativo |
| PROD006 | PROD006 | Brownie Recheado 5x5 (Goiabada) | Brownie | 12.00 | ativo |
| PROD007 | PROD007 | Brownie Recheado 5x5 (Leite Ninho) | Brownie | 12.00 | ativo |
| PROD008 | PROD008 | Brownie Recheado 5x5 (Maracujá) | Brownie | 12.00 | ativo |
| PROD009 | PROD009 | Brownie Recheado 7x7 (Brigadeiro) | Brownie | 17.00 | ativo |
| PROD010 | PROD010 | Brownie Recheado 7x7 (Creme de avelã) | Brownie | 17.00 | ativo |
| PROD011 | PROD011 | Brownie Recheado 7x7 (Doce de Leite) | Brownie | 17.00 | ativo |
| PROD012 | PROD012 | Brownie Recheado 7x7 (Goiabada) | Brownie | 17.00 | ativo |
| PROD013 | PROD013 | Brownie Recheado 7x7 (Leite Ninho) | Brownie | 17.00 | ativo |
| PROD014 | PROD014 | Brownie Recheado 7x7 (Maracujá) | Brownie | 17.00 | ativo |
| PROD015 | PROD015 | Brownie Simples 5x5 | Brownie | 6.00 | ativo |
| PROD016 | PROD016 | Brownie Simples 7x7 | Brownie | 8.00 | ativo |
| PROD017 | PROD017 | Kit 4 Bombons | Kit | 18.00 | ativo |

## Insumos físicos mapeados

| ID fonte | Nome | Tipo | Unidade normalizada | Status | Regra de classificação |
| --- | --- | --- | --- | --- | --- |
| INS001 | Açúcar | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS002 | Óleo | ingredient | ml | ativo | insumo físico sem palavra-chave de embalagem |
| INS003 | Chocolate | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS004 | Farinha de Trigo | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS005 | Papel Manteiga (rolo) | packaging | m | ativo | palavra-chave de embalagem |
| INS006 | Adesivo | packaging | unit | ativo | palavra-chave de embalagem |
| INS007 | Embalagem Simples 5x5 | packaging | unit | ativo | palavra-chave de embalagem |
| INS008 | Embalagem Simples 7x7 | packaging | unit | ativo | palavra-chave de embalagem |
| INS009 | Embalagem Recheado 5x5 | packaging | unit | ativo | palavra-chave de embalagem |
| INS010 | Embalagem Recheado 7x7 | packaging | unit | ativo | palavra-chave de embalagem |
| INS011 | Embalagem Bombom Unitário | packaging | unit | ativo | palavra-chave de embalagem |
| INS012 | Embalagem Kit 4 Bombons | packaging | unit | ativo | palavra-chave de embalagem |
| INS013 | Brigadeiro (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS014 | Doce de Leite (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS015 | Leite Ninho (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS016 | Creme de Avelã (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS017 | Goiabada (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS018 | Maracujá (Recheio) | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |
| INS019 | Chocolate Ao Leite / Branco | ingredient | g | ativo | insumo físico sem palavra-chave de embalagem |

## Itens ignorados de estoque

| ID | Nome | Motivo |
| --- | --- | --- |
| INS020 | Forno Elétrico (Tarifa kWh média) | energia/kWh não é item físico de estoque |
| INS021 | Mão de Obra (Salário Referência) | mão de obra/horas não é item físico de estoque |

## Pendências de unidade / migration

Nenhum item.

## Duplicidades e campos inválidos

- SKUs/IDs duplicados: nenhum.
- Nomes duplicados após normalização: nenhum.
- Campos inválidos: nenhum detectado.

## Limite desta prévia

Esta prévia cobre apenas categorias, produtos finais e insumos físicos. Ela não inclui histórico de vendas, compras, despesas, estoque, produção ou qualquer gravação no banco.
