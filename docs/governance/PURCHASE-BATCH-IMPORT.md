# Importação assistida de compras

`Compras → Importar lote de compras` carrega o manifesto preparado, confere
o catálogo e apresenta datas, fornecedores, quantidades, totais por linha,
subtotais e total. Somente **Confirmar e incluir compras** inicia a gravação.
O usuário pode usar sua sessão no tablet, sem compartilhar credenciais.

Não há nova API administrativa ou permissão: o fluxo chama as Server Functions
existentes, com sessão verificada, CSRF e RBAC. Cadastro exige `catalog:write`;
compra exige `purchases:write`. O ator vem do principal resolvido no servidor.
Não há importação direta por SQL nem credencial no manifesto.

Cada compra conserva sua transação, custo exato, movimentos e auditoria.
**O lote inteiro não é uma transação única.** Uma interrupção pode deixar
compras anteriores concluídas. A tela mostra cada resposta confirmada;
resposta perdida também pode corresponder a gravação concluída. Reabrir o
**mesmo manifesto** reconcilia as compras por UUID idempotente. Não gerar
novas referências para contornar uma falha. Cadastro com resposta perdida é
reconhecido pelo SKU e pela coincidência do nome/tipo/unidade/categoria/descrição.

O manifesto JSON v1 é estrito: até 64 KB, dez compras, trinta produtos, cem
itens por compra. `targetOrigin` coincide exatamente com a origem aberta;
isso evita troca acidental de ambiente, sem substituir autenticação. Produtos
existentes exigem ID, SKU, nome, tipo e unidade coincidentes e cadastro ativo.
Novos produtos limitam-se a ingredientes/embalagens sem preço de venda, com
categoria existente/ativa e nome/ID coincidentes. Não há aproximação por nome
nem alteração automática de cadastro divergente. Toda definição deve ser usada.

Valores são strings positivas com até duas casas; quantidades têm até três.
Compras de massa usam kg e valor **total** da linha; demais itens usam unidade
de estoque, com inteiros para `unit`. Não multiplicar novamente o total.
O contrato executável está em
[`purchase-batch.ts`](../../src/features/operations/purchase-batch.ts).

Carregamento por arquivo, texto ou link do próprio ambiente com fragmento
`#lote=...`. O fragmento contém dados, não credenciais ou comandos. Só é lido
ao abrir o importador e removido da barra de endereço. Não há staging público,
localStorage ou upload das imagens. Conferir não grava. Os dados reais ficam
em artefato privado; testes e documentação pública usam dados sintéticos.

Após concluir, a tela mostra IDs e distingue registro novo/replay. Falha de
atualização do histórico preserva a indicação da gravação confirmada. Em uma
interrupção, usar **Retomar este lote** ou reabrir o mesmo arquivo/link; o
catálogo é reconferido antes da primeira gravação. Não há pagamento ao
fornecedor, alteração de receitas, produção, vendas ou acesso. Data histórica
é metadado da compra, sem reconstrução retroativa de CMV/saldo.

Ensaios locais cobrem ambiente/manifesto/catálogo inválidos, autorização
negada, respostas perdidas, conferência sem gravação, confirmação, custo e
layout tablet. Eles não atestam sessão ou inclusão real no piloto. O aceite
I05 exige releitura independente de compras, itens, movimentos, custo, ator
e auditoria após a execução real.
