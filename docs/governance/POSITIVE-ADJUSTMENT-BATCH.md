# Conferência de ajustes positivos em lote

Em **Estoque → Conferir lote de ajustes positivos**, Dono ou Administrador
carrega o manifesto privado por arquivo, texto ou link do próprio ambiente
com fragmento `#ajustes=...`. O fragmento é lido apenas ao abrir a conferência
e removido da barra de endereço. Não há staging público, localStorage ou
credencial no manifesto. Dados comerciais reais permanecem fora do Git.

**Conferir ajustes** consulta cadastro e recibos, sem escrever. A tela mostra
produto, quantidade, unidade, custo total, origem, motivo e referência; cada
item é identificado como pendente ou já registrado. Somente após marcar a
confirmação, **Confirmar e incluir ajustes** chama o escritor existente,
protegido por sessão verificada, CSRF e `fifo:lifecycle:write` no servidor.
A consulta nova exige a mesma permissão. Não há mudança de RBAC nem autoria
fornecida pelo navegador.

O JSON v1 é estrito, com até 32 KB e dez itens. `targetOrigin` deve coincidir
exatamente com a origem aberta. ID, SKU, nome, unidade e cadastro ativo são
reconferidos. Referências, produtos e SKUs são distintos dentro do manifesto.
Quantidade positiva tem até três casas; `unit` exige inteiro. Custo total é
uma string não negativa de até duas casas, conforme a regra existente. Totais
e comparação de custo usam inteiros/frações exatas.

Cada ajuste conserva sua transação: movimento, camada FIFO e auditoria do
ator autenticado. **O conjunto não é uma transação única.** Se houver falha,
os itens anteriores podem estar concluídos. A retomada deve usar o mesmo
manifesto e as mesmas referências, nunca gerar referências substitutas.

Antes de incluir, a consulta compara referências persistidas com produto,
quantidade, custo decimal/exato, tipo e motivo/origem. Recibos coincidentes
são preservados sem novo POST. Uma referência divergente bloqueia o conjunto
antes da primeira escrita. Resposta perdida após commit ou inclusão concorrente
é reconciliada por nova leitura; divergência ou verificação indisponível
interrompe a execução. A unicidade/lock do escritor existente continua sendo
a proteção transacional contra concorrência. Falha de atualização visual do
histórico não desfaz uma gravação confirmada.

Não registra compra, pagamento, venda ou conclusão de produção. Para o piloto
autorizado, conservar as quatro referências já preparadas e o rascunho #1 de
24 brigadeiros. Após confirmação na sessão do tablet, fazer leitura independente
de movimentos, camadas, custos e autoria antes de avançar. Não inferir produção
física, repetir compras ou criar outro rascunho. I05 continua parcial e I04
depende de seu aceite próprio.

Testes sintéticos cobrem manifesto/ambiente inválido, catálogo divergente,
conferência sem escrita, recibo conflitante, interrupção, resposta perdida,
retomada e ausência de duplicações. O laboratório HTTP/PostgreSQL local valida
RBAC por perfil, quatro gravações auditadas, custo/FIFO e interface em 375px.
Esses ensaios não atestam execução real na sessão do tablet.
