# ADR-0003 — Referências do workbook e saldo negativo no piloto

Decisão humana de 30/10/2026: permitir estoque negativo no teste, dispensar a conferência manual após cada etapa e manter histórico automático. Usuário definiu o workbook anexado como fonte de custo dos insumos, embalagens e demais situações nele listadas. Não usar zero automático para item ausente.

## Escopo executável

A exceção é avaliada exclusivamente no servidor, com política explícita `PILOT_STOCK_POLICY=workbook_negative`, origem pública exata do piloto e manifesto válido em `PILOT_WORKBOOK_COSTS`. Ausência da política/manifesto conserva o bloqueio normal; configuração inválida não é aceita. HML anterior e produção não recebem esses valores. RBAC, sessão, idempotência e transações permanecem.

Conclusões simuladas usam referências do workbook para todo o consumo físico e energia/MO por receita, inclusive quando há saldo. Produção, perdas e ajustes negativos podem deixar o ledger negativo no piloto. Quantidade sem camada não cria entrada nem camada FIFO fictícia: nas perdas/ajustes só a quantidade física coberta e com camada recebe alocação, mantendo a origem e custo dessa camada; o movimento da simulação registra separadamente seu custo de referência e a quantidade descoberta. Portanto não declarar cobertura FIFO completa nem tratar esses custos como custo realizado de operação real. Vendas e cancelamentos conservam o contrato FIFO existente; este pacote não amplia sua disponibilidade sem camada.

A posição de estoque do relatório do piloto usa os mesmos preços de referência e inclui saldos negativos. Compras, pagamentos, movimentos históricos, perfis, quantidades de receita e cenários existentes não são reprecificados. Não transformar despesas históricas em lançamentos novos ou alterar preços praticados/MEI por inferência. Autoria e histórico das novas operações continuam automáticos.

## Fonte e precisão

Workbook SHA-256 `add0174b9d8f7224e03f88f71d7f92c599fc998e502e2174e68f8d49854ebbeb`, igual à fonte anteriormente revisada. Catálogo mestre C/D define preço da apresentação dividido pela quantidade, preservando frações; a coluna calculada F e totais derivados não substituem essa conta. Energia/MO usam tarifas do cadastro e quantidades da ficha, pois seus totais antigos divergem. Ovos usam o custo e consumo explicitamente escritos na ficha; custos de produtos acabados conservam a referência histórica identificada. A identidade própria do saquinho de Bordinhas conserva a decisão anterior aplicada, sem alias por coincidência de preço.

Manifesto privado contém 40 referências (incluindo dois recursos não estocáveis), unidade e origem de célula, além de energia/MO por receita. Valores comerciais não são adicionados ao repositório público. O script de deploy valida e envia o manifesto somente ao Worker piloto; `keep_vars` preserva-o nas publicações seguintes. Sem o arquivo privado, o build não o recebe. Não ler arquivos locais de ambiente.

## Operação e reversibilidade

Sem migration, SQL compartilhado de escrita, repetição de carga ou edição retroativa. Desativar a política restaura a regra estrita para novas operações; saldos/valores negativos já simulados permanecem históricos e podem exigir compensação autorizada antes de outra utilização. O piloto não deve ser promovido com esses fatos como operação real. I05 permanece parcial e I04 sem aceite. Testes cobrem modo normal, precisão, isolamento, repetição, saldo negativo, auditoria e rollback por referência ausente.
